import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  generateProjectStructure,
  getAutoCompleteSuggestions,
  getElementDetails,
} from "./codeParser";
import { MongooseInstance, ChatDetail } from "./db";

export function getWebviewContent(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext
): string {
  // Get the full path to bundle.js
  const bundleJsPathOnDisk = vscode.Uri.file(
    path.join(context.extensionPath, "dist", "bundle.js")
  );

  // Convert the file path to a URI for the webview
  const bundleJsUri = panel.webview.asWebviewUri(bundleJsPathOnDisk);

  // Get the content of webview.html and replace the bundle.js src with the URI
  const webviewHtml = fs
    .readFileSync(
      path.join(context.extensionPath, "src", "webview.html"),
      "utf-8"
    )
    .replace(
      /<script src="bundle.js"><\/script>/,
      `<script src="${bundleJsUri}"></script>`
    );

  return webviewHtml;
}

export function handleWebviewMessage(
  message: any,
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext
) {
  switch (message.command) {
    case "login":
      const user = message.user;
      context.globalState.update("currentUser", user);
      context.globalState.update("userApiKey", user.authApiKey);
      vscode.commands.executeCommand("decode-vs-code.refreshTreeView");
      break;
    case "generateProjectStructure":
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
      const details = getElementDetails(
        message.elementIdentifier,
        message.filePath
      );
      panel.webview.postMessage({ command: "elementDetails", details });
      break;
    case "fetchChatDetails":
      MongooseInstance.getInstance()
        .then(() => {
          return ChatDetail.find({ sessionId: message.sessionId });
        })
        .then((details) => {
          panel.webview.postMessage({
            command: "fetchChatDetailsResponse",
            details,
          });
        });
      break;
    // Handle other commands as needed
  }
}
