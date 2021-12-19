import * as vscode from 'vscode';

export type SearchResult = {
	path: string;
	filename: string;
	content: string;
	lineStart: number;
	lineEnd: number;
};

export class LocalStorageService {
  constructor(private storage: vscode.Memento) {}
	
  public getValue(key: string) {
    return this.storage.get(key, null);
  }

  public setValue(key: string, value: string | null) {
    this.storage.update(key, value);
  }
}

export type File = {
	path: string;
	filename: string;
	content: string;
	isCurrentActiveFile?: boolean;
};

export type TraversedFileData = {
	files: File[];
	skippedFileTypes: Set<string>;
};