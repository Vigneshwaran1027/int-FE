//SQ 1.3
import React, { useState, useEffect } from "react";
import {
  CaseDocument,
  CrashReportChunk,
  ChunkHighlight,
} from "../../interface/DashBoardInterface";
import { useHighlight } from "../HighlightContext";

interface MedicalSummaryItem {
  procedure_name: string;
  procedure_date: string;
  chunkIds: string[];
}

interface MedicalSummaryProps {
  medicalSummary: MedicalSummaryItem[];
  allDocuments: CaseDocument[];
  setSelectedDocumentIndex: (index: number) => void;
  onFetchChunkData: (
    chunkIds: string[],
    procedureName: string
  ) => Promise<CrashReportChunk[] | undefined>;
}

export const MedicalSummary: React.FC<MedicalSummaryProps> = ({
  medicalSummary,
  allDocuments,
  setSelectedDocumentIndex,
  onFetchChunkData,
}) => {
  //SQ 1.8 Necessary state variables
  const [sortType, setSortType] = useState<"ASC" | "DESC">("ASC");
  const [sortedEvents, setSortedEvents] = useState<MedicalSummaryItem[]>([]);
  const [uniqueEvents, setUniqueEvents] = useState<MedicalSummaryItem[]>([]);
  const [activeEvent, setActiveEvent] = useState<string | null>(null);

  // SQ : 1.6 Context functions returned:\nsetIsChunkFiltering, setCurrentChunkHighlights, setChunkFilteredDocuments,\nsetSelectedSummaryPoint,
  // setShowNavigationButtons, setCurrentHighlightIndex,\nsetSelectedWord, highlightCleared, setHighlightCleared, setHighlightLocations,\nsetCurrentMatchIndex,
  // setTotalMatches, setShouldScrollToHighlight
  const {
    setSelectedSummaryPoint,
    setCurrentChunkHighlights,
    setChunkFilteredDocuments,
    setIsChunkFiltering,
    setShowNavigationButtons,
    setHighlightLocations,
    setSelectedWord,
    setCurrentHighlightIndex,
    setCurrentMatchIndex,
    setTotalMatches,
    setShouldScrollToHighlight,
    highlightCleared,
    setHighlightCleared,

    // ADD these for navigation:
    setSortedChunkGroups,
    setCurrentChunkIndex,
  } = useHighlight();

  //SQ 1.9
  const normalizeDate = (dateString: string): string => {
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? dateString
      : date.toISOString().split("T")[0];
  };

  const createEventKey = (event: MedicalSummaryItem): string => {
    return `${event.procedure_date}_${event.procedure_name}`;
  };
 

  //SQ 1.10
  const getUniqueEvents = (events: MedicalSummaryItem[]) => {
    try {
      const eventsByDate = new Map<string, MedicalSummaryItem[]>();

      try {
        events.forEach((event) => {
          try {
            const normalizedDate = normalizeDate(event.procedure_date);
            if (!eventsByDate.has(normalizedDate)) {
              eventsByDate.set(normalizedDate, []);
            }
            const dateEvents = eventsByDate.get(normalizedDate);
            if (dateEvents) {
              dateEvents.push(event);
            }
          } catch (eventProcessingError) {
            console.error(
              "Error processing individual event:",
              eventProcessingError
            );
          }
        });
      } catch (groupingError) {
        console.error("Error grouping events by date:", groupingError);
        return [];
      }

      const uniqueEvents: MedicalSummaryItem[] = [];

      try {
        eventsByDate.forEach((eventsForDate) => {
          try {
            const uniqueEventsForDate = new Map<string, MedicalSummaryItem>();
            eventsForDate.forEach((event) => {
              try {
                const normalizedEventName = event.procedure_name
                  .toLowerCase()
                  .trim();
                if (!uniqueEventsForDate.has(normalizedEventName)) {
                  uniqueEventsForDate.set(normalizedEventName, event);
                }
              } catch (nameNormalizationError) {
                console.error(
                  "Error normalizing event name:",
                  nameNormalizationError
                );
              }
            });
            uniqueEvents.push(...Array.from(uniqueEventsForDate.values()));
          } catch (dateProcessingError) {
            console.error(
              "Error processing events for date:",
              dateProcessingError
            );
          }
        });
      } catch (uniqueEventsError) {
        console.error("Error creating unique events list:", uniqueEventsError);
        return [];
      }

      return uniqueEvents;
    } catch (outerError) {
      console.error("Error in getUniqueEvents:", outerError);
      return [];
    }
  };

  ////SQ 1.11 Update useEffect to handle unique events
  useEffect(() => {
    const parseDate = (dateStr: string) => {
      // Handle "Month day, year" format (e.g., "December 2, 2024")
      if (dateStr.match(/^[A-Za-z]+\s\d{1,2},\s\d{4}$/)) {
        return new Date(dateStr);
      }
      // Handle "Month year" format (e.g., "April 2025") - set to first day of month
      if (dateStr.match(/^[A-Za-z]+\s\d{4}$/)) {
        return new Date(dateStr);
      }
      // Handle "MM/DD/YYYY" format (e.g., "02/10/2025")
      if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const [month, day, year] = dateStr.split("/");
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      // Handle "MM-DD-YYYY" format (e.g., "12-11-2024")
      if (dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
        const [month, day, year] = dateStr.split("-");
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      // Handle "MM/YYYY" format (e.g., "04/2025") - set to first day of month
      if (dateStr.match(/^\d{1,2}\/\d{4}$/)) {
        const [month, year] = dateStr.split("/");
        return new Date(parseInt(year), parseInt(month) - 1, 1);
      }
      // Fallback to Date constructor for other cases
      return new Date(dateStr);
    };

    const sorted = [...medicalSummary].sort((a, b) => {
      try {
        const dateA = parseDate(a.procedure_date);
        const dateB = parseDate(b.procedure_date);

        // If either date is invalid, push it to the end
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;

        return sortType === "ASC"
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      } catch (e) {
        console.error("Error parsing dates:", e);
        return 0;
      }
    });

    console.log("sorted", sorted);
    setSortedEvents(sorted);
    setUniqueEvents(getUniqueEvents(sorted));
  }, [sortType, medicalSummary]);

  //SQ - 1.12 --> The useEffect hook triggers the sortEvents function to sort the medicalSummary array based on the current sortType whenever sortType changes.
  useEffect(() => {
    sortEvents(medicalSummary, sortType);
  }, [sortType, medicalSummary]);

  //SQ - 1.13 --> The useEffect hook resets the activeEvent state to null and sets the highlightCleared flag to false whenever the highlightCleared state changes, effectively clearing any active event highlighting when the highlight is cleared.
  useEffect(() => {
    if (highlightCleared) {
      setActiveEvent(null);
      setHighlightCleared(false);
    }
  }, [highlightCleared, setHighlightCleared]);

  //SQ - 1.13  --> The sortEvents function takes an array of MedicalEvent objects and a sortOrder parameter ('ASC' or 'DESC') to sort the events based on their procedure_date.
  const sortEvents = (
    events: MedicalSummaryItem[],
    sortOrder: "ASC" | "DESC"
  ) => {
    try {
      const parseDate = (dateStr: string) => {
        if (dateStr.match(/^[A-Za-z]+\s\d{1,2},\s\d{4}$/)) {
          return new Date(dateStr);
        }
        if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          const [month, day, year] = dateStr.split("/");
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        if (dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
          const [month, day, year] = dateStr.split("-");
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        return new Date(dateStr);
      };

      const sorted = [...events].sort((a, b) =>
        sortOrder === "ASC"
          ? parseDate(a.procedure_date).getTime() -
            parseDate(b.procedure_date).getTime()
          : parseDate(b.procedure_date).getTime() -
            parseDate(a.procedure_date).getTime()
      );
      setSortedEvents(sorted);
    } catch (error) {
      console.error("Error sorting medical events:", error);
    }
  };

  //SQ 2.0-2.5
  const toggleSortType = () => {
    setSortType((prevSortType) => (prevSortType === "ASC" ? "DESC" : "ASC"));
  };

  // Helper functions for chunk processing
  const findDocumentsByChunkIds = (chunkData: CrashReportChunk[]) => {
    const uniqueDocuments = new Set<string>();
    chunkData.forEach((chunk) => {
      uniqueDocuments.add(chunk.documentName);
    });
    return Array.from(uniqueDocuments);
  };

  const getChunkHighlights = (
    chunkData: CrashReportChunk[]
  ): ChunkHighlight[] => {
    const highlights: ChunkHighlight[] = [];
    chunkData.forEach((chunk) => {
      chunk.chunkBoundingBox.forEach((boundingBoxWord) => {
        highlights.push({
          page_index: boundingBoxWord.page_index,
          bounding_box: boundingBoxWord.bounding_box,
          word: boundingBoxWord.word,
          documentName: chunk.documentName,
          chunkId: chunk.chunkUniqueId,
        });
      });
    });
    return highlights;
  };

  // function to compute sorted chunk groups
  // SQ 7.0 : function to compute sorted chunk groups by first page occurrence
  const computeSortedChunkGroups = (chunkData: CrashReportChunk[]) => {
    // Group highlights by chunkId and find the minimum page_index for each chunk
    const chunkGroupMap = new Map<
      string,
      {
        chunkId: string;
        firstPageIndex: number;
        highlights: ChunkHighlight[];
        documentName: string;
      }
    >();

    chunkData.forEach((chunk) => {
      const highlights: ChunkHighlight[] = chunk.chunkBoundingBox.map((bb) => ({
        page_index: bb.page_index,
        bounding_box: bb.bounding_box,
        word: bb.word,
        documentName: chunk.documentName,
        chunkId: chunk.chunkUniqueId,
      }));

      // Find the lowest page_index in this chunk's bounding boxes
      const firstPageIndex = Math.min(...highlights.map((h) => h.page_index));

      if (chunkGroupMap.has(chunk.chunkUniqueId)) {
        // If chunk already exists, merge highlights and update firstPageIndex if needed
        const existing = chunkGroupMap.get(chunk.chunkUniqueId)!;
        existing.highlights.push(...highlights);
        existing.firstPageIndex = Math.min(
          existing.firstPageIndex,
          firstPageIndex
        );
      } else {
        // Create new chunk group entry
        chunkGroupMap.set(chunk.chunkUniqueId, {
          chunkId: chunk.chunkUniqueId,
          firstPageIndex,
          highlights,
          documentName: chunk.documentName,
        });
      }
    });

    // Convert map to array and sort by firstPageIndex (lowest page number first)
    const sortedGroups = Array.from(chunkGroupMap.values()).sort(
      (a, b) => a.firstPageIndex - b.firstPageIndex
    );

    // console.log("Sorted chunk groups:", sortedGroups.map(g => ({
    //   chunkId: g.chunkId.substring(0, 8),
    //   firstPage: g.firstPage Index,
    //   totalHighlights: g.highlights.length,
    //   pageRange: `${Math.min(...g.highlights.map(h => h.page_index))}-${Math.max(...g.highlights.map(h => h.page_index))}`
    // })));

    return sortedGroups;
  };

  // SQ 3.0 -> 3.34 This function handles user clicks on medical procedure items in the timeline by fetching their associated chunk data
  // and filtering documents to display relevant highlights. It retrieves bounding box coordinates for the procedure's chunk IDs via API,
  // matches those chunks to specific documents in the case, and sets up the document viewer to show the first relevant document with all
  // procedure-related text highlighted in yellow. The function manages loading states, creates highlight navigation controls, and updates
  // multiple context states to enable users to browse through all occurrences of the selected medical procedure across different documents.
  const handleProcedureClick = async (
    procedure: MedicalSummaryItem,
    clickEvent: React.MouseEvent
  ) => {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();

    try {
      console.log("Procedure clicked:", procedure);
      const eventId = createEventKey(procedure);
      setActiveEvent(eventId);

      // Fetch chunk data using the callback
      const chunkData = await onFetchChunkData(
        procedure.chunkIds,
        procedure.procedure_name
      );

      if (!chunkData || chunkData.length === 0) {
        console.warn("No chunk data received from API");
        return;
      }

      console.log("Chunk data received:", chunkData);

      // Create a summary point object for context
      const summaryPoint = {
        point: procedure.procedure_name,
        chunkIds: procedure.chunkIds,
      };
      setSelectedSummaryPoint(summaryPoint);

      const documentsForProcedure = findDocumentsByChunkIds(chunkData);
      console.log("Documents for procedure:", documentsForProcedure);

      if (documentsForProcedure.length > 0) {
        const filteredDocs = allDocuments.filter((doc) =>
          documentsForProcedure.some((docName) => {
            const normalizedDocName = docName.toLowerCase();
            const normalizedCaseDocName = doc.document.toLowerCase();
            return (
              normalizedDocName.includes(normalizedCaseDocName) ||
              normalizedCaseDocName.includes(normalizedDocName)
            );
          })
        );

        console.log("Filtered documents:", filteredDocs);

        if (filteredDocs.length > 0) {
          setChunkFilteredDocuments(filteredDocs);
          setIsChunkFiltering(true);

          const allHighlights = getChunkHighlights(chunkData);
          setCurrentChunkHighlights(allHighlights);

          // ADD: Compute and store sorted chunk groups for navigation
          const sortedGroups = computeSortedChunkGroups(chunkData);
          setSortedChunkGroups(sortedGroups);
          setCurrentChunkIndex(0); // Start at first chunk

          const firstDoc = filteredDocs[0];
          const firstDocIndex = allDocuments.findIndex(
            (doc) => doc.document === firstDoc.document
          );

          if (firstDocIndex !== -1) {
            setSelectedDocumentIndex(firstDocIndex);

            const firstDocHighlights = allHighlights.filter(
              (h) =>
                h.documentName === firstDoc.document ||
                firstDoc.document
                  .toLowerCase()
                  .includes(h.documentName.toLowerCase()) ||
                h.documentName
                  .toLowerCase()
                  .includes(firstDoc.document.toLowerCase())
            );

            if (firstDocHighlights.length > 0) {
              const highlightLocations = firstDocHighlights.map((h) => ({
                page_index: h.page_index,
                bounding_box: h.bounding_box,
                word: h.word,
                documentName: h.documentName,
              }));

              setHighlightLocations(highlightLocations);
              setSelectedWord(`Medical Procedure: ${procedure.procedure_name}`);
              setShowNavigationButtons(true);
              setTotalMatches(highlightLocations.length);
              setCurrentMatchIndex(1);
              setCurrentHighlightIndex(0);
              setShouldScrollToHighlight(true);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error handling procedure click:", error);
    }
  };

  return (
    <div className="card-body">
      <h5 className="card-title d-flex align-items-center justify-content-between">
        <span>
          <img
            src="assets/images/medicalsummary.svg"
            className="me-1"
            alt="word cloud icon"
          />
          Medical Summary
        </span>
        {uniqueEvents.length === 0 ? (
          <span style={{ cursor: "not-allowed", color: "gray" }}>
            <i
              className={`${
                sortType === "DESC" ? "bi bi-sort-down" : "bi bi-sort-up"
              }`}
            />
          </span>
        ) : (
          <a onClick={toggleSortType} style={{ cursor: "pointer" }}>
            <i
              className={`${
                sortType === "DESC" ? "bi bi-sort-down" : "bi bi-sort-up"
              }`}
            />
          </a>
        )}
      </h5>
      <div className="timeline">
        {uniqueEvents.length === 0 ? (
          <p className="no-results-message">No events found.</p>
        ) : (
          uniqueEvents.map((event, index) => {
            const eventId = createEventKey(event);
            const dateObj = new Date(event.procedure_date);
            const displayDate = isNaN(dateObj.getTime())
              ? event.procedure_date
              : dateObj.toLocaleDateString();

            return (
              <div key={index} className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-line" />
                <div
                  key={index}
                  className={`medical-summary p-2 ${
                    activeEvent === eventId ? "active" : ""
                  }`}
                >
                  <h3
                    className={`timeline-date ${
                      activeEvent === eventId ? "active-date" : ""
                    }`}
                    style={{ cursor: "default" }}
                  >
                    {displayDate}
                  </h3>
                  <h2 className="timeline-title">
                    <a
                      onClick={(e) => handleProcedureClick(event, e)}
                      style={{ cursor: "pointer" }}
                      className="text-decoration-none link-color"
                    >
                      {event.procedure_name}
                    </a>
                  </h2>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
