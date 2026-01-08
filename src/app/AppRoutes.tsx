
import { PublicClientApplication } from '@azure/msal-browser';
import React, { JSX } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { msalConfig } from '../configurations/msalConfig';
import { useAuth } from '../configurations/AuthContext';
import { MsalProvider } from '@azure/msal-react';
import LoginComponent from '../components/LoginComponent';
import { Dashboard } from '../components/DashBoard';
import DeepDiveSummary from '../components/DeepDiveSummary';
import { useEffect } from 'react';
const msalInstance = new PublicClientApplication(msalConfig);

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || user && user.user_id == "") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const LoginRoute = () => {
  const { user } = useAuth();
  const location = useLocation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getQueryParams = (search:any) => {
      return new URLSearchParams(search);
  };

  // SQ_L - 1.11 - 1.12 --> useEffect to fetch caseID when the component mounts and store the Case ID in local storage !
  useEffect(() => {
      const queryParams = getQueryParams(location.search);
      const id = queryParams.get('caseID');
      if (id) {
          console.log("this is the CASEID",id)
          sessionStorage.setItem('caseID', id); // Set 
      }
  }, [location.search]);
  if (user && user.user_id && user.user_id.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <Navigate to={(location.state as any)?.from?.pathname || "/dashboard"} replace />;
  }

  return (
    <MsalProvider instance={msalInstance}>
      <LoginComponent />
    </MsalProvider>
  );
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/deepdive" element={<DeepDiveSummary />} />
    </Routes>
  );
};

export default AppRoutes;


