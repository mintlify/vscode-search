"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.traverseFiles = void 0;
const vscode = require("vscode");
async function traverseFiles(root, filesContent) {
    const files = await vscode.workspace.fs.readDirectory(root);
    const filePromises = files.map(async (file, i) => {
        // If filetype is a file
        if (file[1] === 1) {
            const filePath = `${root}/${file[0]}`;
            const readFileUri = vscode.Uri.parse(filePath);
            const readFileRaw = await vscode.workspace.fs.readFile(readFileUri);
            const readFileContent = { path: filePath, filename: file[0], content: readFileRaw.toString() };
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
exports.traverseFiles = traverseFiles;
function isTraversablePath(folderName) {
    const nonTraversable = {
        "node_modules": true,
        ".git": true,
        "build": true,
    };
    return !nonTraversable[folderName];
}
//# sourceMappingURL=utils.js.map