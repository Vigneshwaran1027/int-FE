
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';

import { WordProvider } from '../components/WordContext';
import { AuthProvider } from '../configurations/AuthContext';
import { PopupProvider } from '../components/PopUpContext';
import { HighlightProvider } from '../components/HighlightContext';
import { useEffect } from 'react';
function App() {
  console.log = function () {};


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getQueryParams = (search: any) => {
    return new URLSearchParams(search);
  };

  // SQ_L - 1.11 - 1.12 --> useEffect to fetch caseID when the component mounts and store the Case ID in local storage !
  useEffect(() => {
    const queryParams = getQueryParams(location.search);
    const id = queryParams.get('caseID');
    if (id) {
      console.log("this is the CASEID", id)
      sessionStorage.setItem('caseID', id); // Set 
    }
  }, [location.search]);
  return (
    <>

      {/* <React.StrictMode> */}
      <BrowserRouter>
        <PopupProvider>
          <HighlightProvider>
            <AuthProvider>
              <WordProvider>
                <AppRoutes />
              </WordProvider>
            </AuthProvider>
          </HighlightProvider>
        </PopupProvider>
      </BrowserRouter>
      {/* </React.StrictMode> */}


    </>
  );
}

export default App;



