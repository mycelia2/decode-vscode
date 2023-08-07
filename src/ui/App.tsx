import * as React from "react";
import { useState } from "react";
import { BrowserRouter as Router, Route, Navigate } from "react-router-dom";
import { Login } from "./Login";
import { ChatSessions } from "./ChatSessions"; // Note the PascalCase here
import { ChatDetails } from "./ChatDetails"; // And here

type User = {
  isLoggedIn: boolean;
  id: string;
};

export function App() {
  // PascalCase for the component name
  const [user, setUser] = useState<User | null>(null);

  return (
    <Router>
      <Route path="/login">
        <Login onLogin={setUser} />
      </Route>
      <Route path="/sessions">
        {user && user.isLoggedIn ? (
          <ChatSessions userId={user.id} /> // PascalCase used here
        ) : (
          <Navigate to="/login" />
        )}
      </Route>
      <Route path="/details/:sessionId">
        {user && user.isLoggedIn ? (
          <ChatDetails /> // And here
        ) : (
          <Navigate to="/login" />
        )}
      </Route>
      <Navigate to="/login" />
    </Router>
  );
}

export default App;
