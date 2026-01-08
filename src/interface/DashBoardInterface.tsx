// Updated interfaces to support chunk-based highlighting
// SQ 1.2 Updated interface based on the current response 
export interface CaseDetailsPayload{
  caseid: string;
  email: string;
}

export interface selectedDocumentsAndLocations{
  url: string;
  document_name: string;
  locations : HighlightLocation[]
}

export interface MedicalSummaryItem {
  procedure_name: string;
  procedure_date: string;
  chunkIds: string[];
}

// Updated to support point-based summary structure
export interface SummaryPoint {
  point: string;
  chunkIds: string[];
}

export interface CaseSummaryData {
  name: string;
  dob: string;
  dateOfIncident: string;
  typeOfIncident: string;  
  description: SummaryPoint[]; // Changed from string to SummaryPoint array
}

export interface CaseDetails {
  name: string;
  dob: string;
  dateOfIncident: string;
  typeOfIncident: string;
  description: SummaryPoint[]; // Changed from string to SummaryPoint array
}

export interface CaseDetailProps{
  caseDetail:CaseDetails[]
}

// New interface for chunk data structure
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

// New interface for chunk highlights
export interface ChunkHighlight {
  page_index: number;
  bounding_box: BoundingBox;
  word: string;
  documentName: string;
  chunkId: string;
}

interface MedicalBoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface MedicalData {
  documentName: string;
  bounding_box: MedicalBoundingBox;
  page_index:number;
  word:string;
  count:number;
}

export interface MedicalEvent {
   actualDate: string,
   displayDate: string,
   event : string,
   locations: MedicalData[],
   count:number
}

interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface HighlightLocation {
  page_index: number;
  bounding_box: BoundingBox;
  documentName:string;
  word:string;
}

export interface WordData {
  word: string;
  count: number;
  locations: HighlightLocation[];
}

export interface WordCloudProps {
    wordDetails: WordData[];
}

export interface CaseDocument  {
  document_id: string;
  document: string;
  url: string;
  isProcessed:string;
  wordCloudData: WordData[];
}

export interface DocumentViewerProps {
  documentDetails: CaseDocument[];
  selectedDocumentIndex: number;
  setSelectedDocumentIndex: (index: number) => void;
}

export interface ApiResponse {
  status: string;
  statusCode: number;
  data: {
    caseSummary: CaseSummaryData;
    documents: CaseDocument[];
  };
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
}