import * as vscode from 'vscode';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { getFiles, showErrorMessage, showInformationMessage,
	showLoginMessage, showStatusBarItem,
	showSettings,
	getOptionShort, ENTIRE_WORKSPACE_OPTION,
	THIS_FILE_OPTION, REQUEST_ACCESS_BUTTON,
	LOGOUT_BUTTON } from './utils';
import { LOGOUT_URI, MINT_SEARCH_AUTOCOMPLETE,
	MINT_SEARCH_RESULTS, MINT_ASK_ANSWER, MINT_ASK_AUTOCOMPLETE,
	MINT_ASK_FEEDBACK, MINT_SEARCH_FEEDBACK, MINT_USER_CODE } from './api';

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

export function activate(context: vscode.ExtensionContext) {
	// Set storage manager for auth tokens
	const storageManager = new LocalStorageService(context.globalState);

	const authToken = storageManager.getValue('authToken');
	if (!authToken) {
		showLoginMessage();
	}

	showStatusBarItem();

	const search = vscode.commands.registerCommand('mintlify.search', async () => {
		const searchPick = vscode.window.createQuickPick();
		searchPick.title = "Mint Search";
		searchPick.placeholder = "What would you like to find?";
		searchPick.show();
		
		// Retrieve tokens for auth
		const authToken = storageManager.getValue('authToken');
		// Retrieve for identification
		const workspaceRoot = vscode.workspace.workspaceFolders![0];
		const root = workspaceRoot?.uri?.path;

		searchPick.onDidChangeValue(async (value: string) => {
			if (!value) {
				return searchPick.items = [];
			}

			let itemResults: vscode.QuickPickItem[] = [];
			let autoSuggestions: string[] = [];
			itemResults = [
				{label: value, description: ENTIRE_WORKSPACE_OPTION },
				{label: value, description: THIS_FILE_OPTION },
			];

			searchPick.items = itemResults;

			if (authToken) {
				const { data: autoCompleteData }: {data: string[]} = await axios.post(MINT_SEARCH_AUTOCOMPLETE, {
					query: value,
					root,
					authToken,
				});

				autoSuggestions = autoCompleteData;
			}
			const autoSuggestionResults = autoSuggestions.map((suggestion) => {
				return {
					label: suggestion,
					alwaysShow: true,
				};
			});
			itemResults = [
				{label: value, description: ENTIRE_WORKSPACE_OPTION },
				{label: value, description: THIS_FILE_OPTION },
				...autoSuggestionResults
			];

			return searchPick.items = itemResults;
		});
		searchPick.onDidChangeSelection(async (selectedItems) => {
			const selected = selectedItems[0];

			const { label: search, description: option } = selected;
			if (!search) {
				return null;
			}

			if (!authToken) {
				return showLoginMessage();
			}

			searchPick.value = search;
			const optionShort = getOptionShort(option);

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: `🔎 Mint searching across ${optionShort}`,
			},
			() => {
				return new Promise(async (resolve, reject) => {
					try {
						const files = await getFiles(option);
						const searchRes: {
								data: {
									results: SearchResult[], objectID: string
								}
						} = await axios.post(MINT_SEARCH_RESULTS, {
							files,
							search,
							root,
							authToken
						}, {
							maxContentLength: Infinity,
							maxBodyLength: Infinity,
						});

						const { results: searchResults, objectID } = searchRes.data;
						const resultItems = searchResults.length > 0 ? searchResults.map((result) => {
							return {
								label: result.content,
								detail: result.filename
							};
						}) : [
							{
								label: '📭',
								description: 'No results found. Try broadening your search',
								alwaysShow: true,
							}
						];
						
						searchPick.hide();

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
							const selectedIndex = searchResults.findIndex((result) => result.content === item.label);

							if (selectedIndex === -1) {return;}

							const selectedItem = searchResults[selectedIndex];

							const { path, lineStart, lineEnd } = selectedItem;
							const filePathUri = vscode.Uri.parse(path);
							const startPosition = new vscode.Position(lineStart, 0);
							const endPosition = new vscode.Position(lineEnd, 9999);
							const selectedRange = new vscode.Range(startPosition, endPosition);
							await vscode.window.showTextDocument(filePathUri, {
								selection: selectedRange,
							});

							try {
								axios.put(MINT_SEARCH_FEEDBACK, {
									authToken,
									objectID,
									engagedIndex: selectedIndex,
								});
							}
							catch (error: any) {
								const backendError = error?.response?.data;
								if (backendError) {
									const { shouldPromptWaitlist } = backendError;
									showErrorMessage(backendError.error,
										shouldPromptWaitlist && REQUEST_ACCESS_BUTTON,
										shouldPromptWaitlist && LOGOUT_BUTTON
									);
								}
							}
						});

						resolve('Completed search');
					} catch (error: any) {
						reject('Failed');
						const backendError = error?.response?.data;
						if (backendError) {
							const { shouldPromptWaitlist } = backendError;
							showErrorMessage(backendError.error,
								shouldPromptWaitlist && REQUEST_ACCESS_BUTTON,
								shouldPromptWaitlist && LOGOUT_BUTTON
							);
						}
					}
				});
			}
			);
		});
	});

	const ask = vscode.commands.registerCommand('mintlify.ask', async () => {
		const askPick = vscode.window.createQuickPick();
		askPick.title = "Mint Ask (beta)";
		askPick.placeholder = "What would you like to know?";
		askPick.show();

		// Retrieve tokens for auth
		const authToken = storageManager.getValue('authToken');
		// Retrieve for identification
		const workspaceRoot = vscode.workspace.workspaceFolders![0];
		const root = workspaceRoot?.uri?.path;

		askPick.onDidChangeValue(async (value) => {
			if (!value) {
				return askPick.items = [];
			}

			let itemResults: vscode.QuickPickItem[] = [];
			let autoSuggestions: string[] = [];
			itemResults = [
				{label: value, description: ENTIRE_WORKSPACE_OPTION },
				{label: value, description: THIS_FILE_OPTION },
			];

			askPick.items = itemResults;

			if (authToken) {
				const { data: autoCompleteData }: {data: string[]} = await axios.post(MINT_ASK_AUTOCOMPLETE, {
					query: value,
					root,
					authToken,
				});

				autoSuggestions = autoCompleteData;
			}
			const autoSuggestionResults = autoSuggestions.map((suggestion) => {
				return {
					label: suggestion,
					alwaysShow: true,
				};
			});
			itemResults = [
				{label: value, description: ENTIRE_WORKSPACE_OPTION },
				{label: value, description: THIS_FILE_OPTION },
				...autoSuggestionResults
			];

			return askPick.items = itemResults;
		});
		askPick.onDidChangeSelection(async (selectedItems) => {
			const selected = selectedItems[0];

			if (!selected) {return;}

			const { label: question, description: option } = selected;
			if (!question) {
				return null;
			}

			if (!authToken) {
				return showLoginMessage();
			}

			askPick.value = question;
			const optionShort = getOptionShort(option);

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: `🎤 Mint answering from ${optionShort}`,
			},
			() => {
				return new Promise(async (resolve, reject) => {
					try {
						const files = await getFiles(option);
						const searchRes = await axios.post(MINT_ASK_ANSWER, {
							files,
							question,
							root,
							authToken
						}, {
							maxContentLength: Infinity,
							maxBodyLength: Infinity,
						});

						let { answer, objectID } = searchRes.data;
						if (!answer) {
							answer = 'No answer found';
						}

						askPick.hide();

						const answerPick = vscode.window.createQuickPick();
						answerPick.title = "Mint Answer Results";
						answerPick.placeholder = question;
						answerPick.show();
						const answerByLine = answer.replace(/(?![^\n]{1,64}$)([^\n]{1,64})\s/g, '$1\n').split('\n');
						const itemsByLine =  answerByLine.map((line: string) => {
							return {
								label: line,
								alwaysShow: true
							};
						});

						answerPick.items = [...itemsByLine,
						{
							label: '👍',
							description: 'Answer is useful',
							alwaysShow: true,
						},
						{
							label: '🤷',
							description: 'Not enough information',
							alwaysShow: true,
						},
						{
							label: '🙅‍♂️',
							description: 'Answer is incorrect',
							alwaysShow: true,
						}
					];

					answerPick.onDidChangeSelection(async (selectedItems) => {
						const item = selectedItems[0];

						if (!item) {return;}

						let selectedFeedbackScore;
						switch (item.label) {
							case '🙅‍♂️':
								selectedFeedbackScore = 0;
								break;
							case '👍':
								selectedFeedbackScore = 1;
								break;
							case '🤷':
								selectedFeedbackScore = 2;
									break;
							default:
								selectedFeedbackScore = null;
								break;
						}

						try {
							await axios.put(MINT_ASK_FEEDBACK, {
								authToken,
								objectID,
								feedback: selectedFeedbackScore,
							});

							vscode.window.showInformationMessage('Feedback submitted');
						}
						catch (error: any) {
							const backendError = error?.response?.data;
							if (backendError) {
								const { shouldPromptWaitlist } = backendError;
								showErrorMessage(backendError.error,
									shouldPromptWaitlist && REQUEST_ACCESS_BUTTON,
									shouldPromptWaitlist && LOGOUT_BUTTON
								);
							}
						}
						finally {
							answerPick.dispose();
						}
					});

					resolve('Complete ask');
					}
					catch (error: any) {
						reject('Failed');
						const backendError = error?.response?.data;
						if (backendError) {
							const { shouldPromptWaitlist } = backendError;
							showErrorMessage(backendError.error,
								shouldPromptWaitlist && REQUEST_ACCESS_BUTTON,
								shouldPromptWaitlist && LOGOUT_BUTTON
							);
						}
					}
				});
			});
		});
	});

	const logout = vscode.commands.registerCommand('mintlify.logout', async () => {
		vscode.env.openExternal(vscode.Uri.parse(LOGOUT_URI));
	});

	const settings = vscode.commands.registerCommand('mintlify.settings', async () => {
		const authToken = storageManager.getValue('authToken');
		showSettings(authToken != null);
	});

	vscode.window.registerUriHandler({
    async handleUri(uri: vscode.Uri) {
      if (uri.path === '/auth') {
        const query = new URLSearchParams(uri.query);

				const code = query.get('code');
				try {
					const authResponse = await axios.post(MINT_USER_CODE, {code});
					const { authToken } = authResponse.data;
					storageManager.setValue('authToken', authToken);
					showInformationMessage('Logged in to Mintlify');
				} catch (error) {
					console.log({error});
				}
      } else if (uri.path === '/logout') {
				storageManager.setValue('authToken', null);
				showLoginMessage();
			}
    }
  });

	context.subscriptions.push(search, ask, logout, settings);
}

// this method is called when your extension is deactivated
export function deactivate() {}
