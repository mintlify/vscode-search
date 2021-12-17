import * as vscode from 'vscode';
import TimeAgo from 'javascript-time-ago';
import axios from 'axios';
import { MINT_SEARCH_HISTORY } from '../constants/api';
import { getRootPath } from '../helpers/content';
// @ts-ignore
import en from 'javascript-time-ago/locale/en';

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo('en-US');

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
      const root = getRootPath();
      const { data: { history } } = await axios.post(MINT_SEARCH_HISTORY, {
        authToken: this.authToken,
        root,
      });
      const searchHistory = history.map((search: { query: string, timestamp: string }) => {
        const relativeTime = timeAgo.format(Date.parse(search.timestamp), 'round') as string;
        return new SearchHistory(search.query, relativeTime);
      });
      return Promise.resolve(searchHistory);
    }
  }

  private _onDidChangeTreeData: vscode.EventEmitter<SearchHistory | undefined | null | void> = new vscode.EventEmitter<SearchHistory | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SearchHistory | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

class SearchHistory extends vscode.TreeItem {
  constructor(
    public readonly search: string,
    private relativeTime: string
  ) {
    super(search);
    this.tooltip = `${this.search}-${this.relativeTime}`;
    this.description = this.relativeTime;

    const onClickCommand: vscode.Command = {
      title: 'Search',
      command: 'mintlify.search',
      arguments: [{
        search: this.search,
      }]
    };
    this.command = onClickCommand;
  }
}
