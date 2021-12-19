import * as vscode from 'vscode';
import { hasMagic } from 'glob';
import * as minimatch from 'minimatch';
import { File, TraversedFileData } from '../constants/types';
import { MINT_SEARCH_PREPROCESS } from '../constants/api';
import { showSkippedFileTypesMessage } from './ui';
import axios from 'axios';

export const SUPPORTED_FILE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'html', 'css', 'scss', 'py', 'c', 'vue', 'java', 'md', 'env'];

export const getRootPath = (): string => {
	const workspaceRoot = vscode.workspace?.workspaceFolders![0];
	return workspaceRoot?.uri?.path;
};

const U18ARRAY_TO_MB = 1_048_576;
const MAX_FILE_SIZE_IN_MB = 2;
 
const traverseFiles = async (root: vscode.Uri, filesContent: File[], currentActivePath?: string, gitIgnore?: GitIgnore): Promise<TraversedFileData> => {
	const files = await vscode.workspace.fs.readDirectory(root);
	const skippedFileTypes : Set<string> = new Set();
	const filePromises = files.map(async (file) => {
		const directoryName = file[0];
		const directoryPath = `${root}/${directoryName}`;
		const directoryPathUri = vscode.Uri.parse(directoryPath);
		if (!isTraversablePath(directoryName) || inGitIgnore(root, file, gitIgnore)) {
			return;
		}
		// If filetype is a file
		if (file[1] === 1) {
			const fileExtensionRegex = /(?:\.([^.]+))?$/;
			const fileExtension = fileExtensionRegex.exec(directoryName)![1];
			if (isValidFiletype(fileExtension)) {
				
				const readFileRaw = await vscode.workspace.fs.readFile(directoryPathUri);
				const readFileContent = {
					path: directoryPath,
					filename: directoryName,
					content: readFileRaw.toString(),
					isCurrentActiveFile: currentActivePath != null && directoryPath.includes(currentActivePath)
				};

				// Check file size to ensure that it's not too large
				const fileSizeInMB = readFileRaw.length / U18ARRAY_TO_MB;
				if (fileSizeInMB > MAX_FILE_SIZE_IN_MB) {
					vscode.window.showWarningMessage(`${directoryName} is not being searched as the file is too large`);
					return;
				}

				filesContent.push(readFileContent);
			} else {
				const typesToIgnore = ['gitignore', 'txt'];
				if (!typesToIgnore.includes(fileExtension)) {
					skippedFileTypes.add(fileExtension);
				}
			}
			
		}
		// If is folder
		else if (file[1] === 2) {
			await traverseFiles(directoryPathUri, filesContent, currentActivePath, gitIgnore);
		}

	});
	await Promise.all(filePromises);
	return {files: filesContent, skippedFileTypes};
};

const isTraversablePath = (folderName: string): boolean => {
	const nonTraversable: Record<string, boolean> = {
		"node_modules": true,
		".git": true,
		"build": true,
		"out": true,
		".next": true,
		"dist": true,
	};

	return !nonTraversable[folderName];
};

export type GitIgnore = {
	topLevelDirectories: Set<string>;
	topLevel: Set<string>;
	folders: Set<string>;
	both: Set<string>; 
	globs: Set<string>;
};

const getGitIgnore = async (root: vscode.Uri): Promise<GitIgnore | undefined> => {
	const files = await vscode.workspace.fs.readDirectory(root);
	for (let i = 0; i < files.length; i++) {
		if (files[i][0] == '.gitignore' && files[i][1] == 1) {
			const directoryPath = `${root}/.gitignore`;
			const directoryPathUri = vscode.Uri.parse(directoryPath);
			const readFileRaw = await vscode.workspace.fs.readFile(directoryPathUri);
			const gitIgnoreString = readFileRaw.toString();
			const gitIgnoreElems = gitIgnoreString.split('\n').filter((elem) => {
				return elem.trim().charAt(0) !== '#' && elem.trim().length !== 0;
			}); // remove empty lines & comments
			const topLevelDirectories : Set<string> = new Set();
			const topLevel : Set<string> = new Set();
			const folders : Set<string> = new Set();
			const both : Set<string> = new Set();
			const globs : Set<string> = new Set();
			gitIgnoreElems.forEach((elem) => {
				const trimmed = elem.trim();
				const lastChar = trimmed[trimmed.length-1];
				const removeLastSlash = trimmed.slice(0,-1);
				if (hasMagic(trimmed)) {
					globs.add(trimmed);
				} else if (trimmed.charAt(0) === '/') { // if element starts with '/' it only matches with files/directories in the top level
					// if element ends with '/' it only matches with directories
					if (lastChar === '/') {
						topLevelDirectories.add(`${root}${removeLastSlash}`);
					} else {
						topLevel.add(`${root}${trimmed}`);
					}
				} else if (trimmed.includes('/')) {
					// if element ends with '/' it only matches with directories
					if (lastChar === '/') {
						folders.add(removeLastSlash);
					} else {
						both.add(trimmed);
					}
				} else {
					both.add(trimmed);
				}
			});
			const gitIgnore: GitIgnore = {
				topLevelDirectories,
				topLevel,
				folders,
				both,
				globs
			};
			return gitIgnore;
		}
	}
	return undefined;
};

const inGitIgnore = (root: vscode.Uri, file: any, gitIgnore?: GitIgnore) : boolean => {
	if (gitIgnore == null) {
		return false;
	}
	const directoryName = file[0];
	const directoryPath = `${root}/${directoryName}`;

	if (gitIgnore.topLevel.has(directoryPath) || gitIgnore.both.has(directoryName)) {
		return true;
	}
	let ignore = false;
	gitIgnore.both.forEach((elem) => {
		if (directoryPath.slice(-elem.length) === elem) {
			ignore = true;
		}
	});
	if (ignore) { return true; }

	if (file[1] == 2) { // is a folder
		if (gitIgnore.topLevelDirectories.has(directoryPath)) {
			return true;
		}
		let ignoreFolder = false;
		gitIgnore.folders.forEach((gitIgnoreElem) => {
			if (directoryPath.slice(-gitIgnoreElem.length) === gitIgnoreElem) {
				ignoreFolder = true;
			}
		});
		if (ignoreFolder) { return true; }
	}
	const path = directoryPath.slice(8);
	let matchesGlob = false;
	gitIgnore.globs.forEach((glob) => {
		const globmatch = minimatch(path, glob, {dot: true});
		if (globmatch) {
			matchesGlob = true;
		}
	});
	return matchesGlob;
};

// Remove duplicate on backend
const isValidFiletype = (fileExtension: string): boolean => {
	return fileExtension != null && SUPPORTED_FILE_EXTENSIONS.includes(fileExtension);
};

export const getTraversedFileData = async (currentActivePath?: string): Promise<TraversedFileData> => {
	const root = vscode.workspace?.workspaceFolders![0]?.uri;
	const gitIgnore = await getGitIgnore(root);
	const traversedFileData : TraversedFileData = await traverseFiles(root, [], currentActivePath, gitIgnore);
	return traversedFileData;
};

export const preprocess = async (authToken: string | null, callback: () => void) => {
  const { files, skippedFileTypes } = await getTraversedFileData(vscode.window.activeTextEditor?.document.uri.path);
  showSkippedFileTypesMessage(skippedFileTypes);
  const root = getRootPath();

  await axios.post(MINT_SEARCH_PREPROCESS, {
    authToken,
    files,
    root,
  });

  callback();
};