import { ExtensionContext } from "vscode";
import mongoose, { Document, Schema } from "mongoose";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Interfaces

export interface IChatSession extends Document {
  userId: mongoose.Types.ObjectId;
  startTime: Date;
  lastMessagePreview: string;
  status: string;
  unreadCount: number;
}

export interface IChatDetail extends Document {
  sessionId: mongoose.Types.ObjectId;
  message: string;
  timestamp: Date;
  sender: "user" | "ai";
}

export interface IFileContents extends Document {
  filePath: string;
  classes: string[];
  functions: string[];
  modules: string[];
  variables: string[];
}

export interface IUser extends Document {
  email: string;
  _id: string;
  authApiKey: {
    _id: string;
    key: string;
    name: string;
    disabled: boolean;
  };
}

// Schemas

const ChatSessionSchema = new Schema<IChatSession>({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  startTime: Date,
  lastMessagePreview: String,
  status: { type: String, default: "active" },
  unreadCount: { type: Number, default: 0 },
});

const ChatDetailSchema = new Schema<IChatDetail>({
  sessionId: { type: Schema.Types.ObjectId, ref: "ChatSession" },
  message: String,
  timestamp: Date,
  sender: { type: String, enum: ["user", "ai"] },
});

const FileContentsSchema = new Schema<IFileContents>({
  filePath: String,
  classes: [String],
  functions: [String],
  modules: [String],
  variables: [String],
});

// const UserSchema = new Schema<IUser>({
//   email: String,
// });

// Models

const ChatSession = mongoose.model<IChatSession>(
  "ChatSession",
  ChatSessionSchema
);
const ChatDetail = mongoose.model<IChatDetail>("ChatDetail", ChatDetailSchema);
const FileContents = mongoose.model<IFileContents>(
  "FileContents",
  FileContentsSchema
);
// const User = mongoose.model<IUser>("User", UserSchema);

// Mongoose Singleton Instance

class MongooseInstance {
  private static instance: typeof mongoose | null = null;

  private constructor() {}

  static async getInstance(): Promise<typeof mongoose> {
    if (!MongooseInstance.instance) {
      const connectionString = process.env.MONGODB_URI;

      if (!connectionString) {
        throw new Error(
          "No MongoDB connection string provided in environment variables"
        );
      }

      MongooseInstance.instance = await mongoose.connect(connectionString);
    }

    return MongooseInstance.instance;
  }
}

// Exports

export { ChatSession, ChatDetail, FileContents, MongooseInstance };
