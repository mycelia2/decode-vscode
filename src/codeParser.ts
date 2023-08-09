/**
 * This file contains the core logic for generating a visual representation of a project's structure.
 * It provides a way to generate a string representation of the project structure at a specified zoom level.
 * Individual files can have specific zoom level overrides.
 *
 * The file also includes functionality to parse the code content into an Abstract Syntax Tree (AST) and
 * retrieve the details of a specific code element.
 *
 * The main functions exported by this module are:
 * - generateProjectStructure: Generates a string representation of the project structure.
 * - getZoomLevelView: Generates a zoomed view of a code snippet based on the zoom level.
 * - getElementDetails: Retrieves the details of a specific code element.
 *
 * This file is used in the context of providing a high-level overview of a project's structure and
 * allowing users to zoom into specific parts of the code. It is used when a user wants to understand
 * the overall structure of a project or when they want to get details about a specific part of the code.
 */

import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import * as Babel from "@babel/types";
import * as fs from "fs";
import * as path from "path";

/**
 * Configuration for generating the project structure.
 */
type ProjectStructureConfig = {
  includeTests?: boolean;
  includeDocs?: boolean;
  customFilters?: (entryPath: string, stats: fs.Stats) => boolean;
};

/**
 * Separate function to determine if a file or directory is relevant.
 * Encapsulates the logic for file inclusion, providing a cleaner and more maintainable code structure.
 * @param {string} entryPath - The path of the entry.
 * @param {fs.Stats} stats - File stats.
 * @param {ProjectStructureConfig} config - Configuration for filtering files.
 * @returns {boolean} Whether the file is relevant or not.
 */
function isRelevantFile(
  entryPath: string,
  stats: fs.Stats,
  config: ProjectStructureConfig
): boolean {
  const ext = path.extname(entryPath);
  const parts = entryPath.split(path.sep);

  // If custom filters are provided, they take precedence
  if (config.customFilters && !config.customFilters(entryPath, stats)) {
    return false;
  }

  // Include only the main application source code
  if (parts.includes("src")) {
    return (
      [
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".json", // configuration files like package.json, tsconfig.json
        ".md", // optional inclusion of markdown documentation
      ].includes(ext) || stats.isDirectory()
    );
  }

  // Include webpack configuration if exists
  if (entryPath.endsWith("webpack.config.js")) {
    return true;
  }

  // Additional explicit inclusion criteria can be added here

  return false; // By default, exclude everything else
}

/**
 * Represents a zoom level override for a specific file.
 * @typedef {Object} ZoomOverride
 * @property {string} filePath - The path to the file.
 * @property {number} zoomLevel - The specific zoom level for this file.
 */
type ZoomOverride = { filePath: string; zoomLevel: number };

/**
 * Generates a string representation of the project structure at a specified zoom level.
 * Individual files can have specific zoom level overrides.
 *
 * @param {string} rootPath - The root path of the project.
 * @param {number} defaultZoomLevel - The default zoom level for all files.
 * @param {ProjectStructureConfig} [config={}] - Configuration for file inclusion/exclusion.
 * @param {ZoomOverride[]} [zoomOverrides=[]] - Array of file paths with specific zoom levels.
 * @returns {string} A string representation of the project structure.
 */
export function generateProjectStructure(
  rootPath: string,
  defaultZoomLevel: number,
  config: ProjectStructureConfig = {},
  zoomOverrides: ZoomOverride[] = []
): string {
  let structure = "";

  function traverseDirectory(dirPath: string, indent: number): void {
    const entries = fs.readdirSync(dirPath);

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry);
      const stats = fs.statSync(entryPath);

      if (isRelevantFile(entryPath, stats, config)) {
        const indentation = "  ".repeat(indent);
        if (stats.isDirectory()) {
          structure += indentation + entry + "/\n";
          traverseDirectory(entryPath, indent + 1);
        } else if (stats.isFile()) {
          const override = zoomOverrides.find((o) => o.filePath === entryPath);
          const zoomLevel = override ? override.zoomLevel : defaultZoomLevel;
          const zoomedContent = getZoomLevelView(entryPath, zoomLevel);
          // Add an additional level of indentation to the zoomed content
          const indentedZoomedContent = zoomedContent
            .split("\n")
            .map((line) => indentation + "  " + line)
            .join("\n");
          structure +=
            indentation + entry + ":\n" + indentedZoomedContent + "\n";
        }
      }
    }
  }

  traverseDirectory(rootPath, 0);
  return structure.trim();
}

/**
 * Gets the indentation level of a line.
 * @param {string} line - The line to analyze.
 * @param {number} [tabWidth=4] - The width of a tab character in spaces.
 * @returns {number} The indentation level.
 */
