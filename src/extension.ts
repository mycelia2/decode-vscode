import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { app, RealmInstance, ChatSession, ChatDetail } from "./db";
import { parseAndStoreFile } from "./fileParser";
import { loginUser } from "./auth";

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
              const user = await loginUser(message.email, message.password);
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
              const realm = RealmInstance.getInstance();
              realm.write(() => {
                const newChatSession = realm.create(ChatSession, {
                  userId: app.currentUser?.id,
                  startTime: new Date(),
                  lastMessagePreview: "",
                  status: "active",
                  unreadCount: 0,
                });
              });
              panel?.webview.postMessage({
                command: "chatSessionCreated",
              });
              break;
            case "sendMessageToAI":
              try {
                const aiResponse = await sendMessageToAI(message.message);
                panel?.webview.postMessage({
                  command: "aiResponse",
                  message: aiResponse.response,
                });

                // Store the user's message and the AI's response in the ChatDetail Realm object
                const realm = RealmInstance.getInstance();
                realm.write(() => {
                  realm.create(ChatDetail, {
                    sessionId: message.sessionId,
                    message: message.message,
                    timestamp: new Date(),
                    sender: "user",
                  });
                  realm.create(ChatDetail, {
                    sessionId: message.sessionId,
                    message: aiResponse.response,
                    timestamp: new Date(),
                    sender: "ai",
                  });
                });

                // Update the corresponding ChatSession object
                const chatSession = realm.objectForPrimaryKey(
                  ChatSession,
                  message.sessionId
                );
                if (chatSession) {
                  realm.write(() => {
                    chatSession.lastMessagePreview = aiResponse.response;
                    chatSession.unreadCount += 1;
                  });
                }
              } catch (error) {
                console.error("Failed to send message to AI:", error);
              }
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
