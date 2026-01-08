/* eslint-disable @typescript-eslint/no-explicit-any */
// Sequence 1.1: Import necessary React hooks
import React, { useState, useEffect, useRef } from "react";
// Sequence 1.2: Import custom components for chat display
import BindBotResponse from "../BindBotResponse";
import { ChatHistory, ChatMessage } from "../../interface/ChatBotInterface";
import {
  makeAgentRequest,
  postErrorAPI,
  fetchChunkBoundingBoxData,
} from "../../service/Api";
import DocumentModalPopup from "../DocumentModalPopup";
import {
  ChunkHighlight,
  CrashReportChunk,
  SummaryPoint,
} from "../../interface/DeepDiveSummary";
import { tr } from "date-fns/locale";

interface ChatBotComponentProps {
  setMainLoader?: (loading: boolean) => void;
}

const ChatBotComponent: React.FC<ChatBotComponentProps> = ({
  setMainLoader,
}) => {
  // Sequence 1.5: Initialize important state variables and refs
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [inputVal, setInputVal] = useState<string>("");
  const [errorDisplayed, setErrorDisplayed] = useState<boolean>(false);

  const [isWaitingForResponse, setIsWaitingResponse] = useState<boolean>(false);
  const [loader, setLoader] = useState<boolean>(false);
  const [isInputDisabled, setIsInputDisabled] = useState<boolean>(
    sessionStorage.getItem("InputDisabled") == "true" ? true : false
  );

  // Sequence 1.6: Initialize chatMessages with data from sessionStorage or create default
  const initialChatMessages: ChatHistory = JSON.parse(
    sessionStorage.getItem("chatMessages") ||
      JSON.stringify({
        chatConversation: [
          {
            role: "bot",
            content: "Hi, How can I assist you?",
            contentType: "txt",
            chatId: "",
          },
        ],
        conversationId: 0,
        email: sessionStorage.getItem("emailID") || "",
        userName: sessionStorage.getItem("userName") || "",
        caseId: sessionStorage.getItem("caseID") || "",
        userId: sessionStorage.getItem("userID") || "",
      })
  );

  const [chatMessages, setChatMessages] =
    useState<ChatHistory>(initialChatMessages);

  // Sequence 1.7: Get JWT token and other session data
  const jwtToken = sessionStorage.getItem("jwtToken") || "";
  const caseID = sessionStorage.getItem("caseID");

  // Added Chunk-based highlighting states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedChatPoint, setSelectedChatPoint] =
    useState<SummaryPoint | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [chunkData, setChunkData] = useState<CrashReportChunk[]>([]);
  const [currentChunkHighlights, setCurrentChunkHighlights] = useState<
    ChunkHighlight[]
  >([]);
  const [availableDocuments, setAvailableDocuments] = useState<
    Array<{ documentName: string }>
  >([]);
  const [currentDocumentName, setCurrentDocumentName] = useState<string>("");

  // Sequence 1.12: Profile photo handling
  // eslint-disable-next-line prefer-const
  let profilePhoto = sessionStorage.getItem("profilePhoto");
  const sanitizeImageUrl = (url: any) => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      if (!["http:", "https:", "data:"].includes(parsed.protocol)) {
        return null;
      }
      return url;
    } catch {
      return null;
    }
  };
  const safeProfilePhoto =
    sanitizeImageUrl(profilePhoto) || "assets/images/user-profile.svg";

  // Sequence 1.9: useEffect for scrolling and saving chat
  useEffect(() => {
    scrollToBottom();
    saveChatToLocal();
  }, [chatMessages]);

  useEffect(() => {
    setIsInputDisabled(sessionStorage.getItem("InputDisabled") == "true");
  }, [sessionStorage.getItem("InputDisabled")]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const saveChatToLocal = () => {
    sessionStorage.setItem("chatMessages", JSON.stringify(chatMessages));
  };

  const handleSend = () => {
    if (inputVal.trim() === "") return;

    if (isWaitingForResponse) return;
    const newMessage: ChatMessage = {
      role: "user",
      content: inputVal,
      contentType: "txt",
      chatId: "",
    };
    setChatMessages((previousMessages) => ({
      ...previousMessages,
      chatConversation: [...previousMessages.chatConversation, newMessage],
    }));
    setInputVal("");
    setIsWaitingResponse(true);
    getChatResponse(inputVal);
  };

  // SQ 4.0 to 4.32 This function handles chatbot interactions by sending user messages to the backend API and processing the bot's structured responses containing
  // summary points with associated chunk IDs. It maintains conversation history by appending the new user message, transforms bot responses from the API into a
  // standardized format where bot messages contain arrays of points with chunk references, and updates the conversation state with a new conversation ID.
  // The function includes error handling that displays a user-friendly error message when the API fails, removes previous error messages when retrying, and logs
  // errors to a separate tracking API while managing loading states and input field availability based on conversation status.
  const getChatResponse = async (userInput: string) => {
    try {
      setLoader(true);

      const body = {
        chatConversation: [
          ...chatMessages.chatConversation,
          { role: "user", content: userInput, contentType: "txt" },
        ],
        conversationId: 0,
        email: chatMessages.email,
        userName: chatMessages.userName,
        caseId: chatMessages.caseId,
        userId: chatMessages.userId,
      };

      const response = await makeAgentRequest(body, jwtToken);
      const responseData = response.data;

      if (response.status == 200) {
        const newConversationId = responseData.data.conversationId;

        const newBotMessages = responseData.data.chatConversation.map(
          (msg: any) => ({
            role: msg.role,
            content: msg.content, // Keep as array or string
            contentType: msg.contentType || "txt",
            options: msg.options || undefined,
            chatId: msg.chatId || undefined,
          })
        );

        if (newConversationId === 1) {
          setIsInputDisabled(false);
          sessionStorage.setItem("InputDisabled", "false");
        }

        const updatedChatHistory: ChatHistory = {
          chatConversation: newBotMessages,
          conversationId: newConversationId,
          email: chatMessages.email,
          userName: chatMessages.userName,
          caseId: chatMessages.caseId,
          userId: chatMessages.userId,
        };
 
        try {
          sessionStorage.setItem("chatMessages", JSON.stringify(updatedChatHistory));
          console.log(" Chat saved to sessionStorage:", updatedChatHistory);
        } catch (storageError) {
          console.error("Failed to save to sessionStorage:", storageError);
        }
 

        if (errorDisplayed) {
          function removeErrorAndPrevious(conversation: any) {
            const filteredConvo = [];
            let i = 0;
            while (i < conversation.length) {
              if (
                i + 1 < conversation.length &&
                conversation[i + 1].contentType === "error"
              ) {
                i += 2;
              } else {
                filteredConvo.push(conversation[i]);
                i += 1;
              }
            }
            return filteredConvo;
          }

          const filteredConvo = removeErrorAndPrevious(newBotMessages);
          setChatMessages((prev) => {
            const conversationWithoutError = prev.chatConversation.slice(
              0,
              prev.chatConversation.length - 1
            );
            console.log(
              "conversationWithoutError",
              conversationWithoutError,
              newBotMessages
            );
            return {
              ...prev,
              conversationId: newConversationId,
              chatConversation: [...filteredConvo],
            };
          });
          setErrorDisplayed(false);
        } else {
          setChatMessages((prev) => ({
            ...prev,
            conversationId: newConversationId,
            chatConversation: newBotMessages,
          }));
        }
      } else {
        if (!errorDisplayed) {
          const errorMessage: ChatMessage = {
            role: "bot",
            content: "Something went wrong. Please try again.",
            contentType: "error",
            chatId: " ",
          };

          setChatMessages((prev) => ({
            ...prev,
            chatConversation: [...prev.chatConversation, errorMessage],
          }));

          setErrorDisplayed(true);
        }
      }
    } catch (error) {
      const errorAPI = async () => {
        try {
          const errorDescription =
            error instanceof Error ? error.message : String(error);
          const errorFunction = "getChatResponse";
          const errorSource = "BE";
          const payload = { errorDescription, errorFunction, errorSource };
          await postErrorAPI(payload);
        } catch {
          console.error("Error fetching case details:", error);
        }
      };
      await errorAPI();
      console.error("API Error:", error);
    } finally {
      setLoader(false);
      setIsWaitingResponse(false);
    }
  };

  const handleTryAgain = () => {
    setIsWaitingResponse(true);
    if (errorDisplayed) {
      const lastUserMessage = chatMessages.chatConversation
        .filter((msg) => msg.role === "user")
        .slice(-1)[0];
      if (lastUserMessage) {
        // User messages are always strings, so extract the string content
        const userContent =
          typeof lastUserMessage.content === "string"
            ? lastUserMessage.content
            : "";
        getChatResponse(userContent);
      } else {
        setIsWaitingResponse(false);
      }
    } else {
      getChatResponse(inputVal);
    }
  };

  const handleFeedbackClick = (option: string) => {
    setIsWaitingResponse(true);
    getChatResponse(option);
    setIsInputDisabled(false);
    sessionStorage.setItem("InputDisabled", "false");
  };

  // SQ : 2.0 -> 2.11 This function handles clicks on export/view icons next to chatbot response points by fetching chunk bounding box data and
  // opening a modal to display the source documents with highlights. It validates that chunk IDs exist, retrieves highlight coordinates for all
  // referenced chunks via API, extracts unique document names from the chunks, and sets up the modal to display the first document with its filtered highlights.
  // The function manages global loading state, stores chunk data in context for document viewer access, and includes error handling to gracefully fail if no chunks are available or the API request fails.
  const handleExportIconClick = async (pointObj: {
    point: string;
    chunkIds: string[];
  }) => {
    try {
      if (setMainLoader) {
        setMainLoader(true); // ← Main application loader ON
      }

      console.log("Export icon clicked for point:", pointObj.point);
      console.log("Chunk IDs:", pointObj.chunkIds);

      // **STEP 1: Fetch chunk bounding box data**
      const chunkResponse = await fetchChunkBoundingBoxData(
        pointObj.chunkIds,
        jwtToken
      );

      console.log("Chunk response:", chunkResponse);

      if (chunkResponse.statusCode === 200) {
        // **STEP 2: Store chunk data**
        setChunkData(chunkResponse.data);

        // **STEP 3: Extract unique documents - CORRECTED WITH PROPER TYPE ASSERTION**
        const documentNames = chunkResponse.data.map(
          (chunk: CrashReportChunk) => chunk.documentName
        );
        const uniqueDocumentNames = Array.from(
          new Set(documentNames)
        ) as string[];
        const uniqueDocuments = uniqueDocumentNames.map((docName) => ({
          documentName: docName,
        }));

        console.log("Unique documents for dropdown:", uniqueDocuments);

        setAvailableDocuments(uniqueDocuments);

        // **STEP 4: Get chunk highlights for ALL documents**
        const highlights = getChunkHighlights(
          pointObj.chunkIds,
          chunkResponse.data
        );
        console.log("Generated highlights:", highlights);

        setCurrentChunkHighlights(highlights);

        // **STEP 5: Set selected point**
        setSelectedChatPoint({
          point: pointObj.point,
          chunkIds: pointObj.chunkIds,
        });

        // **STEP 6: Set first document as current**
        if (uniqueDocuments.length > 0) {
          setCurrentDocumentName(uniqueDocuments[0].documentName);
          console.log(
            "Initial document set to:",
            uniqueDocuments[0].documentName
          );
        }

        // **STEP 7: Open modal**
        setIsModalOpen(true);
        console.log("Modal opened");
      }
    } catch (error) {
      console.error("Error fetching chunk data:", error);
    } finally {
      if (setMainLoader) {
        setMainLoader(false); // ← Main application loader OFF
      }
    }
  };

  const getChunkHighlights = (
    chunkIds: string[],
    chunks: CrashReportChunk[],
    documentName?: string
  ): ChunkHighlight[] => {
    const highlights: ChunkHighlight[] = [];

    chunkIds.forEach((chunkId) => {
      // Find matching chunk
      const matchingChunk = chunks.find(
        (chunk) =>
          chunk.chunkUniqueId === chunkId &&
          (!documentName || chunk.documentName === documentName)
      );

      if (matchingChunk) {
        // Extract all bounding boxes from this chunk
        matchingChunk.chunkBoundingBox.forEach((boundingBoxWord) => {
          highlights.push({
            page_index: boundingBoxWord.page_index,
            bounding_box: boundingBoxWord.bounding_box,
            word: boundingBoxWord.word,
            documentName: matchingChunk.documentName,
            chunkId: chunkId,
          });
        });
      }
    });

    console.log(
      `Generated ${highlights.length} highlights for document: ${
        documentName || "all"
      }`
    );
    return highlights;
  };

  const handleModalClose = () => {
    console.log("Modal closed");
    setIsModalOpen(false);
    setSelectedChatPoint(null);
    setChunkData([]);
    setCurrentChunkHighlights([]);
    setAvailableDocuments([]);
    setCurrentDocumentName("");
  };

  const handleDocumentChange = (
    documentName: string,
    highlights: ChunkHighlight[]
  ) => {
    console.log("Document changed to:", documentName);
    console.log("Highlights for this document:", highlights.length);
    setCurrentDocumentName(documentName);
  };

  const BindConversationData = (conversation: ChatMessage[]) => {
    return (
      conversation &&
      conversation.map((mesg, index) => (
        <React.Fragment key={index}>
          {mesg.role === "bot" ? (
            <div
              className={`d-flex justify-content-start mb-3 ${
                mesg.contentType === "error" ? "error-message" : ""
              }`}
            >
              <div className="me-2 d-flex align-items-end">
                <div className="rounded-circle p-2 d-flex align-items-center justify-content-center">
                  <img src="assets/images/chat-convo.svg" alt="Chat Icon" />
                </div>
              </div>
              <div className="d-flex flex-column align-items-start">
                <div className="px-4 pb-3 pt-4 custom-border-chat-left bg-white w-100 border">
                  {mesg.contentType === "txt" && (
                    <BindBotResponse
                      record={{
                        value: mesg,
                        role: mesg.role,
                        func: handleFeedbackClick,
                        onExportClick: handleExportIconClick,
                      }}
                    />
                  )}

                  {mesg.contentType === "error" && (
                    <div className="d-flex align-items-center gap-2">
                      <div className="px-4 py-3 custom-border-chat-left bg-light w-75 error-state">
                        {typeof mesg.content === "string"
                          ? mesg.content
                          : "An error occurred. Please try again."}
                      </div>
                      <img
                        src="assets/images/refresh-icon.svg"
                        onClick={handleTryAgain}
                        style={{ cursor: "pointer" }}
                        alt="refresh-icon"
                      ></img>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="d-flex justify-content-end mb-3">
              <div className="d-flex flex-column align-items-end">
                <div className="px-4 py-3 custom-border-chat-right bg-primary text-white w-100">
                  <BindBotResponse record={{ value: mesg, role: mesg.role }} />
                </div>
              </div>
              <div className="ms-2 d-flex align-items-end">
                <img
                  src={safeProfilePhoto}
                  alt="User"
                  className="rounded-circle profile-image"
                />
              </div>
            </div>
          )}
        </React.Fragment>
      ))
    );
  };

  // Resize logic (existing)
  const [dimensions, setDimensions] = useState({
    height: "480px",
    isResizing: false,
    startY: 0,
    startHeight: 0,
  });

  const startResize = (e: any) => {
    setDimensions((prev) => ({
      ...prev,
      isResizing: true,
      startY: e.clientY,
      startHeight: parseInt(prev.height, 10) || window.innerHeight - 270,
    }));
  };

  useEffect(() => {
    const handleMouseMove = (e: any) => {
      if (!dimensions.isResizing) return;

      const newHeight =
        dimensions.startHeight + (e.clientY - dimensions.startY);
      const minHeight = 150;
      const maxHeight = 480;

      setDimensions((prev) => ({
        ...prev,
        height: `${Math.max(minHeight, Math.min(maxHeight, newHeight))}px`,
      }));
    };

    const handleMouseUp = () => {
      setDimensions((prev) => ({ ...prev, isResizing: false }));
    };

    if (dimensions.isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dimensions.isResizing]);

  return (
    <>
      <div className="card-body p-0">
        <h5 className="d-flex justify-content-between align-items-center mb-0 card-title custom-card-title py-2">
          <span>US Claims Assistant</span>
        </h5>

        <div
          className="bg-white rounded-4 shadow-sm d-flex flex-column"
          style={{
            height: dimensions.height,
            transition: dimensions.isResizing ? "none" : "height 0.2s ease",
            position: "relative",
          }}
        >
          <div />

          <div
            className="flex-grow-1 p-4 overflow-auto"
            style={{
              height: `calc(100% - ${dimensions.isResizing ? "0px" : "80px"})`,
              minHeight: "calc(100% - 80px)",
            }}
            ref={chatContainerRef}
          >
            {BindConversationData(chatMessages.chatConversation)}
            {loader && (
              <div className="chat-content font-14 font-regular">
                <div className="me-2 d-flex align-items-end">
                  <div className="d-flex align-items-center">
                    <div className="rounded-circle p-2 d-flex align-items-center justify-content-center">
                      <img src="assets/images/chat-convo.svg" alt="Chat Icon" />
                    </div>
                    <div className="dot-typing ms-2"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-top">
            <div className="input-group">
              <input
                type="text"
                className="form-control border-0 bg-light rounded-pill me-2"
                placeholder="Type your message"
                value={inputVal}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                onChange={(e) => setInputVal(e.target.value)}
                disabled={isInputDisabled || isWaitingForResponse}
              />
              <button
                className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center"
                onClick={handleSend}
                disabled={isInputDisabled || isWaitingForResponse}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-send"
                >
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </div>
          </div>

          <div
            className="resize-handle bottom"
            onMouseDown={startResize}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "8px",
              cursor: "ns-resize",
              zIndex: 10,
              backgroundColor: "transparent",
            }}
          />
        </div>
      </div>

      <DocumentModalPopup
        isOpen={isModalOpen}
        onClose={handleModalClose}
        selectedPoint={selectedChatPoint}
        availableDocuments={availableDocuments}
        currentChunkHighlights={currentChunkHighlights}
        caseID={caseID}
        jwtToken={jwtToken}
        setMainLoader={setMainLoader || (() => {})}
        currentDocumentName={currentDocumentName}
        onDocumentChange={handleDocumentChange}
      />
    </>
  );
};

export default ChatBotComponent;
