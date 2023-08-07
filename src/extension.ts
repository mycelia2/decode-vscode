import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { createChatSession } from "./db";
import { parseAndStoreFile } from "./fileParser";
import { loginUser } from "./ui/Login";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "decode-vs-code" is now active!'
  );

  let panel: vscode.WebviewPanel | undefined;

  let loginDisposable = vscode.commands.registerCommand(
    "decode-vs-code.login",
    async () => {
      if (!panel) {
        panel = vscode.window.createWebviewPanel(
          "decodeVscodeLogin",
          "Login",
          vscode.ViewColumn.One,
          { enableScripts: true }
        );

        const htmlPath = path.join(
          context.extensionPath,
          "src",
          "webview.html"
        );
        const htmlContent = fs.readFileSync(htmlPath, "utf8");
        panel.webview.html = htmlContent;

        panel.webview.onDidReceiveMessage(async (message) => {
          switch (message.command) {
            case "login":
              const user = await loginUser(
                context,
                message.email,
                message.password
              );
              panel?.webview.postMessage({ command: "loginResponse", user });
              break;
            case "navigateToChatDetails":
              const navSessionId = message.sessionId;
              panel?.webview.postMessage({
                command: "navigateToChatDetails",
                sessionId: navSessionId,
              });
              break;
            case "createNewChatSession":
              const createdSessionId = await createChatSession(message.userId);
              panel?.webview.postMessage({
                command: "chatSessionCreated",
                sessionId: createdSessionId,
              });
              break;
          }
        }, undefined);
      } else {
        panel.reveal(vscode.ViewColumn.One);
      }
    }
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (document) => {
      const fileContent = document.getText();
      await parseAndStoreFile(document.uri.fsPath, fileContent);
    }),
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      const fileContent = document.getText();
      await parseAndStoreFile(document.uri.fsPath, fileContent);
    }),
    loginDisposable
  );
}

export function deactivate() {
  // Close any open connections or cleanup resources if necessary.
}
