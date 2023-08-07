import { ESLint } from "eslint";
import Realm, { UpdateMode } from "realm";
import * as crypto from "crypto";

class FileContents extends Realm.Object {
  filePath!: string;
  contentHash!: string;
  classes!: string[];
  functions!: string[];
  modules!: string[];
  variables!: string[];

  static schema = {
    name: "FileContents",
    primaryKey: "filePath",
    properties: {
      filePath: "string",
      contentHash: "string",
      classes: "string[]",
      functions: "string[]",
      modules: "string[]",
      variables: "string[]",
    },
  };
}

async function parseAndStoreFile(filePath: string, fileContent: string) {
  const contentHash = crypto
    .createHash("md5")
    .update(fileContent)
    .digest("hex");

  const realm = await Realm.open({ schema: [FileContents] });

  // Use type assertion to specify the expected return type
  const existingFile = realm.objectForPrimaryKey("FileContents", filePath) as
    | FileContents
    | undefined;

  if (existingFile && existingFile.contentHash === contentHash) {
    return;
  }

  const eslint = new ESLint();
  const results = await eslint.lintText(fileContent, { filePath });

  const classes: string[] = [];
  const functions: string[] = [];
  const modules: string[] = [];
  const variables: string[] = [];

  for (const result of results) {
    for (const message of result.messages) {
      // Type assertion to access the node property
      const currentNode = (message as any).node;
      if (message.ruleId === "no-undef") {
        variables.push(currentNode.name);
      } else if (message.ruleId === "no-unused-vars") {
        if (currentNode.type === "FunctionDeclaration") {
          functions.push(currentNode.id.name);
        } else if (currentNode.type === "ClassDeclaration") {
          classes.push(currentNode.id.name);
        } else if (currentNode.type === "ImportDeclaration") {
          modules.push(currentNode.source.value);
        }
      }
    }
  }

  realm.write(() => {
    realm.create(
      FileContents,
      {
        filePath,
        contentHash,
        classes,
        functions,
        modules,
        variables,
      },
      UpdateMode.Modified
    );
  });
}

export { FileContents, parseAndStoreFile };
