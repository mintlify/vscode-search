import * as vscode from 'vscode';
import axios from 'axios';
import { MINT_SEARCH_HISTORY } from '../api';

export default class HistoryProvider implements vscode.TreeDataProvider<SearchHistory> {
  constructor(private authToken: string | null) {}

  getTreeItem(element: SearchHistory): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SearchHistory): Promise<SearchHistory[]> {
    if (!this.authToken) {
      return Promise.resolve([]);
    }
    if (element) {
      return Promise.resolve([]);
    } else {
      const { data: { history } } = await axios.post(MINT_SEARCH_HISTORY, {
        authToken: this.authToken
      });
      const searchHistory = history.map((search: { query: string }) => {
        return new SearchHistory(search.query, '20 seconds ago', vscode.TreeItemCollapsibleState.None);
      });
      return Promise.resolve(searchHistory);
    }
  }
}

class SearchHistory extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    private relativeTime: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}-${this.relativeTime}`;
    this.description = this.relativeTime;
  }
}
