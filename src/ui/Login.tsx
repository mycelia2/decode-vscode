import * as React from "react";
import { loginUser } from "./auth";
import { UserContext } from "./App"; // Import the context

interface VsCodeWebviewApi {
  postMessage: (message: any) => void;
  // Add other methods if needed
}

declare global {
  interface Window {
    vscode: VsCodeWebviewApi;
  }
}

export function Login() {
  // Removed the props
  const userContext = React.useContext(UserContext); // Access the context

  if (!userContext) {
    return null;
  } // Optional: handle the case when context is not available

  const { setCurrentUser } = userContext; // Destructure the setCurrentUser method

  console.log("Entered Login function");
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");

  const handleLogin = async () => {
    if (email && password) {
      try {
        const user = await loginUser(email, password);
        setCurrentUser(user);
        if (window.vscode) {
          window.vscode.postMessage({ command: "login", user: user });
        }
      } catch (error) {
        console.error("Error during login:", error);
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
