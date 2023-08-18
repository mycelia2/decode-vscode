import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { RealmApp } from "./App";

import Downshift from "downshift";
import { debounce } from "lodash";
import ReactMarkdown from "react-markdown";

type EventData = {
  command: string;
  message: string;
  results?: { name: string; filePath: string }[];
  details?: { type: string; name: string; code: string };
  filePath?: string;
  projectStructure?: string;
};

type ChatDetail = {
  _id: string;
  sessionId: string;
  message: string;
  timestamp: Date;
  sender: string;
};

export function ChatDetails() {
  const { sessionId } = useParams<string>();
  const [details, setDetails] = useState<ChatDetail[]>([]);
  const [suggestions, setSuggestions] = useState<
    { name: string; filePath: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [aiResponses, setAiResponses] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = debounce(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(event.target.value);
      window.parent.postMessage(
        {
          command: "getAutoCompleteSuggestions",
          inputValue: event.target.value,
        },
        "*"
      );
    },
    300
  );

  const handleSelect = (
    selectedItem: { name: string; filePath: string } | null
  ) => {
    if (selectedItem) {
      window.parent.postMessage(
        {
          command: "getElementDetails",
          name: selectedItem.name,
          filePath: selectedItem.filePath,
        },
        "*"
      );
    }
  };

  const handleSendMessage = () => {
    setIsSending(true);
    if (details.length === 0) {
      window.parent.postMessage(
        {
          command: "generateProjectStructure",
          depth: 1,
        },
        "*"
      );
    } else {
      window.parent.postMessage(
        {
          command: "sendMessageToAI",
          message: inputValue,
        },
        "*"
      );
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      // Fetch the chat details from MongoDB using Realm

      const mongodb = RealmApp.currentUser?.mongoClient("mongodb-atlas");

      const chatDetailsCollection = mongodb
        ?.db("decode")
        .collection("chatdetails");

      const changeStream = chatDetailsCollection?.watch({
        filter: { "fullDocument.sessionId": sessionId },
      });

      if (!changeStream) {
        throw new Error("Failed to initialize change stream");
      }

      for await (const change of changeStream) {
        // Handle the change event
        if (change.operationType === "insert") {
          setAiResponses((prevResponses) => [
            ...prevResponses,
            change.fullDocument.message,
          ]);
        }
      }
    };

    fetchDetails();
  }, [sessionId]);

  useEffect(() => {
    chatContainerRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [details, aiResponses]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="chat-container" ref={chatContainerRef}>
        {details.map((detail) => (
          <div
            key={detail._id.toString()}
            className={`message ${detail.sender}`}
          >
            <ReactMarkdown>{detail.message}</ReactMarkdown>
            <p>{detail.timestamp.toString()}</p>
          </div>
        ))}
        {aiResponses.map((response, index) => (
          <div key={index} className="message ai">
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        ))}
      </div>
      <Downshift inputValue={inputValue} onChange={handleSelect}>
        {({
          getInputProps,
          getItemProps,
          getLabelProps,
          getMenuProps,
          isOpen,
          highlightedIndex,
          selectedItem,
        }) => (
          <div>
            <label {...getLabelProps()}>Start typing</label>
            <input {...getInputProps({ onChange: handleInputChange })} />
            <ul {...getMenuProps()}>
              {isOpen &&
                suggestions.map((item, index) => (
                  <li {...getItemProps({ key: item.filePath, index, item })}>
                    {item.filePath}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </Downshift>
      <button onClick={handleSendMessage} disabled={isSending}>
        {isSending ? "Sending..." : "Send"}
      </button>
    </div>
  );
}
