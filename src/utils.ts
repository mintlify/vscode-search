import * as vscode from 'vscode';
import { LOGIN_URI } from './api';

export type File = {
	path: string;
	filename: string;
	content: string;
};

export const REQUEST_ACCESS_URI = 'https://mintlify.com/start-minting';

export const SIGN_IN_BUTTON = 'Sign in';
export const REQUEST_ACCESS_BUTTON = 'Request access';
export const LOGOUT_BUTTON = 'Logout';

const traverseFiles = async (root: vscode.Uri, filesContent: File[]): Promise<File[]> => {
	const files = await vscode.workspace.fs.readDirectory(root);
	const filePromises = files.map(async (file, i) => {
		// If filetype is a file
		if (file[1] === 1) {
			const filePath = `${root}/${file[0]}`;
			const readFileUri = vscode.Uri.parse(filePath);
			const readFileRaw = await vscode.workspace.fs.readFile(readFileUri);
			const readFileContent = { path: filePath, filename: file[0], content: readFileRaw.toString()};
			filesContent.push(readFileContent);
		} else if (file[1] === 2 && isTraversablePath(file[0])) {
			const newRoot = vscode.Uri.parse(`${root}/${file[0]}`);
			await traverseFiles(newRoot, filesContent);
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

export const ENTIRE_WORKSPACE_OPTION = 'Search entire workspace';
export const THIS_FILE_OPTION = 'Search this file';

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

const SEARCH_BUTTON = '🔎 Search';
const ASK_BUTTON = '🎤 Ask';

export const showSettings = async (isLoggedIn: boolean) => {
	if (!isLoggedIn) {
		return showLoginMessage();
	}
	
	const selectedButton = await vscode.window.showInformationMessage('🌿 Mintlify Settings', SEARCH_BUTTON, ASK_BUTTON, LOGOUT_BUTTON);
	let selectedCommand: string;
	switch (selectedButton) {
		case SEARCH_BUTTON:
			selectedCommand = 'mintlify.search';
			break;
		case ASK_BUTTON:
			selectedCommand = 'mintlify.ask';
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
	mintlifyButton.text = '$(squirrel) Mintlify';
	mintlifyButton.tooltip = 'Open Mintlify Settings';
	mintlifyButton.command = 'mintlify.settings';
	mintlifyButton.show();
};