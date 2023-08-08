import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChatDetail, FileContents, RealmInstance } from "../db";
import Downshift from "downshift";
import { debounce } from "lodash";

export function ChatDetails() {
  const { sessionId } = useParams<string>();
  const [details, setDetails] = useState<ChatDetail[]>([]);
  const [suggestions, setSuggestions] = useState<FileContents[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");

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

  const handleSendMessage = () => {
    const realm = RealmInstance.getInstance();
    realm.write(() => {
      realm.create<ChatDetail>("ChatDetail", {
        sessionId,
        message: inputValue,
        timestamp: new Date(),
        sender: "user",
      });
    });
    setInputValue("");
    fetchDetails();
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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="chat-container">
        {details.map((detail) => (
          <div
            key={detail._id.toString()}
            className={`message ${detail.sender}`}
          >
            <p>{detail.message}</p>
            <p>{detail.timestamp.toString()}</p>
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
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
}
