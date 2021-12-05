import * as vscode from 'vscode';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { showInformationMessage, refreshHistoryTree, showLoginMessage } from './utils';
import { MINT_USER_CODE } from './constants/api';
import { SUPPORTED_FILE_EXTENSIONS } from './constants/content';
import { LocalStorageService } from './constants/types';

export const initializeAuth = (storageManager: LocalStorageService) => {
  vscode.window.registerUriHandler({
    async handleUri(uri: vscode.Uri) {
      if (uri.path === '/auth') {
        const query = new URLSearchParams(uri.query);
  
        const code = query.get('code');
        try {
          const authResponse = await axios.post(MINT_USER_CODE, {code});
          const { authToken } = authResponse.data;
          storageManager.setValue('authToken', authToken);
          refreshHistoryTree();
  
          showInformationMessage('Logged in to Mintlify');
        } catch (err) {
          console.log(err);
          vscode.window.showErrorMessage('Error authenticating user');
        }
      } else if (uri.path === '/logout') {
        storageManager.setValue('authToken', null);
        refreshHistoryTree();
  
        showLoginMessage();
      }
    }
  });
};

// Setup listener for file event changes
// const uploadWorkspace = () => {
//   vscode.commands.executeCommand('mintlify.upload');
// };

// Todo: setup only relevant files
// const watcher = vscode.workspace.createFileSystemWatcher(`**/*.{${SUPPORTED_FILE_EXTENSIONS.join(',')}}`, true);
// watcher.onDidChange(() => {
//   uploadWorkspace();
// });
// watcher.onDidDelete(() => {
//   // uploadWorkspace()
// });
