"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOptionShort = exports.getFiles = exports.THIS_FILE_OPTION = exports.ENTIRE_WORKSPACE_OPTION = exports.LOGOUT_BUTTON = exports.REQUEST_ACCESS_BUTTON = exports.SIGN_IN_BUTTON = exports.REQUEST_ACCESS_URI = void 0;
const vscode = require("vscode");
exports.REQUEST_ACCESS_URI = 'https://mintlify.com/start-minting';
exports.SIGN_IN_BUTTON = 'Sign in';
exports.REQUEST_ACCESS_BUTTON = 'Request access';
exports.LOGOUT_BUTTON = 'Logout';
const traverseFiles = async (root, filesContent) => {
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
};
const isTraversablePath = (folderName) => {
    const nonTraversable = {
        "node_modules": true,
        ".git": true,
        "build": true,
    };
    return !nonTraversable[folderName];
};
exports.ENTIRE_WORKSPACE_OPTION = 'Search entire workspace';
exports.THIS_FILE_OPTION = 'Search this file';
const getFiles = async (option = exports.ENTIRE_WORKSPACE_OPTION) => {
    if (option === exports.ENTIRE_WORKSPACE_OPTION) {
        const root = vscode.workspace.workspaceFolders[0].uri;
        const files = await traverseFiles(root, []);
        return files;
    }
    else if (option === exports.THIS_FILE_OPTION) {
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
exports.getFiles = getFiles;
const getOptionShort = (option = exports.ENTIRE_WORKSPACE_OPTION) => {
    switch (option) {
        case exports.ENTIRE_WORKSPACE_OPTION:
            return 'the workspace';
        case exports.THIS_FILE_OPTION:
            return 'this file';
        default:
            return '';
    }
};
exports.getOptionShort = getOptionShort;
//# sourceMappingURL=utils.js.map