"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const axios_1 = require("axios");
const utils_1 = require("./utils");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "mintlify" is now active!');
    const search = vscode.commands.registerCommand('mintlify.search', async () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = "Mint Search";
        quickPick.placeholder = "What would you like to find?";
        quickPick.show();
        quickPick.onDidChangeValue((value) => {
            let itemResults = [];
            if (value) {
                // TODO: Add autocompletes
                itemResults = [{ label: value, description: "Search entire workspace" }, { label: value, description: "Search this file" }];
            }
            return quickPick.items = itemResults;
        });
        quickPick.onDidChangeSelection(async (selectedItems) => {
            const selected = selectedItems[0];
            const search = selected?.label;
            if (!search) {
                return null;
            }
            const root = vscode.workspace.workspaceFolders[0].uri;
            const files = await (0, utils_1.traverseFiles)(root, []);
            const searchRes = await axios_1.default.post('http://localhost:5000/search/results', {
                files,
                search,
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
        });
    });
    const ask = vscode.commands.registerCommand('mintlify.ask', async () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = "Mint Ask";
        quickPick.placeholder = "What would you like to know?";
        quickPick.show();
        quickPick.onDidChangeValue((value) => {
            let itemResults = [];
            if (value) {
                // TODO: Add autocompletes
                itemResults = [{ label: value, description: "Search entire workspace" }, { label: value, description: "Search this file" }];
            }
            return quickPick.items = itemResults;
        });
        quickPick.onDidChangeSelection(async (selectedItems) => {
            const selected = selectedItems[0];
            const question = selected?.label;
            if (!question) {
                return null;
            }
            const root = vscode.workspace.workspaceFolders[0].uri;
            const files = await (0, utils_1.traverseFiles)(root, []);
            const searchRes = await axios_1.default.post('http://localhost:5000/ask/answer', {
                files,
                question,
            });
            const answer = searchRes.data.answer;
            quickPick.hide();
            const answerPick = vscode.window.createQuickPick();
            answerPick.items = [{ label: answer }];
            answerPick.title = "Mint Answer Results";
            answerPick.placeholder = question;
            answerPick.show();
        });
    });
    context.subscriptions.push(search, ask);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map