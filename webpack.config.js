const path = require('path');

// Configuration for the VS Code extension
const extensionConfig = {
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },

  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
          },
        },
      },
    ],
  },
  target: 'node',
  externals: {
    vscode: 'commonjs vscode',
  },
};

// Configuration for the React UI
const uiConfig = {
  entry: './src/ui/App.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  resolve: {
    extensions: ['.tsx', '.jsx', '.js'],
    fallback: {
        "path": require.resolve("path-browserify")
    },
  },
  module: {
    rules: [
      {
        test: /\.(tsx|jsx)x?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
          },
        },
      },
    ],
  },
  target: 'web',
};

module.exports = [extensionConfig, uiConfig]; 
