// import React, { useState } from 'react';
// import { useWordContext } from '../WordContext';
import { WordCloudProps } from "../../interface/DashBoardInterface";
// import { useMatchNavigation } from '../MatchNavigationContext';
import { useHighlight } from "../HighlightContext";
import { useMemo } from "react";
// --> When the user successfully logs in and lands on the Dashboard component, the WordCloud component is rendered with the appropriate props. The component imports necessary packages and hooks, accesses the useHighlight hook for managing highlights, and initializes state variables for total matches and the highlighted word. It executes the renderWordItems function to create buttons for each word in the word cloud, sorting them by count. When the user clicks on a word, the handleWordClick function is triggered, which updates the context with the selected word and its locations, sets the highlighted word, resets the current highlight index, and enables scrolling to the first highlighted instance. Consequently, the selected word is visually highlighted in the word cloud, and all instances of that word are highlighted in the document.
export const WordCloud: React.FC<WordCloudProps> = ({ wordDetails }) => {
  // const { setSelectedWord } = useWordContext();
  //SQ 1.7
  const {
    setSelectedWord,
    selectedWord,
    setHighlightLocations,
    // highlightLocations,
    // currentHighlightIndex,
    setCurrentHighlightIndex,
    setShouldScrollToHighlight,
    setShowNavigationButtons,

    setTotalMatches,

    setCurrentMatchIndex,
    setwordCount,

    isChunkFiltering,
    setIsChunkFiltering,
    setSelectedSummaryPoint,
    setCurrentChunkHighlights,
  } = useHighlight();

  //SQ - 1.8 - 1.10 --> The function initializes state variables for the WordCloud component, including totalMatches, currentMatchIndex, and highlightedWord. It then executes the renderWordItems function to generate buttons for the word cloud. This function sorts the wordDetails in descending order based on their count and maps the sorted details into buttons. When a button is clicked, it sets the selected word using setSelectedWord with the corresponding word element. Finally, the generated word cloud buttons are displayed to the user.
  const renderWordItems = () => {
    try {
      const isProcessed = sessionStorage.getItem("isProcessed");

      // Debug logs (consider removing in production)
      console.log("Current word items:", wordDetails);

      // Early return for empty or processing states
      if (
        wordDetails.length === 0 ||
        isProcessed === "processing" ||
        isProcessed === "failure"
      ) {
        return <p>No word cloud data found</p>;
      }

      // Process and sort word details
      const uniqueSortedWordDetails = [...wordDetails]
        .reduce((acc, curr) => {
          try {
            const exists = acc.some((item) => item.word === curr.word);
            if (!exists) acc.push(curr);
            return acc;
          } catch (error) {
            console.error("Error processing word item:", curr, error);
            return acc; // Continue with existing accumulator
          }
        }, [] as typeof wordDetails)
        .sort((a, b) => b.count - a.count);

      console.log("Sorted word details:", uniqueSortedWordDetails);

      // Render word items
      return uniqueSortedWordDetails.map((el, index) => (
        <li
          className="nav-item"
          style={{ cursor: "pointer" }}
          key={`${el.word}-${index}`}
        >
          <a
            className={`nav-link rounded-pill wordcloud-item ${
              selectedWord === el.word ? "active" : "border"
            }`}
            onClick={() => {
              try {
                handleWordClick(el.word);
              } catch (error) {
                console.error("Error handling word click:", error);
              }
            }}
            title={`Count: ${el.count}`}
          >
            {el.word}
          </a>
        </li>
      ));
    } catch (error) {
      console.error("Error rendering word items:", error);
      return <p className="text-danger">Error loading word cloud data</p>;
    }
  };
  const renderedWordItems = useMemo(() => {
    console.log("wordDetails", wordDetails);

    return renderWordItems();
  }, [wordDetails, selectedWord]); // Add all dependencies here

  //SQ = 2.0 - 2.16 --> When a user clicks on a word in the word cloud, the handleWordClick function is triggered, which retrieves the corresponding data for the selected word from wordDetails. It then updates the context by storing the selected word and its locations, setting the highlighted word, and resetting the current highlight index to zero. Additionally, it enables scrolling to the first highlighted instance by setting a scroll flag to true. As a result, the selected word is visually highlighted in the word cloud, and all instances of that word are highlighted in the document.
  const handleWordClick = (word: string) => {
    try {
      // STEP 1: Clear any active chunk filtering (CRITICAL for integration)
      if (isChunkFiltering) {
        setIsChunkFiltering(false);
        setSelectedSummaryPoint(null);
        setCurrentChunkHighlights([]);
      }
 
      // STEP 2: Find the selected word data
      const selectedWordData = wordDetails.find((w) => w.word === word);
 
      if (!selectedWordData) {
        console.warn(`Word "${word}" not found in word cloud data`);
        return;
      }
 
      // STEP 3: Update all highlight states
      setShowNavigationButtons(true);
      setSelectedWord(word);
      setwordCount(selectedWordData.count);
      setTotalMatches(selectedWordData.count);
      setCurrentMatchIndex(1);
 
      // STEP 4: Map locations with complete interface
      const filteredData = selectedWordData.locations.map(
        ({ bounding_box, page_index }) => ({
          bounding_box,
          page_index,
          word,
          documentName: "", // For type consistency with HighlightLocation
        })
      );
 
      setHighlightLocations(filteredData);
 
      // STEP 5: Set initial highlight index
      if (selectedWordData.locations.length > 0) {
        setCurrentHighlightIndex(0);
        setShouldScrollToHighlight(true);
      } else {
        setCurrentHighlightIndex(-1);
      }
    } catch (error) {
      console.error("Error in handleWordClick:", error);
      // Optionally: Show user-facing error toast
      // setToastMsg({ show: true, message: "Failed to highlight word", success: false });
    }
  };


  return (
    //  <MatchNavigationProvider>
    <div className="card-body">
      <h5 className="card-title d-flex align-items-center">
        <img
          src="assets/images/wordcloud-icon.svg"
          className="me-1"
          alt="word cloud icon"
        />
        Word Cloud
      </h5>
      <div className="wordcloud-scroll">
        <ul className="nav nav-pills gap-2 custom-wordcloud">
          {renderedWordItems}
        </ul>
      </div>
    </div>
    //  </MatchNavigationProvider>
  );
};
