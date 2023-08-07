import Realm from "realm";
import { v4 as uuidv4 } from "uuid";

class ChatSession extends Realm.Object {
  _id!: string;
  userId!: string;
  startTime!: Date;
  lastMessagePreview!: string;
  status: string = "active";
  unreadCount: number = 0;

  static schema = {
    name: "ChatSession",
    primaryKey: "_id",
    properties: {
      _id: "string",
      userId: "string",
      startTime: "date",
      lastMessagePreview: "string",
      status: { type: "string", default: "active" },
      unreadCount: { type: "int", default: 0 },
    },
  };
}

class ChatDetail extends Realm.Object {
  _id!: string;
  sessionId!: string;
  message!: string;
  timestamp!: Date;
  sender!: "user" | "ai";

  static schema = {
    name: "ChatDetail",
    primaryKey: "_id",
    properties: {
      _id: "string",
      sessionId: "string",
      message: "string",
      timestamp: "date",
      sender: { type: "string", enum: ["user", "ai"] },
    },
  };
}

class FileContents extends Realm.Object {
  filePath!: string;
  classes!: string[];
  functions!: string[];
  modules!: string[];
  variables!: string[];

  static schema = {
    name: "FileContents",
    primaryKey: "filePath",
    properties: {
      filePath: "string",
      classes: "string[]",
      functions: "string[]",
      modules: "string[]",
      variables: "string[]",
    },
  };
}
export { ChatSession, ChatDetail, FileContents };

export async function createChatSession(userId: string) {
  const realm = await Realm.open({ schema: [ChatSession] });
  const _id = uuidv4(); // Generate a unique ID using UUID

  realm.write(() => {
    realm.create("ChatSession", {
      _id,
      userId,
      startTime: new Date(),
      lastMessagePreview: "",
      status: "active",
      unreadCount: 0,
    });
  });

  return _id;
}
