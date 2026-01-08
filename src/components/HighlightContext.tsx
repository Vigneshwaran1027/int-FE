/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useState } from 'react';
import { CaseDocument, MedicalEvent, SummaryPoint, ChunkHighlight, CrashReportChunk } from '../interface/DashBoardInterface';

export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface HighlightLocation {
  page_index: number;
  bounding_box: BoundingBox;
  word: string;
  documentName: string;
}

export interface WordCloud {
  word: string;
  count: number;
  locations: HighlightLocation[];
}

interface RemainingMatchesType {
  documents: CaseDocument[];
  locations: any[];
}

export interface SortedChunkGroup {
  chunkId: string;
  firstPageIndex: number;
  highlights: ChunkHighlight[];
  documentName: string;
}

interface HighlightContextType {
  wordCount: number;
  setwordCount: (should: number) => void;
  selectedWord: string;
  setSelectedWord: (word: string) => void;
  highlightLocations: HighlightLocation[];
  setHighlightLocations: (locations: HighlightLocation[]) => void;
  currentDocument: CaseDocument | null;
  setCurrentDocument: (doc: CaseDocument | null) => void;
  currentHighlightIndex: number;
  setCurrentHighlightIndex: (index: number) => void;
  shouldScrollToHighlight: boolean;
  setShouldScrollToHighlight: (should: boolean) => void;
  showNavigationButtons: boolean;
  setShowNavigationButtons: (show: boolean) => void;
  totalMatches: number;
  setTotalMatches: (should: number) => void;
  currentMatchIndex: number;
  setCurrentMatchIndex: (should: number) => void;
  filteredDocuments: CaseDocument[];
  setFilteredDocuments: (docs: CaseDocument[]) => void;
  isFiltering: any;
  setIsFiltering: (filtering: any) => void;
  selectedMedicalEvent: MedicalEvent | null;
  setSelectedMedicalEvent: (event: MedicalEvent | null) => void;
  loader: boolean;
  setLoader: (should: boolean) => void;
  highlightCleared: boolean;
  setHighlightCleared: (should: boolean) => void;
  remainingMatches: RemainingMatchesType;
  setRemainingMatches: React.Dispatch<React.SetStateAction<RemainingMatchesType>>;
  isFiltering2: any;
  setIsFiltering2: (filtering: any) => void;
  selectedFileIndex: number | null;
  setSelectedFileIndex: (should: number) => void;
  
  // Chunk-based highlighting states
  selectedSummaryPoint: SummaryPoint | null;
  setSelectedSummaryPoint: (point: SummaryPoint | null) => void;
  currentChunkHighlights: ChunkHighlight[];
  setCurrentChunkHighlights: (highlights: ChunkHighlight[]) => void;
  chunkFilteredDocuments: CaseDocument[];
  setChunkFilteredDocuments: (docs: CaseDocument[]) => void;
  isChunkFiltering: boolean;
  setIsChunkFiltering: (filtering: boolean) => void;
  
  // Global chunk data
  globalChunkData: CrashReportChunk[];
  setGlobalChunkData: (data: CrashReportChunk[]) => void;

  // New chunk navigation states
  currentChunkIndex: number;
  setCurrentChunkIndex: (index: number) => void;
  sortedChunkGroups: SortedChunkGroup[];
  setSortedChunkGroups: (groups: SortedChunkGroup[]) => void;
}

// The changes from here is for highlight navigation

const HighlightContext = createContext<HighlightContextType | undefined>(undefined);

export const HighlightProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedWord, setSelectedWord] = useState<string>("");
  const [highlightLocations, setHighlightLocations] = useState<HighlightLocation[]>([]);
  const [currentDocument, setCurrentDocument] = useState<CaseDocument | null>(null);
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState<number>(-1);
  const [shouldScrollToHighlight, setShouldScrollToHighlight] = useState<boolean>(false);
  const [showNavigationButtons, setShowNavigationButtons] = useState<boolean>(false);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [wordCount, setwordCount] = useState<number>(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [filteredDocuments, setFilteredDocuments] = useState<CaseDocument[]>([]);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [isFiltering2, setIsFiltering2] = useState<boolean>(false);
  const [selectedMedicalEvent, setSelectedMedicalEvent] = useState<MedicalEvent | null>(null);
  const [loader, setLoader] = useState<boolean>(false);
  const [highlightCleared, setHighlightCleared] = useState(false);
  const [remainingMatches, setRemainingMatches] = useState<{
    documents: CaseDocument[];
    locations: any[];
  }>({ documents: [], locations: [] });
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(
    sessionStorage.getItem("selectedIndex") !== null 
      ? Number(sessionStorage.getItem("selectedIndex")) 
      : 0
  );

  // Chunk-based highlighting states
  const [selectedSummaryPoint, setSelectedSummaryPoint] = useState<SummaryPoint | null>(null);
  const [currentChunkHighlights, setCurrentChunkHighlights] = useState<ChunkHighlight[]>([]);
  const [chunkFilteredDocuments, setChunkFilteredDocuments] = useState<CaseDocument[]>([]);
  const [isChunkFiltering, setIsChunkFiltering] = useState<boolean>(false);
  
  // Global chunk data storage
  const [globalChunkData, setGlobalChunkData] = useState<CrashReportChunk[]>([]);

  // ADD: New chunk navigation states
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [sortedChunkGroups, setSortedChunkGroups] = useState<SortedChunkGroup[]>([]);

  return (
    <HighlightContext.Provider 
      value={{ 
        wordCount,
        remainingMatches, 
        setRemainingMatches,
        setwordCount,
        selectedWord, 
        setSelectedWord, 
        highlightLocations, 
        setHighlightLocations, 
        currentDocument, 
        setCurrentDocument,
        currentHighlightIndex,
        setCurrentHighlightIndex,
        shouldScrollToHighlight,
        setShouldScrollToHighlight,
        showNavigationButtons,
        setShowNavigationButtons,
        totalMatches,
        setTotalMatches,
        currentMatchIndex,
        setCurrentMatchIndex,
        filteredDocuments,
        setFilteredDocuments,
        isFiltering,
        setIsFiltering,
        selectedMedicalEvent,
        setSelectedMedicalEvent,
        loader,
        setLoader,
        highlightCleared,
        setHighlightCleared,
        isFiltering2, 
        setIsFiltering2,
        selectedFileIndex, 
        setSelectedFileIndex,
        
        // Chunk-based highlighting values
        selectedSummaryPoint,
        setSelectedSummaryPoint,
        currentChunkHighlights,
        setCurrentChunkHighlights,
        chunkFilteredDocuments,
        setChunkFilteredDocuments,
        isChunkFiltering,
        setIsChunkFiltering,
        
        // Global chunk data
        globalChunkData,
        setGlobalChunkData,

        // ADD: New chunk navigation values
        currentChunkIndex,
        setCurrentChunkIndex,
        sortedChunkGroups,
        setSortedChunkGroups,
      }}
    >
      {children}
    </HighlightContext.Provider>
  );
};

export const useHighlight = (): HighlightContextType => {
  const context = useContext(HighlightContext);
  if (context === undefined) {
    throw new Error('useHighlight must be used within a HighlightProvider');
  }
  return context;
};