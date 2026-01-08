/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import {
  CaseDetails,
  SummaryPoint,
  CrashReportChunk,
  ChunkHighlight,
} from "../../interface/DashBoardInterface";
import { useHighlight } from "../HighlightContext";

export const CaseSummary: React.FC<
  CaseDetails & {
    allDocuments: any[];
    setSelectedDocumentIndex: (index: number) => void;
    onFetchChunkData: (
      chunkIds: string[],
      point: string
    ) => Promise<CrashReportChunk[] | undefined>;
  }
> = ({
  // SQ 1.2 Render CaseSummary component with props \n(onFetchChunkData, allDocuments, setSelectedDocumentIndex)
  name,
  dob,
  dateOfIncident,
  typeOfIncident,
  description,
  allDocuments,
  setSelectedDocumentIndex: setSelectedDocIndex,
  onFetchChunkData,
}) => {
  const [caseDetails, setCaseDetails] = useState<CaseDetails | undefined>();

  // SQ 1.7 Return highlight context functions \n(setSelectedSummaryPoint, setCurrentChunkHighlights,
  // \nsetChunkFilteredDocuments, setIsChunkFiltering, etc.) The changes from here is for highlight navigation
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

    // ADD these new context values:
    setSortedChunkGroups,
    setCurrentChunkIndex,
  } = useHighlight();

  // UseEffect to set the case Summary details in the initial render
  useEffect(() => {
    setCaseDetails({ name, dob, dateOfIncident, typeOfIncident, description });
  }, [name, dob, dateOfIncident, typeOfIncident, description]);

  const caseID = sessionStorage.getItem("caseID");

  // SQ 3.5 Call findDocumentsByChunkIds helper function to filter documents
  const findDocumentsByChunkIds = (chunkData: CrashReportChunk[]) => {
    const uniqueDocuments = new Set<string>();
    chunkData.forEach((chunk) => {
      uniqueDocuments.add(chunk.documentName);
    });
    return Array.from(uniqueDocuments);
  };

  // SQ 3.15 Call getChunkHighlights helper function with summaryPoint.chunkIds.
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

  // ADD this helper function inside CaseSummary component:

  // SQ 6.0 Helper function to compute sorted chunk groups by first page occurrence
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

    console.log(
      "Sorted chunk groups:",
      sortedGroups.map((g) => ({
        chunkId: g.chunkId.substring(0, 8),
        firstPageIndex: g.firstPageIndex,
        totalHighlights: g.highlights.length,
        pageRange: `${Math.min(
          ...g.highlights.map((h) => h.page_index)
        )}-${Math.max(...g.highlights.map((h) => h.page_index))}`,
      }))
    );

    return sortedGroups;
  };

  // SQ 3.0 to 3.37 Call handleSummaryPointClick function with summaryPoint and event parameters.
  // When user clicks on a summary point link icon in the description.
  // The function that calls the bounding box api in the onclick to get the bounding box data for the highlightion
  const handleSummaryPointClick = async (
    summaryPoint: SummaryPoint,
    event: React.MouseEvent
  ) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      console.log("Summary point clicked:", summaryPoint);

      const chunkData = await onFetchChunkData(
        summaryPoint.chunkIds,
        summaryPoint.point
      );

      if (!chunkData || chunkData.length === 0) {
        console.warn("No chunk data received from API");
        return;
      }

      console.log("Chunk data received:", chunkData);
      setSelectedSummaryPoint(summaryPoint);

      const documentsForPoint = findDocumentsByChunkIds(chunkData);
      console.log("Documents for point:", documentsForPoint);

      if (documentsForPoint.length > 0) {
        const filteredDocs = allDocuments.filter((doc) =>
          documentsForPoint.some((docName) => {
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

          // ADD: Compute and store sorted chunk groups
          const sortedGroups = computeSortedChunkGroups(chunkData);
          setSortedChunkGroups(sortedGroups);
          setCurrentChunkIndex(0); // Start at first chunk

          const firstDoc = filteredDocs[0];
          const firstDocIndex = allDocuments.findIndex(
            (doc) => doc.document === firstDoc.document
          );

          if (firstDocIndex !== -1) {
            setSelectedDocIndex(firstDocIndex);

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
              setSelectedWord(
                `Summary Point: ${summaryPoint.point.substring(0, 30)}...`
              );
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
      console.error("Error handling summary point click:", error);
    }
  };

  if (!caseDetails) {
    return <div>Loading...</div>;
  }

  // SQ 2.3 Function formatMedicalDescription based on the points
  const formatMedicalDescription = (description?: SummaryPoint[]) => {
    if (!description || !Array.isArray(description)) return null;

    return (
      <ul className="medical-description ps-3 mb-0">
        {description.map((summaryPoint, index) => (
          <li key={index} className="mb-2">
            {summaryPoint.point.charAt(0).toUpperCase() +
              summaryPoint.point.slice(1)}
            <img
              src="assets/images/export-icon.svg"
              alt="generate-similar-icon"
              className="mb-1 ms-1"
              onClick={(e) => handleSummaryPointClick(summaryPoint, e)}
              style={{ cursor: "pointer", width: "16px", height: "16px" }}
            />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="col-md-3">
      <div className="card shadow-sm h-100">
        <div className="card-body">
          <h5 className="card-title d-flex align-items-center">
            <img
              src="assets/images/caseoverview-icon.svg"
              className="me-1"
              alt="overview icon"
            />
            Case Overview
          </h5>
          <div className="case-overview-scroll">
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label d-block mb-1">Case ID</label>
                <label className="d-block">{caseID}</label>
              </div>
              <div className="col-md-6">
                <label className="form-label d-block mb-1">Name</label>
                <label className="d-block">
                  {caseDetails?.name === "null" ? "-" : caseDetails?.name}
                </label>
              </div>
            </div>
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label d-block mb-1">DOB</label>
                <label className="d-block">
                  {caseDetails?.dob === "null" ? "-" : caseDetails?.dob}
                </label>
              </div>
              <div className="col-md-6">
                <label className="form-label d-block mb-1">
                  Date of Incident
                </label>
                <label className="d-block">
                  {caseDetails?.dateOfIncident === "null"
                    ? "-"
                    : caseDetails?.dateOfIncident}
                </label>
              </div>
            </div>
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label d-block mb-1">
                  Type of Incident
                </label>
                <label className="d-block" style={{ width: "275px" }}>
                  {caseDetails?.typeOfIncident === "null"
                    ? "-"
                    : caseDetails?.typeOfIncident}
                </label>
              </div>
            </div>
            <div className="row mb-3">
              <div className="col-md-12">
                <label className="form-label d-block mb-1">
                  Description of Incident
                </label>
                <div className="incident-description ps-3">
                  {formatMedicalDescription(caseDetails?.description)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
