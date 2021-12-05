import * as vscode from 'vscode';
import { LOGIN_URI, REQUEST_ACCESS_URI } from './constants/api';
import { ENTIRE_WORKSPACE_OPTION,
	THIS_FILE_OPTION, REQUEST_ACCESS_BUTTON,
	LOGOUT_BUTTON, SIGN_IN_BUTTON } from './constants/content';

export type File = {
	path: string;
	filename: string;
	content: string;
};

export const getRootPath = (): string => {
	const workspaceRoot = vscode.workspace.workspaceFolders![0];
	const root = workspaceRoot?.uri?.path;

	return root;
};

const U18ARRAY_TO_MB = 1_048_576;
const MAX_FILE_SIZE_IN_MB = 2;

const traverseFiles = async (root: vscode.Uri, filesContent: File[]): Promise<File[]> => {
	const files = await vscode.workspace.fs.readDirectory(root);
	const filePromises = files.map(async (file) => {
		const directoryName = file[0];
		const directoryPath = `${root}/${directoryName}`;
		const directoryPathUri = vscode.Uri.parse(directoryPath);
		// If filetype is a file
		if (file[1] === 1 && isValidFiletype(directoryName)) {
			const readFileRaw = await vscode.workspace.fs.readFile(directoryPathUri);
			const readFileContent = { path: directoryPath, filename: directoryName, content: readFileRaw.toString()};

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
			await traverseFiles(directoryPathUri, filesContent);
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
	};

	return !nonTraversable[folderName];
};

// Remove duplicate on backend
const isValidFiletype = (fileName: string): boolean => {
	const fileExtensionRegex = /(?:\.([^.]+))?$/;
	const fileExtension = fileExtensionRegex.exec(fileName)![1];

	// Todo: Search non-code files
	const validExtensions: Record<string, boolean> = {
		'ts': true,
		'tsx': true,
		'js': true,
		'jsx': true,
		'html': true,
		'css': true,
		'py': true,
		'vue': true,
		'md': true,
		'env': true,
	};

	return fileExtension != null && validExtensions[fileExtension];
};

export const getFiles = async (option: string = ENTIRE_WORKSPACE_OPTION): Promise<File[]> => {
	if (option === ENTIRE_WORKSPACE_OPTION) {
		const root = vscode.workspace.workspaceFolders![0].uri;
		const files = await traverseFiles(root, []);
		return files;
	}

	else if (option === THIS_FILE_OPTION) {
		const document = vscode.window.activeTextEditor?.document;
		if (document === undefined) {
			return [];
		}

		const { fileName } = document;
		const fileNamePath = fileName.split('/');

		const file = {
			path: document.uri.toString(),
			filename: fileNamePath[fileNamePath.length - 1],
			content: document.getText(),
		};
		return [file];
	}

	return [];
};

export const getOptionShort = (option: string = ENTIRE_WORKSPACE_OPTION): string => {
	switch (option) {
		case ENTIRE_WORKSPACE_OPTION:
			return 'the workspace';
		case THIS_FILE_OPTION:
			return 'this file';
		default:
			return '';
	}
};

export const showLoginMessage = () => {
	vscode.window.showInformationMessage('🌿 Sign in to use Mintlify search', SIGN_IN_BUTTON)
		.then((selectedValue) => {
			if (selectedValue === SIGN_IN_BUTTON) {
				vscode.env.openExternal(vscode.Uri.parse(LOGIN_URI));
			}
		});
};

export const showInformationMessage = async (message: string) => {
	return vscode.window.showInformationMessage(message);
};

export const showErrorMessage = async (message: string, ...buttons: string[]) => {
	const userActionOnError = await vscode.window.showErrorMessage(
		message,
		...buttons
	);
	if (userActionOnError === REQUEST_ACCESS_BUTTON) {
		vscode.env.openExternal(vscode.Uri.parse(REQUEST_ACCESS_URI));
	}
	else if (userActionOnError === LOGOUT_BUTTON) {
		vscode.commands.executeCommand('mintlify.logout');
	}
};

const SEARCH_BUTTON = '🔎 Search (⌘ + M)';

export const showSettings = async (isLoggedIn: boolean) => {
	if (!isLoggedIn) {
		return showLoginMessage();
	}
	
	const selectedButton = await vscode.window.showInformationMessage('🌿 Mintlify Settings', SEARCH_BUTTON, LOGOUT_BUTTON);
	let selectedCommand: string;
	switch (selectedButton) {
		case SEARCH_BUTTON:
			selectedCommand = 'mintlify.searchbar';
			break;
		case LOGOUT_BUTTON:
			selectedCommand = 'mintlify.logout';
			break;
		default:
			selectedCommand = '';
			break;
	}
	
	vscode.commands.executeCommand(selectedCommand);
};

export const showStatusBarItem = () => {
	const mintlifyButton = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		0
	);
	mintlifyButton.text = '$(search-save) Mintlify';
	mintlifyButton.tooltip = 'Open Mintlify Settings';
	mintlifyButton.command = 'mintlify.settings';
	mintlifyButton.show();
};

export const configUserSettings = () => {
	const config = vscode.workspace.getConfiguration('http');
	config.update('systemCertificates', false, true);
};

export const refreshHistoryTree = () => {
	vscode.commands.executeCommand('mintlify.refreshHistory');
};