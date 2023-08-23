import * as React from "react";
import { useState, useEffect } from "react";
import { Login } from "./Login";
import { ChatDetails } from "./ChatDetails";
import * as RealmWeb from "realm-web";

type VsCodeApi = {
  postMessage: (message: any) => void;
  // Add other methods as needed
};
export const VsCodeContext = React.createContext<VsCodeApi | null>(null);

export const RealmApp = new RealmWeb.App({
  id: "decode-react-igbny",
});

interface UserContextType {
  currentUser: any;
  setCurrentUser: React.Dispatch<React.SetStateAction<any>>;
}

export const UserContext = React.createContext<UserContextType | null>(null);

export function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const data = event.data as any;
      if (data.command === "initialize") {
        if (data && data.currentUser && data.sessionId) {
          const credentials = RealmWeb.Credentials.apiKey(
            data.currentUser.authApiKey.key
          );
          const user = await RealmApp.logIn(credentials);
          setCurrentUser(user);
          {
            setSessionId(data.sessionId);
          }
        }
        setLoading(false);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Or any other loading indicator
  }

  return (
    <VsCodeContext.Provider value={window.vscode as VsCodeApi}>
      <UserContext.Provider value={{ currentUser, setCurrentUser }}>
        {currentUser ? <ChatDetails sessionId={sessionId} /> : <Login />}
      </UserContext.Provider>
    </VsCodeContext.Provider>
  );
}
