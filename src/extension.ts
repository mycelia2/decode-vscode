import * as vscode from "vscode";
import { TreeViewProvider } from "./treeViewProvider";
import { createChatSession } from "./chatSessionManager";
import { getWebviewContent, handleWebviewMessage } from "./webviewManager";
import { IUser } from "./db";

export async function activate(context: vscode.ExtensionContext) {
  try {
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

        panel.webview.html = getWebviewContent(panel, context);

        // Send necessary data to the webview
        panel.webview.postMessage({
          command: "initialize",
          currentUser: context.globalState.get("currentUser") as IUser,
          // Add any necessary data here
        });

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage((message) => {
          handleWebviewMessage(message, panel, context);
        });
      }
    );

    context.subscriptions.push(disposable);

    let createChatSessionDisposable = vscode.commands.registerCommand(
      "decode-vs-code.createChatSession",
      async () => {
        await createChatSession(context);
        treeViewProvider.refresh();
      }
    );

    context.subscriptions.push(createChatSessionDisposable);

    let loginDisposable = vscode.commands.registerCommand(
      "decode-vs-code.openLogin",
      () => {
        const panel = vscode.window.createWebviewPanel(
          "decodeVscodeLogin",
          "Login",
          vscode.ViewColumn.One,
          {
            enableScripts: true,
          }
        );

        panel.webview.html = getWebviewContent(panel, context);

        // Send necessary data to the webview
        panel.webview.postMessage({
          command: "initialize",
          currentUser: context.globalState.get("currentUser") as IUser,
          // Add any necessary data here
        });

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage((message) => {
          handleWebviewMessage(message, panel, context);
        });
      }
    );
    context.subscriptions.push(loginDisposable);

    let refreshTreeViewDisposable = vscode.commands.registerCommand(
      "decode-vs-code.refreshTreeView",
      () => {
        treeViewProvider.refresh();
      }
    );

    context.subscriptions.push(refreshTreeViewDisposable);
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
