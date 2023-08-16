import * as React from "react";
import { loginUser } from "./auth";

interface LoginProps {
  onLogin: (user: any) => void;
}

interface VsCodeWebviewApi {
  postMessage: (message: any) => void;
  // Add other methods if needed
}

declare global {
  interface Window {
    vscode: VsCodeWebviewApi;
  }
}
export function Login({ onLogin }: LoginProps) {
  console.log("Enetered Login function");
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");

  const handleLogin = async () => {
    if (email && password) {
      try {
        const user = await loginUser(email, password);
        console.log("User after login:", user); // Logging the user
        onLogin(user);
        if (window.vscode) {
          window.vscode.postMessage({ command: "login", user: user });
        }
      } catch (error) {
        console.error("Error during login:", error); // Logging the actual error
        setError("Login failed. Please check your email and password.");
      }
    } else {
      setError("Please enter your email and password.");
    }
  };

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Log In</button>
      {error && <p>{error}</p>}
    </div>
  );
}
