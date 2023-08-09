import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
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

/**
 * Parses a file and stores its details in the database.
 * @param {string} filePath - The path of the file.
 * @param {string} fileContent - The content of the file.
 * @returns {Promise<void>}
 */
export async function parseAndStoreFile(filePath: string, fileContent: string) {
  const contentHash = crypto
    .createHash("md5")
    .update(fileContent)
    .digest("hex");

  // Parse the code into an AST
  const ast = parser.parse(fileContent, {
    sourceType: "module",
    plugins: ["typescript"],
  });

  const classes: string[] = [];
  const functions: string[] = [];
  const modules: string[] = [];
  const variables: string[] = [];

  traverse(ast, {
    enter(path) {
      // Collect class declarations
      if (path.isClassDeclaration() && path.node.id) {
        classes.push(path.node.id.name);
      }

      // Collect function declarations
      if (path.isFunctionDeclaration() && path.node.id) {
        functions.push(path.node.id.name);
      }

      // Collect imported modules
      if (path.isImportDeclaration()) {
        modules.push(path.node.source.value);
      }

      // Collect variable declarations
      if (path.isVariableDeclarator() && path.node.id.type === "Identifier") {
        variables.push(path.node.id.name);
      }
    },
  });

  const realm = await Realm.open({ schema: [FileContents] });
  const existingFile = realm.objectForPrimaryKey("FileContents", filePath) as
    | FileContents
    | undefined;

  if (existingFile && existingFile.contentHash === contentHash) {
    return;
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
