
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of the context data
interface WordContextProps {
    selectedWord: string;
    setSelectedWord: (word: string) => void;
}

// Create a provider component
interface WordProviderProps {
    children: ReactNode;
}

// Create the context with default values
const defaultWordContext: WordContextProps = {
    selectedWord: '',
    setSelectedWord: () => {},
};

const WordContext = createContext<WordContextProps>(defaultWordContext);

export const WordProvider: React.FC<WordProviderProps> = ({ children }) => {
    const [selectedWord, setSelectedWord] = useState<string>('');
    // console.log(selectedWord,"WORD CONTEXT");
    return (
        <WordContext.Provider value={{ selectedWord, setSelectedWord }}>
            {children}
        </WordContext.Provider>
        
    );
};


// Custom hook to use the WordContext
// eslint-disable-next-line react-refresh/only-export-components
export const useWordContext = () => useContext(WordContext);