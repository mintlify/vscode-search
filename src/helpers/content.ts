import * as vscode from 'vscode';
import { hasMagic } from 'glob';
import * as minimatch from 'minimatch';

export const SUPPORTED_FILE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'html', 'css', 'scss', 'py', 'c', 'vue', 'java', 'md', 'env'];

export type File = {
	path: string;
	filename: string;
	content: string;
	isCurrentActiveFile?: boolean;
};

export const getRootPath = (): string => {
	const workspaceRoot = vscode.workspace.workspaceFolders![0];
	const root = workspaceRoot?.uri?.path;

	return root;
};

const U18ARRAY_TO_MB = 1_048_576;
const MAX_FILE_SIZE_IN_MB = 2;

const traverseFiles = async (root: vscode.Uri, filesContent: File[], currentActivePath?: string, gitIgnore?: GitIgnore): Promise<File[]> => {
	const files = await vscode.workspace.fs.readDirectory(root);
	const filePromises = files.map(async (file) => {
		const directoryName = file[0];
		const directoryPath = `${root}/${directoryName}`;
		const directoryPathUri = vscode.Uri.parse(directoryPath);
		if (inGitIgnore(root, file, gitIgnore)) {
			return;
		}
		// If filetype is a file
		if (file[1] === 1 && isValidFiletype(directoryName)) {
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
		}
		// If is folder
		else if (file[1] === 2 && isTraversablePath(directoryName)) {
			await traverseFiles(directoryPathUri, filesContent, currentActivePath, gitIgnore);
		}

	});
	await Promise.all(filePromises);
	return filesContent;
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
		const globmatch = minimatch(path, glob, {dot: true, debug: true});
		if (globmatch) {
			matchesGlob = true;
		}
	});
	return matchesGlob;
};

// Remove duplicate on backend
const isValidFiletype = (fileName: string): boolean => {
	const fileExtensionRegex = /(?:\.([^.]+))?$/;
	const fileExtension = fileExtensionRegex.exec(fileName)![1];
	return fileExtension != null && SUPPORTED_FILE_EXTENSIONS.includes(fileExtension);
};

export const getFiles = async (currentActivePath?: string): Promise<File[]> => {
	const root = vscode.workspace.workspaceFolders![0].uri;
	const files = await traverseFiles(root, [], currentActivePath);
	return files;
};