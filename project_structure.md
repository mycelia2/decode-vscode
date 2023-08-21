This is a VScode extension with NodeJs extension host and a react frontend that is rendered inside webview panel.

# Project Structure

decode-vscode/
├── src/
│ ├── db.ts # File for defining the Realm schema and creating chat sessions
│ ├── extension.ts # Entry point of the VS Code extension
│ ├── treeViewProvider.ts # Handles the rendering of the menu in the sidepanel
│ ├── webviewManager.ts # Handles the rendering of webview as well as message passing with the same
│ ├── codeParser.ts # Classes and functions used to parse the local code files
│ ├── chatSessionManager.ts # Handles and manages chat sessions
│ ├── ui/ # Directory for React components used in the user interface
│ │ ├── App.tsx # Main component for the application
│ │ ├── ChatDetails.tsx # Component for displaying chat details
│ │ └── Login.tsx # Component for the login functionality
│ │ └── auth.tsx # Supports login functionality
│ │ └── main.tsx # renders App component
│ ├── webview.html # HTML template for the webview panel used in the extension
├── package.json # Project configuration and dependencies
├── tsconfig.json # TypeScript compiler options
├── README.md # Documentation and information about the extension
└── webpack.config.js # Webpack configuration for bundling the extension
