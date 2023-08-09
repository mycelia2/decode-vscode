/**
 * "Decode VS Code" Extension
 *
 * This extension is designed to enhance the user experience in Visual Studio Code by providing
 * additional features such as user authentication, real-time chat with an AI, and file parsing.
 *
 * Key Features:
 * - User Authentication: Users can log in to their accounts. The login form is displayed in a webview panel.
 * - Real-time Chat: Users can chat with an AI. The chat messages are sent to an AI server and the responses are displayed in the chat interface.
 * - File Parsing: When a text document is opened or saved, the file content is parsed and stored.
 *
 * Key Libraries:
 * - vscode: Used for interacting with the Visual Studio Code editor.
 * - fs: Used for reading files.
 * - path: Used for handling file and directory paths.
 *
 * Key Database:
 * - Realm: Used for storing and managing data. We have defined several Realm objects such as `RealmInstance`, `ChatSession`, and `ChatDetail`.
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { app, RealmInstance, ChatSession, ChatDetail } from "./db";
import { parseAndStoreFile } from "./fileParser";
import { loginUser } from "./auth";

/**
 * In this method, we're setting up the necessary event listeners and commands for the extension.
 * @param {vscode.ExtensionContext} context - The context in which the extension is executed.
 * It is used for subscribing to events and setting up commands.
 */
export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "decode-vs-code" is now active!'
  );

  let panel: vscode.WebviewPanel | undefined;

  /**
   * Command for logging in the user.
   * This command creates a webview panel for the login form and handles the login process.
   * The command is registered with the command ID "decode-vs-code.login".
   */
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
              try {
                RealmInstance.getInstance()
                  .then((realm) => {
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
                  })
                  .catch((error) => {
                    console.error(
                      "An error occurred while creating a new session:",
                      error
                    );
                  });
              } catch (error) {
                console.error("Failed to create new chat session:", error);
              }
              break;
            case "sendMessageToAI":
              try {
                const aiResponse = await sendMessageToAI(message.message);
                panel?.webview.postMessage({
                  command: "aiResponse",
                  message: aiResponse.response,
                });

                // Store the user's message and the AI's response in the ChatDetail Realm object
                RealmInstance.getInstance()
                  .then((realm) => {
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
                  })
                  .catch((error) => {
                    console.error("An error occurred:", error);
                  });
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
    /**
     * Event listener for when a text document is opened.
     * This event is triggered whenever a text document is opened in the editor.
     * In the event handler, we're parsing the file content and storing it.
     */
    vscode.workspace.onDidOpenTextDocument(async (document) => {
      const fileContent = document.getText();
      await parseAndStoreFile(document.uri.fsPath, fileContent);
    }),
    /**
     * Event listener for when a text document is saved.
     * This event is triggered whenever a text document is saved in the editor.
     * In the event handler, we're parsing the updated file content and storing it.
     */
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      const fileContent = document.getText();
      await parseAndStoreFile(document.uri.fsPath, fileContent);
    }),
    loginDisposable
  );
}

/**
 * This method is called when the extension is deactivated.
 * The extension is deactivated when the user closes the editor or the editor is shut down.
 * In this method, we're cleaning up any resources used by the extension.
 */
export function deactivate() {
  // Close any open connections or cleanup resources if necessary.
}

/**
 * This method is called when the extension is deactivated.
 * The extension is deactivated when the user closes the editor or the editor is shut down.
 * In this method, we're cleaning up any resources used by the extension.
 */
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
