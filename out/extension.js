"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const axios_1 = require("axios");
const url_1 = require("url");
const utils_1 = require("./utils");
const auth_1 = require("./auth");
class LocalStorageService {
    constructor(storage) {
        this.storage = storage;
    }
    getValue(key) {
        return this.storage.get(key, null);
    }
    setValue(key, value) {
        this.storage.update(key, value);
    }
}
const showLoginMessage = () => {
    vscode.window.showInformationMessage('🌿 Sign in to use Mintlify search', utils_1.SIGN_IN_BUTTON)
        .then((selectedValue) => {
        if (selectedValue === utils_1.SIGN_IN_BUTTON) {
            vscode.env.openExternal(vscode.Uri.parse(auth_1.LOGIN_URI));
        }
    });
};
function activate(context) {
    // Set storage manager for auth tokens
    const storageManager = new LocalStorageService(context.globalState);
    const getTokens = () => {
        return {
            accessToken: storageManager.getValue('accessToken'),
            refreshToken: storageManager.getValue('refreshToken')
        };
    };
    const setTokens = ({ accessToken, refreshToken }) => {
        storageManager.setValue('accessToken', accessToken);
        storageManager.setValue('refreshToken', refreshToken);
    };
    const { accessToken } = getTokens();
    if (!accessToken) {
        showLoginMessage();
    }
    const search = vscode.commands.registerCommand('mintlify.search', async () => {
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = "Mint Search";
        quickPick.placeholder = "What would you like to find?";
        quickPick.show();
        quickPick.onDidChangeValue((value) => {
            let itemResults = [];
            if (value) {
                // TODO: Add dynamic autocompletes
                itemResults = [{ label: value, description: utils_1.ENTIRE_WORKSPACE_OPTION }, { label: value, description: utils_1.THIS_FILE_OPTION }];
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
            const optionShort = (0, utils_1.getOptionShort)(option);
            const { accessToken, refreshToken } = getTokens();
            if (!accessToken) {
                return showLoginMessage();
            }
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `🔎 Mint searching across ${optionShort}`,
            }, () => {
                return new Promise(async (resolve, reject) => {
                    try {
                        const files = await (0, utils_1.getFiles)(option);
                        const searchRes = await axios_1.default.post('http://localhost:5000/search/results', {
                            files,
                            search,
                            accessToken,
                            refreshToken
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
                            if (!itemContext) {
                                return null;
                            }
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
                            if (!itemContext) {
                                return null;
                            }
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
                    }
                    catch (error) {
                        reject('Failed');
                        const backendError = error?.response?.data;
                        if (backendError) {
                            const { shouldPromptWaitlist } = backendError;
                            const userActionOnError = await vscode.window.showErrorMessage(backendError.error, shouldPromptWaitlist && utils_1.REQUEST_ACCESS_BUTTON, shouldPromptWaitlist && utils_1.LOGOUT_BUTTON);
                            if (userActionOnError === utils_1.REQUEST_ACCESS_BUTTON) {
                                vscode.env.openExternal(vscode.Uri.parse(utils_1.REQUEST_ACCESS_URI));
                            }
                            else if (userActionOnError === utils_1.LOGOUT_BUTTON) {
                                vscode.commands.executeCommand('mintlify.logout');
                            }
                        }
                    }
                });
            });
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
            let itemResults = [];
            if (value) {
                itemResults = [{ label: value, description: utils_1.ENTIRE_WORKSPACE_OPTION }, { label: value, description: utils_1.THIS_FILE_OPTION }];
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
            const optionShort = (0, utils_1.getOptionShort)(option);
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `🎤 Mint answering from ${optionShort}`,
            }, () => {
                return new Promise(async (resolve) => {
                    const files = await (0, utils_1.getFiles)(option);
                    const searchRes = await axios_1.default.post('http://localhost:5000/ask/answer', {
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
        vscode.env.openExternal(vscode.Uri.parse(auth_1.LOGOUT_URI));
    });
    vscode.window.registerUriHandler({
        async handleUri(uri) {
            if (uri.path === '/auth') {
                const query = new url_1.URLSearchParams(uri.query);
                const code = query.get('code');
                try {
                    const authResponse = await axios_1.default.post('http://localhost:5000/user/code', { code });
                    const tokens = authResponse.data;
                    setTokens(tokens);
                }
                catch (error) {
                    console.log({ error });
                }
            }
            else if (uri.path === '/logout') {
                storageManager.setValue('accessToken', null);
                storageManager.setValue('refreshToken', null);
                showLoginMessage();
            }
        }
    });
    context.subscriptions.push(search, ask, logout);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map