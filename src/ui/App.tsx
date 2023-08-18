import * as React from "react";
import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { Login } from "./Login";
import { ChatDetails } from "./ChatDetails";
import * as RealmWeb from "realm-web";

// Update this later using build process
// const realmAppId = process.env.REALM_APP_ID;

// if (!realmAppId) {
//   throw new Error("No realm app id provided");
// }

export const RealmApp = new RealmWeb.App({
  id: "decode-react-igbny",
});

// Create a context to share the user's state
interface UserContextType {
  currentUser: any; // Define the type for currentUser based on your data model
  setCurrentUser: React.Dispatch<React.SetStateAction<any>>;
}

export const UserContext = React.createContext<UserContextType | null>(null);

function UserAuthHandler() {
  const userContext = React.useContext(UserContext);
  const navigate = useNavigate();

  if (!userContext) {
    return null;
  }

  const { setCurrentUser } = userContext;

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const data = event.data as any;
      if (data.currentUser) {
        const credentials = RealmWeb.Credentials.apiKey(
          data.currentUser.apiKey.key
        );
        const user = await RealmApp.logIn(credentials);
        setCurrentUser(user);
        navigate(`/details/${user.id}`);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [navigate, setCurrentUser]);

  return null;
}

export function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
      <BrowserRouter>
        <UserAuthHandler />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/details/:sessionId"
            element={currentUser ? <ChatDetails /> : <Navigate to="/login" />}
          />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </UserContext.Provider>
  );
}
