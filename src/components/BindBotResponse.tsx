/* eslint-disable @typescript-eslint/no-explicit-any */
import { Buttons } from "./HTMLComponents/Buttons";
import { Text } from "./HTMLComponents/Text";
import { useState, useEffect } from "react";

export function BindBotResponse(data: any) {
  const [isErrorShown, setIsErrorShown] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    if (
      data?.record?.value &&
      data.record.value.contentType &&
      data.record.value.content
    ) {
      setIsErrorShown(false);
      setLastError(null);
    }
  }, [data]);

  try {
    if (!data?.record?.value || !data.record.value.contentType) {
      if (!isErrorShown) {
        setIsErrorShown(true);
        return (
          <div>
            <Text
              record={{
                value: "Something went wrong, please try again later.",
                role: data?.record?.role,
              }}
            />
          </div>
        );
      } else {
        return null;
      }
    }

    const { contentType, content } = data.record.value;

    const returnComponents = () => {
      switch (contentType) {
        case "txt":
          return (
            <div>
              <Text
                record={{ value: content, role: data?.record?.role }}
                onExportClick={data.record.onExportClick} // **PASS HANDLER**
              />
            </div>
          );

        case "btn":
          return (
            <div className="d-flex flex-column align-items-start">
              <Buttons
                record={{
                  value: content,
                  func: data.record.func,
                  msg: data?.record?.value,
                }}
              />
            </div>
          );

        default:
          return null;
      }
    };

    return <>{returnComponents()}</>;
  } catch (error) {
    console.error("Error BindBotResponse:", error);
  }
}

export default BindBotResponse;
