import * as React from "react";
import * as Realm from "realm";

const APP_ID = process.env.REALM_APP_ID as string;
const app = new Realm.App({ id: APP_ID });

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
        const credentials = Realm.Credentials.emailPassword(email, password);
        const user = await app.logIn(credentials);
        onLogin(user);
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

export async function loginUser(
  context: any,
  email: string,
  password: string
): Promise<any | null> {
  try {
    const credentials = Realm.Credentials.emailPassword(email, password);
    const user = await app.logIn(credentials);
    return user;
  } catch (error) {
    console.error("Login failed:", error);
    return null;
  }
}
