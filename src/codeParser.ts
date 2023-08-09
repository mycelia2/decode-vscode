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
 * Encapsulates the logic for file inclusion/exclusion, providing a cleaner and more maintainable code structure.
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
  const entry = path.basename(entryPath); // Extracting entry name from the path
  const ext = path.extname(entryPath);

  if (config.customFilters && !config.customFilters(entryPath, stats)) {
    return false;
  }
  // Logic for standard filtering criteria, including exclusion of specific files and directories, as well as
  // optional inclusion of test files and documentation.
  // More conditions can be added here if necessary.
  return ![
    ["package-lock.json", "yarn.lock"].includes(entry),
    stats.isDirectory() && ["dist", "build"].includes(entry),
    !config.includeTests && (ext === ".test.ts" || ext === ".spec.ts"),
    !config.includeDocs && ["README.md", "CHANGELOG.md"].includes(entry),
    ![
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      "package.json",
      "tsconfig.json",
      "webpack.config.js",
    ].includes(ext) && !stats.isDirectory(),
  ].some(Boolean);
}

export function generateProjectStructure(
  rootPath: string,
  zoomLevel: number,
  config: ProjectStructureConfig = {}
): string {
  let structure = "";

  function traverseDirectory(dirPath: string, indent: number): void {
    let entries;
    try {
      entries = fs.readdirSync(dirPath);
    } catch (error) {
      console.error(`Failed to read directory: ${dirPath}`, error);
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry);
      let stats;

      try {
        stats = fs.statSync(entryPath);
      } catch (error) {
        console.error(`Failed to get stats for entry: ${entryPath}`, error);
        continue;
      }

      if (isRelevantFile(entryPath, stats, config)) {
        if (stats.isDirectory()) {
          structure += "  ".repeat(indent) + entry + "/\n";
          traverseDirectory(entryPath, indent + 1);
        } else if (stats.isFile()) {
          structure += "  ".repeat(indent) + entry + "\n";
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
  // Convert tabs to spaces based on the specified tab width
  line = line.replace(/\t/g, " ".repeat(tabWidth));

  let level = 0;
  while (line[level] === " ") {
    level += 1;
  }

  return level;
}

/**
 * Generates a zoomed view of a code snippet based on the zoom level.
 * @param {string} content - The code content.
 * @param {number} zoomLevel - The zoom level.
 * @param {number} [tabWidth=4] - The width of a tab character in spaces.
 * @returns {string} The zoomed view of the code.
 */
export function getZoomLevelView(
  content: string,
  zoomLevel: number,
  tabWidth: number = 4
): string {
  const lines = content.split("\n");
  let result = "";
  let isCollapsed = false;

  for (const line of lines) {
    const indentationLevel = getIndentationLevel(line, tabWidth);

    if (indentationLevel > zoomLevel) {
      if (!isCollapsed) {
        result += "  ".repeat(zoomLevel) + "...\n";
        isCollapsed = true;
      }
    } else {
      result += line + "\n";
      isCollapsed = false;
    }
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
