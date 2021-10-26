import * as vscode from 'vscode';
import axios from 'axios';

type File = {
	path: string;
	filename: string;
	content: string;
};

type SearchResult = {
	path: string;
	startLine: number;
	endLine: number;
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "mintlify" is now active!');

	const find = vscode.commands.registerCommand('mintlify.search', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user

		const quickPick = vscode.window.createQuickPick();
		quickPick.title = "Mint Search";
		quickPick.placeholder = "What would you like to ask?";
		quickPick.onDidChangeValue((value) => {
			let itemResults: vscode.QuickPickItem[] = [];
			if (value) {
				// TODO: Add autocompletes
				itemResults = [{label: value, description: "Search entire workspace" }, {label: value, description: "Search this file" }];
			}

			return quickPick.items = itemResults;

		});
		quickPick.onDidChangeSelection(async (selectedItems) => {
			const selected = selectedItems[0];

			const root = vscode.workspace.workspaceFolders![0]!.uri;
			const files = await traverseFiles(root, []);

			const searchRes = await axios.post('http://localhost:5000/search/results', {
				files,
				search: selected.label
			});

			console.log(searchRes.data);
			
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

async function traverseFiles(root: vscode.Uri, filesContent: File[]): Promise<File[]> {
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
}

function isTraversablePath(folderName: string): boolean {
	const nonTraversable: Record<string, boolean> = {
		"node_modules": true,
		".git": true,
	};

	return !nonTraversable[folderName];
}

// this method is called when your extension is deactivated
export function deactivate() {}
