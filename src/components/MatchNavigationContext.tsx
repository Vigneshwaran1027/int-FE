
import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

// Define the context values
interface MatchNavigationContextProps {
    jumpToPreviousMatch: () => void;
    jumpToNextMatch: () => void;
    setJumpToPreviousMatch: (fn: () => void) => void;
    setJumpToNextMatch: (fn: () => void) => void;
}

// Create the context with default empty functions
const MatchNavigationContext = createContext<MatchNavigationContextProps>({
    jumpToPreviousMatch: () => {},
    jumpToNextMatch: () => {},
    setJumpToPreviousMatch: () => {},
    setJumpToNextMatch: () => {},

});

// eslint-disable-next-line react-refresh/only-export-components
export const useMatchNavigation = () => useContext(MatchNavigationContext);

export const MatchNavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [previousMatchFn, setPreviousMatchFn] = useState<() => void>(() => () => {
        console.warn("Previous match function not initialized yet");
    });

    const [nextMatchFn, setNextMatchFn] = useState<() => void>(() => () => {
        console.warn("Next match function not initialized yet");
    });

    const setJumpToPreviousMatch = useCallback((fn: () => void) => {
        setPreviousMatchFn(() => fn);
    }, []);

    const setJumpToNextMatch = useCallback((fn: () => void) => {
        setNextMatchFn(() => fn);
    }, []);

    return (
        <MatchNavigationContext.Provider value={{ 
            jumpToPreviousMatch: previousMatchFn, 
            jumpToNextMatch: nextMatchFn, 
            setJumpToPreviousMatch, 
            setJumpToNextMatch 
        }}>
            {children}
        </MatchNavigationContext.Provider>
    );
}

