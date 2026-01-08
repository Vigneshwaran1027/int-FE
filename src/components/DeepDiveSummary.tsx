/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
//SQ_NO-1.2
import React, { useEffect, useRef, useState, useCallback } from "react";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
//SQ_NO-1.3
import {
  APIResponse,
  DeepDiveWordCloud,
  WordListPopup,
  HighlightType,
  WordCloudItem,
  SummaryPoint,
  SummaryResponse,
  ChunkHighlight,
  CrashReportChunk,
  CrashReportData,
} from "../interface/DeepDiveSummary";
import { HeaderComponent } from "./Header";
import { BreadCrumbs } from "./reuseable/BreadCrums";
import DatePicker from "react-datepicker";
import Loader from "./reuseable/Loader";
import {
  fetchBinaryContent,
  fetchDocuments,
  fetchSummary,
  postErrorAPI,
  fetchChunkBoundingBoxData,
} from "../service/Api";
import DOMPurify from "dompurify";
import * as pdfjsLib from "pdfjs-dist";
import { useNavigate } from "react-router-dom";
import { useHighlight } from "./HighlightContext";
import ToastMsg, { ToastMessageState } from "./Toast/ToastMsg";
import ChatBotComponent from "./dashBoardComponents/ChatBot";
import DocumentModalPopup from "./DocumentModalPopup";

interface Position {
  x: number;
  y: number;
}

interface WordCloudLocation {
  bounding_box: {
    height: number;
    left: number;
    top: number;
    width: number;
  };
  documentName: string;
  page_index: number;
  word: string;
}

interface WordCloud {
  count: number;
  locations: WordCloudLocation[];
  word: string;
}

interface SummaryData {
  summary: string;
  wordClouds: WordCloud[];
}

