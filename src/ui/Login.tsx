import * as React from "react";
import { loginUser } from "../auth";

interface LoginProps {
  onLogin: (user: any) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");

  const handleLogin = async () => {
    if (email && password) {
      try {
        const user = await loginUser(email, password);
        onLogin(user);
        window.parent.postMessage({ command: "login", user: user }, "*"); // Send postMessage after successful login
      } catch (error) {
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
