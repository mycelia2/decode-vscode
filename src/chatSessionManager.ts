import * as vscode from "vscode";
import { MongooseInstance, ChatSession, IChatSession, IUser } from "./db";
import { getWebviewContent, handleWebviewMessage } from "./webviewManager";
import { ObjectId } from "bson";

export async function fetchChatSessions(
  userId: string
): Promise<IChatSession[]> {
  const mongoose = await MongooseInstance.getInstance();
  const chatSessions = await ChatSession.find({ userId: new ObjectId(userId) });

  return chatSessions;
}

async function setupChatSessionWebview(
  sessionId: string,
  context: vscode.ExtensionContext
) {
  const currentUser = context.globalState.get("currentUser") as IUser;

  // Open the chat details view for the chat session
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
    sessionId: sessionId,
    currentUser: currentUser,
  });

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage((message) => {
    handleWebviewMessage(message, panel, context);
  });
}

export async function createChatSession(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    const mongoose = await MongooseInstance.getInstance();
    const currentUser = context.globalState.get("currentUser") as IUser;

    console.log("Create chat session: Current user:", currentUser);

    const chatSession = new ChatSession({
      userId: currentUser._id,
      startTime: new Date(),
      lastMessagePreview: "",
      status: "active",
      unreadCount: 0,
    });
    await chatSession.save();

    await setupChatSessionWebview(chatSession._id, context);
  } catch (error) {
    console.error("Error creating chat session:", error);
  }
}

export async function openChatSession(
  sessionId: string,
  context: vscode.ExtensionContext
): Promise<void> {
  // try {
  //   console.log("Open chat session: Session ID:", sessionId);
  //   await setupChatSessionWebview(sessionId, context);
  // } catch (error) {
  //   console.error("Error opening chat session:", error);
  // }
}
