/* eslint-disable @typescript-eslint/no-explicit-any */
// SQ_DB - 1.1
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  CaseDetailsPayload,
  CaseDocument,
  CaseSummaryData,
  MedicalSummaryItem,
} from "../interface/DashBoardInterface";
import { CaseSummary } from "./dashBoardComponents/CaseOverview";
import { HeaderComponent } from "./Header";
import { WordCloud } from "./dashBoardComponents/WordCloud";
import { MedicalSummary } from "./dashBoardComponents/MedicalSummary";
import ChatBotComponent from "./dashBoardComponents/ChatBot";
import Loader from "./reuseable/Loader";
import {
  postCaseDetails,
  postErrorAPI,
  fetchChunkBoundingBoxData,
} from "../service/Api";
import { useHighlight } from "./HighlightContext";
import { DocumentViewer } from "./dashBoardComponents/DocumentViewer";
import ToastMsg, { ToastMessageState } from "./Toast/ToastMsg";

interface Position {
  x: number;
  y: number;
}

export const Dashboard: React.FC = () => {
  const CHAT_ICON_SIZE = 25;
  const CHAT_WINDOW_WIDTH = 500;
  const CHAT_WINDOW_HEIGHT = 500;
  const MARGIN = 25;

  const navigate = useNavigate();
  const [chatBotOpen, setChatBotOpen] = useState<boolean>(false);
  const [caseSummary, setCaseSummary] = useState<CaseSummaryData>({
    name: "",
    dob: "",
    typeOfIncident: "",
    dateOfIncident: "",
    description: [],
  });
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [medicalEvents, setMedicalEvents] = useState<MedicalSummaryItem[]>([]);
  const [selectedDocumentIndex, setSelectedDocumentIndex] = useState<number>(
    () => {
      const storedIndex = sessionStorage.getItem("selectedIndex");
      return storedIndex ? parseInt(storedIndex, 10) : 0;
    }
  );
  const chatBotRef = useRef<HTMLDivElement | null>(null);
  const chatBotIconRef = useRef<HTMLDivElement | null>(null);

  // const { loader, setGlobalChunkData, setLoader } = useHighlight();

  const {
    loader,
    setGlobalChunkData,
    setLoader,
    setIsChunkFiltering,
    setSelectedSummaryPoint,
    setCurrentChunkHighlights,
    setChunkFilteredDocuments,
    setShowNavigationButtons,
    setHighlightLocations,
    setSelectedWord,
    setCurrentHighlightIndex,
    setSortedChunkGroups,
    setCurrentChunkIndex,
    setHighlightCleared,
  } = useHighlight();

  const [loading, setLoading] = useState(true);
  const [currentCaseID, setCurrentCaseID] = useState<string | null>(null);

  const resetDashboardState = useCallback(() => {
    console.log("🔄 Resetting Dashboard to initial state");
   
    // Reset all chunk-related highlighting state
    setIsChunkFiltering(false);
    setSelectedSummaryPoint(null);
    setCurrentChunkHighlights([]);
    setChunkFilteredDocuments([]);
    setShowNavigationButtons(false);
    setHighlightLocations([]);
    setSelectedWord("");
    setCurrentHighlightIndex(-1);
    setSortedChunkGroups([]);
    setCurrentChunkIndex(0);
    setGlobalChunkData([]);
    setHighlightCleared(true);
   
    // Clear highlight-related session storage
    const keysToRemove = [
      "selectedFile",
      "prevFile",
      "prevFileIndex",
      "prevIndex",
      "allLocationscount"
    ];
   
    keysToRemove.forEach(key => {
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        console.error(`Error removing ${key} from sessionStorage:`, error);
      }
    });
   
    console.log("✅ Dashboard state reset complete");
  }, [
    setIsChunkFiltering,
    setSelectedSummaryPoint,
    setCurrentChunkHighlights,
    setChunkFilteredDocuments,
    setShowNavigationButtons,
    setHighlightLocations,
    setSelectedWord,
    setCurrentHighlightIndex,
    setSortedChunkGroups,
    setCurrentChunkIndex,
    setGlobalChunkData,
    setHighlightCleared,
  ]);
 
  // ✅ NEW: Reset on mount (when entering Dashboard)
  useEffect(() => {
    console.log("📍 Dashboard mounted");
    resetDashboardState();
  }, []); // Only run on initial mount
 
  // ✅ NEW: Reset on unmount (when leaving Dashboard)
  useEffect(() => {
    return () => {
      console.log("📍 Dashboard unmounting");
      resetDashboardState();
    };
  }, [resetDashboardState]);

  // SQ_DB - 1.10
  useEffect(() => {
    const search =
      window.location.search || window.location.hash.split("?")[1] || "";
    const params = new URLSearchParams(search);
    const urlCaseID = params.get("caseID");
    let finalCaseID = urlCaseID;

    if (!finalCaseID) {
      finalCaseID = sessionStorage.getItem("caseID");
    }

    if (finalCaseID && finalCaseID !== currentCaseID) {
      sessionStorage.setItem("caseID", finalCaseID);
      setCurrentCaseID(finalCaseID);
    }
  }, [currentCaseID]);
  const [toastMsg, setToastMsg] = useState<ToastMessageState>({
    show: false,
    message: "",
    success: false,
  });

  // The changes from here is for highlight navigation

  const [JWTtoken, setJWTtoken] = useState<string>("");
  useEffect(() => {
    const token = sessionStorage.getItem("jwtToken") || "";
    setJWTtoken(token);
  }, [sessionStorage.getItem("jwtToken")]);

  const emailID = sessionStorage.getItem("emailID");

  // SQ 2.0 API Call Function to Fetch the updated case details resposne for the chunk based highlition
  //This function polls the backend API to fetch comprehensive case details including patient information, incident summary, associated documents, and medical event timeline.
  // It sends a POST request with the case ID and email credentials, then processes the response to update multiple UI state variables with formatted data. The function includes robust
  // error handling that logs failures to a separate error tracking API, and redirects users to login if authentication fails while preserving the case ID for session recovery.
  const fetchCaseDetails = useCallback(async () => {
    console.log("Polling case details...", sessionStorage.getItem("caseID"));

    const payload: CaseDetailsPayload = {
      caseid: currentCaseID || "",
      email: emailID || "",
    };

    try {
      const response = await postCaseDetails(payload, JWTtoken);
      console.log("Full API response:", response);

      if (!response) {
        const caseID = sessionStorage.getItem("caseID");
        sessionStorage.clear();
        navigate(`/login?caseID=${caseID}`);
        window.location.reload();
        return;
      }

      if (response.status === 200) {
        const caseData = response.data.data;

        const newSummary = {
          name: caseData.caseSummary.name || "-",
          dob: caseData.caseSummary.dob || "-",
          typeOfIncident: caseData.caseSummary.incidentType || "-",
          dateOfIncident: caseData.caseSummary.dateOfIncident || "-",
          description: caseData.caseSummary.summary || [],
        };

        setCaseSummary(newSummary);
        // setDocuments(caseData.documents || []);
        setDocuments((prevDocs) => {
          const newDocs = caseData.documents || [];
          if (JSON.stringify(prevDocs) === JSON.stringify(newDocs)) {
            return prevDocs;
          }
          return newDocs;
        });

        if (caseData.caseSummary.medicalSummary) {
          const formattedMedicalSummary =
            caseData.caseSummary.medicalSummary.map((item: any) => ({
              procedure_name: item.procedure_name,
              procedure_date: item.procedure_date,
              chunkIds: item.chunkIds || [],
            }));
          setMedicalEvents(formattedMedicalSummary);
        } else {
          setMedicalEvents([]);
        }
      }
    } catch (error) {
      console.error("Error polling case details:", error);
      const errorAPI = async () => {
        try {
          const errorDescription =
            error instanceof Error ? error.message : String(error);
          const errorFunction = "fetchCaseDetails";
          const errorSource = "BE";
          const payload = { errorDescription, errorFunction, errorSource };
          await postErrorAPI(payload);
        } catch {
          console.error("Error logging failed:", error);
        }
      };
      await errorAPI();
    } finally {
      setLoading(false);
    }
  }, [currentCaseID, emailID, JWTtoken, navigate]);

  // Fetch data on mount and set up polling
  useEffect(() => {
    if (!JWTtoken || !currentCaseID) {
      return;
    }

    fetchCaseDetails();

    const pollingInterval = 30000;
    const intervalId = setInterval(() => {
      // Call fetchCaseDetails directly, not via the dependency
      fetchCaseDetails();
    }, pollingInterval);
    // Cleanup function
    return () => {
      clearInterval(intervalId);
    };
  }, [JWTtoken, currentCaseID]);

  // SQ : 2.1 to 2.16 Api call function that Handle chunk data fetch fetch ChunkBoundingBox Data
  // API call function based on the oncliick function call from the case summary and medical summary component
  // This function retrieves bounding box coordinates for specific text chunks within documents to enable visual highlighting.
  // It accepts an array of chunk IDs and makes an API call to fetch their location data, which is then stored in global context for the DocumentViewer component to render highlights on the corresponding document pages.
  const handleFetchChunkData = async (chunkIds: string[], point: string) => {
    try {
      console.log("Fetching chunk data for point:", point);

      // Call the API to get chunk bounding box data
      const response = await fetchChunkBoundingBoxData(
        // currentCaseID,
        chunkIds,
        JWTtoken
      );

      if (response.statusCode === 200) {
        console.log("Chunk data received:", response.data);

        // Store in global context for use in DocumentViewer
        setGlobalChunkData(response.data);

        return response.data;
      } else {
        console.error("No chunk data in response");
        setToastMsg({
          show: true,
          message: "Failed to fetch highlight data",
          success: false,
        });
      }
    } catch (error) {
      console.error("Error fetching chunk data:", error);
      setToastMsg({
        show: true,
        message: "Error loading highlight data",
        success: false,
      });
    }
  };

  // Click outside handler for chat
  function handleClickOutside(event: any) {
    if (
      chatBotRef.current &&
      !chatBotRef.current.contains(event.target) &&
      chatBotIconRef.current &&
      !chatBotIconRef.current.contains(event.target)
    ) {
      setChatBotOpen(false);
    }
  }

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleDeepDiveSummary = () => {
    navigate("/deepdive", { state: { key: Date.now() } });
  };

  // Chat positioning logic
  const [iconPosition, setIconPosition] = useState<Position>({
    x: window.innerWidth - CHAT_ICON_SIZE - 85,
    y: window.innerHeight - CHAT_ICON_SIZE - 85,
  });
  const [isInitialRender, setIsInitialRender] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });

  // SQ 3.2 Chat positioning logic which is to access the chat window
  const getChatWindowPosition = (): Position => {
    try {
      if (
        typeof CHAT_ICON_SIZE !== "number" ||
        typeof CHAT_WINDOW_WIDTH !== "number" ||
        typeof CHAT_WINDOW_HEIGHT !== "number"
      ) {
        throw new Error("Missing required size constants");
      }

      const windowWidth = typeof window !== "undefined" ? window.innerWidth : 0;
      const windowHeight =
        typeof window !== "undefined" ? window.innerHeight : 0;
      const margin = isInitialRender ? 85 : 25;

      const safeIconPosition = {
        x: Math.max(0, iconPosition?.x || 0),
        y: Math.max(0, iconPosition?.y || 0),
      };

      const spaceRight = Math.max(
        0,
        windowWidth - safeIconPosition.x - CHAT_ICON_SIZE
      );
      const spaceLeft = Math.max(0, safeIconPosition.x);
      const spaceBelow = Math.max(
        0,
        windowHeight - safeIconPosition.y - CHAT_ICON_SIZE
      );

      let left = safeIconPosition.x;
      let top = safeIconPosition.y;

      if (spaceRight >= CHAT_WINDOW_WIDTH + margin) {
        left = safeIconPosition.x + CHAT_ICON_SIZE + margin;
      } else if (spaceLeft >= CHAT_WINDOW_WIDTH + margin) {
        left = safeIconPosition.x - CHAT_WINDOW_WIDTH - margin;
      } else if (spaceBelow >= CHAT_WINDOW_HEIGHT + margin) {
        left = Math.max(
          margin,
          Math.min(safeIconPosition.x, windowWidth - CHAT_WINDOW_WIDTH - margin)
        );
        top = safeIconPosition.y + CHAT_ICON_SIZE + margin;
      } else {
        left = Math.max(
          margin,
          Math.min(safeIconPosition.x, windowWidth - CHAT_WINDOW_WIDTH - margin)
        );
        top = safeIconPosition.y - CHAT_WINDOW_HEIGHT - margin;
      }

      const newPosition = {
        x: Math.max(
          margin,
          Math.min(left, windowWidth - CHAT_WINDOW_WIDTH - margin)
        ),
        y: Math.max(
          margin,
          Math.min(top, windowHeight - CHAT_WINDOW_HEIGHT - margin)
        ),
      };

      if (isInitialRender && typeof setIsInitialRender === "function") {
        setIsInitialRender(false);
      }

      return newPosition;
    } catch (error) {
      console.error("Error calculating chat window position:", error);
      return {
        x:
          typeof window !== "undefined"
            ? Math.max(25, (window.innerWidth - CHAT_WINDOW_WIDTH) / 2)
            : 25,
        y:
          typeof window !== "undefined"
            ? Math.max(25, (window.innerHeight - CHAT_WINDOW_HEIGHT) / 2)
            : 25,
      };
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - iconPosition.x,
      y: e.clientY - iconPosition.y,
    });
    e.preventDefault();
  };

  // SQ_DB - 4.1
  const handleMouseUp = (): void => {
    setIsDragging(false);
  };
  // SQ_DB - 2.1
  const handleClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault();
    if (!isDragging) {
      setChatBotOpen(!chatBotOpen);
    }
  };

  // UseEffect to Dragging and drag Start the chat Icon
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const [zoomLevel, setZoomLevel] = useState(1);
  const handleMouseMove = (e: MouseEvent): void => {
    if (!isDragging) return;

    const newX = Math.max(
      MARGIN,
      Math.min(
        (e.clientX - dragStart.x) / zoomLevel,
        window.innerWidth - CHAT_ICON_SIZE - MARGIN
      )
    );
    const newY = Math.max(
      MARGIN,
      Math.min(
        (e.clientY - dragStart.y) / zoomLevel,
        window.innerHeight - CHAT_ICON_SIZE - MARGIN
      )
    );

    setIconPosition({
      x: newX,
      y: newY,
    });
  };
  const lastClientSize = useRef({ width: 0, height: 0 });

  // SQ : 4.2 useF=Effect to handleZoomOrResize the chat bot
  useEffect(() => {
    const handleZoomOrResize = () => {
      if (!window.visualViewport) {
        // Fallback for browsers without visualViewport
        const zoom =
          Math.round((window.outerWidth / window.innerWidth) * 100) / 100;
        setZoomLevel(zoom);
        return;
      }

      const viewport = window.visualViewport;
      setZoomLevel(viewport.scale);

      // Adjust icon position to maintain relative position
      const relativeX =
        iconPosition.x / (lastClientSize.current.width || window.innerWidth);
      const relativeY =
        iconPosition.y / (lastClientSize.current.height || window.innerHeight);

      const newX = relativeX * viewport.width;
      const newY = relativeY * viewport.height;

      setIconPosition({
        x: Math.max(
          MARGIN,
          Math.min(newX, viewport.width - CHAT_ICON_SIZE - MARGIN)
        ),
        y: Math.max(
          MARGIN,
          Math.min(newY, viewport.height - CHAT_ICON_SIZE - MARGIN)
        ),
      });

      lastClientSize.current = {
        width: viewport.width,
        height: viewport.height,
      };
    };

    // Initialize
    lastClientSize.current = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleZoomOrResize);
      window.visualViewport.addEventListener("scroll", handleZoomOrResize);
    } else {
      window.addEventListener("resize", handleZoomOrResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleZoomOrResize);
        window.visualViewport.removeEventListener("scroll", handleZoomOrResize);
      } else {
        window.removeEventListener("resize", handleZoomOrResize);
      }
    };
  }, [iconPosition.x, iconPosition.y]);
  const chatWindowPosition = getChatWindowPosition();

  // SQ 5.1 Render DocumentViewer component with props:\ndocumentDetails, selectedDocumentIndex,
  //  setSelectedDocumentIndex
  const documentViewer = useMemo(
    () => (
      <div className="card shadow-sm h-100">
        <DocumentViewer
          documentDetails={documents}
          selectedDocumentIndex={selectedDocumentIndex}
          setSelectedDocumentIndex={setSelectedDocumentIndex}
        />
      </div>
    ),
    [documents, selectedDocumentIndex, setSelectedDocumentIndex]
  );

  return (
    <>
      <div className={` ${loader ? "" : ""}`}>
        <nav className="navbar navbar-expand-lg py-1">
          <HeaderComponent />
        </nav>
        <div className="container-fluid mb-4">
          <div className="row">
            <div className="col-md-12 d-flex justify-content-between align-items-center mt-3 mb-3">
              <h5 className="fs-4 fw-semibold">Dashboard</h5>
              <a
                onClick={handleDeepDiveSummary}
                className="btn btn-primary"
                type="submit"
              >
                Deep Dive Summary
              </a>
            </div>
          </div>
          {loading ? (
            <Loader />
          ) : (
            <div className="row">
              <CaseSummary
                {...caseSummary}
                allDocuments={documents}
                setSelectedDocumentIndex={setSelectedDocumentIndex}
                onFetchChunkData={handleFetchChunkData}
              />
              <div className="col-md-6">{documentViewer}</div>
              <div className="col-md-3">
                <div className="card shadow-sm">
                  <WordCloud
                    wordDetails={
                      documents[selectedDocumentIndex]?.wordCloudData || []
                    }
                  />
                </div>
                <div className="card mt-4 shadow-sm">
                  <MedicalSummary
                    medicalSummary={medicalEvents}
                    allDocuments={documents}
                    setSelectedDocumentIndex={setSelectedDocumentIndex}
                    onFetchChunkData={handleFetchChunkData} // Add this prop
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          ref={chatBotIconRef}
          className="position-fixed z-3 d-flex align-items-center justify-content-center"
          style={{
            cursor: isDragging ? "grabbing" : "pointer",
            left: `${iconPosition.x}px`,
            top: `${iconPosition.y}px`,
            // zIndex: 1000,
            width: `${CHAT_ICON_SIZE}px`,
            height: `${CHAT_ICON_SIZE}px`,
            userSelect: "none",
          }}
          onMouseDown={handleMouseDown}
          onClick={(e) => {
            handleClick(e);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setChatBotOpen(!chatBotOpen)}
        >
          {chatBotOpen ? (
            <img
              src="assets/images/chat-close-icon.svg"
              alt="Close chat"
              style={{ pointerEvents: "none" }}
            />
          ) : (
            <img
              src="assets/images/chat.svg"
              alt="Open chat"
              style={{ pointerEvents: "none" }}
            />
          )}
        </div>

        {chatBotOpen && (
          <div
            ref={chatBotRef}
            className="position-fixed"
            style={{
              left: `${chatWindowPosition.x}px`,
              top: `${chatWindowPosition.y}px`,
              zIndex: 999,
              width: `${CHAT_WINDOW_WIDTH}px`,
              height: `${CHAT_WINDOW_HEIGHT}px`,
              backgroundColor: "transparent",
              borderRadius: "0.5rem",
            }}
          >
            <div className="h-100">
              <ChatBotComponent setMainLoader={setLoader} />
            </div>
          </div>
        )}

        <ToastMsg toastMsg={toastMsg} setToastMsg={setToastMsg} />
      </div>
      {loader && <Loader />}
    </>
  );
};
