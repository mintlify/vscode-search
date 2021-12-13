import * as vscode from 'vscode';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { showInformationMessage, refreshHistoryTree, showLoginMessage } from './utils';
import { MINT_USER_CODE } from './constants/api';
import { LocalStorageService } from './constants/types';

export const initializeAuth = (storageManager: LocalStorageService) => {
  vscode.window.registerUriHandler({
    async handleUri(uri: vscode.Uri) {
      if (uri.path === '/auth') {
        const query = new URLSearchParams(uri.query);
  
        const code = query.get('code');
        const uriScheme = vscode.env.uriScheme;
        try {
          const authResponse = await axios.post(MINT_USER_CODE, { code, uriScheme });
          const { authToken, email } = authResponse.data;
          storageManager.setValue('authToken', authToken);
          refreshHistoryTree();
  
          showInformationMessage(`Logged in to Mintlify as ${email}`);
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