import React, { SetStateAction, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Realm from "realm"; // Adjusting the import for Realm
import { ChatDetail, FileContents } from "../db";
import Downshift from "downshift";
import { debounce } from "lodash";

export function ChatDetails() {
  // Using camelCase for function name as per ESLint recommendation
  const { sessionId } = useParams();

  // Specifying types explicitly for details and suggestions
  const [details, setDetails] = useState<ChatDetail[]>([]);
  const [suggestions, setSuggestions] = useState<FileContents[]>([]);
  const [loading, setLoading] = useState(true);

  const [inputValue, setInputValue] = useState("");

  const handleInputChange = debounce(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(event.target.value);
      const realmInstance = new Realm({ schema: [FileContents] }); // Using instance of Realm
      const results = realmInstance
        .objects<FileContents>("FileContents")
        .filtered(`...your filter logic...`);
      setSuggestions([...results]);
    },
    300
  );

  const handleSelect = (
    selectedItem: { filePath: SetStateAction<string> } | null
  ) => {
    if (selectedItem) {
      setInputValue(selectedItem.filePath);
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      const realmInstance = new Realm({ schema: [ChatDetail] }); // Using instance of Realm
      const detailsFromRealm = realmInstance
        .objects<ChatDetail>("ChatDetail")
        .filtered("sessionId = $0", sessionId);
      setDetails([...detailsFromRealm]);
      setLoading(false);
    };

    fetchDetails();
  }, [sessionId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {details.map((detail) => (
        <div key={detail._id}>
          <p>{detail.message}</p>
          <p>{detail.timestamp.toString()}</p>
          <p>{detail.sender}</p>
        </div>
      ))}
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
    </div>
  );
}
