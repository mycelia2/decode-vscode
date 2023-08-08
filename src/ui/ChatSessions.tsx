import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChatSession, RealmInstance } from "../db";

export function ChatSessions({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSessions = async () => {
      const realm = RealmInstance.getInstance();
      const realmResults = realm
        .objects<ChatSession>("ChatSession")
        .filtered("userId = $0", userId);

      setSessions([...realmResults]);
      setLoading(false);
    };

    fetchSessions();
  }, [userId]);

  const handleSessionClick = (session: ChatSession) => {
    if (session.status === "active") {
      navigate(`/details/${session._id.toString()}`);
    }
  };

  const handleNewSessionClick = () => {
    const realm = RealmInstance.getInstance();
    const newChatSession = realm.write(() => {
      return realm.create<ChatSession>("ChatSession", {
        userId,
        startTime: new Date(),
        lastMessagePreview: "",
        status: "active",
        unreadCount: 0,
      });
    });

    navigate(`/details/${newChatSession._id.toString()}`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {sessions.map((session) => (
        <div
          key={session._id.toString()}
          onClick={() => handleSessionClick(session)}
        >
          <p>{session.lastMessagePreview}</p>
          <p>{session.status}</p>
          <p>{session.unreadCount}</p>
        </div>
      ))}
      <button onClick={handleNewSessionClick}>New Chat Session</button>
    </div>
  );
}
