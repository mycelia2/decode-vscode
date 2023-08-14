import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { ChatDetail } from "../db";
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

/**
 * ChatDetails component is responsible for displaying the chat details of a specific session.
 * It also provides a search functionality to search for files based on their content.
 * The search results are displayed in a dropdown list.
 * The user can select a file from the dropdown list and send its path as a message to the AI.
 */
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

  const fetchDetails = () => {
    // Replace RealmInstance with RealmApp here
    RealmApp.currentUser?.functions
      .fetchChatDetails(sessionId)
      .then((detailsFromRealm) => {
        setDetails([...detailsFromRealm]);
        setLoading(false);
      });
  };
  /**
   * This effect is responsible for fetching the chat details when the component mounts.
   */
  useEffect(() => {
    fetchDetails();
  }, [sessionId]);

  /**
   * This effect is responsible for handling the messages received from the extension.
   * When a message is received, it updates the aiResponses state with the AI's response.
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as EventData;

      switch (data.command) {
        case "getAutoCompleteSuggestionsResponse":
          setSuggestions(data.results || []);
          break;
        case "getElementDetailsResponse":
          if (data.details) {
            setInputValue(
              `${inputValue}\n${data.details.type}: ${data.details.name}\n${data.details.code}`
            );
          } else {
            setInputValue(data.filePath || "");
          }
          break;
        case "generateProjectStructureResponse":
          window.parent.postMessage(
            {
              command: "sendMessageToAI",
              message: data.projectStructure || "",
            },
            "*"
          );
          break;
        case "aiResponse":
          setAiResponses((prevResponses) => [...prevResponses, data.message]);
          setIsSending(false);
          break;
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  /**
   * This effect is responsible for scrolling the chat container to the bottom whenever a new message is added.
   */
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
