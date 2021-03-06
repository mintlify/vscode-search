import * as vscode from 'vscode';
import { hasMagic } from 'glob';
import { SHA3 } from 'crypto-js';
import * as minimatch from 'minimatch';
import { File, TraversedFileData } from '../constants/types';
import { MINT_SEARCH_AUTOCOMPLETE_V2, MINT_SEARCH_PREPROCESS } from '../constants/api';
import axios from 'axios';

export const SUPPORTED_FILE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'html', 'css', 'scss', 'py', 'c', 'vue', 'java', 'md', 'env', 'rs'];
// specifically for the error message
const UNSUPPORTED_FILE_EXTENSIONS = [
	'cpp', 'c++', 'cc', 'cp', 'cxx', 'h', 'h++', 'hh', 'hpp', 'hxx', 'inc', 'inl', 'ipp', 'tcc','tpp', // C++
	'cs', 'cake', 'cshtml', 'csx', // C#
	'r', 'rd', 'rsx', // R
	'rb', 'ruby', // Ruby
	'ml', 'eliom', 'eliomi', 'ml4', 'mli', 'mll', 'mly', // OCaml
	'go', 'swift', 'php',
	'rlib', 'kt', 'kts', 'ktm', 'hs', 'plx', 'pl', 'pm', 'erl', 'hrl'
];

export const getRootPath = (encrypt = false): string => {
	const workspaceRoot = vscode.workspace?.workspaceFolders![0];
	const path = workspaceRoot?.uri?.path;

	if (encrypt && path != null) {
		const encyptedRoot = SHA3(path).toString();
		return encyptedRoot;
	}

	return path;
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
				if (UNSUPPORTED_FILE_EXTENSIONS.includes(fileExtension) && fileExtension !== null) {
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

export const preprocess = async (authToken: string | null, callback: (skippedFiles: Set<string>) => void) => {
  const { files, skippedFileTypes } = await getTraversedFileData(vscode.window.activeTextEditor?.document.uri.path);

	try {
		await axios.post(MINT_SEARCH_PREPROCESS, {
			authToken,
			files,
			root: getRootPath(true),
		});
	} finally {
		callback(skippedFileTypes);
	}
};

type Suggestion = {
	type: 'history' | 'recommend',
	query: string;
};

export const getAutoSuggestionPickItems = async (authToken: string | null, value: string): Promise<vscode.QuickPickItem[]> => {
	if (authToken == null) {
		return [];
	}

	const { data: autoSuggestions }: {data: Suggestion[]} = await axios.post(MINT_SEARCH_AUTOCOMPLETE_V2, {
		query: value,
		root: getRootPath(true),
		authToken,
	});

	if (autoSuggestions == null) {
		return [];
	}

	const autoSuggestionResults = autoSuggestions
		.map((suggestion) => {
		const iconMap = {
			history: '$(clock)',
			recommend: '$(search)'
		};

		const icon = iconMap[suggestion.type];
		return {
			label: `${icon} ${suggestion.query}`,
			alwaysShow: true,
		};
	});

	return autoSuggestionResults;
};

export const removeIconFromLabel = (label: string): string => {
	return label.replace(/^\$\((clock|search)\)\s/, '');
};