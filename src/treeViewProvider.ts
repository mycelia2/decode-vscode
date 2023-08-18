import * as vscode from "vscode";
import { fetchChatSessions } from "./chatSessionManager";
import { IUser } from "./db";
import { logout } from "./extension";

export class TreeViewProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
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
      const user = this._context.globalState.get("currentUser") as IUser;
      if (user) {
        return fetchChatSessions(user.id).then((sessions) => {
          console.log("getChildren", sessions);
          const sessionTreeItems = sessions.map(
            (session) => new vscode.TreeItem(session.lastMessagePreview)
          );

          // Create a new TreeItem for the "Create Chat Session" button
          const createChatSessionTreeItem = new vscode.TreeItem(
            "Create Chat Session"
          );
          createChatSessionTreeItem.command = {
            command: "decode-vs-code.createChatSession",
            title: "Create Chat Session",
            arguments: [this._context], // Pass the user ID and context to the command
          };

          // Add the "Create Chat Session" button to the top of the list
          sessionTreeItems.unshift(createChatSessionTreeItem);

          // Create a new TreeItem for the "Logout" button
          const logoutTreeItem = new vscode.TreeItem("Logout");
          logoutTreeItem.command = {
            command: "decode-vs-code.logout", // Use the registered command identifier
            title: "Logout",
          };

          // Add the "Logout" button to the list
          sessionTreeItems.push(logoutTreeItem);

          return sessionTreeItems;
        });
      } else {
        const loginTreeItem = new vscode.TreeItem(
          "Please log in to view chat sessions."
        );
        loginTreeItem.command = {
          command: "decode-vs-code.openLogin",
          title: "Open Login",
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
