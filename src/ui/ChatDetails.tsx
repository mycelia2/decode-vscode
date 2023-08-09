import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { ChatDetail, FileContents, RealmInstance } from "../db";
import Downshift from "downshift";
import { debounce } from "lodash";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { solarizedlight } from "react-syntax-highlighter/dist/esm/styles/prism";

export function ChatDetails() {
  const { sessionId } = useParams<string>();
  const [details, setDetails] = useState<ChatDetail[]>([]);
  const [suggestions, setSuggestions] = useState<FileContents[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [aiResponses, setAiResponses] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = debounce(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(event.target.value);
      const realm = RealmInstance.getInstance();
      const results = realm
        .objects<FileContents>("FileContents")
        .filtered(`content CONTAINS "${event.target.value}"`);
      setSuggestions([...results]);
    },
    300
  );

  const handleSelect = (selectedItem: { filePath: string } | null) => {
    if (selectedItem) {
      setInputValue(selectedItem.filePath);
    }
  };

  const handleSendMessage = async () => {
    setIsSending(true);
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
    const realm = RealmInstance.getInstance();
    const detailsFromRealm = realm
      .objects<ChatDetail>("ChatDetail")
      .filtered(`sessionId = "${sessionId}"`);
    setDetails([...detailsFromRealm]);
    setLoading(false);
  };

  useEffect(() => {
    fetchDetails();
  }, [sessionId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as { command: string; message: string };

      if (data.command === "aiResponse") {
        setAiResponses((prevResponses) => [...prevResponses, data.message]);
        setIsSending(false);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

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
