import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { RealmApp } from "./App";
import Downshift from "downshift";
import { debounce } from "lodash";
import ReactMarkdown from "react-markdown";
import { VsCodeContext } from "./App";
import { ObjectId } from "bson";

type ChatDetail = {
  _id?: ObjectId;
  sessionId: ObjectId;
  message: string;
  timestamp: Date;
  sender: "user" | "ai";
};

export function ChatDetails({ sessionId }: { sessionId: string | null }) {
  const vscode = React.useContext(VsCodeContext);
  const [details, setDetails] = useState<ChatDetail[]>([]);
  const [suggestions, setSuggestions] = useState<
    { name: string; filePath: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [aiResponses, setAiResponses] = useState<string[]>([]);
  const [tempAiResponses, setTempAiResponses] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  if (!vscode) {
    throw new Error("vscode is not defined");
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);

    const atIndex = value.indexOf("@");
    if (
      atIndex !== -1 &&
      atIndex < value.length - 1 &&
      value[atIndex + 1] !== " "
    ) {
      const fileName = value.slice(atIndex + 1);
      vscode.postMessage({
        command: "getAutoCompleteSuggestions",
        inputValue: fileName,
      });
    }
  };

  const onInputChange = handleInputChange;

  const handleSelect = (
    selectedItem: { name: string; filePath: string } | null
  ) => {
    if (selectedItem) {
      vscode.postMessage({
        command: "getElementDetails",
        name: selectedItem.name,
        filePath: selectedItem.filePath,
      });
    }
  };

  const handleSendMessage = async () => {
    setIsSending(true);

    if (sessionId === null) {
      console.error("Session ID must not be null.");
      return;
    }

    const chatDetail: ChatDetail = {
      sessionId: new ObjectId(sessionId), // Convert the sessionId string to an ObjectID
      message: inputValue,
      timestamp: new Date(),
      sender: "user",
    };

    // Save the chat detail to the Realm database
    const mongodb = RealmApp.currentUser?.mongoClient("mongodb-atlas");
    const chatDetailsCollection = mongodb
      ?.db("decode")
      .collection("chatdetails");
    if (!chatDetailsCollection) {
      console.error("Failed to access chat details collection");
      return;
    }

    try {
      await chatDetailsCollection.insertOne(chatDetail);

      setDetails((prevDetails) => [...prevDetails, chatDetail]);

      fetch("http://localhost:8000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: sessionId, message: inputValue }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("No reader available");
          }
          const decoder = new TextDecoder("utf-8");
          let aiResponse = "";
          reader
            .read()
            .then(function processText({ done, value }): Promise<void> {
              if (done) {
                setIsSending(false);
                return Promise.resolve();
              }
              const chunk = decoder.decode(value);

              // Only add non-empty chunks to the response

              aiResponse += chunk;
              setTempAiResponses((prevResponses) => [
                ...prevResponses.slice(0, prevResponses.length - 1),
                aiResponse,
              ]);

              return reader.read().then(processText);
            });
        })
        .catch((error) => {
          console.error("Failed to send message to AI:", error);
          setIsSending(false);
        });
    } catch (error) {
      console.error("Failed to insert chat detail:", error);
      return;
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      // Fetch the chat details from MongoDB using Realm
      const mongodb = RealmApp.currentUser?.mongoClient("mongodb-atlas");
      const chatDetailsCollection = mongodb
        ?.db("decode")
        .collection("chatdetails");
      const chatDetails = await chatDetailsCollection?.find({ sessionId });

      if (!chatDetails) {
        throw new Error("Failed to fetch chat details");
      }

      setDetails(chatDetails);
      setLoading(false); // Set loading to false after fetching details

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
          setTempAiResponses((prevResponses) =>
            prevResponses.filter(
              (response) => response !== change.fullDocument.message
            )
          );
        }
      }
    };

    fetchDetails();
  }, [sessionId]);

  useEffect(() => {
    chatContainerRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [details, aiResponses, tempAiResponses]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="chat-container" ref={chatContainerRef}>
        {details.map((detail) => (
          <div
            key={detail._id?.toString()}
            className={`message ${detail.sender}`}
          >
            <span className="sender">
              {detail.sender === "user" ? "You" : "AI"}:
            </span>
            <ReactMarkdown>{detail.message}</ReactMarkdown>
          </div>
        ))}
        {aiResponses.map((response, index) => (
          <div key={index} className="message ai">
            <span className="sender">AI:</span>
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        ))}
        {tempAiResponses.map((response, index) => (
          <div key={index} className="message ai">
            <span className="sender">AI:</span>
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
            <label {...getLabelProps()}></label>
            <input
              {...getInputProps({
                onChange: onInputChange,
                value: inputValue,
              })}
            />
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
