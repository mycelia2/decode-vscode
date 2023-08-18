import * as vscode from "vscode";
import { MongooseInstance, ChatSession, IChatSession, IUser } from "./db";
import { getWebviewContent, handleWebviewMessage } from "./webviewManager";

export async function fetchChatSessions(
  userId: string
): Promise<IChatSession[]> {
  const mongoose = await MongooseInstance.getInstance();
  const chatSessions = await ChatSession.find({ userId });
  return chatSessions;
}

export async function createChatSession(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    const mongoose = await MongooseInstance.getInstance();
    const currentUser = context.globalState.get("currentUser");

    console.log("Create chat session: Current user:", currentUser);

    const chatSession = new ChatSession({
      userId: "64dca52fb30617e8e131ad6b",
      startTime: new Date(),
      lastMessagePreview: "",
      status: "active",
      unreadCount: 0,
    });
    await chatSession.save();

    // Open the chat details view after creating a new chat session
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
      sessionId: chatSession._id, // Send the ID of the new chat session
      currentUser: currentUser,
    });

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage((message) => {
      handleWebviewMessage(message, panel, context);
    });
  } catch (error) {
    console.error("Error creating chat session:", error);
  }
}
