import * as vscode from 'vscode';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { getFiles, getOptionShort, ENTIRE_WORKSPACE_OPTION,
	THIS_FILE_OPTION, SIGN_IN_BUTTON, REQUEST_ACCESS_BUTTON,
	REQUEST_ACCESS_URI, LOGOUT_BUTTON } from './utils';
import { LOGIN_URI, LOGOUT_URI } from './auth';

type SearchResult = {
	path: string;
	filename: string;
	content: string;
	lineStart: number;
	lineEnd: number;
};

class LocalStorageService {
  constructor(private storage: vscode.Memento) {}
	
  public getValue(key: string) {
    return this.storage.get(key, null);
  }

  public setValue(key: string, value: string | null) {
    this.storage.update(key, value);
  }
}

const showLoginMessage = () => {
	vscode.window.showInformationMessage('🌿 Sign in to use Mintlify search', SIGN_IN_BUTTON)
		.then((selectedValue) => {
			if (selectedValue === SIGN_IN_BUTTON) {
				vscode.env.openExternal(vscode.Uri.parse(LOGIN_URI));
			}
		});
};

export function activate(context: vscode.ExtensionContext) {
	// Set storage manager for auth tokens
	const storageManager = new LocalStorageService(context.globalState);

	const authToken = storageManager.getValue('authToken');
	if (!authToken) {
		showLoginMessage();
	}

	const search = vscode.commands.registerCommand('mintlify.search', async () => {
		const quickPick = vscode.window.createQuickPick();
		quickPick.title = "Mint Search";
		quickPick.placeholder = "What would you like to find?";
		quickPick.show();
		
		// Retrieve tokens for auth
		const authToken = storageManager.getValue('authToken');
		// Retrieve for identification
		const workspaceRoot = vscode.workspace.workspaceFolders![0];
		const root = workspaceRoot?.uri?.path;

		quickPick.onDidChangeValue(async (value: string) => {
			if (value) {
				let itemResults: vscode.QuickPickItem[] = [];
				let autoSuggestions: string[] = [];
				itemResults = [
					{label: value, description: ENTIRE_WORKSPACE_OPTION },
					{label: value, description: THIS_FILE_OPTION },
				];

				quickPick.items = itemResults;

				if (authToken) {
					const { data: autoCompleteData }: {data: string[]} = await axios.post('http://localhost:5000/search/autocomplete', {
						query: value,
						root,
						authToken,
					});

					autoSuggestions = autoCompleteData;
				}
				const autoSuggestionResults = autoSuggestions.map((suggestion) => {
					return {
						label: suggestion,
					};
				});
				itemResults = [
					{label: value, description: ENTIRE_WORKSPACE_OPTION },
					{label: value, description: THIS_FILE_OPTION },
					...autoSuggestionResults
				];

				return quickPick.items = itemResults;
			}

			return quickPick.items = [];
		});
		quickPick.onDidChangeSelection(async (selectedItems) => {
			const selected = selectedItems[0];

			const { label: search, description: option } = selected;
			if (!search || !option) {
				return null;
			}

			quickPick.value = search;
			const optionShort = getOptionShort(option);

			if (!authToken) {
				return showLoginMessage();
			}

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: `🔎 Mint searching across ${optionShort}`,
			},
			() => {
				return new Promise(async (resolve, reject) => {
					try {
						const files = await getFiles(option);
						const searchRes: { data: { results: SearchResult[] } } = await axios.post('http://localhost:5000/search/results', {
							files,
							search,
							root,
							authToken
						}, {
							maxContentLength: Infinity,
							maxBodyLength: Infinity,
						});

						const searchResults = searchRes.data.results;
						const resultItems = searchResults.map((result) => {
							return {
								label: result.content,
								detail: result.filename
							};
						});
						
						quickPick.hide();

						const resultsPick = vscode.window.createQuickPick();
						resultsPick.items = resultItems;
						resultsPick.title = "Mint Search Results";
						resultsPick.placeholder = search;
						resultsPick.matchOnDescription = true;
						resultsPick.matchOnDetail = true;
						resultsPick.show();

						resultsPick.onDidChangeActive(async (activeItems) => {
							const item = activeItems[0];
							const itemContext = searchResults.find((result) => result.content === item.label);

							if (!itemContext) {return null;}

							const { path, lineStart, lineEnd } = itemContext;
							const filePathUri = vscode.Uri.parse(path);
							const startPosition = new vscode.Position(lineStart, 0);
							const endPosition = new vscode.Position(lineEnd, 9999);
							const selectedRange = new vscode.Range(startPosition, endPosition);

							await vscode.window.showTextDocument(filePathUri, {
								selection: selectedRange,
								preserveFocus: true,
							});
						});

						resultsPick.onDidChangeSelection(async (selectedItems) => {
							const item = selectedItems[0];
							const itemContext = searchResults.find((result) => result.content === item.label);

							if (!itemContext) {return null;}

							const { path, lineStart, lineEnd } = itemContext;
							const filePathUri = vscode.Uri.parse(path);
							const startPosition = new vscode.Position(lineStart, 0);
							const endPosition = new vscode.Position(lineEnd, 9999);
							const selectedRange = new vscode.Range(startPosition, endPosition);
							await vscode.window.showTextDocument(filePathUri, {
								selection: selectedRange,
							});
						});

						resolve('Completed search');
					} catch (error: any) {
						reject('Failed');
						const backendError = error?.response?.data;
						if (backendError) {
							const { shouldPromptWaitlist } = backendError;
							const userActionOnError = await vscode.window.showErrorMessage(
								backendError.error,
								shouldPromptWaitlist && REQUEST_ACCESS_BUTTON,
								shouldPromptWaitlist && LOGOUT_BUTTON,
							);
							if (userActionOnError === REQUEST_ACCESS_BUTTON) {
								vscode.env.openExternal(vscode.Uri.parse(REQUEST_ACCESS_URI));
							}
							else if (userActionOnError === LOGOUT_BUTTON) {
								vscode.commands.executeCommand('mintlify.logout');
							}
						}
					}
				});
			}
			);
		});
	});

	const ask = vscode.commands.registerCommand('mintlify.ask', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user

		const quickPick = vscode.window.createQuickPick();
		quickPick.title = "Mint Ask (beta)";
		quickPick.placeholder = "What would you like to know?";
		quickPick.show();
		quickPick.onDidChangeValue((value) => {
			let itemResults: vscode.QuickPickItem[] = [];
			if (value) {
				itemResults = [{label: value, description: ENTIRE_WORKSPACE_OPTION }, {label: value, description: THIS_FILE_OPTION }];
			}

			return quickPick.items = itemResults;
		});
		quickPick.onDidChangeSelection(async (selectedItems) => {
			const selected = selectedItems[0];

			const { label: question, description: option } = selected;
			if (!question || !option) {
				return null;
			}

			quickPick.value = question;
			const optionShort = getOptionShort(option);

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: `🎤 Mint answering from ${optionShort}`,
			},
			() => {
				return new Promise(async (resolve) => {
					const files = await getFiles(option);
					const searchRes = await axios.post('http://localhost:5000/ask/answer', {
						files,
						question,
					}, {
						maxContentLength: Infinity,
						maxBodyLength: Infinity,
					});

					const answer = searchRes.data.answer;
					quickPick.hide();

					const answerPick = vscode.window.createQuickPick();
					answerPick.items = [{ label: answer }];
					answerPick.title = "Mint Answer Results";
					answerPick.placeholder = question;
					answerPick.show();

					resolve('Complete ask');
				});
			});
		});
	});

	const logout = vscode.commands.registerCommand('mintlify.logout', async () => {
		vscode.env.openExternal(vscode.Uri.parse(LOGOUT_URI));
	});

	vscode.window.registerUriHandler({
    async handleUri(uri: vscode.Uri) {
      if (uri.path === '/auth') {
        const query = new URLSearchParams(uri.query);

				const code = query.get('code');
				try {
					const authResponse = await axios.post('http://localhost:5000/user/code', {code});
					const { authToken } = authResponse.data;
					storageManager.setValue('authToken', authToken);
				} catch (error) {
					console.log({error});
				}
      } else if (uri.path === '/logout') {
				storageManager.setValue('authToken', null);
				showLoginMessage();
			}
    }
  });

	context.subscriptions.push(search, ask, logout);
}

// this method is called when your extension is deactivated
export function deactivate() {}
