//SQ_L - 1.1 
import React, { useEffect, useState } from 'react';
import { useMsal } from "@azure/msal-react";
import { useLocation, useNavigate } from 'react-router-dom';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { Client } from "@microsoft/microsoft-graph-client";
import { useAuth } from '../configurations/AuthContext';
// import { fetchJWTToken, postErrorAPI } from '../service/Api';
// import { JWTTokenPayload } from '../interface/Interface';
import Loader from './reuseable/Loader';
import { fetchJWTToken, postErrorAPI } from '../service/Api';
import { JWTTokenPayload } from '../interface/Interface';
import usClaimsLogo from "/public/assets/images/usclaims-logo.svg";
import microsoftIcon from "/public/assets/images/microsoft-icon.svg";


//  : The function implements a comprehensive login component for Microsoft authentication in a React application. It begins by importing necessary packages and interfaces, setting up the component with hooks for authentication and navigation. State variables are created to manage loading indicators, toast messages, and button states. The function includes two useEffect hooks: one for extracting query parameters and storing the case ID in local storage, and another for clearing toast messages after a timeout. When the user clicks the login button, an asynchronous handleLogin function is triggered, which manages the authentication process by disabling the button, initiating a login popup, and acquiring an access token. Upon successful authentication, user details and profile photos are fetched, with appropriate error handling for photo retrieval. The function also defines a method to obtain a JWT token from the backend, handling API calls and responses while managing errors. Finally, it determines the navigation destination after login and ensures that loading indicators are updated accordingly, providing feedback to the user on the success or failure of the login attempt.
const LoginComponent: React.FC = () => {
    const { instance } = useMsal();
    
    const { setToken, setUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [loader,setLoader] =  useState(false);
    // const [notFound, setNotFound] = useState(false);
    const [toastMessage, setToastMessage] = useState<string>("");
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);

    

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getQueryParams = (search:any) => {
      return new URLSearchParams(search);
  };

  // SQ_L - 1.11 - 1.12 --> useEffect to fetch caseID when the component mounts and store the Case ID in local storage !
   useEffect(() => {
 
    // Get caseID from URL
    const queryParams = getQueryParams(location.search);
    const urlCaseID = queryParams.get("caseID");
   
    // Get caseID from sessionStorage (backup)
    const storedCaseID = sessionStorage.getItem("caseID");
    console.log("CaseID from sessionStorage:", storedCaseID);
 
    // Determine which caseID to use
    const finalCaseID = urlCaseID || storedCaseID;
   
    // Check if redirected due to token expiration
    const wasTokenExpired = sessionStorage.getItem("tokenExpired") === "true";
    console.log("Was token expired?", wasTokenExpired);
 
    if (wasTokenExpired) {
      console.log("Clearing sessionStorage due to token expiration");
      sessionStorage.clear();
    }
 
    // Store caseID back if valid
    if (finalCaseID && finalCaseID !== "null" && finalCaseID !== "undefined") {
      sessionStorage.setItem("caseID", finalCaseID);
     
      // Update URL if caseID came from storage but not in URL
      if (!urlCaseID && finalCaseID) {
        window.history.replaceState(null, "", `/login?caseID=${finalCaseID}`);
      }
    } else {
      console.error(" No valid caseID found!");
    }
 
  }, [location.search]);
  
  useEffect(() => {
    const accounts = instance.getAllAccounts();
    if (accounts.length > 0) {
      instance.logoutPopup(); // Clears session
      instance.clearCache(); // Clears token cache
    }
  }, [instance]);
  
    // SQ_L - 1.13 - 1.14 --> The useEffect hook to set a timeout that clears toast messages after three seconds, enhancing user experience by automatically dismissing notifications. Additionally, it returns a cleanup function to ensure that the timeout is cleared when the component unmounts, preventing potential memory leaks and ensuring that no stale state persists after the component is no longer in use.
       useEffect(() => {
           if (toastMessage !== "") {
             const timer = setTimeout(() => {
               setToastMessage(""); // Hide the toast message after 3 seconds
             }, 3000);
             return () => clearTimeout(timer); // Clear the timer on component unmount or when toastMessage changes
           }
         }, [toastMessage]);
       
       



    // SQ_L - 2.0 - 2.57  - The function outlines a login process using Microsoft authentication, where it first disables the login button to prevent multiple attempts and sets up a login request. Upon successful authentication via a popup, it retrieves account information and attempts to acquire an access token silently. If successful, the access token is stored, and user details are fetched using the Graph API. The function also checks for a user profile photo, handling both the retrieval of the photo and assigning a default image if none exists. Additionally, it includes functionality to obtain a JWT token through an API call and manages navigation to the appropriate page after login, with error handling throughout the process.
    const handleLogin = async () => {
        try {
            // setLoading(true)
            setIsButtonDisabled(true);
            console.log("Attempting to login...");
            const loginRequest = {
                scopes: ["User.Read"],
                prompt: "select_account",
            };

            console.log("Login request:", loginRequest);
            const loginResponse = await instance.loginPopup(loginRequest);
            console.log("Login response:", loginResponse);
            const account = loginResponse.account;

            if (account) {
                console.log("Account information:", account);
                try {
                    console.log("Attempting to acquire token silently...");
                    const tokenResponse = await instance.acquireTokenSilent({
                        scopes: ["User.Read", "User.ReadBasic.All", "ProfilePhoto.Read.All"],
                        account: account
                    });

                    console.log("Token response:", tokenResponse);
                    const accessToken = tokenResponse.accessToken;
                    console.log("Access token acquired:", accessToken);
                    setToken(accessToken);

                    // Create a Graph client
                    const graphClient = Client.init({
                        authProvider: (done) => {
                            done(null, accessToken);
                        }
                    });

                    // Fetch user details
                    const userDetails = await graphClient.api('/me').get();
                    console.log("User details:", userDetails);

                   

                    // Fetch user profile picture
                    let userPhoto: string | undefined;
                    try {
                       // When fetching the photo
try {
  const photoInfo = await graphClient.api('/me/photo').get();
  if (photoInfo) {
    const photoResponse = await graphClient.api('/me/photo/$value').get();
    const photoArrayBuffer = await photoResponse.arrayBuffer();
    const base64String = arrayBufferToBase64(photoArrayBuffer);
    const dataUrl = `data:${photoInfo.contentType};base64,${base64String}`;
    sessionStorage.setItem('profilePhoto', dataUrl);
  } else {
    sessionStorage.setItem('profilePhoto', 'images/user-test-acount.svg');
  }
} catch (error) {
  console.log(error);
  
  sessionStorage.setItem('profilePhoto', 'images/user-test-acount.svg');
}

// Helper function
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
                    } catch (error: unknown) {
                        console.warn("Could not fetch user photo:", error);
                        if (error instanceof Error) {
                            if ('statusCode' in error && error.statusCode === 404) {
                                console.log("User does not have a profile photo");
                                userPhoto = 'images/user-test-acount.svg'; // Replace with your default image path
                            } else {
                                console.error(error.message)
                                // console.error("Unexpected error fetching photo:", error.message);
                            }
                        } else {
                            console.error("An unknown error occurred");
                        }
                        userPhoto = 'images/user-test-acount.svg'; // Fallback to default image
                    }

                    sessionStorage.setItem('emailID', userDetails.mail)
                    sessionStorage.setItem('userName', userDetails.displayName)
                    
                    // sessionStorage.setItem('profilePhoto', userPhoto)

                    console.log("userDetails?.userPrincipalName",userPhoto)
                    const caseID = sessionStorage.getItem('caseID')

                    // const emailID = 
                    if (!caseID) {
                      console.error('Missing caseID in sessionStorage');
                    //   setNotFound(true)
                      return;
                    }
            
                  const payload:JWTTokenPayload={
                    userName: sessionStorage.getItem('userName') || "",
                    email: sessionStorage.getItem('emailID') || "",
                    caseId: caseID,
                  }

                  console.log(payload,"JWTTOKE PAYLOAD");
                  //SQ_L - 2.30 - 2.44 --> The function initiates the process of obtaining a JWT token by first initializing a variable for the token and retrieving the case ID from local storage. It then calls an API method to fetch the JWT token, passing the username, email, and case ID as payload. The function sets the endpoint URL for the API call and invokes a client function to handle the request. Within this client function, it configures the request headers and makes an Axios call to the backend to retrieve the JWT token. If the response is successful, the access token is stored in local storage; otherwise, an error message is displayed. The function includes error handling to manage any issues that arise during the API call or token retrieval process.
                    const getJWTToken = async () =>{
                        try {
                            setLoader(true)
                            const response = await fetchJWTToken(payload);
                            console.log(response,"response in jwtfetch");
                            
                            if (response.status === 200) { // Check if the status code is 200
                            //   const responseBody = await response.json(); // Assuming the JWT token is in the JSON response
                              const jwtToken = response.data.jwtToken; // Extract the JWT token from the response body
                              if (!jwtToken) {
                                console.error("JWT token is null or undefined!");
                                return;
                              }
                              
                              sessionStorage.setItem("jwtToken", jwtToken);
                              console.log(jwtToken,"jwtToken");
                              sessionStorage.setItem('userID', response.data.userId)
                              setUser({
                                user_name: userDetails?.userPrincipalName ?? "",
                                user_email: userDetails?.mail ?? "",
                                profile_picture: userPhoto ?? "assets/images/user-profile.svg",
                                user_id: userDetails?.id ?? ""
                              });
                              const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';
                              navigate(from, { replace: true });
                            } else if(response.status === 400){
                                navigate('/login');
                                setToastMessage("JWT token is expired. Please login again.")
                            }else {
                              setToastMessage("Something went wrong, Please try again after some time.")
                              console.error('Failed to fetch JWT token:', response.statusText);
                            }
                          }catch (error) {
                                const errorAPI =async () =>{
                                  try{
                                    const errorDescription= "Unknown error"; // Use error.message for a more descriptive error
                                    const errorFunction ="fetchCaseDetails"
                                    const errorSource="FrontEnd"
                                    const payload = { errorDescription, errorFunction, errorSource };
                                    await postErrorAPI(payload) // Call the error logging API
                                  } catch{
                                    console.error('Error fetching case details:', error);
                                  }
                                }
                                await errorAPI(); // Call the error logging function
                              } finally {
                                setLoader(false);
                              }
                    }
            
                    await getJWTToken();                    
                    const jwtToken= sessionStorage.getItem('jwtToken')
                    console.log(jwtToken,"JWT IN LOGIN");
                    
                //     setUser({
                //       user_name: userDetails?.userPrincipalName ?? "",
                //       user_email: userDetails?.mail ?? "",
                //       profile_picture: userPhoto ?? "assets/images/user-profile.svg",
                //       user_id : userDetails?.id ?? ""
                //   });


                    

                        // Set the token received from your backend
                        const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';
                        // Navigate to the dashboard route
                        console.log("navvv",from)

                        const token = sessionStorage.getItem("jwtToken");
                        console.log("Token after set:", token); // Verify it's there
                        
                        // navigate(from, { replace: true });                 // }
                    // } else {
                    //     throw new Error('Failed to authenticate with backend');
                    // }

                } catch (error) {
                    console.error("Error during token acquisition:", error);
                    setLoader(false)
                    if (error instanceof InteractionRequiredAuthError) {
                        console.log("Interaction required, attempting to acquire token via popup...");
                        await instance.acquireTokenPopup({
                            scopes: ["User.Read", "User.ReadBasic.All", "ProfilePhoto.Read.All"],
                            account: account
                        });
                    } else {
                        throw error;
                    }
                }
            } else {
                console.error("No account information received");
                // showToast('Authentication failed. No account information.', 'error');
            }
        } catch (error) {
            const errorAPI =async () =>{
                try{
                  const errorDescription= "Unknown error"; // Use error.message for a more descriptive error
                  const errorFunction ="handleLogin"
                  const errorSource="FrontEnd"
                  const payload = { errorDescription, errorFunction, errorSource };
                  await postErrorAPI(payload) // Call the error logging API
                } catch{
                  console.error('Error fetching case details:', error);
                }
              }
              await errorAPI(); // Call the error logging function
            console.error("Login error:", error);
            // showToast('Authentication failed', 'error');
        } finally {
            setLoader(false)
            setIsButtonDisabled(false); // Re-enable the button
                
        }
    };

    return (
        <>
            <div>
            <meta charSet="UTF-8" />
            <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>USClaims | Login</title>
            <link rel="icon" type="image/x-icon" href="assets/images/favicon.ico" />
            <link rel="stylesheet" href="assets/scss/custom.css" />
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
            <div className="bg-login">
            <div className="container-fluid h-100 d-flex flex-column align-items-center justify-content-center ">
                <div className="col-md-4 col-lg-3">
                <div className="card w-100 d-flex justify-content-between align-items-center border-0 py-4">
                     <div className="card-body text-center">
              <img src={usClaimsLogo} className="mb-4" alt="logo" />
              {!isButtonDisabled && (
                <button 
                  onClick={handleLogin} 
                  className="btn d-block btn-primary px-5 mt-3"
                >
                  <img className="mx-2" src={microsoftIcon} alt="microsoft-icon" />
                  Login with Microsoft
                </button>
              )}
                    </div>
                </div>
                </div>
            </div>
            </div>
            </div>
            {loader && <Loader />}
        </>
           );
};

export default LoginComponent;