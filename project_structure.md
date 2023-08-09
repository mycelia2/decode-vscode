# Project Structure

decode-vscode/
├── src/
│ ├── db.ts # File for defining the Realm schema and creating chat sessions
│ ├── extension.ts # Entry point of the VS Code extension
│ ├── fileParser.ts # Handles parsing and storing file contents using ESLint and Realm
│ ├── ui/ # Directory for React components used in the user interface
│ │ ├── App.tsx # Main component for the application
│ │ ├── ChatSessions.tsx # Component for displaying chat sessions
│ │ ├── ChatDetails.tsx # Component for displaying chat details
│ │ └── Login.tsx # Component for the login functionality
│ ├── webview.html # HTML template for the webview panel used in the extension
│ └── ... # Other source code files
├── package.json # Project configuration and dependencies
├── tsconfig.json # TypeScript compiler options
├── README.md # Documentation and information about the extension
└── webpack.config.js # Webpack configuration for bundling the extension