const DeepDiveSummary: React.FC = () => {
  //SQ_NO-1.5
  const [documents, setDocuments] = useState<APIResponse[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [word, setword] = useState<string>("");
  const [fileType, setfileType] = useState<string>("");
  const [isFromPrevLocation, setIsFromPrevLocation] = useState(false);
  const [lastSummarizedDocs, setLastSummarizedDocs] = useState<string[]>([]);

  // Chat bot related states
  const CHAT_ICON_SIZE = 25;
  const CHAT_WINDOW_WIDTH = 500;
  const CHAT_WINDOW_HEIGHT = 500;
  const MARGIN = 25;
  const [chatBotOpen, setChatBotOpen] = useState<boolean>(false);
  const chatBotRef = useRef<HTMLDivElement | null>(null);
  const chatBotIconRef = useRef<HTMLDivElement | null>(null);

  const [iconPosition, setIconPosition] = useState<Position>({
    x: window.innerWidth - CHAT_ICON_SIZE - 85,
    y: window.innerHeight - CHAT_ICON_SIZE - 85,
  });
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [isInitialRender2, setIsInitialRender2] = useState(true);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });

  // Filter and search states
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [searchValue, setSearchValue] = useState<string>("");
  const [showCalendar, setShowCalendar] = useState(false);

  // Summary and display states
  const [summary, setSummary] = useState<string>("");
  const [clickedWordCloud, setClickedWordCloud] = useState<DeepDiveWordCloud[]>(
    []
  );
  const [isSummaryBeingViewed, setIsSummaryBeingViewed] = useState(false);
  const [loader, setLoader] = useState(true);
  const [showToast, setShowToast] = useState(false);

  // Navigation and routing
  const navigate = useNavigate();
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null | any>(
    null
  );
  const [startDate, endDate] = dateRange;
  const summaryContainerRef = useRef<HTMLDivElement>(null);

  // Popup and modal states
  const [popup, setPopup] = useState<WordListPopup>({
    isVisible: false,
    title: "",
    documents: [],
  });

  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const [currentDocument, setCurrentDocument] = useState<string>("");
  const [currentWordCloud, setCurrentWordCloud] =
    useState<DeepDiveWordCloud | null>(null);

  // NEW State varibales used for the CHUNK-BASED STATES manage
  const [summaryPoints, setSummaryPoints] = useState<SummaryPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<SummaryPoint | null>(null);
  const [chunkData, setChunkData] = useState<CrashReportChunk[]>([]);
  const [currentChunkHighlights, setCurrentChunkHighlights] = useState<
    ChunkHighlight[]
  >([]);

  //SQ_NO-1.6
  const breadcrumbData = [
    { title: "Dashboard", isActive: true, path: "/dashboard" },
    { title: "Deep Dive Summary", isActive: true, path: "/deepdive" },
  ];

  const [currentDocumentName, setCurrentDocumentName] = useState<string>("");
  const [currentTitle, setCurrentTitle] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [dropdownItems, setDropdownItems] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    document_name: string;
  } | null>(null);
  const [remainingDocuments, setRemainingDocuments] = useState<string[]>([]);
  const [toastMsg, setToastMsg] = useState<ToastMessageState>({
    show: false,
    message: "",
    success: false,
  });

  //SQ_NO-1.7
  const caseID = sessionStorage.getItem("caseID");
  const emailID = sessionStorage.getItem("emailID");
  const jwtToken = sessionStorage.getItem("jwtToken");
  const userID = sessionStorage.getItem("userID");

  const { highlightLocations } = useHighlight();

  //SQ 1.25 - 1.38 --> The fetchDocumentsData function asynchronously retrieves document data
  const fetchDocumentsData = useCallback(
    async (
      startDate?: Date | null,
      endDate?: Date | null,
      searchValue: string = ""
    ) => {
      try {
        setIsInitialRender2(true);
        const parsedStartDate = startDate
          ? format(startDate, "yyyy-MM-dd")
          : "";
        const parsedEndDate = endDate ? format(endDate, "yyyy-MM-dd") : "";

        const payload = {
          caseid: caseID ?? "",
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          email: emailID ?? "",
          searchValue: searchValue,
        };
        const docs = await fetchDocuments(payload, jwtToken ?? "");

        if (docs.status == 204 && documents.length != 0) {
          setDocuments((prev) => (prev.length === 0 ? prev : []));
        }

        setDocuments((prev) => {
          const newDocs = docs.data.data;
          return JSON.stringify(prev) === JSON.stringify(newDocs)
            ? prev
            : newDocs;
        });
      } catch (error) {
        console.error("Error fetching documents:", error);
        const errorAPI = async () => {
          try {
            const errorDescription =
              error instanceof Error ? error.message : String(error);
            const errorFunction = "fetchDocumentsData";
            const errorSource = "BE";
            const payload = { errorDescription, errorFunction, errorSource };
            await postErrorAPI(payload);
          } catch {
            console.error("Error logging failed:", error);
          }
        };
        await errorAPI();
      } finally {
        setIsInitialRender2(false);
      }
    },
    [caseID, emailID, jwtToken, navigate]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Mouse event handlers for dragging
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

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  // Set up the polling effect
  useEffect(() => {
    setLoader(false);
    fetchDocumentsData();
    const pollingInterval = 420 * 10000;
    const intervalId = setInterval(fetchDocumentsData, pollingInterval);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // SQ : 1.25 and 1.26 Updated useEffect for handling point clicks instead of link clicks to trigger the handleExportIconClick
  useEffect(() => {
    if (isSummaryBeingViewed && summaryContainerRef.current) {
      const pointElements =
        summaryContainerRef.current.querySelectorAll(".summary-point");
      const exportIcons =
        summaryContainerRef.current.querySelectorAll(".export-icon");

      pointElements.forEach((pointElement) => {
        pointElement.addEventListener("click", handlePointClick);
      });

      exportIcons.forEach((icon) => {
        icon.addEventListener("click", handleExportIconClick);
      });

      return () => {
        pointElements.forEach((pointElement) => {
          pointElement.removeEventListener("click", handlePointClick);
        });
        exportIcons.forEach((icon) => {
          icon.removeEventListener("click", handleExportIconClick);
        });
      };
    }
  }, [isSummaryBeingViewed, summary, summaryPoints]);

  if (!jwtToken || !caseID || !emailID || !userID) {
    console.log("CASE ID AND JWT IS MISSING IN DEEPDIVE SUMMARY");
    return null;
  }

  // FUNCTION: SQ 9.0  Handle export icon clicks to fetch chunk data
  const handleExportIconClick = async (event: Event): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget as HTMLElement;
    const listItem = target.closest("li");
    if (!listItem) return;

    const pointIndex = parseInt(
      listItem.getAttribute("data-point-index") || "0"
    );

    if (summaryPoints[pointIndex]) {
      const selectedPoint = summaryPoints[pointIndex];
      setSelectedPoint(selectedPoint);
      setLoader(true);

      try {
        // Fetch chunk bounding box data
        const chunkResponse = await fetchChunkBoundingBoxData(
          // caseID,
          selectedPoint.chunkIds,
          jwtToken
        );

        if (chunkResponse.statusCode === 200) {
          setChunkData(chunkResponse.data);

          // Find unique documents from chunks
          const uniqueDocuments = Array.from(
            new Set(
              (chunkResponse.data as CrashReportChunk[]).map(
                (chunk: CrashReportChunk) => chunk.documentName
              )
            )
          ).map((docName: string) => ({
            documentName: docName
          }));

          // Get chunk highlights for all documents
          const highlights = getChunkHighlights(
            selectedPoint.chunkIds,
            chunkResponse.data
          );
          setCurrentChunkHighlights(highlights);

          setPopup({
            isVisible: true,
            title: selectedPoint.point.substring(0, 50) + "...",
            documents: uniqueDocuments,
            selectedPoint: selectedPoint,
            chunkIds: selectedPoint.chunkIds,
          });
        }
      } catch (error) {
        console.error("Error fetching chunk data:", error);
        setToastMsg({
          show: true,
          message: "Error fetching chunk data.",
          success: false,
        });
      } finally {
        setLoader(false);
      }
    }
  };

  // Function to handle point clicks (for future use if needed)
  const handlePointClick = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    // This can be used for other point-related interactions if needed
  };

  // SQ 11.13  Helper function to get chunk highlights from chunks data This function transforms chunk IDs and their associated bounding box data into a flattened array of individual word-level highlights for rendering
  // on documents. It iterates through each chunk ID, finds the matching chunk data (optionally filtering by document name), and extracts all bounding box entries within that chunk, creating a highlight object for each
  // word that includes its page index, coordinates, text content, source document, and chunk reference. The function returns a complete list of all highlights across the specified chunks, enabling the document viewer to
  // render yellow rectangles around each relevant word or phrase.RetryClaude can make mistakes. Please double-check responses.
  const getChunkHighlights = (
    chunkIds: string[],
    chunks: CrashReportChunk[],
    documentName?: string
  ): ChunkHighlight[] => {
    const highlights: ChunkHighlight[] = [];

    chunkIds.forEach((chunkId) => {
      const matchingChunk = chunks.find(
        (chunk) =>
          chunk.chunkUniqueId === chunkId &&
          (!documentName || chunk.documentName === documentName)
      );

      if (matchingChunk) {
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

    return highlights;
  };

  // Helper function to find documents by chunk IDs
  const findDocumentsByChunkIds = (chunkIds: string[]) => {
    const uniqueDocuments = new Set<string>();

    chunkIds.forEach((chunkId) => {
      const matchingChunk = chunkData.find(
        (chunk) => chunk.chunkUniqueId === chunkId
      );
      if (matchingChunk) {
        uniqueDocuments.add(matchingChunk.documentName);
      }
    });

    return Array.from(uniqueDocuments).map((docName) => ({
      documentName: docName,
    }));
  };

  // SQ 1.18 --> This function is used to remove the file extension from the file
  const removeFileExtension = (filename: string) => {
    return filename.replace(/\.[^/.]+$/, "");
  };

  const getDisplayName = (document: string) => {
    return removeFileExtension(document);
  };

  // SQ : 7.0 Updated summarizeDocuments function for point-based summary
  const summarizeDocuments = async () => {
    setLastSummarizedDocs([...selectedDocuments]);
    if (selectedDocuments.length === 0) {
      setSummary("");
      setSummaryPoints([]);
      return;
    }

    try {
      setLoader(true);
      const payload = {
        documents: selectedDocuments,
        caseId: caseID,
        email: emailID,
        userId: userID,
      };

      const result = await fetchSummary(payload, jwtToken);

      if (result?.statusCode === 200 && result?.data?.summary) {
        console.log("Summary data received:", result.data.summary);

        setSummaryPoints(result.data.summary);

        // Create clickable HTML for points with export icons
        const pointsHTML = result.data.summary
          .map(
            (summaryPoint: SummaryPoint, index: number) =>
              `<li class="mb-2 summary-point" data-point-index="${index}">
                ${summaryPoint.point}
                <img src="assets/images/export-icon.svg" alt="export-icon" class="mb-1 ms-1 export-icon" style="cursor: pointer;" />
              </li>`
          )
          .join("");

        setSummary(
          `<ul class="medical-description ps-3 mb-0">${pointsHTML}</ul>`
        );
        setIsSummaryBeingViewed(true);
      }
    } catch (error) {
      setToastMsg({
        show: true,
        message: "An error occurred.",
        success: false,
      });
      console.error("Error fetching summary:", error);
    } finally {
      setLoader(false);
    }
  };

  // Handle document click in source documents
  const handleDocumentClick = (documentName: string, pointTitle: string) => {
    if (!selectedPoint) {
      console.error("No point selected");
      return;
    }

    // Update states
    setCurrentDocument(documentName);
    setCurrentDocumentName(documentName);
    setCurrentTitle(pointTitle);
    setSelectedFile({ document_name: documentName });

    // Open the modal popup
    setIsPopupOpen(true);
  };

  // SQ - 4.0 - 4.4 --> The handleApply function applies the selected date range and search value to fetch documents
  const handleApply = async () => {
    const start = startDate ?? endDate;
    const end = endDate ?? startDate;
    await fetchDocumentsData(start, end, searchValue);
    setShowCalendar(false);
  };

  // SQ - 5.0 - 5.5 --> The handleCancel function resets the date range
  const handleCancel = async () => {
    setDateRange([null, null]);
    await fetchDocumentsData(null, null, searchValue);
    setShowCalendar(false);
  };

  // SQ - 2.0 - 2.5 --> The handleDocumentSelection function manages the selection of documents
  const handleDocumentSelection = (id: string) => {
    setSelectedDocuments((prevState) =>
      prevState.includes(id)
        ? prevState.filter((docId) => docId !== id)
        : [...prevState, id]
    );
    setSummary("");
    setPopup({
      isVisible: false,
      title: "",
      documents: [],
    });
    setIsSummaryBeingViewed(false);
  };

  // Determine if the currently selected docs are the same as last summarized
  const isSameSelection =
    JSON.stringify([...selectedDocuments].sort()) ===
    JSON.stringify([...lastSummarizedDocs].sort());

  // Updated handleClear function to reset new states
  const handleClear = () => {
    setSelectedDocuments([]);
    setLastSummarizedDocs([]);
    setPopup({
      isVisible: false,
      title: "",
      documents: [],
    });
    setSummary("");
    setSummaryPoints([]);
    setSelectedPoint(null);
    setCurrentChunkHighlights([]);
    setIsSummaryBeingViewed(false);
    setClickedWordCloud([]);
    setChunkData([]);
  };

  // Updated handleClose function
  const handleClose = () => {
    setPopup({
      isVisible: false,
      title: "",
      documents: [],
    });
    setSelectedPoint(null);
    setCurrentChunkHighlights([]);
    setCurrentWordCloud(null);
    setCurrentLocationIndex(0);
    setPdfDoc(null);
    setIsPopupOpen(false);

    const container = document.getElementById("pdf-canvas");
    if (container) {
      container.innerHTML = "";
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Handle modal close
  const handlePopUpClose = () => {
    setIsPopupOpen(false);
    setPdfDoc(null);
    setCurrentWordCloud(null);
    setCurrentLocationIndex(0);

    const container = document.getElementById("pdf-canvas");
    if (container) {
      container.innerHTML = "";
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  //SQ - 1.39 --> This function is used to map and bind the documents in the left panel
  const bindDocuments = () => {
    if (!documents) {
      return <p>No documents found.</p>;
    }

    // Get all processable document IDs (not processing or failed)
    const processableDocumentIds = documents
      .filter(
        (doc) =>
          doc.isProcessed !== "processing" && doc.isProcessed !== "failure"
      )
      .map((doc) => doc.documentId);

    // Check if all processable documents are selected
    const allProcessableSelected =
      processableDocumentIds.length > 0 &&
      processableDocumentIds.every((id) => selectedDocuments.includes(id));

    // Toggle select all processable documents
    const handleSelectAll = () => {
      if (allProcessableSelected) {
        setSelectedDocuments([]);
      } else {
        setSelectedDocuments([
          ...new Set([...selectedDocuments, ...processableDocumentIds]),
        ]);
      }
    };

    return (
      <div style={{ position: "relative", height: "100%" }}>
        {/* Select All checkbox - Sticky Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            backgroundColor: "#f8f9fa",
            borderBottom: "1px solid #dee2e6",
            padding: "0.5rem 0",
            marginBottom: "0.5rem",
          }}
        >
          <div className="d-flex gap-2 align-items-center px-3">
            <input
              className="form-check-input me-1"
              type="checkbox"
              id="select-all-checkbox"
              checked={
                allProcessableSelected && processableDocumentIds.length > 0
              }
              onChange={handleSelectAll}
              disabled={processableDocumentIds.length === 0}
              style={{
                cursor:
                  processableDocumentIds.length > 0 ? "pointer" : "not-allowed",
                opacity: processableDocumentIds.length > 0 ? 1 : 0.6,
                marginLeft: "-3px",
              }}
            />
            <label
              className="form-check-label fw-bold"
              htmlFor="select-all-checkbox"
              style={{
                cursor:
                  processableDocumentIds.length > 0 ? "pointer" : "not-allowed",
                opacity: processableDocumentIds.length > 0 ? 1 : 0.6,
                marginLeft: "10px",
              }}
            >
              {allProcessableSelected ? "Deselect All" : "Select All"}
            </label>
          </div>
        </div>

        {/* Documents list with scroll */}
        <div style={{ overflowY: "auto", maxHeight: "calc(100% - 50px)" }}>
          {documents.map((doc) => {
            let itemStyle = {};
            let isClickable = true;

            if (doc.isProcessed === "failure") {
              itemStyle = {
                backgroundColor: "rgba(255, 0, 0, 0.1)",
                cursor: "not-allowed",
              };
              isClickable = false;
            } else if (doc.isProcessed === "processing") {
              itemStyle = {
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                cursor: "not-allowed",
              };
              isClickable = false;
            }

            return (
              <li
                className="list-group-item px-0 d-flex gap-2"
                key={doc.documentId}
                style={itemStyle}
              >
                <input
                  className="form-check-input me-1"
                  type="checkbox"
                  id={`document-checkbox-${doc.documentId}`}
                  defaultValue={doc.document}
                  checked={selectedDocuments.includes(doc.documentId)}
                  onChange={() =>
                    isClickable && handleDocumentSelection(doc.documentId)
                  }
                  disabled={!isClickable}
                  style={{
                    cursor: isClickable ? "pointer" : "not-allowed",
                    opacity: isClickable ? 1 : 0.6,
                    marginLeft: "12px",
                  }}
                />
                <label
                  className="form-check-label"
                  htmlFor={`document-checkbox-${doc.documentId}`}
                  style={{
                    cursor: isClickable ? "pointer" : "not-allowed",
                    opacity: isClickable ? 1 : 0.6,
                    marginLeft: "12px",
                    width: "242px",
                  }}
                >
                  {getDisplayName(doc.document)}
                  {doc.isProcessed === "processing" && (
                    <span className="ms-2 text-muted">(Processing...)</span>
                  )}
                  {doc.isProcessed === "failure" && (
                    <span className="ms-2 text-danger">
                      (Failed to process)
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </div>
      </div>
    );
  };

  //SQ 3.2
  const handleSearch = async () => {
    await fetchDocumentsData(startDate, endDate, searchValue);
  };

  // SQ - 3.0 - 3.9 --> Handle search input changes
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);

    if (newValue === "") {
      setTimeout(() => {
        fetchDocumentsData(startDate, endDate, "");
      }, 0);
    }
  };

  //SQ 3.1
  const handleSearchKeyPress = async (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      await handleSearch();
    }
  };

  //SQ 16.5
  const createMarkup = (htmlContent: string) => {
    return { __html: DOMPurify.sanitize(htmlContent) };
  };

  // Chat bot drag handlers
  const getChatWindowPosition = (): Position => {
    const margin = isInitialRender ? 85 : 25;
    let left = iconPosition.x;
    let top = iconPosition.y;

    const spaceRight = window.innerWidth - iconPosition.x - CHAT_ICON_SIZE;
    const spaceLeft = iconPosition.x;
    const spaceBelow = window.innerHeight - iconPosition.y - CHAT_ICON_SIZE;

    if (spaceRight >= CHAT_WINDOW_WIDTH + margin) {
      left = iconPosition.x + CHAT_ICON_SIZE + margin;
    } else if (spaceLeft >= CHAT_WINDOW_WIDTH + margin) {
      left = iconPosition.x - CHAT_WINDOW_WIDTH - margin;
    } else if (spaceBelow >= CHAT_WINDOW_HEIGHT + margin) {
      left = Math.max(
        margin,
        Math.min(iconPosition.x, window.innerWidth - CHAT_WINDOW_WIDTH - margin)
      );
      top = iconPosition.y + CHAT_ICON_SIZE + margin;
    } else {
      left = Math.max(
        margin,
        Math.min(iconPosition.x, window.innerWidth - CHAT_WINDOW_WIDTH - margin)
      );
      top = iconPosition.y - CHAT_WINDOW_HEIGHT - margin;
    }

    const newPosition = {
      x: Math.max(
        margin,
        Math.min(left, window.innerWidth - CHAT_WINDOW_WIDTH - margin)
      ),
      y: Math.max(
        margin,
        Math.min(top, window.innerHeight - CHAT_WINDOW_HEIGHT - margin)
      ),
    };

    if (isInitialRender) {
      setIsInitialRender(false);
    }

    return newPosition;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - iconPosition.x,
      y: e.clientY - iconPosition.y,
    });
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent): void => {
    if (!isDragging) return;

    const newX = Math.max(
      MARGIN,
      Math.min(
        e.clientX - dragStart.x,
        window.innerWidth - CHAT_ICON_SIZE - MARGIN
      )
    );
    const newY = Math.max(
      MARGIN,
      Math.min(
        e.clientY - dragStart.y,
        window.innerHeight - CHAT_ICON_SIZE - MARGIN
      )
    );

    setIconPosition({
      x: newX,
      y: newY,
    });
  };

  const handleMouseUp = (): void => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault();
    if (!isDragging) {
      setChatBotOpen(!chatBotOpen);
    }
  };

  const chatWindowPosition = getChatWindowPosition();

  return (
    <>
      <ToastMsg toastMsg={toastMsg} setToastMsg={setToastMsg} />

      <div className={`${loader ? "blur" : ""}`}>
        <meta charSet="UTF-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>USClaims | Deep Dive</title>
        <link rel="icon" type="image/x-icon" href="assets/images/favicon.ico" />
        <link rel="stylesheet" href="./assets/scss/custom.css" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
        />

        <nav className="navbar navbar-expand-lg">
          <HeaderComponent />
        </nav>

        <div className="container-fluid mb-4">
          <div className="row mt-2">
            <BreadCrumbs data={breadcrumbData} />
          </div>
          <div className="row">
            <div className="col-md-12 d-flex justify-content-between align-items-center mt-3 mb-3">
              <h5 className="fs-4 fw-semibold">Deep Dive Summary</h5>
            </div>
          </div>
          <div className="row">
            <div className="col-md-3">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-4 position-relative">
                    <h5 className="card-title mb-0">
                      <img
                        src="assets/images/deepdivedoc.svg"
                        className="me-2"
                        alt="document icon"
                      />
                      Documents
                    </h5>
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => {
                        setShowCalendar(!showCalendar);
                      }}
                    >
                      <i className="bi bi-calendar4"></i>
                    </button>
                    {showCalendar && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          position: "absolute",
                          top: "50px",
                          right: "5px",
                          zIndex: "999",
                        }}
                      >
                        <div style={{ position: "relative" }}>
                          <DatePicker
                            selected={startDate}
                            onChange={(dates: [Date | null, Date | null]) =>
                              setDateRange(dates)
                            }
                            inline
                            startDate={startDate}
                            endDate={endDate}
                            selectsRange
                            dateFormat="yyyy/MM/dd"
                            showTimeSelect={false}
                            popperPlacement="bottom-start"
                            onCalendarClose={() => {
                              if (!startDate && !endDate) handleCancel();
                            }}
                            shouldCloseOnSelect={false}
                            open={showCalendar}
                          >
                            <div
                              style={{
                                padding: "10px",
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <button
                                onClick={handleCancel}
                                className="btn btn-outline-primary"
                                style={{ marginRight: "10px" }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleApply}
                                className="btn btn-primary"
                              >
                                Apply
                              </button>
                            </div>
                          </DatePicker>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="row">
                    <div className="col-md-12">
                      <div className="input-group mb-3">
                        <input
                          type="search"
                          className="form-control bg-white"
                          placeholder="Search"
                          value={searchValue}
                          onChange={handleSearchInputChange}
                          onKeyPress={handleSearchKeyPress}
                          aria-label="Search"
                          aria-describedby="button-addon2"
                        />
                        <a
                          className="btn btn-outline-secondary"
                          type="button"
                          id="button-addon2"
                          onClick={handleSearch}
                        >
                          <i className="bi bi-search"></i>
                        </a>
                      </div>
                    </div>
                    <div className="col-md-12 mt-2 mb-4 document-scroll">
                      <ul className="list-group list-group-flush">
                        {bindDocuments()}
                      </ul>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <button
                          className="btn btn-outline-primary w-100"
                          onClick={handleClear}
                          disabled={selectedDocuments.length === 0}
                          type="button"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="col-md-6">
                        <button
                          className="btn btn-primary"
                          onClick={summarizeDocuments}
                          disabled={
                            selectedDocuments.length === 0 || isSameSelection
                          }
                          type="button"
                        >
                          Summarize
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${popup.isVisible ? "col-md-6" : "col-md-9"}`}>
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title d-flex align-items-center">
                    <img
                      src="assets/images/viewdocument-icon.svg"
                      className="me-2"
                      alt="view document icon"
                    />
                    Document Summary
                  </h5>
                  {isSummaryBeingViewed && (
                    <div
                      ref={summaryContainerRef}
                      className="mb-3 summary-container"
                      style={{ maxHeight: "506px", overflowY: "auto" }}
                      dangerouslySetInnerHTML={createMarkup(summary)}
                    ></div>
                  )}
                </div>
                {selectedDocuments &&
                !isSummaryBeingViewed &&
                selectedDocuments.length < 1 ? (
                  <div className="card-body">
                    <div className="text-center my-5">
                      <img
                        src="assets/images/nodocuments.jpg"
                        className="mb-2"
                        alt="no document"
                      />
                      <p>No Documents Selected</p>
                      <p>
                        You can select multiple documents and click the
                        'Summarize' button to view their summaries.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {!isSummaryBeingViewed && (
                      <div className="card-body">
                        <div className="text-center my-5">
                          <img
                            src="assets/images/nodocuments.jpg"
                            className="mb-2"
                            alt="no document"
                          />
                          <p>
                            You can select multiple documents and click the
                            'Summarize' button to view their summaries.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {popup.isVisible && (
              <div className="col-md-3">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="card-title d-flex align-items-center mb-0">
                        <img
                          src="assets/images/source-document.svg"
                          className="me-2"
                          alt="source document icon"
                        />
                        Source Documents
                      </h5>
                      <a>
                        <img
                          src="assets/images/close-icon.svg"
                          alt="close-icon"
                          onClick={handleClose}
                          style={{cursor : "pointer"}}
                        />
                      </a>
                    </div>
                    <div className="grey-v1 mt-4">
                      Showing result for:
                      <span className="text-black">
                        {selectedPoint?.point.substring(0, 50)}...
                      </span>
                    </div>
                    {/* {selectedPoint && (
                      <div
                        className="mt-2 mb-3 p-2"
                        style={{
                          backgroundColor: "#f8f9fa",
                          borderRadius: "4px",
                          fontSize: "0.9em",
                        }}
                      >
                        <strong>Point:</strong> {selectedPoint.point}
                      </div>
                    )} */}
                    <div
                      className="mt-3"
                      style={{ maxHeight: "400px", overflowY: "auto" }}
                    >
                      <ul className="px-0" style={{ marginBottom: "0" }}>
                        {popup.documents.map((doc, index) => (
                          <li
                            key={index}
                            className="list-unstyled py-3 border-bottom"
                          >
                            <a
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                const decoded = doc.documentName.replace(
                                  /%([0-9A-Fa-f]{2})/g,
                                  (match, p1) => {
                                    return String.fromCharCode(
                                      parseInt(p1, 16)
                                    );
                                  }
                                );
                                setCurrentDocumentName(decoded);
                                setCurrentTitle(popup.title);
                                handleDocumentClick(decoded, popup.title);
                              }}
                              className="text-decoration-none link-color"
                            >
                              {getDisplayName(doc.documentName)}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* {selectedPoint && selectedPoint.chunkIds && (
                      <div
                        className="mt-3 p-2"
                        style={{ backgroundColor: "#e9ecef", borderRadius: "4px" }}
                      >
                        <small className="text-muted">
                          <strong>Chunk IDs:</strong> {selectedPoint.chunkIds.join(", ")}
                        </small>
                      </div>
                    )} */}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Document Modal Popup */}
        <DocumentModalPopup
          isOpen={isPopupOpen}
          onClose={handlePopUpClose}
          selectedPoint={selectedPoint}
          availableDocuments={popup.documents}
          currentChunkHighlights={currentChunkHighlights}
          caseID={caseID}
          jwtToken={jwtToken}
          setMainLoader={setLoader}
          currentDocumentName={currentDocumentName} // Pass the selected document name
          onDocumentChange={(
            documentName: string,
            highlights: ChunkHighlight[]
          ) => {
            setCurrentDocument(documentName);
          }}
        />

        {/* Chat Bot */}
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
      {(loader || isInitialRender2) && <Loader />}
    </>
  );
};

export default DeepDiveSummary;
