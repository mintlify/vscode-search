import * as vscode from 'vscode';
import { getLoginURI, REQUEST_ACCESS_URI } from '../constants/api';
import { REQUEST_ACCESS_BUTTON,
	LOGOUT_BUTTON, SIGN_IN_BUTTON } from '../constants/content';

export const showLoginMessage = () => {
	vscode.window.showInformationMessage('🌿 Sign in to use Mintlify search', SIGN_IN_BUTTON)
		.then((selectedValue) => {
			if (selectedValue === SIGN_IN_BUTTON) {
				const loginURI = getLoginURI(vscode.env.uriScheme);
				vscode.env.openExternal(vscode.Uri.parse(loginURI));
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
	const httpConfig = vscode.workspace.getConfiguration('http');
	httpConfig.update('systemCertificates', false, true);

	// Remove color scheme in case left over
	removePickerColorScheme();
};

export const changePickerColorScheme = () => {
	const workbenchConfig = vscode.workspace.getConfiguration('workbench');
	const currentColorScheme = workbenchConfig.get('colorCustomizations') as any;
	const mintlifyColorScheme = {
		"[*Dark*]": {
      "quickInput.background": "#2E3D38",
      "quickInput.foreground": "#FFF",
      "quickInputList.focusBackground": "#0C8C5E80",
      "list.highlightForeground": "#18E299A1",
      "focusBorder": "#18E29945",
			"progressBar.background": "#0C8C5E"
    },
    "[*Light*]": {
      "quickInputList.focusBackground": "#0C8C5E",
      "list.highlightForeground": "#1B4637",
      "list.focusHighlightForeground": "#E8FEF6",
      "focusBorder": "#0C8C5E",
			"progressBar.background": "#0C8C5E"
    }
	};
	workbenchConfig.update('colorCustomizations', {...currentColorScheme, ...mintlifyColorScheme}, true);
};

export const removePickerColorScheme = () => {
	const workbenchConfig = vscode.workspace.getConfiguration('workbench');
	const currentColorScheme = workbenchConfig.get('colorCustomizations') as any;
	const { ['[*Dark*]']: defaultDark, ['[*Light*]']: defaultLight, ...removedScheme } = currentColorScheme;
	workbenchConfig.update('colorCustomizations', removedScheme, true);
};

export const refreshHistoryTree = () => {
	vscode.commands.executeCommand('mintlify.refreshHistory');
};

export const showSkippedFileTypesMessage = (skippedFileTypes: Set<string>) => {
	let skippedFileTypesStr = '';
  skippedFileTypes.forEach(function(elem){
  if (elem !== null) {
			skippedFileTypesStr += '.' + elem + ', ';
		}
  });
	skippedFileTypesStr = skippedFileTypesStr.slice(0, -2);
  vscode.window.showWarningMessage(`Files of type ${skippedFileTypesStr} are not being searched because the language is not supported.`);
};
