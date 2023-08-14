import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { RealmInstance, ChatSession } from "./db";
import {
  generateProjectStructure,
  getAutoCompleteSuggestions,
  getElementDetails,
} from "./codeParser";

class TreeViewProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<
    vscode.TreeItem | undefined
  > = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    console.log("getTreeItem", element);
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (!element) {
      const userId = this._context.globalState.get("userId");
      if (userId) {
        return fetchChatSessions(userId.toString()).then((sessions) => {
          console.log("getChildren", sessions);
          return sessions.map(
            (session) => new vscode.TreeItem(session.lastMessagePreview)
          );
        });
      } else {
        const loginTreeItem = new vscode.TreeItem(
          "Please log in to view chat sessions."
        );
        loginTreeItem.command = {
          command: "decode-vs-code.openChatDetails",
          title: "Open Chat Details",
          arguments: [],
        };
        console.log("getChildren", [loginTreeItem]);
        return Promise.resolve([loginTreeItem]);
      }
    }
    console.log("getChildren", []);
    return Promise.resolve([]);
  }
}

export async function activate(context: vscode.ExtensionContext) {
  try {
    RealmInstance.initialize(context);
    context.globalState.update("userId", null);

    const treeViewProvider = new TreeViewProvider(context);
    vscode.window.registerTreeDataProvider("decode-vs-code", treeViewProvider);

    console.log(
      'Congratulations, your extension "decode-vs-code" is now active!'
    );

    let disposable = vscode.commands.registerCommand(
      "decode-vs-code.openChatDetails",
      () => {
        const panel = vscode.window.createWebviewPanel(
          "decodeVscodeChatDetails",
          "Chat Details",
          vscode.ViewColumn.One,
          {
            enableScripts: true,
          }
        );

        // Get the full path to bundle.js
        const bundleJsPathOnDisk = vscode.Uri.file(
          path.join(context.extensionPath, "dist", "bundle.js")
        );

        // Convert the file path to a URI for the webview
        const bundleJsUri = panel.webview.asWebviewUri(bundleJsPathOnDisk);

        // Get the content of webview.html and replace the bundle.js src with the URI
        const webviewHtml = fs
          .readFileSync(
            path.join(context.extensionPath, "webview.html"),
            "utf-8"
          )
          .replace(
            /<script src="bundle.js"><\/script>/,
            `<script src="${bundleJsUri}"></script>`
          );

        panel.webview.html = webviewHtml;

        // Send necessary data to the webview
        panel.webview.postMessage({
          command: "initialize",
          // Add any necessary data here
        });

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage((message) => {
          switch (message.command) {
            case "login":
              const user = message.user;
              context.globalState.update("userId", user._id.toString());
            case "generateProjectStructure":
              // Call the generateProjectStructure function from your code parsing module
              const structure = generateProjectStructure(
                message.rootPath,
                message.defaultZoomLevel,
                message.config,
                message.zoomOverrides
              );
              panel.webview.postMessage({
                command: "projectStructure",
                structure,
              });
              break;
            case "getAutoCompleteSuggestions":
              // Call the getAutoCompleteSuggestions function from your code parsing module
              const suggestions = getAutoCompleteSuggestions(
                message.rootPath,
                message.inputValue,
                message.config
              );
              panel.webview.postMessage({
                command: "autoCompleteSuggestions",
                suggestions,
              });
              break;
            case "getElementDetails":
              // Call the getElementDetails function from your code parsing module
              const details = getElementDetails(
                message.elementIdentifier,
                message.filePath
              );
              panel.webview.postMessage({ command: "elementDetails", details });
              break;
            // Handle other commands as needed
          }
        });
      }
    );

    context.subscriptions.push(disposable);

    let createChatSessionDisposable = vscode.commands.registerCommand(
      "decode-vs-code.createChatSession",
      async () => {
        const userId = context.globalState.get("userId");
        if (userId) {
          await createChatSession(userId.toString());
          treeViewProvider.refresh();
        }
      }
    );

    context.subscriptions.push(createChatSessionDisposable);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to activate the extension: ${error.message}`);
      vscode.window.showErrorMessage(
        `Failed to activate the extension: ${error.message}`
      );
    } else {
      console.error(`Failed to activate the extension: ${error}`);
      vscode.window.showErrorMessage(
        `Failed to activate the extension: ${error}`
      );
    }
  }
}

export function deactivate() {
  // Clean up any resources if needed
}

async function fetchChatSessions(userId: string): Promise<ChatSession[]> {
  const realm = await RealmInstance.getInstance();
  const chatSessions = realm
    .objects<ChatSession>("ChatSession")
    .filtered(`userId = "${userId}"`);
  return Array.from(chatSessions);
}

async function createChatSession(userId: string): Promise<void> {
  const realm = await RealmInstance.getInstance();
  realm.write(() => {
    realm.create<ChatSession>("ChatSession", {
      userId,
      startTime: new Date(),
      lastMessagePreview: "",
      status: "active",
      unreadCount: 0,
    });
  });
}

async function sendMessageToAI(message: string) {
  const response = await fetch("http://localhost:8000/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: [{ role: "user", content: message }] }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}
