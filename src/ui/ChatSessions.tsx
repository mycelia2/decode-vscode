import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChatSession, RealmInstance } from "../db";

/**
 * React component to display and manage chat sessions for a user.
 *
 * @export
 * @param {string} userId - The ID of the user whose chat sessions to display.
 * @returns {JSX.Element} A list of chat sessions and a button to create new sessions.
 */
export function ChatSessions({ userId }: { userId: string }) {
  /** List of chat sessions for the user */
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  /** Loading state to determine when the chat sessions are being fetched */
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Fetches chat sessions for the user when the component mounts or userId changes.
   */
  useEffect(() => {
    const fetchSessions = async () => {
      RealmInstance.getInstance()
        .then((realm) => {
          const realmResults = realm
            .objects<ChatSession>("ChatSession")
            .filtered("userId = $0", userId);
          setSessions([...realmResults]);
          setLoading(false);
        })
        .catch((error) => {
          console.error("An error occurred:", error);
        });
    };

    fetchSessions();
  }, [userId]);

  /**
   * Navigates to the details page for the clicked session if the status is "active".
   *
   * @param {ChatSession} session - The selected chat session.
   */
  const handleSessionClick = (session: ChatSession) => {
    if (session.status === "active") {
      navigate(`/details/${session._id.toString()}`);
    }
  };

  /**
   * Creates a new chat session and navigates to its details page.
   */
  const handleNewSessionClick = async () => {
    try {
      const realm = await RealmInstance.getInstance();

      const newChatSession = realm.write(() => {
        return realm.create<ChatSession>("ChatSession", {
          userId,
          startTime: new Date(),
          lastMessagePreview: "",
          status: "active",
          unreadCount: 0,
        });
      });

      if (newChatSession && newChatSession._id) {
        navigate(`/details/${newChatSession._id.toString()}`);
      } else {
        console.error("Failed to create new chat session");
      }
    } catch (error) {
      console.error("An error occurred while creating a new session:", error);
    }
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
