/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ChunkHighlight, SummaryPoint } from "../interface/DeepDiveSummary";
import { fetchBinaryContent } from "../service/Api";
import { SortedChunkGroup } from "./HighlightContext";

// DocumentModalPopupProps interface to the chunk based highlightion
interface DocumentModalPopupProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPoint: SummaryPoint | null;
  availableDocuments: Array<{ documentName: string }>;
  currentChunkHighlights: ChunkHighlight[];
  caseID: string | null;
  jwtToken: string | null;
  onDocumentChange?: (
    documentName: string,
    highlights: ChunkHighlight[]
  ) => void;
  setMainLoader: (loading: boolean) => void;
  currentDocumentName: string;
}

const DocumentModalPopup: React.FC<DocumentModalPopupProps> = ({
  isOpen,
  onClose,
  selectedPoint,
  availableDocuments,
  currentChunkHighlights,
  caseID,
  jwtToken,
  onDocumentChange,
  setMainLoader,
  currentDocumentName, // NEW: Use main component loader
}) => {
  // SQ 1.4 Intialize the state variables
  const [currentDocument, setCurrentDocument] = useState<string>("");
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null | string>(null);
  const [fileType, setFileType] = useState<string>("");
  const [currentHighlights, setCurrentHighlights] = useState<ChunkHighlight[]>(
    []
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasRenderedRef = useRef(false);

  const [sortedChunkGroups, setSortedChunkGroups] = useState<
    SortedChunkGroup[]
  >([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [documentChunkGroups, setDocumentChunkGroups] = useState<
    SortedChunkGroup[]
  >([]);

  const [documentZoom, setDocumentZoom] = useState<number>(1.0);
  const MIN_ZOOM = 1.0;
  const MAX_ZOOM = 3.0;
  const ZOOM_STEP = 0.25;
  const [isHoveringDocument, setIsHoveringDocument] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentPdfDocRef = useRef<any>(null);

  // SQ 10.0 to 10.17 Compute sorted chunk groups from chunk highlights**
  const computeSortedChunkGroups = (
    chunkHighlights: ChunkHighlight[]
  ): SortedChunkGroup[] => {
    // Group highlights by chunkId
    const chunkGroupMap = new Map<
      string,
      {
        chunkId: string;
        firstPageIndex: number;
        highlights: ChunkHighlight[];
        documentName: string;
      }
    >();

    chunkHighlights.forEach((highlight) => {
      if (chunkGroupMap.has(highlight.chunkId)) {
        const existing = chunkGroupMap.get(highlight.chunkId)!;
        existing.highlights.push(highlight);
        existing.firstPageIndex = Math.min(
          existing.firstPageIndex,
          highlight.page_index
        );
      } else {
        chunkGroupMap.set(highlight.chunkId, {
          chunkId: highlight.chunkId,
          firstPageIndex: highlight.page_index,
          highlights: [highlight],
          documentName: highlight.documentName,
        });
      }
    });

    // Sort by firstPageIndex (lowest page first)
    const sortedGroups = Array.from(chunkGroupMap.values()).sort(
      (a, b) => a.firstPageIndex - b.firstPageIndex
    );

    console.log(
      "DocumentModalPopup - Sorted chunk groups:",
      sortedGroups.map((g) => ({
        chunkId: g.chunkId.substring(0, 8),
        firstPageIndex: g.firstPageIndex,
        totalHighlights: g.highlights.length,
        documentName: g.documentName,
      }))
    );

    return sortedGroups;
  };

  // SQ 1.7  Reset states when modal opens/closes
  // Add currentDocumentName to the effect that handles document changes
  // useEffect hook triggers when modal opens\nwith dependencies [isOpen, selectedChatPoint, globalChunkData]
  useEffect(() => {
    if (isOpen && currentDocumentName) {
      // Reset rendering flag
      hasRenderedRef.current = false;

      // Set the current document and fetch it
      setCurrentDocument(currentDocumentName);
      handleDocumentChange(currentDocumentName);
    } else if (!isOpen) {
      // Clean up when modal closes
      cleanupModal();
    }
  }, [isOpen, currentDocumentName]); // Add currentDocumentName as dependency

  // Update highlights when they change
  useEffect(() => {
    if (currentChunkHighlights.length > 0) {
      setCurrentHighlights(currentChunkHighlights);

      // Compute sorted groups for ALL highlights (across all documents)
      const sortedGroups = computeSortedChunkGroups(currentChunkHighlights);
      setSortedChunkGroups(sortedGroups);
      setCurrentChunkIndex(0); // Reset to first chunk

    }
  }, [currentChunkHighlights]);

  // Apply zoom transform when documentZoom changes
  useEffect(() => {
    const container = document.getElementById("pdf-canvas-popup");
    if (!container) return;

    const canvases = container.getElementsByTagName("canvas");
    if (canvases.length === 0) return;

    // Save current scroll position as percentage
    const scrollPercentY =
      container.scrollTop /
      (container.scrollHeight - container.clientHeight || 1);

    for (let i = 0; i < canvases.length; i++) {
      const canvas = canvases[i] as HTMLElement;
      canvas.style.transform = `scale(${documentZoom})`;
      canvas.style.transformOrigin = "top left";

      // Add margin to prevent bottom cutoff
      canvas.style.marginBottom = `${(documentZoom - 1) * 100}%`;
    }

    // Restore scroll position after DOM updates
    requestAnimationFrame(() => {
      const newScrollTop =
        scrollPercentY * (container.scrollHeight - container.clientHeight);
      container.scrollTop = newScrollTop;
    });
  }, [documentZoom]);

  useEffect(() => {
    if (currentDocument) {
      setDocumentZoom(1.0);
    }
  }, [currentDocument]);

  const cleanupModal = () => {
    const container = document.getElementById("pdf-canvas-popup");
    if (container) {
      container.innerHTML = "";
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    hasRenderedRef.current = false;
    setPdfDoc(null);
    // setCurrentDocument('');
    setFileType("");
    setCurrentHighlights([]);

    setSortedChunkGroups([]);
    setCurrentChunkIndex(0);
    setDocumentZoom(1.0);
    currentPdfDocRef.current = null;
  };

  // SQ .Function document change function that utilizes in the drop down to access the chage in the filtered documents
  const handleDocumentChange = async (documentName: string) => {
    if (!documentName || !caseID || !jwtToken) return;

    try {
      setMainLoader(true);
      setDocumentZoom(1.0);

      const isSameDocument = currentDocument === documentName;

      if (!isSameDocument) {
        const container = document.getElementById("pdf-canvas-popup");
        if (container) {
          container.innerHTML = "";
        }

        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }

        hasRenderedRef.current = false;
        setPdfDoc(null);
        setFileType("");
        currentPdfDocRef.current = null;
      }

      setCurrentDocument(documentName);

      let allChunkGroups = sortedChunkGroups;
      if (sortedChunkGroups.length === 0 && currentChunkHighlights.length > 0) {
        console.log("Recomputing sortedChunkGroups after modal reopen");
        allChunkGroups = computeSortedChunkGroups(currentChunkHighlights);
        setSortedChunkGroups(allChunkGroups);
      }

      // Filter highlights for the selected document
      const documentHighlights = currentChunkHighlights.filter(
        (highlight) =>
          highlight.documentName === documentName ||
          documentName
            .toLowerCase()
            .includes(highlight.documentName.toLowerCase()) ||
          highlight.documentName
            .toLowerCase()
            .includes(documentName.toLowerCase())
      );
      setCurrentHighlights(documentHighlights);

      //  NEW: Filter chunk groups for current document only
      const docChunks = allChunkGroups.filter(
        (group) =>
          group.documentName === documentName ||
          documentName
            .toLowerCase()
            .includes(group.documentName.toLowerCase()) ||
          group.documentName.toLowerCase().includes(documentName.toLowerCase())
      );

      setDocumentChunkGroups(docChunks);
      setCurrentChunkIndex(0); // Reset to first chunk of this document

      // Notify parent component
      if (onDocumentChange) {
        onDocumentChange(documentName, documentHighlights);
      }

      const requestBody = {
        caseId: caseID,
        documentName: documentName,
      };

      const response = await fetchBinaryContent(requestBody);
      if (response.status === 200) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const container = document.getElementById("pdf-canvas-popup");
        if (container) container.innerHTML = "";

        const detectedFileType = blob.type;
        setFileType(detectedFileType);

        if (detectedFileType === "application/pdf") {
          try {
            const pdfDocument = await pdfjsLib.getDocument(blobUrl).promise;
            setPdfDoc(pdfDocument);

            await renderAllPagesWithChunks(
              pdfDocument,
              documentHighlights,
              documentName
            );

            // UPDATED: Scroll using filtered chunk groups
            if (docChunks.length > 0) {
              setTimeout(() => {
                scrollToHighlight(docChunks[0].firstPageIndex);
              }, 100);
            } else if (documentHighlights.length > 0) {
              setTimeout(() => {
                scrollToHighlight(documentHighlights[0].page_index);
              }, 100);
            }
          } catch (error) {
            console.error("Error loading PDF:", error);
            handleImageFileWithChunks(blobUrl, documentHighlights);
          }
        } else if (detectedFileType.startsWith("image/")) {
          setPdfDoc(blobUrl);
          handleImageFileWithChunks(blobUrl, documentHighlights);
        } else {
          console.error("Unsupported file type:", detectedFileType);
        }
      }
    } catch (error) {
      console.error("Error fetching document:", error);
      currentPdfDocRef.current = null;
    } finally {
      setMainLoader(false);
    }
  };

  // SQ 2.0  FUNCTIONS** (place after handleDocumentChange, before renderAllPagesWithChunks)

  // **FUNCTION 1: Handle next chunk navigation**
  const handleNextChunk = async () => {
    //  Use documentChunkGroups instead of sortedChunkGroups
    if (documentChunkGroups.length === 0) return;

    const nextIndex = currentChunkIndex + 1;

    // Check bounds within CURRENT DOCUMENT
    if (nextIndex >= documentChunkGroups.length) {
      console.log("Already at last chunk of current document");
      return; // ← Stop at last chunk
    }

    setIsNavigating(true);
    setMainLoader(true);

    try {
      const nextChunk = documentChunkGroups[nextIndex]; // ← Use filtered chunks

      // No document switching needed - always same document
      setTimeout(() => {
        scrollToHighlight(nextChunk.firstPageIndex);
        setMainLoader(false);
        setIsNavigating(false);
      }, 300);

      setCurrentChunkIndex(nextIndex);
    } catch (error) {
      console.error("Error navigating to next chunk:", error);
      setMainLoader(false);
      setIsNavigating(false);
    }
  };

  // **FUNCTION 2: Handle previous chunk navigation**
  const handlePrevChunk = async () => {
    // Use documentChunkGroups instead of sortedChunkGroups
    if (documentChunkGroups.length === 0) return;

    const prevIndex = currentChunkIndex - 1;

    // Check bounds within CURRENT DOCUMENT
    if (prevIndex < 0) {
      console.log("Already at first chunk of current document");
      return; // ← Stop at first chunk
    }

    setIsNavigating(true);
    setMainLoader(true);

    try {
      const prevChunk = documentChunkGroups[prevIndex]; // ← Use filtered chunks

      // No document switching needed - always same document
      setTimeout(() => {
        scrollToHighlight(prevChunk.firstPageIndex);
        setMainLoader(false);
        setIsNavigating(false);
      }, 300);

      setCurrentChunkIndex(prevIndex);
    } catch (error) {
      console.error("Error navigating to previous chunk:", error);
      setMainLoader(false);
      setIsNavigating(false);
    }
  };

  // FUNCTION : Get current position display text
  const getCurrentPosition = () => {
    if (documentChunkGroups.length === 0) return 0;
    return currentChunkIndex + 1;
  };

  // FUNCTION : Get total results count
  const getResultsCount = () => {
    return documentChunkGroups.length; // ← Use filtered chunks
  };

  // Zoom control functions (add around line 200)
  const handleZoomIn = () => {
    setDocumentZoom((prev) => {
      const newZoom = Math.min(prev + ZOOM_STEP, MAX_ZOOM);
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setDocumentZoom((prev) => {
      const newZoom = Math.max(prev - ZOOM_STEP, MIN_ZOOM);
      return newZoom;
    });
  };

  const handleZoomReset = () => {
    setDocumentZoom(1.0);
  };

  // SQ 3.0 -> 3.27  This function renders all pages of a PDF document with chunk-based highlights by iterating through each page,
  // creating high-resolution canvases, and drawing semi-transparent yellow rectangles at the specified bounding box coordinates.
  // It uses an abort controller to cancel previous render operations when a new document is selected, scales the canvas for crisp
  // display on high-DPI screens, and delegates the actual highlight drawing to a separate function while maintaining proper page sequencing.
  // The function appends each rendered page canvas to the viewer container with styling for borders and shadows, and includes cleanup logic to prevent duplicate renders using a reference flag.

  const renderAllPagesWithChunks = async (
    pdf: pdfjsLib.PDFDocumentProxy,
    chunkHighlights: ChunkHighlight[],
    documentName: string
  ) => {
    if (hasRenderedRef.current) return;
    hasRenderedRef.current = true;

    // Clean up previous abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const container = document.getElementById("pdf-canvas-popup");
    if (!container) {
      console.error("Viewer container not found");
      return;
    }

    container.innerHTML = "";

    try {
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (controller.signal.aborted) return;

        const page = await pdf.getPage(pageNum);
        const scale = window.devicePixelRatio * 2;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          console.log("ctx is null");
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / scale}px`;
        canvas.style.height = `${viewport.height / scale}px`;

        canvas.dataset.pageNumber = (pageNum - 1).toString();

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.setTransform(scale, 0, 0, scale, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: page.getViewport({ scale: 1 }),
        };

        await page.render(renderContext).promise;

        drawChunkHighlightsOnCanvas(
          ctx,
          canvas,
          chunkHighlights,
          pageNum - 1,
          documentName,
          scale
        );

        canvas.style.display = "block";
        canvas.style.margin = "10px auto";
        canvas.style.border = "1px solid #ddd";
        canvas.style.borderRadius = "4px";
        canvas.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
        canvas.style.maxWidth = "100%";
        canvas.style.height = "auto";

        container.appendChild(canvas);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Rendering error:", err);
      }
    } finally {
      hasRenderedRef.current = false;
    }
  };

  // SQ 4.0 -> 4.12 This function draws semi-transparent yellow highlight rectangles on a PDF page canvas by filtering chunk highlights that match the current page
  // index and document name, then rendering each bounding box with a yellow fill and amber border. It converts normalized bounding box coordinates (0-1 range) to
  // scaled pixel positions based on the canvas dimensions and device pixel ratio, ensuring highlights appear at the correct locations regardless of screen resolution. The function uses canvas save/restore to prevent style leakage between different highlight rectangles.
  const drawChunkHighlightsOnCanvas = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    chunkHighlights: ChunkHighlight[],
    pageIndex: number,
    documentName: string,
    scale: number = 1
  ) => {
    const matchingHighlights = chunkHighlights.filter(
      (h) => h.page_index === pageIndex && h.documentName === documentName
    );

    matchingHighlights.forEach(({ bounding_box }) => {
      const { left, top, width, height } = bounding_box;
      ctx.save();

      ctx.fillStyle = "rgba(255, 255, 0, 0.4)";
      // ctx.strokeStyle = "rgba(255, 193, 7, 0.8)";
      // ctx.lineWidth = 1;

      const scaledLeft = left * (canvas.width / scale);
      const scaledTop = top * (canvas.height / scale);
      const scaledWidth = width * (canvas.width / scale);
      const scaledHeight = height * (canvas.height / scale);

      ctx.fillRect(scaledLeft, scaledTop, scaledWidth, scaledHeight);
      // ctx.strokeRect(scaledLeft, scaledTop, scaledWidth, scaledHeight);

      ctx.restore();
    });
  };

  // SQ 5.0 -> 5.28 This function loads an image file and prepares it for rendering with chunk highlights by creating an Image object,
  // setting up a load handler that triggers the rendering process once the image is fully loaded, and enabling cross-origin resource
  // sharing for external image sources. It passes the loaded image element to the rendering function along with chunk highlights and a default page index of 0.
  const handleImageFileWithChunks = (
    imageUrl: string,
    chunkHighlights: ChunkHighlight[]
  ) => {
    const img = new Image();
    img.onload = function () {
      const container = document.getElementById("pdf-canvas-popup");
      if (!container) return;

      renderImageWithChunkHighlights(img, container, chunkHighlights, 0);
    };

    img.crossOrigin = "anonymous";
    img.src = imageUrl;
  };

  // SQ 5.5 This function displays an image with chunk-based highlights using a dual-canvas approach where the base canvas renders
  // the high-resolution scaled image and an overlay canvas draws semi-transparent yellow rectangles at the specified bounding box locations.
  // It filters highlights matching the current page index, converts normalized coordinates to pixel positions, and creates a wrapper containing
  // both canvases positioned absolutely to ensure proper highlight alignment over the image content.
  const renderImageWithChunkHighlights = (
    imgElement: HTMLImageElement,
    container: HTMLElement,
    chunkHighlights: ChunkHighlight[],
    pageIndex: number
  ) => {
    const matchingHighlights = chunkHighlights.filter(
      (h) => h.page_index === pageIndex
    );

    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";

    const imageCanvas = document.createElement("canvas");
    const imageCtx = imageCanvas.getContext("2d");

    if (!imageCtx) return;

    const scale = window.devicePixelRatio * 1.5;
    imageCanvas.width = imgElement.width * scale;
    imageCanvas.height = imgElement.height * scale;
    imageCanvas.style.width = `${imgElement.width}px`;
    imageCanvas.style.height = `${imgElement.height}px`;

    imageCtx.imageSmoothingEnabled = true;
    imageCtx.imageSmoothingQuality = "high";
    imageCtx.scale(scale, scale);

    imageCtx.drawImage(imgElement, 0, 0);
    wrapper.appendChild(imageCanvas);

    const highlightCanvas = document.createElement("canvas");
    highlightCanvas.width = imgElement.width;
    highlightCanvas.height = imgElement.height;
    highlightCanvas.style.position = "absolute";
    highlightCanvas.style.top = "0";
    highlightCanvas.style.left = "0";
    highlightCanvas.style.pointerEvents = "none";

    const ctx = highlightCanvas.getContext("2d");
    if (!ctx) return;

    matchingHighlights.forEach(({ bounding_box }) => {
      const { left, top, width, height } = bounding_box;
      ctx.save();

      ctx.fillStyle = "rgba(255, 255, 0, 0.4)";
      // ctx.strokeStyle = "rgba(255, 193, 7, 0.8)";
      // ctx.lineWidth = 2;

      const rectX = left * imgElement.width;
      const rectY = top * imgElement.height;
      const rectWidth = width * imgElement.width;
      const rectHeight = height * imgElement.height;

      ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
      // ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
      ctx.restore();
    });

    wrapper.appendChild(highlightCanvas);
    container.innerHTML = "";
    container.appendChild(wrapper);
  };

  // SQ : 6.0 -> 6.17 Scroll Highlight functionality in the initial render of the document
  const scrollToHighlight = (pageIndex: number) => {
    try {
      const container = document.getElementById("pdf-canvas-popup");
      if (!container) return;

      const canvases = container.getElementsByTagName("canvas");

      // **NEW: Find canvas with matching page index**
      let targetCanvas: HTMLCanvasElement | null = null;
      for (let i = 0; i < canvases.length; i++) {
        if (parseInt(canvases[i].dataset.pageNumber || "0") === pageIndex) {
          targetCanvas = canvases[i];
          break;
        }
      }

      if (targetCanvas) {
        const scrollPos = targetCanvas.offsetTop - 50; // 50px offset from top

        container.scrollTo({
          top: scrollPos,
          behavior: "smooth",
        });

        // **NEW: Visual emphasis (optional)**
        targetCanvas.style.transition = "transform 0.3s ease";
        targetCanvas.style.transform = "scale(1.02)";
        setTimeout(() => {
          targetCanvas!.style.transform = "scale(1)";
        }, 300);
      }
    } catch (error) {
      console.error("Error during scroll operation:", error);
    }
  };

  // SQ 7.0 Function  removeFileExtension
  const removeFileExtension = (filename: string) => {
    return filename.replace(/\.[^/.]+$/, "");
  };

  // SQ 8.0 Function getDisplayName
  const getDisplayName = (document: string) => {
    const nameWithoutExtension = removeFileExtension(document);
    // Only add ellipsis if the name exceeds 40 characters
    if (nameWithoutExtension.length > 60) {
      return nameWithoutExtension.substring(0, 60) + "...";
    }
    return nameWithoutExtension;
  };

  // SQ 8.1 Function getDropdownDisplayName - for dropdown items (80 character limit)
  const getDropdownDisplayName = (document: string) => {
    const nameWithoutExtension = removeFileExtension(document);
    // Only add ellipsis if the name exceeds 80 characters
    if (nameWithoutExtension.length > 110) {
      return nameWithoutExtension.substring(0, 110) + "...";
    }
    return nameWithoutExtension;
  };

  // SQ 8.2 Function getFullDisplayName - for title attribute (full name without truncation)
  const getFullDisplayName = (document: string) => {
    return removeFileExtension(document);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div
        className="modal fade show custom-modal-bg"
        style={{ display: "block" }}
        id="documentModalPopup"
        aria-hidden={!isOpen}
      >
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5">
                <div className="btn-group w-75">
                  <button
                    className="btn d-flex justify-content-between align-items-center border-0 text-nowrap ps-0 fw-semibold show"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="true"
                    title={getFullDisplayName(currentDocument)}
                    style={{ maxWidth: "450px" }}
                  >
                    {getDisplayName(currentDocument)}
                    <i className="bi bi-chevron-down ms-2"></i>
                  </button>
                  <ul className="dropdown-menu" style={{ maxWidth: "500px" }}>
                    {availableDocuments.map((doc, index) => {
                      // Check if this is the only document OR if it's the currently selected document
                      const isOnlyDocument = availableDocuments.length === 1;
                      const isCurrentDocument =
                        doc.documentName === currentDocument;
                      const isClickable = !isOnlyDocument && !isCurrentDocument;

                      let itemStyle = {};
                      if (!isClickable) {
                        itemStyle = {
                          backgroundColor: "rgba(0, 0, 0, 0.05)",
                        };
                      }

                      return (
                        <li key={index} style={itemStyle}>
                          <a
                            className="dropdown-item"
                            href="#"
                            title={getFullDisplayName(doc.documentName)}
                            style={{
                              cursor: isClickable ? "pointer" : "not-allowed",
                              opacity: isClickable ? 1 : 0.6,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "block",
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              if (isClickable) {
                                setCurrentDocument(doc.documentName);
                                handleDocumentChange(doc.documentName);
                              }
                            }}
                          >
                            {getDropdownDisplayName(doc.documentName)}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </h1>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body">
              <div className="d-flex justify-content-between" style={{ marginBottom: "7px" }}>
                <div className="grey-v1">
                  Showing result for :
                  <span className="text-black">{` ${selectedPoint?.point?.substring(0, 60) ?? ""
                    }...`}</span>
                </div>
                {/* <div>
                  <span className="grey-v1 me-2">1/10 Results</span>
                  <a style={{ opacity: 1, pointerEvents: "auto" }}>
                    <i className="bi bi-chevron-up me-2" />
                  </a>
                  <button
                    type="button"
                    className="btn btn-link p-0 m-0"
                    style={{ opacity: 1, pointerEvents: "auto" }}
                  >
                    <i className="bi bi-chevron-down me-2 pe-2 chevron-border" />
                  </button>
                </div> */}
                <div>
                  <span className="grey-v1 me-2">
                    {getCurrentPosition()}/{getResultsCount()} Results
                  </span>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentChunkIndex > 0) handlePrevChunk();
                    }}
                    style={{
                      opacity: currentChunkIndex === 0 ? 0.5 : 1,
                      pointerEvents: currentChunkIndex === 0 ? "none" : "auto",
                    }}
                  >
                    <i className="bi bi-chevron-up me-2" />
                  </a>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentChunkIndex < documentChunkGroups.length - 1)
                        handleNextChunk();
                    }}
                    style={{
                      opacity:
                        currentChunkIndex >= documentChunkGroups.length - 1
                          ? 0.5
                          : 1,
                      pointerEvents:
                        currentChunkIndex >= documentChunkGroups.length - 1
                          ? "none"
                          : "auto",
                    }}
                  >
                    <i className="bi bi-chevron-down me-2 pe-2 chevron-border" />
                  </a>
                </div>
              </div>
              <div
                className="position-relative"
                onMouseEnter={() => setIsHoveringDocument(true)}
                onMouseLeave={() => setIsHoveringDocument(false)}
              >
                <div
                  className={`d-flex align-items-center gap-2 position-absolute top-0 end-0 z-1 mt-3 me-3 transition-opacity ${isHoveringDocument ? "opacity-100" : "opacity-0"
                    }`}
                  style={{
                    transition: "opacity 0.3s ease",
                    pointerEvents: isHoveringDocument ? "auto" : "none",
                  }}
                >
                  <button
                    className="btn btn-sm bg-white active shadow-sm border"
                    onClick={handleZoomOut}
                    disabled={documentZoom <= MIN_ZOOM}
                    title="Zoom Out (25%)"
                    style={{
                      width: "32px",
                      height: "32px",
                      padding: "0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i className="bi bi-dash-lg"></i>
                  </button>

                  <button
                    className="btn btn-sm bg-white active shadow-sm border"
                    onClick={handleZoomReset}
                    disabled={documentZoom === 1.0}
                    title="Reset to 100%"
                    style={{
                      width: "32px",
                      height: "32px",
                      padding: "0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i className="bi bi-arrow-counterclockwise"></i>
                  </button>

                  <span
                    className="btn btn-sm bg-white active shadow-sm border d-flex align-items-center justify-content-center"
                    style={{
                      minWidth: "60px",
                      height: "32px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "default",
                      pointerEvents: "none",
                    }}
                  >
                    {(documentZoom * 100).toFixed(0)}%
                  </span>

                  <button
                    className="btn btn-sm bg-white active shadow-sm border"
                    onClick={handleZoomIn}
                    disabled={documentZoom >= MAX_ZOOM}
                    title="Zoom In (25%)"
                    style={{
                      width: "32px",
                      height: "32px",
                      padding: "0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i className="bi bi-plus-lg"></i>
                  </button>
                </div>
                <div className="selected-popupdoc-scroll" id="pdf-canvas-popup"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DocumentModalPopup;