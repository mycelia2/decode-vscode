import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { ChatDetail, RealmInstance } from "../db";
import Downshift from "downshift";
import { debounce } from "lodash";
import ReactMarkdown from "react-markdown";
import vscode from "vscode";
import {
  generateProjectStructure,
  getAutoCompleteSuggestions,
  getElementDetails,
} from "../codeParser";

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
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(event.target.value);
      const workspaceRootPath = vscode.workspace.workspaceFolders
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : undefined;
      if (workspaceRootPath) {
        const results = await getAutoCompleteSuggestions(
          workspaceRootPath,
          event.target.value
        );
        setSuggestions(results);
      }
    },
    300
  );

  /**
   * This function is called when the user selects a file from the dropdown list.
   * It updates the input value with the selected file path.
   */
  const handleSelect = async (
    selectedItem: { name: string; filePath: string } | null
  ) => {
    if (selectedItem) {
      const details = await getElementDetails(
        selectedItem.name,
        selectedItem.filePath
      );
      if (details) {
        setInputValue(
          `${inputValue}\n${details.type}: ${details.name}\n${details.code}`
        );
      } else {
        setInputValue(selectedItem.filePath);
      }
    }
  };

  /**
   * This function is called when the user selects a file from the dropdown list.
   * It updates the input value with the selected file path.
   */
  const handleSendMessage = async () => {
    setIsSending(true);
    // If this is the first message, send the project structure to the AI
    if (details.length === 0) {
      // Get the workspace root path
      const workspaceRootPath = vscode.workspace.workspaceFolders
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : undefined;
      if (workspaceRootPath) {
        const projectStructure = generateProjectStructure(workspaceRootPath, 1);
        // Send the project structure to the extension
        window.parent.postMessage(
          {
            command: "sendMessageToAI",
            message: projectStructure,
          },
          "*"
        );
      }
    }
    // Send a message to the extension
    window.parent.postMessage(
      {
        command: "sendMessageToAI",
        message: inputValue,
      },
      "*"
    );
  };
  const fetchDetails = () => {
    RealmInstance.getInstance().then((realm) => {
      const detailsFromRealm = realm
        .objects<ChatDetail>("ChatDetail")
        .filtered(`sessionId = "${sessionId}"`);
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
      const data = event.data as { command: string; message: string };

      if (data.command === "aiResponse") {
        setAiResponses((prevResponses) => [...prevResponses, data.message]);
        setIsSending(false);

        // Store the AI's response in the ChatDetail Realm object
        RealmInstance.getInstance()
          .then((realm) => {
            realm.write(() => {
              realm.create(ChatDetail, {
                sessionId: sessionId,
                message: data.message,
                timestamp: new Date(),
                sender: "ai",
              });
            });
          })
          .catch((error) => {
            // Handle any errors that may occur here
            console.error("An error occurred:", error);
          });
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
