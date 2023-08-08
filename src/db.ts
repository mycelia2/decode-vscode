import Realm from "realm";

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

class RealmInstance {
  private static instance: Realm | null = null;

  private constructor() {}

  static getInstance(): Realm {
    if (!RealmInstance.instance) {
      RealmInstance.instance = new Realm({ schema: SCHEMA });
    }

    return RealmInstance.instance;
  }
}

export { ChatSession, ChatDetail, FileContents, RealmInstance, app };
