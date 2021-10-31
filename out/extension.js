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
        const autoCompleteResponses = {
            'Wh': ['What functions are in utility.js?', 'Where are we initializing Mongoose?', 'What is AuthToken?'],
            'Whe': ['Where are we initializing Mongoose?', 'Where is activate() function?', 'Where is searchResults returned?'],
            'Where ': ['Where are we initializing Mongoose?', 'Where is activate() function?', 'Where is searchResults returned?'],
            'Where a': ['Where are we initializing Mongoose?', 'Where at utils?', 'Where are we creating a user token?'],
            'Where ar': ['Where are we initializing Mongoose?', 'Where are user tokens used?', 'Where are subscriptions created'],
            'Where are w': ['Where are we initializing Mongoose?', 'Where are we creating subscriptions?', 'Where are we supporting test cases?'],
            'Where are we c': ['Where are we creating subscriptions?', 'Where are we casting variables?', 'Where are we cancelling subscriptions'],
            'Where are we ca': ['Where are we casting variables?', 'Where are we cancelling subscriptions', 'Where are we cancelling listeners?'],
            'Where are we can': ['Where are we cancelling subscriptions', 'Where are we cancelling listeners?', 'Where are we cancelling the stripe subscription?'],
            'Where are we cancelling t': ['Where are we cancelling the stripe subscription?'],
            'Where are we cancelling the stripe subscription?': [],
            'Where are we cr': ['Where are we creating subscriptions?', 'Where are we creating express instance?', 'Where are we creating the Payment type?'],
            'Where are we creating c': ['Where are we creating checkouts?'],
            'Where are we creating checkout sessions?': [],
            'Where i': ['Where instance user data?', 'Where in src are we storing helpers?', 'Where is the signIn function?'],
            'Where is': ['Where is the signIn function?', 'Where is class UserData defined?'],
            'Where is t': ['Where is the signIn function?', 'Where is the body css attribute?', 'Where is tsconfig.json'],
            'Where is th': ['Where is the signIn function?', 'Where is the body css attribute?'],
            'Where is the h': [],
            'Where is the head of the main dashboard page': [],
            'Wha': ['What is express?', 'What can morgan do?', 'What is the header CSS class?'],
            'What i': ['What is express?', 'What is the header CSS class?', 'What is the function getSectionedWebPageContent doing?'],
            'What is e': ['What is express?', 'What is express.Router?'],
            'What is express.': ['What is express.Router?'],
            'What is express.Router ': [],
            'What is express.Router doing?': [],
            'What d': ['What does express.listen do?', 'What do axios requests return?', 'What does sessionId track?'],
            'What doe': ['What does express.listen do?', 'What does sessionId track?', 'What does AuthToken.findOne do?'],
            'What does A': ['What does AuthToken store?', 'What does AuthToken.findOne do?'],
            'What does AuthToken.': ['What does AuthToken.findOne do?'],
            'What does AuthToken.findOne do?': [],
            'G': ['Get the body section in index.html', 'Get the css class for h1', 'Get an await async use case'],
            'Get t': ['Get the body section in index.html', 'Get the css class for h1', 'Get the css class for body'],
            'Get the q': ['Get the quickstart section', 'Get the quicksort implementation'],
            'Get the quicks': ['Get the quicksort function'],
            'Get the quicksort implementation in Python': [],
        };
        let lastActiveAutocomplete = [];
        quickPick.onDidChangeValue((value) => {
            let itemResults = [];
            if (value) {
                if (autoCompleteResponses[value]) {
                    lastActiveAutocomplete = autoCompleteResponses[value];
                }
                // TODO: Add dynamic autocompletes
                const autoComplete = lastActiveAutocomplete.map((auto) => {
                    return {
                        label: auto
                    };
                });
                itemResults = [{ label: value, description: "Search entire workspace" }, { label: value, description: "Search this file" }, ...autoComplete];
            }
            return quickPick.items = itemResults;
        });
        quickPick.onDidChangeSelection(async (selectedItems) => {
            const selected = selectedItems[0];
            const search = selected?.label;
            if (!search) {
                return null;
            }
            quickPick.value = search;
            const root = vscode.workspace.workspaceFolders[0].uri;
            const files = await (0, utils_1.traverseFiles)(root, []);
            const searchRes = await axios_1.default.post('http://localhost:5000/search/results', {
                files,
                search,
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
        });
    });
    context.subscriptions.push(search, ask);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map