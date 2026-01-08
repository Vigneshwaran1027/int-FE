/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import {
  DocumentViewerProps,
  selectedDocumentsAndLocations,
  HighlightType,
  ChunkHighlight,
} from "../../interface/DashBoardInterface";
import { SortedChunkGroup, useHighlight } from "../HighlightContext";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import { fetchBinaryContent, postErrorAPI } from "../../service/Api";
import ToastMsg, { ToastMessageState } from "../Toast/ToastMsg";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentDetails,
  selectedDocumentIndex,
  setSelectedDocumentIndex,
}) => {
  // SQ : 1.5 Return context values including highlightLocations, selectedWord, setLoader, setShowNavigationButtons,
  // showNavigationButtons, setCurrentHighlightIndex, setSelectedWord, setHighlightLocations,\nselectedSummaryPoint,
  // currentChunkHighlights, chunkFilteredDocuments, isChunkFiltering,\nsetIsChunkFiltering, setSelectedSummaryPoint, setCurrentChunkHighlights.
  const {
    highlightLocations,
    remainingMatches,
    setIsFiltering2,
    setIsFiltering,
    selectedWord,
    setLoader,
    setShowNavigationButtons,
    showNavigationButtons,
    setCurrentHighlightIndex,
    setSelectedWord,
    setHighlightLocations,
    isFiltering,
    isFiltering2,
    filteredDocuments,
    setHighlightCleared,
    wordCount,
    selectedFileIndex,
    setSelectedFileIndex,
    setwordCount,
    selectedSummaryPoint,
    currentChunkHighlights,
    chunkFilteredDocuments,
    isChunkFiltering,
    setIsChunkFiltering,
    setSelectedSummaryPoint,
    setCurrentChunkHighlights,

    currentChunkIndex,
    setCurrentChunkIndex,
    sortedChunkGroups,
    setSortedChunkGroups,
  } = useHighlight();

  const abortControllerRef = useRef<AbortController | null>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement | null>(null);
  const [, setSearchVal] = useState("");
  const [products, setProducts] = useState(documentDetails);

  const [showAll, setShowAll] = useState(false);
  const [selectedFile, setSelectedFile] =
    useState<selectedDocumentsAndLocations>({
      url: documentDetails[0]?.url || "",
      document_name: documentDetails[0]?.document || "",
      locations: highlightLocations,
    });

  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const [toastMsg, setToastMsg] = useState<ToastMessageState>({
    show: false,
    message: "",
    success: false,
  });

  const [documentZoom, setDocumentZoom] = useState<number>(1.0);
  const MIN_ZOOM = 1.0;
  const MAX_ZOOM = 3.0;
  const ZOOM_STEP = 0.25;

  const [isHoveringDocument, setIsHoveringDocument] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [documentChunkGroups, setDocumentChunkGroups] = useState<
    SortedChunkGroup[]
  >([]);

  // The changes from here is for highlight navigation

  const highlightContainerRefs = useRef<{
    [key: number]: HTMLDivElement | null;
  }>({});

  const lastApiCallRef = useRef<string>("");
  const currentPdfDocRef = useRef<any>(null);

  const LARGE_DOCUMENT_THRESHOLD = 100; // Pages
  const MEMORY_SAFE_QUALITY_FACTOR = 1.5; // Reduced quality for large docs
  const STANDARD_QUALITY_FACTOR = 2.0; // Normal quality
  const LARGE_DOC_BATCH_SIZE = 2; // Smaller batches for large docs
  const STANDARD_BATCH_SIZE = 3;

  useEffect(() => {
    setProducts(documentDetails);
    setSelectedFile({
      url: documentDetails[0]?.url || "",
      document_name: documentDetails[0]?.document || "",
      locations: highlightLocations,
    });
  }, [documentDetails]);

  // SQ 1.11 Handle chunk filtering flag check in the mount in the useEffect
  // isChunkFiltering is true AND chunkFilteredDocuments has elements
  useEffect(() => {
    console.log("Chunk filtering effect", {
      isChunkFiltering,
      chunkFilteredDocuments,
    });

    if (isChunkFiltering && chunkFilteredDocuments.length > 0) {
      setProducts(chunkFilteredDocuments);

      const firstDoc = chunkFilteredDocuments[0];
      setSelectedFile({
        url: firstDoc.url,
        document_name: firstDoc.document,
        locations: [],
      });

      const actualIndex = documentDetails.findIndex(
        (doc) => doc.document === firstDoc.document
      );
      if (actualIndex !== -1) {
        setSelectedDocumentIndex(actualIndex);
        setSelectedFileIndex(0);

        if (sortedChunkGroups.length > 0) {
          const docChunks = sortedChunkGroups.filter(
            (group) =>
              group.documentName === firstDoc.document ||
              firstDoc.document
                .toLowerCase()
                .includes(group.documentName.toLowerCase()) ||
              group.documentName
                .toLowerCase()
                .includes(firstDoc.document.toLowerCase())
          );
          setDocumentChunkGroups(docChunks);
          setCurrentChunkIndex(0);
        }
      }
    } else if (!isFiltering && !isFiltering2 && !isChunkFiltering) {
      setProducts(documentDetails);
    }
  }, [
    isChunkFiltering,
    chunkFilteredDocuments,
    documentDetails,
    setSelectedDocumentIndex,
    setSelectedFileIndex,
  ]);

  // SQ useEffect to store the selected index
  useEffect(() => {
    const storedData = sessionStorage.getItem("selectedFile");
    if (storedData) {
      const selectedFile = JSON.parse(storedData);
      setSelectedFile(selectedFile);
    }

    const selectedIndex = sessionStorage.getItem("selectedIndex");
    if (!selectedIndex) {
      setSelectedFileIndex(0);
      sessionStorage.setItem("isProcessed", documentDetails[0]?.isProcessed);
    } else {
      const index = parseInt(selectedIndex, 10);
      setSelectedFileIndex(index);
      setSelectedDocumentIndex(index);
    }
  }, []);

  const removeFileExtension = (filename: string) => {
    return filename.replace(/\.[^/.]+$/, "");
  };

  const getDisplayName = (document: string) => {
    return removeFileExtension(document);
  };

  // SQ 1.26 Function clearAllHighlights here newly added the setIsChunkFiltering set to false her for the chunk based highlightion
  // it actually clears the entire stored data to make it as a initial state
  function clearAllHighlights() {
    try {
      setLoader(true);
      if (isFiltering) setIsFiltering(false);
      if (isFiltering2) setIsFiltering2(false);
      if (isChunkFiltering) setIsChunkFiltering(false);

      setSelectedSummaryPoint(null);
      setCurrentChunkHighlights([]);

      setCurrentChunkIndex(0);
      setSortedChunkGroups([]);

      setSelectedWord("");
      setHighlightLocations([]);
      setwordCount(0);
      setCurrentHighlightIndex(-1);
      // setShouldScrollToHighlight(false); // ← REMOVE THIS LINE

      // Reset navigation UI
      setShowNavigationButtons(false);
      setSearchVal("");

      // Reset to FIRST document (index 0)
      const firstDocument = documentDetails[0];

      if (firstDocument) {
        const resetFile = {
          url: firstDocument.url,
          document_name: firstDocument.document,
          locations: [],
        };

        setSelectedFile(resetFile);
        setSelectedFileIndex(0);
        setSelectedDocumentIndex(0);

        sessionStorage.setItem("selectedFile", JSON.stringify(resetFile));
        sessionStorage.setItem("selectedIndex", "0");
        sessionStorage.setItem("isProcessed", firstDocument.isProcessed);

        sessionStorage.removeItem("prevFile");
        sessionStorage.removeItem("prevFileIndex");
        sessionStorage.removeItem("prevIndex");
        sessionStorage.removeItem("allLocationscount");
      }

      setProducts(documentDetails);
      setHighlightCleared(true);

      const pdfCanvas = document.getElementById("pdf-canvas");
      if (pdfCanvas) {
        pdfCanvas.innerHTML = "";
      }

      renderedPages.forEach((pageNum) => {
        const container = highlightContainerRefs.current[pageNum];
        if (container) {
          container.innerHTML = "";
        }
      });
      setRenderedPages(new Set());

      console.log("All highlights cleared, reset to first document");
      setCurrentLocationIndex(0);
      
    } catch (error) {
      console.error(" Error in clearAllHighlights:", error);
    } finally {
      setLoader(false);
    }
  }

  // SQ Function handleClickOutside in the dropdown
  const handleClickOutside = (event: MouseEvent) => {
    const dropdownMenu = document.querySelector(".dropdown-menu.show");
    const dropdownButton = dropdownButtonRef.current;

    if (
      dropdownMenu &&
      !dropdownMenu.contains(event.target as Node) &&
      dropdownButton &&
      !dropdownButton.contains(event.target as Node)
    ) {
      setShowAll(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // SQ : 1.18 File selection to shown in the documents based on the isChunkFiltering or default all documents
  useEffect(() => {
    console.log("Products update effect", {
      isFiltering,
      isFiltering2,
      isChunkFiltering,
    });

    if (isChunkFiltering) {
      return;
    } else if (isFiltering) {
      setProducts(filteredDocuments);
      if (filteredDocuments.length > 0) {
        sessionStorage.setItem(
          "selectedFile",
          JSON.stringify({
            url: null,
            document_name: filteredDocuments[0].document,
            locations: highlightLocations,
          })
        );

        setSelectedFile({
          url: filteredDocuments[0].url,
          document_name: filteredDocuments[0].document,
          locations: highlightLocations,
        });
      }
    } else {
      setProducts(documentDetails);
    }

    if (isFiltering2) {
      setSelectedFileIndex(0);
      setSelectedDocumentIndex(0);
    }
  }, [isFiltering, isFiltering2, filteredDocuments, isChunkFiltering]);

  // useEffect(() => {
  //   console.log("API call effect", selectedFile, currentLocationIndex);
  //   apiFunction(selectedFile, currentLocationIndex);
  // }, [selectedFile.document_name, selectedFile.locations, currentLocationIndex])

  useEffect(() => {
    const callKey = `${selectedFile.document_name}-${selectedFile.locations.length}-${currentLocationIndex}`;
    if (lastApiCallRef.current === callKey) {
      console.log("Skipping duplicate API call for:", callKey);
      return;
    }
    lastApiCallRef.current = callKey;
    apiFunction(selectedFile, currentLocationIndex);
  }, [
    selectedFile.document_name,
    selectedFile.locations,
    currentLocationIndex,
  ]);

  // Re-render document when zoom changes (add around line 140)
  useEffect(() => {
    const container = document.getElementById("pdf-canvas");
    if (!container) return;

    const canvases = container.getElementsByClassName("pdf-page-canvas");

    // Save current scroll position as percentage
    const scrollPercentX =
      container.scrollLeft /
      (container.scrollWidth - container.clientWidth || 1);
    const scrollPercentY =
      container.scrollTop /
      (container.scrollHeight - container.clientHeight || 1);

    for (let i = 0; i < canvases.length; i++) {
      const canvas = canvases[i] as HTMLElement;
      canvas.style.transform = `scale(${documentZoom})`;
      canvas.style.transformOrigin = "top left";

      canvas.style.marginBottom = `${(documentZoom - 1) * 100}%`;
    }

    requestAnimationFrame(() => {
      const newScrollLeft =
        scrollPercentX * (container.scrollWidth - container.clientWidth);
      const newScrollTop =
        scrollPercentY * (container.scrollHeight - container.clientHeight);

      container.scrollLeft = newScrollLeft;
      container.scrollTop = newScrollTop;
    });
  }, [documentZoom]);

  useEffect(() => {
    if (
      !selectedSummaryPoint &&
      !selectedWord &&
      currentChunkHighlights.length === 0
    ) {
      return;
    }
    setDocumentZoom(1.0);
  }, [
    selectedSummaryPoint,
    selectedWord,
    isChunkFiltering,
    currentChunkHighlights.length,
  ]);

  const highlightHash = JSON.stringify(highlightLocations);
  useEffect(() => {
    setCurrentLocationIndex(0);
    setSelectedFile((prevState) => ({
      ...prevState,
      locations: highlightLocations,
    }));
  }, [selectedWord, highlightHash]);

  // SQ 7.1 to 7.11 : Call getNavigationDisplayText function \n// Gets context-appropriate text
  //
  const getNavigationDisplayText = () => {
    if (isChunkFiltering && selectedSummaryPoint) {
      // Check if it's a medical procedure or case summary point
      if (selectedSummaryPoint.point.startsWith("Medical Procedure:")) {
        return selectedSummaryPoint.point;
      }
      return `${selectedSummaryPoint.point.substring(0, 30)}...`;
    }
    return selectedWord;
  };

  // Zoom control functions (add around line 200)
  const handleZoomIn = () => {
    setDocumentZoom((prev) => {
      const newZoom = Math.min(prev + ZOOM_STEP, MAX_ZOOM);
      console.log(`🔍 Zoom In: ${(newZoom * 100).toFixed(0)}%`);
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setDocumentZoom((prev) => {
      const newZoom = Math.max(prev - ZOOM_STEP, MIN_ZOOM);
      console.log(`🔍 Zoom Out: ${(newZoom * 100).toFixed(0)}%`);
      return newZoom;
    });
  };

  const handleZoomReset = () => {
    console.log("🔍 Reset Zoom: 100%");
    setDocumentZoom(1.0);
  };

  // SQ 1.33 Function drawChunkHighlightsOnCanvas matching the chunkHighlights with the
  function drawChunkHighlightsOnCanvas(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    chunkHighlights: ChunkHighlight[],
    pageIndex: number,
    documentName: string,
    scale: number = 1
  ) {
    const matchingHighlights = chunkHighlights.filter(
      (h) =>
        h.page_index === pageIndex &&
        (h.documentName === documentName ||
          documentName.toLowerCase().includes(h.documentName.toLowerCase()) ||
          h.documentName.toLowerCase().includes(documentName.toLowerCase()))
    );

    console.log(
      `Drawing ${matchingHighlights.length} chunk highlights on page ${pageIndex}`
    );

    matchingHighlights.forEach(({ bounding_box }) => {
      const { left, top, width, height } = bounding_box;
      ctx.save();

      ctx.fillStyle = "rgba(255, 255, 0, 0.42)";
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
  }

  // SQ 1.37 Function drawHighlightsOnCanvas to highlights the word based on the bounding data
  function drawHighlightsOnCanvas(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    highlights: HighlightType[],
    pageIndex: number,
    selectedWord: string,
    scale: number = 1
  ) {
    if (!ctx || !canvas || !highlights) {
      console.error("Invalid parameters provided to drawHighlightsOnCanvas");
      return;
    }

    try {
      const normalizedWord = selectedWord.toLowerCase().trim();
      const wordParts = normalizedWord
        .split(/\s+/)
        .map((part) => part.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ""));

      const matchingHighlights = highlights.reduce<HighlightType[]>(
        (acc, h) => {
          try {
            const normalizedHighlightWord = h.word
              ?.toLowerCase()
              .trim()
              .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");

            if (
              h.page_index === pageIndex &&
              normalizedHighlightWord &&
              wordParts.includes(normalizedHighlightWord)
            ) {
              acc.push(h);
            }
          } catch (error) {
            console.warn("Skipping invalid highlight", h, error);
          }
          return acc;
        },
        []
      );

      if (matchingHighlights.length > 0) {
        ctx.save();
        try {
          ctx.fillStyle = "rgba(255, 255, 1, 0.96)";
          ctx.globalAlpha = 0.5;

          matchingHighlights.forEach(({ bounding_box }) => {
            try {
              const { left, top, width, height } = bounding_box;

              const scaledLeft = left * (canvas.width / scale);
              const scaledTop = top * (canvas.height / scale);
              const scaledWidth = width * (canvas.width / scale);
              const scaledHeight = height * (canvas.height / scale);

              ctx.fillRect(scaledLeft, scaledTop, scaledWidth, scaledHeight);
            } catch (drawError) {
              console.warn(
                "Failed to draw highlight box",
                bounding_box,
                drawError
              );
            }
          });
        } finally {
          ctx.restore();
        }
      }
    } catch (error) {
      console.error("Failed to draw highlights:", error);
    }
  }

  // SQ 1.41 Function renderAllPages render all the pages with the chunkHighlights and highlights for mentioned scenario from all the componenets
  const renderAllPages = async (
    pdf: any,
    highlights: HighlightType[],
    selectedWord: string,
    chunkHighlights?: ChunkHighlight[],
    targetPageIndex: number = 0
  ): Promise<void> => {
    if (!pdf) {
      console.error("PDF not loaded yet");
      return;
    }

    const container = document.getElementById("pdf-canvas");
    if (!container) {
      console.error("PDF viewer container not found");
      return;
    }
    
    currentPdfDocRef.current = pdf;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      container.replaceChildren();

      const isLargeDocument = pdf.numPages > LARGE_DOCUMENT_THRESHOLD;
      const qualityFactor = isLargeDocument ? MEMORY_SAFE_QUALITY_FACTOR : STANDARD_QUALITY_FACTOR;
      const batchSize = isLargeDocument ? LARGE_DOC_BATCH_SIZE : STANDARD_BATCH_SIZE;

      // STEP 1: Determine priority pages
      let priorityPages: number[] = [];
      let scrollToPage = targetPageIndex;

      if (chunkHighlights && chunkHighlights.length > 0) {
        const highlightedPageIndices = new Set(
          chunkHighlights.map(h => h.page_index + 1)
        );
        priorityPages = Array.from(highlightedPageIndices).sort((a, b) => a - b);
        
        if (targetPageIndex === 0 && priorityPages.length > 0) {
          scrollToPage = priorityPages[0] - 1;
        }
        
        const targetPage1Indexed = scrollToPage + 1;
        if (!priorityPages.includes(targetPage1Indexed)) {
          priorityPages.unshift(targetPage1Indexed);
        }
        
        console.log(`Priority rendering ${priorityPages.length} highlighted pages, target: ${scrollToPage}`);
      } else if (highlights && highlights.length > 0) {
        const highlightedPageIndices = new Set(
          highlights.map(h => h.page_index + 1)
        );
        priorityPages = Array.from(highlightedPageIndices).sort((a, b) => a - b);
        
        if (targetPageIndex === 0 && priorityPages.length > 0) {
          scrollToPage = priorityPages[0] - 1;
        }
        
        const targetPage1Indexed = scrollToPage + 1;
        if (!priorityPages.includes(targetPage1Indexed)) {
          priorityPages.unshift(targetPage1Indexed);
        }
      } else {
        const INITIAL_PAGES = Math.min(5, pdf.numPages); // Increased from 3 to 5
        priorityPages = Array.from({ length: INITIAL_PAGES }, (_, i) => i + 1);
        scrollToPage = 0;
      }

      // STEP 2: Create placeholders for ALL pages WITH SPINNERS
      const pageWrappers: HTMLDivElement[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const wrapper = document.createElement("div");
        wrapper.className = "pdf-page-wrapper";
        wrapper.dataset.pageNumber = pageNum.toString();
        wrapper.style.minHeight = "800px";
        wrapper.style.position = "relative";
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.justifyContent = "center";
        wrapper.style.backgroundColor = "#f8f9fa";
        wrapper.style.border = "1px solid #dee2e6";
        wrapper.style.marginBottom = "10px";
        wrapper.style.borderRadius = "4px";

        const loaderDiv = document.createElement("div");
        loaderDiv.className = "page-placeholder-loader";
        loaderDiv.innerHTML = `
          <div style="text-align: center;">
            <div class="spinner-border text-primary" role="status" style="width: 2rem; height: 2rem;">
              <span class="visually-hidden">Loading...</span>
            </div>
            <div style="margin-top: 10px; color: #6c757d; font-size: 14px;">
              Loading page ${pageNum}...
            </div>
          </div>
        `;
        
        wrapper.appendChild(loaderDiv);
        container.appendChild(wrapper);
        pageWrappers.push(wrapper);
      }

      // STEP 3: Render priority pages FIRST
      console.log(`Rendering ${priorityPages.length} priority pages...`);
      await renderPageBatch(
        pdf, 
        priorityPages, 
        pageWrappers, 
        highlights, 
        selectedWord, 
        chunkHighlights, 
        controller,
        qualityFactor,
        batchSize
      );

      if (controller.signal.aborted) return;

      // STEP 4: Turn off main loader and scroll to target
      setLoader(false);
      
      setTimeout(() => {
        scrollToHighlight(scrollToPage);
      }, 100);

      // STEP 5: Render remaining pages in background
      const remainingPages = Array.from({ length: pdf.numPages }, (_, i) => i + 1)
        .filter(p => !priorityPages.includes(p));

      if (remainingPages.length > 0) {
        console.log(`Background rendering ${remainingPages.length} remaining pages...`);
        
        // Add delay for large documents to prevent freeze
        const startDelay = isLargeDocument ? 500 : 50;
        
        setTimeout(async () => {
          await renderPageBatch(
            pdf, 
            remainingPages, 
            pageWrappers, 
            highlights, 
            selectedWord, 
            chunkHighlights, 
            controller,
            qualityFactor,
            batchSize
          );
        }, startDelay);
      }

    } catch (err) {
      if (!controller.signal.aborted) {
        console.error("Document rendering failed:", err);
      }
      setLoader(false);
    }
  };

  // Helper function to render a batch of pages
  const renderPageBatch = async (
    pdf: any,
    pageNumbers: number[],
    pageWrappers: HTMLDivElement[],
    highlights: HighlightType[],
    selectedWord: string,
    chunkHighlights: ChunkHighlight[] | undefined,
    controller: AbortController,
    qualityFactor: number = 2.0,
    batchSize: number = 3
  ) => {
    for (let i = 0; i < pageNumbers.length; i += batchSize) {
      if (controller.signal.aborted) break;
      
      const batch = pageNumbers.slice(i, i + batchSize);
      
      // Render batch concurrently
      await Promise.all(
        batch.map(pageNum => renderSinglePage(
          pdf,
          pageNum,
          pageWrappers[pageNum - 1],
          highlights,
          selectedWord,
          chunkHighlights,
          controller,
          qualityFactor
        ))
      );

      if (i + batchSize < pageNumbers.length) {
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms pause
      }
    }
  };

  // Render a single page into its wrapper
  const renderSinglePage = async (
    pdf: any,
    pageNum: number,
    wrapper: HTMLDivElement,
    highlights: HighlightType[],
    selectedWord: string,
    chunkHighlights: ChunkHighlight[] | undefined,
    controller: AbortController,
    qualityFactor: number = 2.0
  ) => {
    if (controller.signal.aborted) return;

    let pdfPage: any = null;

    try {
      pdfPage = await pdf.getPage(pageNum);
      if (controller.signal.aborted) return;

      const renderScale = documentZoom * qualityFactor;
      const viewport = pdfPage.getViewport({ scale: renderScale });
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { 
        willReadFrequently: false,
        alpha: false
      });
      
      if (!ctx) return;

      canvas.width = viewport.width * window.devicePixelRatio;
      canvas.height = viewport.height * window.devicePixelRatio;
      canvas.style.width = `${(viewport.width / qualityFactor) * documentZoom}px`;
      canvas.style.height = `${(viewport.height / qualityFactor) * documentZoom}px`;
      canvas.className = "pdf-page-canvas";
      canvas.dataset.pageNumber = pageNum.toString();

      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      await pdfPage.render({
        canvasContext: ctx,
        viewport: viewport,
        intent: "display",
      }).promise;

      // Apply highlights
      if (chunkHighlights && chunkHighlights.length > 0) {
        drawChunkHighlightsOnCanvas(ctx, canvas, chunkHighlights, pageNum - 1, selectedFile.document_name, window.devicePixelRatio);
      } else if (highlights && highlights.length > 0) {
        drawHighlightsOnCanvas(ctx, canvas, highlights, pageNum - 1, selectedWord, window.devicePixelRatio);
      }

      // Replace placeholder with actual canvas
      wrapper.replaceChildren(canvas);
      wrapper.style.minHeight = "auto";
      wrapper.style.display = "block";
      wrapper.style.backgroundColor = "transparent";
      wrapper.style.border = "none";
      wrapper.style.alignItems = "";
      wrapper.style.justifyContent = "";

      console.log(`✓ Page ${pageNum} rendered`);
    } catch (err) {
      if (!controller.signal.aborted) {
        console.warn(`Error rendering page ${pageNum}:`, err);
      }
    } finally {
      if (pdfPage && pdfPage.cleanup) {
        try {
          pdfPage.cleanup();
        } catch (cleanupErr) {
          console.warn(`Cleanup failed for page ${pageNum}:`, cleanupErr);
        }
      }
    }
  };

  // SQ 1.53 Function apiFunction This function fetches and renders document files (PDFs or images) from the backend, displaying
  // them with highlighted text regions based on search results or chunk data. It retrieves the binary content using the case ID
  // and document name, determines the file type, and handles PDFs by rendering all pages with highlights before scrolling to the relevant location,
  // while images are processed through a separate handler. The function includes comprehensive error handling for password-protected PDFs
  // (reverting to the previous document), fallback rendering attempts when PDF parsing fails, and proper memory cleanup by revoking blob URLs.
  const apiFunction = async (
    selectedFile: selectedDocumentsAndLocations,
    currentLocationIndex: number
  ) => {
    let blobUrl: string | null = null;
 
    try {
      setLoader(true);
      setRenderedPages(new Set());
 
      const requestBody = {
        caseId: sessionStorage.getItem("caseID"),
        documentName: selectedFile.document_name,
      };
 
      const response = await fetchBinaryContent(requestBody);
 
      if (response.status === 200) {
        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
        const fileType = blob.type;
 
        if (fileType === "application/pdf") {
          try {
            setRenderedPages(new Set());
 
            const pdfDoc = await pdfjsLib.getDocument({
              url: blobUrl,
            }).promise;
 
            setLoadingProgress(100);
            setIsLoading(false);
 
            const highlightsToUse = selectedFile.locations;
            let chunkHighlightsToUse: ChunkHighlight[] = [];
 
            if (isChunkFiltering && currentChunkHighlights.length > 0) {
              chunkHighlightsToUse = currentChunkHighlights.filter(
                (h) =>
                  h.documentName === selectedFile.document_name ||
                  selectedFile.document_name
                    .toLowerCase()
                    .includes(h.documentName.toLowerCase()) ||
                  h.documentName
                    .toLowerCase()
                    .includes(selectedFile.document_name.toLowerCase())
              );
            }
 
            // Setup chunk groups BEFORE rendering
            if (isChunkFiltering && sortedChunkGroups.length > 0) {
              const currentDocChunks = sortedChunkGroups.filter(
                (group) =>
                  group.documentName === selectedFile.document_name ||
                  selectedFile.document_name
                    .toLowerCase()
                    .includes(group.documentName.toLowerCase()) ||
                  group.documentName
                    .toLowerCase()
                    .includes(selectedFile.document_name.toLowerCase())
              );
 
              console.log(
                `Filtered to ${currentDocChunks.length} chunks for ${selectedFile.document_name}`
              );
              setDocumentChunkGroups(currentDocChunks);
              setCurrentChunkIndex(0);
            }
 
            // Determine the target page to scroll to based on currentLocationIndex
            const targetPageIndex = highlightsToUse[currentLocationIndex]?.page_index || 0;
 
            // renderAllPages now handles loader internally
            await renderAllPages(
              pdfDoc,
              highlightsToUse,
              selectedWord,
              chunkHighlightsToUse,
              targetPageIndex // Pass the target page for scrolling
            );
 
            if (blobUrl) {
              URL.revokeObjectURL(blobUrl);
              blobUrl = null;
              console.log("Blob URL revoked");
            }
 
          } catch (error) {
            console.error("Error loading PDF:", error);
 
            if (error instanceof Error && error.message.includes("password")) {
              setToastMsg({
                show: true,
                message:
                  "This document is password protected and cannot be displayed.",
                success: false,
              });
 
              const prevFile = sessionStorage.getItem("prevFile");
              if (prevFile) {
                try {
                  const parsedFile = JSON.parse(
                    prevFile
                  ) as selectedDocumentsAndLocations;
                  setSelectedFile(parsedFile);
                } catch (error) {
                  console.error(
                    "Error parsing prevFile from sessionStorage",
                    error
                  );
                }
              }
 
              const prevFileIndex = sessionStorage.getItem("prevFileIndex");
              setSelectedDocumentIndex(
                prevFileIndex ? parseInt(prevFileIndex) : 0
              );
 
              const prevIndex = sessionStorage.getItem("prevIndex");
              setSelectedFileIndex(prevIndex ? parseInt(prevIndex) : 0);
 
              setRenderedPages(new Set());
              setLoader(false);
              if (blobUrl) URL.revokeObjectURL(blobUrl);
              return;
            }
 
            if (blobUrl) {
              try {
                const highlightsForImage = selectedFile.locations;
                let chunkHighlightsForImage: ChunkHighlight[] = [];
 
                if (isChunkFiltering && currentChunkHighlights.length > 0) {
                  chunkHighlightsForImage = currentChunkHighlights.filter(
                    (h) =>
                      h.documentName === selectedFile.document_name ||
                      selectedFile.document_name
                        .toLowerCase()
                        .includes(h.documentName.toLowerCase()) ||
                      h.documentName
                        .toLowerCase()
                        .includes(selectedFile.document_name.toLowerCase())
                  );
                }
 
                handleImageFile(
                  blobUrl,
                  highlightsForImage,
                  selectedWord,
                  chunkHighlightsForImage
                );
              } catch (imageError) {
                console.error("Error handling as image:", imageError);
                setToastMsg({
                  show: true,
                  message: "The document could not be displayed.",
                  success: false,
                });
                setRenderedPages(new Set());
              }
            }
            setLoader(false);
          }
        } else if (fileType.startsWith("image/")) {
          try {
            const highlightsToUse = selectedFile.locations;
            let chunkHighlightsToUse: ChunkHighlight[] = [];
 
            if (isChunkFiltering && currentChunkHighlights.length > 0) {
              chunkHighlightsToUse = currentChunkHighlights.filter(
                (h) =>
                  h.documentName === selectedFile.document_name ||
                  selectedFile.document_name
                    .toLowerCase()
                    .includes(h.documentName.toLowerCase()) ||
                  h.documentName
                    .toLowerCase()
                    .includes(selectedFile.document_name.toLowerCase())
              );
            }
 
            handleImageFile(
              blobUrl,
              highlightsToUse,
              selectedWord,
              chunkHighlightsToUse
            );
            setLoader(false);
          } catch (imageError) {
            console.error("Error handling image:", imageError);
            setToastMsg({
              show: true,
              message: "The image could not be displayed.",
              success: false,
            });
            setRenderedPages(new Set());
            setLoader(false);
          }
        } else {
          console.error("Unsupported file type:", fileType);
          setToastMsg({
            show: true,
            message: "Unsupported file type.",
            success: false,
          });
          setIsLoading(false);
          setRenderedPages(new Set());
          setLoader(false);
          if (blobUrl) URL.revokeObjectURL(blobUrl);
        }
      } else {
        // Handle non-200 status codes
        console.error("API returned non-200 status:", response.status);
 
        // Abort any ongoing rendering operations
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
 
        // Clear the canvas
        const pdfCanvas = document.getElementById("pdf-canvas");
        if (pdfCanvas) {
          pdfCanvas.innerHTML = "";
        }
 
        // Clear current PDF reference
        currentPdfDocRef.current = null;
 
        // Turn off the loader
        setLoader(false);
        setIsLoading(false);
        setRenderedPages(new Set());
 
        // Show error toast
        setToastMsg({
          show: true,
          message: "Failed to load document.",
          success: false,
        });
 
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      }
    } catch (error) {
      // Abort any ongoing rendering operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
 
      // Clear the canvas
      const pdfCanvas = document.getElementById("pdf-canvas");
      if (pdfCanvas) {
        pdfCanvas.innerHTML = "";
      }
 
      // Clear current PDF reference
      currentPdfDocRef.current = null;
 
      setToastMsg({
        show: true,
        message: "An error occurred while loading the document.",
        success: false,
      });
 
      try {
        const errorDescription =
          error instanceof Error ? error.message : String(error);
        const errorFunction = "apiFunction";
        const errorSource = "BE";
        const payload = { errorDescription, errorFunction, errorSource };
        await postErrorAPI(payload);
      } catch (apiError) {
        console.error("Error logging error:", apiError);
      }
 
      console.log("traceback", error);
      setRenderedPages(new Set());
      setIsLoading(false);
      setLoader(false);
 
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    }
  };

  function handleImageFile(
    imageUrl: string,
    highlights: HighlightType[],
    selectedWord: string,
    chunkHighlights?: ChunkHighlight[]
  ) {
    const img = new Image();
    img.onload = function () {
      const container = document.getElementById("pdf-canvas");
      if (!container) return;

      if (chunkHighlights && chunkHighlights.length > 0) {
        renderImageWithChunkHighlights(img, container, chunkHighlights, 0);
      } else {
        renderImageHighlights(img, container, highlights, 0, selectedWord);
      }

      scrollToImageHighlight(
        highlightLocations[currentLocationIndex]?.page_index || 0
      );
    };
    img.src = imageUrl;
  }

  // SQ : 1.70 This function renders image files with visual chunk highlights by creating a two-layer canvas system where the base layer
  // displays the high-quality scaled image and an overlay layer draws semi-transparent yellow rectangles at specified bounding box coordinates.
  // It filters chunk highlights matching the current page index, converts normalized bounding box coordinates (0-1 range) to absolute pixel positions
  // based on the image dimensions, and renders each highlight with a yellow fill and amber border. The function uses device pixel ratio scaling for crisp rendering on high-DPI displays and replaces the container's content with the newly created highlighted image wrapper.
  function renderImageWithChunkHighlights(
    imgElement: HTMLImageElement,
    container: HTMLElement,
    chunkHighlights: ChunkHighlight[],
    pageIndex: number
  ) {
    const matchingHighlights = chunkHighlights.filter(
      (h) => h.page_index === pageIndex
    );

    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";

    const zoomedWidth = imgElement.width * documentZoom;
    const zoomedHeight = imgElement.height * documentZoom;

    const imageCanvas = document.createElement("canvas");
    const imageCtx = imageCanvas.getContext("2d");

    if (!imageCtx) return;

    const scale = window.devicePixelRatio * 1.5;

    imageCanvas.width = zoomedWidth * scale;
    imageCanvas.height = zoomedHeight * scale;
    imageCanvas.style.width = `${zoomedWidth}px`;
    imageCanvas.style.height = `${zoomedHeight}px`;

    imageCtx.imageSmoothingEnabled = true;
    imageCtx.imageSmoothingQuality = "high";
    imageCtx.scale(scale, scale);

    imageCtx.drawImage(imgElement, 0, 0, zoomedWidth, zoomedHeight);
    wrapper.appendChild(imageCanvas);

    const highlightCanvas = document.createElement("canvas");
    highlightCanvas.width = zoomedWidth;
    highlightCanvas.height = zoomedHeight;
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

      const rectX = left * zoomedWidth;
      const rectY = top * zoomedHeight;
      const rectWidth = width * zoomedWidth;
      const rectHeight = height * zoomedHeight;

      ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
      // ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
      ctx.restore();
    });

    wrapper.appendChild(highlightCanvas);
    container.innerHTML = "";
    container.appendChild(wrapper);
  }

  // Function renderImageHighlights for the image canvas
  function renderImageHighlights(
    imgElement: HTMLImageElement,
    container: HTMLElement,
    highlights: HighlightType[],
    pageIndex: number,
    selectedWord: string
  ) {
    if (!imgElement || !container || !highlights) {
      console.error("Invalid parameters provided to renderImageHighlights");
      return;
    }

    try {
      const normalizedWord = selectedWord.toLowerCase().trim();
      const wordParts = normalizedWord.split(/\s+/).filter(Boolean);

      const matchingHighlights = highlights.reduce<HighlightType[]>(
        (acc, h) => {
          try {
            const word = h.word?.toLowerCase().trim();
            if (
              h.page_index === pageIndex &&
              word &&
              wordParts.includes(word)
            ) {
              acc.push(h);
            }
          } catch (error) {
            console.warn("Skipping invalid highlight", h, error);
          }
          return acc;
        },
        []
      );

      const zoomedWidth = imgElement.width * documentZoom;
      const zoomedHeight = imgElement.height * documentZoom;

      const wrapper = document.createElement("div");
      Object.assign(wrapper.style, {
        position: "relative",
        display: "inline-block",
        width: `${zoomedWidth}px`,
        height: `${zoomedHeight}px`,
      });

      const imgClone = imgElement.cloneNode(true) as HTMLImageElement;
      imgClone.style.width = `${zoomedWidth}px`;
      imgClone.style.height = `${zoomedHeight}px`;
      wrapper.appendChild(imgClone);

      const highlightCanvas = document.createElement("canvas");
      highlightCanvas.width = zoomedWidth;
      highlightCanvas.height = zoomedHeight;
      Object.assign(highlightCanvas.style, {
        position: "absolute",
        top: "0",
        left: "0",
        pointerEvents: "none",
      });

      const ctx = highlightCanvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get 2D rendering context");
      }

      ctx.save();
      try {
        ctx.fillStyle = "rgba(255, 255, 1, 0.96)";
        ctx.globalAlpha = 0.5;

        matchingHighlights.forEach(({ bounding_box }) => {
          try {
            const { left, top, width, height } = bounding_box;
            ctx.fillRect(
              left * zoomedWidth,
              top * zoomedHeight,
              width * zoomedWidth,
              height * zoomedHeight
            );
          } catch (error) {
            console.warn("Failed to draw highlight box", bounding_box, error);
          }
        });
      } finally {
        ctx.restore();
      }

      wrapper.appendChild(highlightCanvas);
      container.replaceChildren(wrapper);
    } catch (error) {
      console.error("Failed to render image highlights:", error);
      container.replaceChildren(imgElement.cloneNode(true));
    }
  }

  function scrollToImageHighlight(highlightLocation: number) {
    try {
      if (!highlightLocation) return;

      const container = document.getElementById("pdf-canvas");
      if (!container) return;

      const highlights = container.querySelectorAll(".highlight-overlay");
      if (highlightLocation < highlights.length) {
        const highlight = highlights[highlightLocation];
        highlight.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        highlight.classList.add("highlight-emphasis");
        setTimeout(() => {
          highlight.classList.remove("highlight-emphasis");
        }, 2000);
      }
    } catch (error) {
      console.error("Error in scrollToImageHighlight:", error);
    }
  }

  // SQ 4.0 This function navigates to the previous occurrence of the selected search term by decrementing the current location
  // index by the word count of the search phrase. It ensures the index doesn't go below the word count threshold, allowing users
  // to step backwards through multi-word phrase matches in the document highlights.
  const handlePrevLocation = () => {
    if (!highlightLocations || highlightLocations.length === 0) return;
    const wordCount = selectedWord.split(" ").length;
    if (currentLocationIndex >= wordCount) {
      setCurrentLocationIndex((prev) => prev - wordCount);
    }
  };

  // MODIFY scrollToHighlight to handle chunk highlighting:

  // scrollToHighlight to work with progressive rendering
const scrollToHighlight = (pageIndex: number) => {
  const container = document.getElementById("pdf-canvas");
  if (!container) return;

  // Find the wrapper for the specific page (1-indexed in dataset)
  const targetWrapper = container.querySelector(
    `.pdf-page-wrapper[data-page-number="${pageIndex + 1}"]`
  ) as HTMLElement;

  if (targetWrapper) {
    const scrollPos = targetWrapper.offsetTop - 50; // 50px offset from top

    container.scrollTo({
      top: scrollPos,
      behavior: "smooth",
    });

    // ADD visual emphasis for the canvas inside the wrapper (optional)
    const canvas = targetWrapper.querySelector("canvas");
    if (canvas && isChunkFiltering) {
      canvas.style.transition = "transform 0.3s ease";
      canvas.style.transform = "scale(1.02)";
      setTimeout(() => {
        canvas.style.transform = "scale(1)";
      }, 300);
    }
  } else {
    console.warn(`Wrapper for page ${pageIndex + 1} not found`);
  }
};

  // SQ 5.0 This function advances to the next occurrence of the selected search term by incrementing the current location
  // index by the word count, while preventing navigation beyond the maximum valid index (total locations minus word count).
  //  It enables forward navigation through search results, accounting for multi-word phrases to maintain proper highlight positioning
  const handleNextLocation = () => {
    if (!highlightLocations || highlightLocations.length === 0) return;

    const wordCount = selectedWord.split(" ").length;
    const maxIndex = highlightLocations.length - wordCount;

    if (currentLocationIndex < maxIndex) {
      setCurrentLocationIndex((prev) => prev + wordCount);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const value = event.target.value.trim().toLowerCase();
      setSearchVal(event.target.value);

      // Determine base documents: use filtered docs if chunk filtering is active
      const baseDocuments = isChunkFiltering
        ? chunkFilteredDocuments
        : documentDetails;

      // When search is cleared
      if (!value) {
        setProducts(baseDocuments);
        return;
      }

      // Perform search within the appropriate document set
      try {
        const filteredAndSorted = [...baseDocuments].reduce<{
          matches: typeof products;
          others: typeof products;
        }>(
          (acc, item) => {
            try {
              const docName = item.document.toLowerCase();
              if (docName.includes(value)) {
                acc.matches.push(item);
              } else {
                acc.others.push(item);
              }
            } catch (error) {
              console.warn("Error processing document:", item, error);
              acc.others.push(item);
            }
            return acc;
          },
          { matches: [], others: [] }
        );

        // Sort matches alphabetically
        filteredAndSorted.matches.sort((a, b) =>
          a.document.localeCompare(b.document)
        );

        setProducts([
          ...filteredAndSorted.matches,
          ...filteredAndSorted.others,
        ]);
      } catch (filterError) {
        console.error("Search processing failed:", filterError);
        setProducts(baseDocuments);
      }
    } catch (outerError) {
      console.error("Search handler failed:", outerError);
      setSearchVal("");
      const baseDocuments = isChunkFiltering
        ? chunkFilteredDocuments
        : documentDetails;
      setProducts(baseDocuments);
    }
  };

  // SQ 2.0 to 2.16 This function handles document selection from a list, with different behaviors based on the active filtering mode (chunk-based summary points or text search).
  // When chunk filtering is active, it matches the selected document with chunk highlights and displays them; when text search filtering is active, it retrieves matching search result
  // locations from storage and sets up navigation through those highlights; otherwise, it simply loads the document without highlights. The function updates multiple state variables and
  // session storage entries to track the selected file, its index, highlight locations, and restore previous selections if needed, while resetting search inputs and navigation controls appropriately.
  const handleFileSelect = (
    document_url: string,
    name: string,
    index: number,
    isProcessed: string
  ) => {
    try {
      setDocumentZoom(1.0);
      currentPdfDocRef.current = null;

      if (isChunkFiltering && selectedSummaryPoint) {
        try {
          const matchedLocations = currentChunkHighlights.filter(
            (h) =>
              h.documentName === name ||
              name.toLowerCase().includes(h.documentName.toLowerCase()) ||
              h.documentName.toLowerCase().includes(name.toLowerCase())
          );

          const selectedfile = {
            url: document_url,
            document_name: name,
            locations: [],
          };

          sessionStorage.setItem("prevFile", JSON.stringify(selectedFile));
          setSelectedFile(selectedfile);
          sessionStorage.setItem("selectedFile", JSON.stringify(selectedfile));

          if (matchedLocations.length > 0) {
            const highlightLocations = matchedLocations.map((item) => ({
              page_index: item.page_index,
              bounding_box: item.bounding_box,
              word: item.word,
              documentName: item.documentName,
            }));

            setHighlightLocations(highlightLocations);
            setShowNavigationButtons(true);
            setCurrentHighlightIndex(0);
            setSelectedWord(
              `Summary Point: ${selectedSummaryPoint.point.substring(0, 30)}...`
            );

            const docChunks = sortedChunkGroups.filter(
              (group) =>
                group.documentName === name ||
                name.toLowerCase().includes(group.documentName.toLowerCase()) ||
                group.documentName.toLowerCase().includes(name.toLowerCase())
            );
            setDocumentChunkGroups(docChunks);
            setCurrentChunkIndex(0); // Reset to first chunk
          }

          const actualIndex = documentDetails.findIndex(
            (item) => item.document === name
          );

          setSelectedDocumentIndex(actualIndex >= 0 ? actualIndex : index);
          sessionStorage.setItem(
            "prevFileIndex",
            JSON.stringify(selectedDocumentIndex)
          );

          setShowAll(false);
          setSearchVal("");
          setSelectedFileIndex(index);
          sessionStorage.setItem(
            "prevIndex",
            JSON.stringify(selectedFileIndex)
          );
          sessionStorage.setItem("isProcessed", isProcessed);
          sessionStorage.setItem("selectedIndex", index.toString());
          return;
        } catch (error) {
          console.error("Error in chunk filtering file selection:", error);
        }
      }

      if (
        isFiltering2 &&
        remainingMatches &&
        remainingMatches.documents.length > 0
      ) {
        try {
          const storedCount = sessionStorage.getItem("allLocationscount");
          if (storedCount) {
            const counts = storedCount.split(",").map(Number);
            if (index < counts.length) {
              setwordCount(counts[index]);
            }
          }

          const matchedDocument = remainingMatches.documents.find(
            (doc) =>
              doc.document === name ||
              name.includes(doc.document) ||
              doc.document.includes(name)
          );

          if (matchedDocument) {
            const matchedLocations = remainingMatches.locations.filter(
              (loc) =>
                loc.documentName === matchedDocument.document ||
                matchedDocument.document.includes(loc.documentName) ||
                loc.documentName.includes(matchedDocument.document)
            );

            const selectedfile1 = {
              url: document_url,
              document_name: name,
              locations: matchedLocations,
            };

            sessionStorage.setItem("prevFile", JSON.stringify(selectedFile));
            setSelectedFile(selectedfile1);
            sessionStorage.setItem(
              "selectedFile",
              JSON.stringify(selectedfile1)
            );

            if (matchedLocations.length > 0) {
              const highlightLocations = matchedLocations.map((item) => ({
                page_index: item.page_index,
                bounding_box: item.bounding_box,
                word: item.word,
                count: item.count,
                documentName: item.documentName,
              }));

              setHighlightLocations(highlightLocations);
              setShowNavigationButtons(true);
              setCurrentHighlightIndex(0);
            }

            const actualIndex = documentDetails.findIndex(
              (item) => item.document === name
            );

            setSelectedDocumentIndex(actualIndex >= 0 ? actualIndex : index);
            sessionStorage.setItem(
              "prevFileIndex",
              JSON.stringify(selectedDocumentIndex)
            );

            setShowAll(false);
            setSearchVal("");
            setSelectedFileIndex(index);
            sessionStorage.setItem(
              "prevIndex",
              JSON.stringify(selectedFileIndex)
            );
            sessionStorage.setItem("isProcessed", isProcessed);
            sessionStorage.setItem("selectedIndex", index.toString());
            return;
          }
        } catch (error) {
          console.error("Error in remainingMatches handling:", error);
        }
      }

      try {
        setSelectedFileIndex(index);
        sessionStorage.setItem("prevIndex", JSON.stringify(selectedFileIndex));
        sessionStorage.setItem("isProcessed", isProcessed);
        sessionStorage.setItem("selectedIndex", index.toString());
        setShowAll(false);
        setShowNavigationButtons(false);

        const actualIndex = documentDetails.findIndex(
          (item) => item.document === name
        );

        const selectedfile2 = {
          url: document_url,
          document_name: name,
          locations: [],
        };

        setSelectedFile(selectedfile2);
        sessionStorage.setItem("prevFile", JSON.stringify(selectedFile));
        sessionStorage.setItem("selectedFile", JSON.stringify(selectedfile2));

        setSelectedDocumentIndex(actualIndex >= 0 ? actualIndex : index);
        sessionStorage.setItem(
          "prevFileIndex",
          JSON.stringify(selectedDocumentIndex)
        );
        setShowAll(false);
        setSearchVal("");
      } catch (error) {
        console.error("Error in default file selection handling:", error);
      }
    } catch (error) {
      console.error("Error in handleFileSelect:", error);
    }
  };

  // const getResultsCount = () => {
  //   if (isChunkFiltering && selectedSummaryPoint) {
  //     // Count unique chunk IDs instead of total highlights
  //     const uniqueChunks = new Set(
  //       currentChunkHighlights.map(h => h.chunkId)
  //     );
  //     return uniqueChunks.size;
  //   }
  //   return wordCount;
  // };

  const getResultsCount = () => {
    if (isChunkFiltering && documentChunkGroups.length > 0) {
      return documentChunkGroups.length; // ← Use filtered chunks
    }
    return wordCount;
  };

  const getCurrentPosition = () => {
    if (isChunkFiltering && documentChunkGroups.length > 0) {
      return currentChunkIndex + 1; // ← Position within current document
    }
    return (
      Math.floor(currentLocationIndex / selectedWord.split(" ").length) + 1
    );
  };

  // ADD these new functions:
  // Navigation handling in the chunk data
  const handleNextChunk = async () => {
    if (!isChunkFiltering || documentChunkGroups.length === 0) return;

    const nextIndex = currentChunkIndex + 1;

    //  Check bounds within CURRENT DOCUMENT
    if (nextIndex >= documentChunkGroups.length) {
      console.log("Already at last chunk of current document");
      return; // ← Stop at last chunk of current document
    }

    setIsNavigating(true);
    setLoader(true);

    try {
      const nextChunk = documentChunkGroups[nextIndex]; // ← Use filtered chunks
      console.log(
        `Navigating to chunk ${nextIndex + 1}/${
          documentChunkGroups.length
        } in ${selectedFile.document_name}`,
        {
          chunkId: nextChunk.chunkId.substring(0, 8),
          firstPageIndex: nextChunk.firstPageIndex,
        }
      );

      // No document switching - always same document
      setTimeout(() => {
        scrollToHighlight(nextChunk.firstPageIndex);
        setLoader(false);
        setIsNavigating(false);
      }, 300);

      setCurrentChunkIndex(nextIndex);
    } catch (error) {
      console.error("Error navigating to next chunk:", error);
      setLoader(false);
      setIsNavigating(false);
    }
  };

  // UPDATED: Navigation to previous chunk - jumps to first page of previous unique chunk
  const handlePrevChunk = async () => {
    if (!isChunkFiltering || documentChunkGroups.length === 0) return;

    const prevIndex = currentChunkIndex - 1;

    // Check bounds within CURRENT DOCUMENT
    if (prevIndex < 0) {
      console.log("Already at first chunk of current document");
      return; // ← Stop at first chunk of current document
    }

    setIsNavigating(true);
    setLoader(true);

    try {
      const prevChunk = documentChunkGroups[prevIndex]; // ← Use filtered chunks

      // No document switching - always same document
      setTimeout(() => {
        scrollToHighlight(prevChunk.firstPageIndex);
        setLoader(false);
        setIsNavigating(false);
      }, 300);

      setCurrentChunkIndex(prevIndex);
    } catch (error) {
      console.error("Error navigating to previous chunk:", error);
      setLoader(false);
      setIsNavigating(false);
    }
  };

  return (
    <>
      <ToastMsg toastMsg={toastMsg} setToastMsg={setToastMsg} />
      <div className="card-body">
        <h5 className="card-title d-flex align-items-center">
          <img
            src="assets/images/viewdocument-icon.svg"
            className="me-1"
            alt="view document icon"
          />
          View Document
        </h5>

        <div className=" row d-flex align-items-center">
          <div className="col-md-12">
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3">
              <div className="w-25">
                <label className="font-medium grey-v1 me-2">
                  Current Document
                </label>
              </div>
              <div className="btn-group w-75">
                <button
                  className="btn border d-flex justify-content-between align-items-center dropdown-toggle w-100"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  onClick={() => {
                    setShowAll(true);
                  }}
                  ref={dropdownButtonRef}
                >
                  <span className="text-truncate searchInput">
                    {getDisplayName(selectedFile.document_name)}
                  </span>
                </button>
                {showAll && (
                  <div className="dropdown-menu show w-100">
                    <div className="input-group mb-2 px-3">
                      <span
                        className="input-group-text bg-white"
                        id="basic-addon2"
                      >
                        <i className="bi bi-search" />
                      </span>
                      <input
                        type="text"
                        onChange={handleSearchChange}
                        className="form-control bg-white border-start-0 shadow-none ps-0"
                        placeholder="Search"
                        aria-label="Recipient's username"
                        aria-describedby="basic-addon2"
                      />
                    </div>
                    <ul className="list-unstyled mb-0 dropdown-Scroll">
                      {products.map((document, index) => {
                        let itemStyle = {};
                        const isClickable =
                          document.isProcessed !== "processing";
                        const isFailed = document.isProcessed === "failure";

                        if (isFailed) {
                          itemStyle = {
                            backgroundColor: "rgba(255, 0, 0, 0.1)",
                          };
                        } else if (document.isProcessed === "processing") {
                          itemStyle = {
                            backgroundColor: "rgba(0, 0, 0, 0.05)",
                            cursor: "not-allowed",
                          };
                        }

                        return (
                          <li key={index} style={itemStyle}>
                            <a
                              className={`dropdown-item text-break-spaces w-100 ${
                                selectedFileIndex === index
                                  ? "bg-primary text-white"
                                  : ""
                              }`}
                              style={{
                                cursor: isClickable ? "pointer" : "not-allowed",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                opacity: isClickable ? 1 : 0.6,
                              }}
                              onClick={() =>
                                isClickable &&
                                handleFileSelect(
                                  document.url,
                                  document.document,
                                  index,
                                  document?.isProcessed
                                )
                              }
                            >
                              <span style={{ flex: 1 }}>
                                {getDisplayName(document.document)}
                                {document?.isProcessed === "processing" && (
                                  <span className="ms-2 text-black">
                                    (Processing...)
                                  </span>
                                )}
                                {isFailed && (
                                  <span className="ms-2 text-danger">
                                    (Failed to process)
                                  </span>
                                )}
                              </span>

                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                {isClickable && (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(document.url, "_blank");
                                    }}
                                    style={{
                                      marginLeft: "10px",
                                      cursor: "pointer",
                                      color: "#007bff",
                                    }}
                                    title="Open in SharePoint"
                                  >
                                    ➤
                                  </span>
                                )}
                              </div>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
          {showNavigationButtons && (
            <div className="d-flex justify-content-between mt-3">
              <div className="grey-v1">
                Showing result for:
                <span className="text-black">{getNavigationDisplayText()}</span>
              </div>
              <div>
                <span className="grey-v1 me-2">
                  {getCurrentPosition()}/{getResultsCount()} Results
                </span>
                {/* <a href="#" onClick={(e) => {
                  e.preventDefault();
                  if (currentLocationIndex > 0) handlePrevLocation();
                }}
                  style={{
                    opacity: currentLocationIndex === 0 ? 0.5 : 1,
                    pointerEvents: currentLocationIndex === 0 ? 'none' : 'auto'
                  }}
                >
                  <i className="bi bi-chevron-up me-2" />
                </a> */}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (isChunkFiltering) {
                      handlePrevChunk(); // Use chunk navigation
                    } else if (currentLocationIndex > 0) {
                      handlePrevLocation(); // Existing word navigation
                    }
                  }}
                  style={{
                    opacity: isChunkFiltering
                      ? currentChunkIndex === 0
                        ? 0.5
                        : 1
                      : currentLocationIndex === 0
                      ? 0.5
                      : 1,
                    pointerEvents: isChunkFiltering
                      ? currentChunkIndex === 0
                        ? "none"
                        : "auto"
                      : currentLocationIndex === 0
                      ? "none"
                      : "auto",
                  }}
                >
                  <i className="bi bi-chevron-up me-2" />
                </a>

                {/* <a href="#" onClick={(e) => {
                  e.preventDefault();
                  const wordCount = selectedWord.split(' ').length;
                  const totalResults = Math.ceil(highlightLocations.length / wordCount);
                  const currentPosition = Math.floor(currentLocationIndex / wordCount) + 1;

                  if (currentPosition < totalResults) handleNextLocation();
                }}
                  style={{
                    opacity: (() => {
                      const wordCount = selectedWord.split(' ').length;
                      const totalResults = Math.ceil(highlightLocations.length / wordCount);
                      const currentPosition = Math.floor(currentLocationIndex / wordCount) + 1;
                      return currentPosition >= totalResults ? 0.5 : 1;
                    })(),
                    pointerEvents: (() => {
                      const wordCount = selectedWord.split(' ').length;
                      const totalResults = Math.ceil(highlightLocations.length / wordCount);
                      const currentPosition = Math.floor(currentLocationIndex / wordCount) + 1;
                      return currentPosition >= totalResults ? 'none' : 'auto';
                    })()
                  }}
                >
                  <i className="bi bi-chevron-down me-2 pe-2 chevron-border" />
                </a> */}

                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (isChunkFiltering) {
                      handleNextChunk();
                    } else {
                      const wordCount = selectedWord.split(" ").length;
                      const totalResults = Math.ceil(
                        highlightLocations.length / wordCount
                      );
                      const currentPosition =
                        Math.floor(currentLocationIndex / wordCount) + 1;

                      if (currentPosition < totalResults) handleNextLocation();
                    }
                  }}
                  style={{
                    opacity: (() => {
                      if (isChunkFiltering) {
                        return currentChunkIndex >=
                          documentChunkGroups.length - 1 // ← Use filtered chunks
                          ? 0.5
                          : 1;
                      }
                      const wordCount = selectedWord.split(" ").length;
                      const totalResults = Math.ceil(
                        highlightLocations.length / wordCount
                      );
                      const currentPosition =
                        Math.floor(currentLocationIndex / wordCount) + 1;
                      return currentPosition >= totalResults ? 0.5 : 1;
                    })(),
                    pointerEvents: (() => {
                      if (isChunkFiltering) {
                        return currentChunkIndex >=
                          documentChunkGroups.length - 1 // ← Use filtered chunks
                          ? "none"
                          : "auto";
                      }
                      const wordCount = selectedWord.split(" ").length;
                      const totalResults = Math.ceil(
                        highlightLocations.length / wordCount
                      );
                      const currentPosition =
                        Math.floor(currentLocationIndex / wordCount) + 1;
                      return currentPosition >= totalResults ? "none" : "auto";
                    })(),
                  }}
                >
                  <i className="bi bi-chevron-down me-2 pe-2 chevron-border" />
                </a>
                <a href="#" onClick={clearAllHighlights}>
                  <i className="bi bi-x-lg" />
                </a>
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 rounded border p-3">
          <div className="d-flex justify-content-between align-items-center border-bottom pb-3">
            <h5 className="mb-0">{selectedFile.document_name}</h5>
          </div>

          {isLoading && (
            <div className="text-center my-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p>Loading PDF...</p>
              <div className="progress" style={{ height: "5px" }}>
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{ width: `${loadingProgress}%` }}
                  aria-valuenow={loadingProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
            </div>
          )}
          <div
            className="position-relative"
            onMouseEnter={() => setIsHoveringDocument(true)}
            onMouseLeave={() => setIsHoveringDocument(false)}
          >
            <div
              className={`d-flex align-items-center gap-2 position-absolute top-0 end-0 z-1 mt-3 me-3 transition-opacity ${
                isHoveringDocument ? "opacity-100" : "opacity-0"
              }`}
              style={{
                transition: "opacity 0.3s ease",
                pointerEvents: isHoveringDocument ? "auto" : "none",
              }}
            >
              <button
                className="btn btn-sm bg-white active shadow-sm border"
                onClick={handleZoomOut}
                disabled={
                  documentZoom <= MIN_ZOOM ||
                  isLoading ||
                  !currentPdfDocRef.current
                }
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
                disabled={
                  documentZoom === 1.0 || isLoading || !currentPdfDocRef.current
                }
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
                disabled={
                  documentZoom >= MAX_ZOOM ||
                  isLoading ||
                  !currentPdfDocRef.current
                }
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
            <div className="selected-doc-scroll" id="pdf-canvas"></div>
          </div>
        </div>
      </div>
    </>
  );
};
