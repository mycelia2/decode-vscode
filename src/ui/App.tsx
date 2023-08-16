import * as React from "react";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./Login";
import { ChatDetails } from "./ChatDetails";
import * as RealmWeb from "realm-web";

const atlasConfig = {
  appId: "decode-react-igbny",
  appUrl:
    "https://realm.mongodb.com/groups/64d473fe8861ca14d4f95cf1/apps/64d47e50c353697e8ac0731e",
  baseUrl: "https://realm.mongodb.com",
  clientApiBaseUrl: "https://us-west-2.aws.realm.mongodb.com",
  dataApiBaseUrl: "https://us-west-2.aws.data.mongodb-api.com",
  dataExplorerLink:
    "https://cloud.mongodb.com/links/64d473fe8861ca14d4f95cf1/explorer/AtlasCluster/database/collection/find",
  dataSourceName: "mongodb-atlas",
};

export const RealmApp = new RealmWeb.App({
  id: atlasConfig["appId"],
});

export function App() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as any;
      console.log("Setting current user in App.tsx", data.currentUser);
      if (data.currentUser) {
        setCurrentUser(data.currentUser);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    console.log("currentUser in App:", currentUser);
  }, [currentUser]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login onLogin={setCurrentUser} />} />
        <Route
          path="/details/:sessionId"
          element={currentUser ? <ChatDetails /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to="/login" />} />{" "}
        {/* Default navigation */}
      </Routes>
    </BrowserRouter>
  );
}
