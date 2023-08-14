// import Realm from "realm";
import * as path from "path";
import { ExtensionContext } from "vscode";
import * as Realm from "realm";

class ChatSession extends Realm.Object {
  public _id!: Realm.BSON.ObjectId;
  userId!: string;
  startTime!: Date;
  lastMessagePreview!: string;
  status: string = "active";
  unreadCount: number = 0;

  static schema = {
    name: "ChatSession",
    primaryKey: "_id",
    properties: {
      _id: { type: "objectId", default: () => new Realm.BSON.ObjectId() },
      userId: "string",
      startTime: "date",
      lastMessagePreview: "string",
      status: { type: "string", default: "active" },
      unreadCount: { type: "int", default: 0 },
      chatDetails: { type: "list", objectType: "ChatDetail" },
    },
  };
}

class ChatDetail extends Realm.Object {
  public _id!: Realm.BSON.ObjectId;
  sessionId!: string;
  message!: string;
  timestamp!: Date;
  sender!: "user" | "ai";

  static schema = {
    name: "ChatDetail",
    primaryKey: "_id",
    properties: {
      _id: { type: "objectId", default: () => new Realm.BSON.ObjectId() },
      sessionId: "string",
      message: "string",
      timestamp: "date",
      sender: { type: "string", enum: ["user", "ai"] },
    },
  };
}

class FileContents extends Realm.Object {
  public _id!: Realm.BSON.ObjectId;
  filePath!: string;
  classes!: string[];
  functions!: string[];
  modules!: string[];
  variables!: string[];

  static schema = {
    name: "FileContents",
    primaryKey: "_id",
    properties: {
      _id: { type: "objectId", default: () => new Realm.BSON.ObjectId() },
      filePath: "string",
      classes: "string[]",
      functions: "string[]",
      modules: "string[]",
      variables: "string[]",
    },
  };
}

class User extends Realm.Object {
  public _id!: Realm.BSON.ObjectId;
  email!: string;
  // Add other user properties as needed

  static schema = {
    name: "User",
    primaryKey: "_id",
    properties: {
      _id: { type: "objectId", default: () => new Realm.BSON.ObjectId() },
      email: "string",
      // Define other user properties as needed
    },
  };
}

const SCHEMA = [ChatSession, ChatDetail, FileContents, User];

class RealmInstance {
  private static instance: Realm | null = null;
  private static context: ExtensionContext | null = null; // Added context variable

  private constructor() {}

  static initialize(context: ExtensionContext) {
    RealmInstance.context = context; // Store the context for later use
  }

  static async getInstance(): Promise<Realm> {
    if (RealmInstance.context === null) {
      throw new Error("RealmInstance has not been initialized with context");
    }

    if (!RealmInstance.instance) {
      const realmPath = path.join(
        RealmInstance.context.globalStorageUri.fsPath
      );

      // Open the realm asynchronously and store the result in the instance field
      RealmInstance.instance = await Realm.open({
        path: realmPath,
        schema: SCHEMA,
      });
    }

    // Since instance is now guaranteed to be set, we can return it directly
    return RealmInstance.instance;
  }
}

export { ChatSession, ChatDetail, FileContents, RealmInstance };
