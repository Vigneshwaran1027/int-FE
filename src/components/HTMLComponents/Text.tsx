import React, { useEffect, useState } from "react";

interface ChatPoint {
  chunkIds: string[];
  point: string;
}

interface TextProps {
  record: {
    value: string | ChatPoint[];
    role: string;
  };
  onExportClick?: (pointObj: ChatPoint) => void;
}

const linkStyle = {
  color: "inherit",
  textDecoration: "underline",
  cursor: "pointer",
};

export const Text: React.FC<TextProps> = ({
  record,
  onExportClick,
}: TextProps) => {
  const [pointsArr, setPointsArr] = useState<ChatPoint[]>([]);

  useEffect(() => {
    if (record?.value) {
      parseContent(record.value);
    }
  }, [record]);

  const parseContent = (content: string | ChatPoint[]) => {
    try {
      // Check if content is array of points
      if (Array.isArray(content)) {
        setPointsArr(content);
        return;
      }

      // Plain text parsing
      let points: string[];
      if (/:|\n|\d+\./.test(content)) {
        points = content.split(/:|\n/).filter((item) => item.trim() !== "");
      } else if (
        /[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u25FC\u25FD\u25FE\u25AA\u00B7\u00D8\u00B0\u2219]/.test(
          content
        )
      ) {
        points = content
          .split(
            /[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u25FC\u25FD\u25FE\u25AA\u00B7\u00D8\u00B0\u2219]/
          )
          .filter((item) => item.trim() !== "");
      } else {
        points = [content.trim()];
      }

      // Convert to ChatPoint format for backward compatibility
      setPointsArr(points.map((p) => ({ point: p, chunkIds: [] })));
    } catch (error) {
      console.error("Error parsing content:", error);
    }
  };

  const renderText = (text: string) => {
    try {
      const urlRegex = /<?(https?:\/\/[^\s>]+)>?/g;
      const parts = text.split(urlRegex);

      return parts.map((part, index) => {
        const match = part.match(urlRegex);
        if (match) {
          let url = match[0].replace(/^<|>$/g, "");
          url = url.replace(/[.,!?]+$/, "");
          return (
            <a
              className="ai-bot-content-link"
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              {url}
            </a>
          );
        }
        return part;
      });
    } catch (error) {
      console.error("Error rendering text:", error);
      return "Something went wrong, please try again later.";
    }
  };

  // Render point with export icon
  const renderPoint = (pointObj: ChatPoint, index: number) => {
    const hasChunks = pointObj.chunkIds && pointObj.chunkIds.length > 0;

    return (
      <p className="points d-flex align-items-start gap-2" key={index}>
        <span>
          {renderText(pointObj.point)}
          {hasChunks && onExportClick && (
            <img
              src="assets/images/export-icon.svg"
              alt="export-icon"
              className="export-icon-chat"
              style={{
                cursor: "pointer",
                marginTop: "2px",
                width: "16px",
                height: "15px",
              }}
              onClick={() => onExportClick(pointObj)}
            />
          )}
        </span>
      </p>
    );
  };

  return (
    <>
      {record?.role === "bot" ? (
        <span>
          {pointsArr?.map((pointObj, index) => renderPoint(pointObj, index))}
        </span>
      ) : (
        renderText((record?.value as string) || "")
      )}
    </>
  );
};
