import Realm from "realm";
import * as os from "os";
import * as path from "path";

const APP_ID = process.env.REALM_APP_ID as string;
const app = new Realm.App({ id: APP_ID });

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

const SCHEMA = [ChatSession, ChatDetail, FileContents];

import fs from "fs";

class RealmInstance {
  private static instance: Realm | null = null;

  private constructor() {}

  static async getInstance(): Promise<Realm> {
    if (!RealmInstance.instance) {
      const realmPath = path.join(os.homedir(), ".myapp", "realm");

      // Make sure the directory exists
      if (!fs.existsSync(path.dirname(realmPath))) {
        fs.mkdirSync(path.dirname(realmPath), { recursive: true });
      }

      // Open the realm asynchronously and store the result in the instance field
      RealmInstance.instance = await Realm.open({
        path: realmPath,
        schema: SCHEMA,
        inMemory: true,
      });
    }

    // Since instance is now guaranteed to be set, we can return it directly
    return RealmInstance.instance;
  }
}

export { ChatSession, ChatDetail, FileContents, RealmInstance, app };
