/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
 
/**
 * PS_CLC_08 - PS_CLC_11 call client function with required params to get the response
 * @param body
 * @param endpoint
 * @param requestType
 * @returns returns response
 */
let isRedirecting = false;
 
export async function client(
  endpoint: string,
  requestType: string,
  body: any,
  headerJWT: string | ""
) {
  try {
 
    const headers = {
      "Content-Type": "application/json",
      jwtToken: headerJWT,
    };
 
    const config = {
      method: requestType,
      url: endpoint,
      data: body,
      headers: headers,
    };
 
    const apiResponse = await axios(config);
    return apiResponse;
  } catch (error: any) {
    if (error.response) {
      const errorMsg = error.response.data.message || "";
      const errorField = error.response.data.error || "";
 
      const isTokenExpired =
        errorMsg === "token expired." ||
        errorMsg === "token invalid" ||
        errorField === "Signature has expired" ||
        errorField === "missing jwt token";
 
      if (isTokenExpired) {
        // Prevent multiple redirects
        if (isRedirecting) {
          console.log("Redirect already in progress");
          return;
        }
        isRedirecting = true;
 
        const caseID = sessionStorage.getItem("caseID");
 
        if (!caseID || caseID === "null" || caseID === "undefined") {
          console.error(" Invalid caseID:", caseID);
          window.location.href = "/login";
          return;
        }
 
        const redirectUrl = "/login?caseID=" + encodeURIComponent(caseID);
       
        sessionStorage.setItem("tokenExpired", "true");
 
        window.location.href = redirectUrl;
       
        return;
      }
 
      console.error("Error response:", error.response);
      return error.response.data;
    } else {
      console.error("Error message:", error.message);
      return { message: error.message };
    }
  }
}




