import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // Using the original useHistory
import Realm from "realm";
import { ChatSession } from "../db";

export function ChatSessions({ userId }: { userId: string }) {
  // Renaming to camelCase. You might prefer to disable the rule instead.
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // Back to useHistory

  useEffect(() => {
    const fetchSessions = async () => {
      const realmConfig = { schema: [ChatSession] };
      const realm = new Realm(realmConfig);
      const realmResults = realm
        .objects("ChatSession")
        .filtered("userId = $0", userId);

      // Convert realm results to array using map
      const sessionsArray: ChatSession[] = realmResults.map(
        (session: any) => session
      );

      setSessions(sessionsArray);
      setLoading(false);
    };

    fetchSessions();
  }, [userId]);

  const handleSessionClick = (session: ChatSession) => {
    if (session.status === "active") {
      navigate(`/details/${session._id}`);
    }
  };

  const handleNewSessionClick = () => {
    // Create a new chat session
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {sessions.map((session) => (
        <div key={session._id} onClick={() => handleSessionClick(session)}>
          <p>{session.lastMessagePreview}</p>
          <p>{session.status}</p>
          <p>{session.unreadCount}</p>
        </div>
      ))}
      <button onClick={handleNewSessionClick}>New Chat Session</button>
    </div>
  );
}
