"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "mintlify" is now active!');
    const find = vscode.commands.registerCommand('mintlify.find', async () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = "Mint Search";
        quickPick.placeholder = "What would you like to ask?";
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
            const root = vscode.workspace.workspaceFolders[0].uri;
            const filesContent = await traverseFiles(root, []);
            console.log(filesContent);
            quickPick.value = '';
            quickPick.items = [{ label: "Results" }];
        });
        quickPick.show();
        // Call API to sort through the files and returns results
        // const simulateResult: Result = {
        // 	path: 'file:///Users/hanwang/Desktop/figstack/backend/src/prompts/explain.ts',
        // 	start: { line: 10, character: 2 },
        // 	end: { line: 15, character: 99 },
        // };
        // const { path, start, end } = simulateResult;
        // const filePathUri = vscode.Uri.parse(path);
        // const startPosition = new vscode.Position(start.line, start.character);
        // const endPosition = new vscode.Position(end.line, end.character);
        // const selectedRange = new vscode.Range(startPosition, endPosition);
        // const editor = await vscode.window.showTextDocument(filePathUri, {
        // 	selection: selectedRange
        // });
        // editor.revealRange(selectedRange);
    });
    context.subscriptions.push(find);
}
exports.activate = activate;
async function traverseFiles(root, filesContent) {
    const files = await vscode.workspace.fs.readDirectory(root);
    const filePromises = files.map(async (file, i) => {
        // If filetype is a file
        if (file[1] === 1) {
            const filePath = `${root}/${file[0]}`;
            const readFileUri = vscode.Uri.parse(filePath);
            const readFileRaw = await vscode.workspace.fs.readFile(readFileUri);
            const readFileContent = { path: filePath, content: readFileRaw.toString() };
            filesContent.push(readFileContent);
        }
        else if (file[1] === 2 && isTraversablePath(file[0])) {
            const newRoot = vscode.Uri.parse(`${root}/${file[0]}`);
            await traverseFiles(newRoot, filesContent);
        }
    });
    await Promise.all(filePromises);
    return filesContent;
}
function isTraversablePath(folderName) {
    const nonTraversable = {
        "node_modules": true,
        ".git": true,
    };
    return !nonTraversable[folderName];
}
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map