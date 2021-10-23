// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

type File = {
	path: string;
	content: string;
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "mintlify" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('mintlify.helloWorld', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		const root = vscode.workspace.workspaceFolders![0]!.uri;
		const filesContent = await traverseFiles(root, []);

		console.log(filesContent);
	});

	context.subscriptions.push(disposable);
}

async function traverseFiles(root: vscode.Uri, filesContent: File[]): Promise<File[]> {
	const files = await vscode.workspace.fs.readDirectory(root);
	const filePromises = files.map(async (file, i) => {
		// If filetype is a file
		if (file[1] === 1) {
			const filePath = `${root}/${file[0]}`;
			const readFileUri = vscode.Uri.parse(filePath);
			const readFileRaw = await vscode.workspace.fs.readFile(readFileUri);
			const readFileContent = { path: filePath, content: readFileRaw.toString()};
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
