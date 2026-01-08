// PopupContext.tsx
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { DeepDiveWordCloud } from '../interface/DeepDiveSummary';

interface PopupContextType {
  isPopupOpen: boolean;
  setIsPopupOpen: (should: boolean) => void;
  
  currentDocument: string;
  setCurrentDocument: (documentName: string) => void;
  
  currentWordCloud: DeepDiveWordCloud | null;
  setCurrentWordCloud: (wordCloud: DeepDiveWordCloud | null) => void;
  
  isSourcePanelOpen: boolean;
  setIsSourcePanelOpen: (isOpen: boolean) => void;
  
  selectedWord: string;
  setSelectedWord: (word: string) => void;
  
  documentList: string[];
  setDocumentList: (documents: string[]) => void;
}

// Provide a default value for the context
const defaultPopupContext: PopupContextType = {
  isPopupOpen: false,
  setIsPopupOpen: () => {},
  currentDocument: '',
  setCurrentDocument: () => {},
  currentWordCloud: null,
  setCurrentWordCloud: () => {},
  isSourcePanelOpen: false,
  setIsSourcePanelOpen: () => {},
  selectedWord: '',
  setSelectedWord: () => {},
  documentList: [],
  setDocumentList: () => {},
};

const PopupContext = createContext<PopupContextType>(defaultPopupContext);

export const PopupProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState('');
  const [currentWordCloud, setCurrentWordCloud] = useState<DeepDiveWordCloud | null>(null);
  const [isSourcePanelOpen, setIsSourcePanelOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [documentList, setDocumentList] = useState<string[]>([]);

  return (
    <PopupContext.Provider 
    value={{
      isPopupOpen,
      setIsPopupOpen,
      currentDocument,
      setCurrentDocument,
      currentWordCloud,
      setCurrentWordCloud,
      isSourcePanelOpen,
      setIsSourcePanelOpen,
      selectedWord,
      setSelectedWord,
      documentList,
      setDocumentList,
    }}>
      {children}
    </PopupContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePopup = () => useContext(PopupContext);
