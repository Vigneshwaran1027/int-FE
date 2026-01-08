// ApiService.ts
export interface DeepDivePayload {
  caseid: string;
  startDate: string;
  endDate: string;
  email: string;
  searchValue: string;
}

export interface DeepDiveSummaryPayload{
  documents: string[],
    caseId : string,
    email : string,
    userId: string
}

export interface APIResponse {
  documentId: string;
  document: string;
  url: string;
  isProcessed: string;
}

// Updated to handle point-based summary instead of word clouds
export interface SummaryPoint {
  point: string;
  chunkIds: string[];
}

export interface SummaryResponse {
  summary: SummaryPoint[];
}

// Updated popup interface to handle points instead of words
export interface WordListPopup {
  isVisible: boolean;
  title: string;
  documents: Array<{
    document?: string | undefined;
    documentName: string;
    count?: number;
  }>;
  selectedPoint?: SummaryPoint; // New field to track selected point
  chunkIds?: string[]; // New field to store chunk IDs for the selected point
}

export interface DeepDiveWordCloud {
  word: string;
  count: number;
  locations: HighlightType[];
  groupedHighlights?: {
    page_index: number;
    bounding_boxes: {
      left: number;
      top: number;
      width: number;
      height: number;
    }[];
  }[];
}

export interface HighlightType {
  page_index: number;
  bounding_box: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  word?: string;
  documentName: string;
}

export interface WordCloudItem {
  word: string;
  locations: HighlightType[];
}

// New interfaces for chunk-based highlighting
export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface BoundingBoxWord {
  page_index: number;
  bounding_box: BoundingBox;
  word: string;
}

export interface CrashReportChunk {
  chunkUniqueId: string;
  chunkBoundingBox: BoundingBoxWord[];
  documentName: string;
}

export interface CrashReportData {
  chunks: CrashReportChunk[];
}

// New interface for point-based highlights
export interface ChunkHighlight {
  page_index: number;
  bounding_box: BoundingBox;
  word: string;
  documentName: string;
  chunkId: string;
}