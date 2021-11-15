import * as vscode from 'vscode';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { traverseFiles, File } from './utils';
import { LOGIN_URI } from './auth';

type SearchResult = {
	path: string;
	filename: string;
	content: string;
	lineStart: number;
	lineEnd: number;
};

type Doc = {
	doc: string;
	insertPosition: vscode.Position;
};

const ENTIRE_WORKSPACE_OPTION = 'Search entire workspace';
const THIS_FILE_OPTION = 'Search this file';

const SIGN_IN_BUTTON = 'Sign in';

const getFiles = async (option: string): Promise<File[]> => {
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

const getOptionShort = (option: string): string => {
	switch (option) {
		case ENTIRE_WORKSPACE_OPTION:
			return 'the workspace';
		case THIS_FILE_OPTION:
			return 'this file';
		default:
			return '';
	}
};

export function activate(context: vscode.ExtensionContext) {

	vscode.window.registerUriHandler({
    async handleUri(uri: vscode.Uri) {
      if (uri.path === '/auth') {
        const query = new URLSearchParams(uri.query);

				const code = query.get('code');
				console.log({code});
      }
    }
  });

	vscode.window.showInformationMessage('🌿 Sign in to use Mintlify search', SIGN_IN_BUTTON)
		.then((selectedValue) => {
			if (selectedValue === SIGN_IN_BUTTON) {
				vscode.env.openExternal(vscode.Uri.parse(LOGIN_URI));
			}
		});

	const search = vscode.commands.registerCommand('mintlify.search', async () => {
		const quickPick = vscode.window.createQuickPick();
		quickPick.title = "Mint Search";
		quickPick.placeholder = "What would you like to find?";
		quickPick.show();

		quickPick.onDidChangeValue((value: string) => {
			let itemResults: vscode.QuickPickItem[] = [];
			if (value) {
				// TODO: Add dynamic autocompletes
				itemResults = [{label: value, description: ENTIRE_WORKSPACE_OPTION }, {label: value, description: THIS_FILE_OPTION }];
			}

			return quickPick.items = itemResults;
		});
		quickPick.onDidChangeSelection(async (selectedItems) => {
			const selected = selectedItems[0];

			const { label: search, description: option } = selected;
			if (!search || !option) {
				return null;
			}

			quickPick.value = search;
			const optionShort = getOptionShort(option);

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: `🔎 Mint searching across ${optionShort}`,
			},
			() => {
				return new Promise(async (resolve) => {
					const files = await getFiles(option);
					const searchRes = await axios.post('http://localhost:5000/search/results', {
						files,
						search,
					}, {
						maxContentLength: Infinity,
						maxBodyLength: Infinity,
					});

					const searchResults: SearchResult[] = searchRes.data.results;
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

	const documentFile = vscode.commands.registerCommand('mintlify.documentFile', async () => {
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Generating documentation',
      cancellable: true,
    }, () => {
      return new Promise(async (resolve) => {
				const editor = vscode.window.activeTextEditor;
				if(editor) {
					const files = await getFiles(THIS_FILE_OPTION);
					try {
						const documentRes = await axios.post(`http://localhost:5000/document/file`, {
							files
						});
						const docs: Doc[] = documentRes.data.documents;
						docs.forEach(doc => {
							const snippet = new vscode.SnippetString(`${doc.doc}\n`);
							editor.insertSnippet(snippet, doc.insertPosition);
						});
						resolve('Complete docstring generation');
					} catch (err: any) {
						let errorMessage = 'Error';
						if (err.response.data.error) {
							errorMessage = err.response.data.error;
						}
						vscode.window.showErrorMessage(errorMessage);
						resolve(errorMessage);
					}
				}
      });
    });
  });

	context.subscriptions.push(search, ask, documentFile);
}

// this method is called when your extension is deactivated
export function deactivate() {}
