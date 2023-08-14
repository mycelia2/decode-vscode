import * as React from "react";
import { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Navigate } from "react-router-dom";
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
  // Declare a state to store the current user from Realm
  const [currentUser, setCurrentUser] = useState(RealmApp.currentUser);

  useEffect(() => {
    // Set up any necessary listeners or additional logic here, if required
  }, []);

  return (
    <Router>
      <Route path="/login">
        <Login onLogin={setCurrentUser} />
      </Route>
      <Route path="/details/:sessionId">
        {currentUser ? <ChatDetails /> : <Navigate to="/login" />}
      </Route>
      <Navigate to="/login" /> {/* Default navigation */}
    </Router>
  );
}