function getIndentationLevel(line: string, tabWidth: number = 4): number {
  line = line.replace(/\t/g, " ".repeat(tabWidth));
  let level = 0;
  while (line[level] === " ") {
    level += 1;
  }
  return level;
}

let currentIndentationLevel = 0;

function addEllipsis(result: string, level: number): string {
  if (level > currentIndentationLevel) {
    currentIndentationLevel = level;
    return result + "  ".repeat(level) + "...\n";
  }
  return result;
}

/**
 * Generates a zoomed view of a code snippet based on the zoom level.
 * @param {string} filePath - The file path.
 * @param {number} zoomLevel - The zoom level.
 * @param {number} [tabWidth=4] - The width of a tab character in spaces.
 * @returns {string} The zoomed view of the code.
 */
export function getZoomLevelView(
  filePath: string,
  zoomLevel: number,
  tabWidth: number = 4
): string {
  currentIndentationLevel = 0; // Reset the current indentation level

  if (zoomLevel === 0) {
    return "";
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  let result = "";
  let insideIndentedBlock = false;
  let insideCommentBlock = false;

  for (const line of lines) {
    const indentationLevel = getIndentationLevel(line, tabWidth);

    if (line.trim() === "" && !insideIndentedBlock && !insideCommentBlock) {
      continue;
    }

    if (line.trim().startsWith("/**")) {
      insideCommentBlock = true;
    }

    if (insideCommentBlock) {
      result += line + "\n";
      if (line.trim().endsWith("*/")) {
        insideCommentBlock = false;
      }
      continue;
    }

    switch (zoomLevel) {
      case 1:
        if (indentationLevel === 0) {
          result += line + "\n";
          insideIndentedBlock = true;
        } else if (insideIndentedBlock && indentationLevel > 0) {
          result = addEllipsis(result, 1);
          insideIndentedBlock = false;
        }
        break;
      case 2:
        if (indentationLevel <= 1) {
          result += line + "\n";
          insideIndentedBlock = false;
        } else if (!insideIndentedBlock && indentationLevel > 1) {
          result = addEllipsis(result, 1);
          insideIndentedBlock = true;
        }
        break;
      default:
        result += line + "\n";
    }
  }

  // Add ellipsis to the end of each function or block of code at zoom level 1
  if (zoomLevel === 1) {
    result = result.replace(/(\n\s*function.*\n)/g, "$1  ...\n");
  }

  return result.trim();
}

/**
 * Represents the details of a specific code element.
 */
export type ElementDetails = {
  type: "Function" | "Class" | "Variable" | "Module" | "Unknown";
  name: string;
  code: string;
};

/**
 * Parses the code content into an Abstract Syntax Tree (AST).
 * @param {string} code - The code content to parse.
 * @returns {parser.Node} The root node of the AST.
 */
function parseCodeIntoAST(code: string): Babel.File {
  return parser.parse(code, {
    sourceType: "module",
    plugins: ["typescript"], // Include additional plugins if needed (e.g., 'jsx' for JSX syntax)
  });
}

/**
 * Retrieves the details of a specific code element.
 * @param {string} elementIdentifier - The name of the element.
 * @param {string} filePath - The path of the file containing the element.
 * @returns {Promise<ElementDetails|null>} The details of the element or null if not found.
 */
export async function getElementDetails(
  elementIdentifier: string,
  filePath: string
): Promise<ElementDetails | null> {
  const content = fs.readFileSync(filePath, "utf-8");
  const ast = parseCodeIntoAST(content);

  let details: ElementDetails | null = null;

  traverse(ast, {
    enter(path) {
      if (
        (Babel.isFunctionDeclaration(path.node) ||
          Babel.isClassDeclaration(path.node) ||
          Babel.isVariableDeclarator(path.node)) &&
        Babel.isIdentifier(path.node.id) && // Check if id is an Identifier
        path.node.id.name === elementIdentifier
      ) {
        details = {
          type: getType(path.node),
          name: elementIdentifier,
          code: content.substring(path.node.start!, path.node.end!),
        };
        path.stop(); // Stop traversal once the element is found
      }
    },
  });

  return details;
}

function getType(
  node: Babel.Node
): "Function" | "Class" | "Variable" | "Module" | "Unknown" {
  if (Babel.isFunctionDeclaration(node)) {
    return "Function";
  }
  if (Babel.isClassDeclaration(node)) {
    return "Class";
  }
  if (Babel.isVariableDeclarator(node)) {
    return "Variable";
  }
  // Additional checks can be added for other types
  return "Unknown";
}
