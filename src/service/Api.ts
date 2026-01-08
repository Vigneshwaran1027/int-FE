import { CaseDetailsPayload } from "../interface/DashBoardInterface";
import { DeepDiveSummaryPayload } from "../interface/DeepDiveSummary";
import { ErrorAPIPayload, JWTTokenPayload } from "../interface/Interface";
import { client } from "./Client";
import getEndpoint from "./Endpoints";
// import { useNavigate } from "react-router-dom";

export const postCaseDetails = async (
  payload: CaseDetailsPayload,
  header: string
) => {
  const endpoint = getEndpoint("caseSummary", "postCaseDetails"); // Corrected endpoint retrieval

  // Construct the URL
  //PC_SU_26
  console.log("THis is the payload", payload);
  console.log("this is the header", header);
  console.log("this is the header", endpoint);

  const response = await client(endpoint, "POST", payload, header)
    // Return the response 
  return response
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetchBinaryContent = async (payload: any) => {
    // Construct the URL 

    const endpoint = getEndpoint('caseSummary', 'fetchBinaryContent'); // Corrected endpoint retrieval
    console.log("responseresponse", endpoint);

    const token = sessionStorage.getItem('jwtToken') || "";
    console.log("tokentoken", token);

    const headers = {
        'Content-Type': 'application/json',
        'jwtToken': token
    };
    // const response = await client(endpoint, "POST", payload, token)

    // console.log("responseresponse",response);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),

    });
    console.log(response, "responseresponseresponseresponse");


    return response

}


export async function makeAgentRequest(body: object, header: string) {
    const endpoint = getEndpoint('caseSummary', 'makeAgentRequest'); // Corrected endpoint retrieval

    // const url="https://zebchatbot.usclaims.com/chat/chat"
    console.log("THis is the body in the API hit !!!", body)
    const result = await client(endpoint, "POST", body, header);
    console.log("This is the result", result)
    return result;
}

export const fetchJWTToken = async (payload: JWTTokenPayload) => {
    //SQ 2.31- 2.41 login.tsx
    const endpoint = getEndpoint('caseSummary', 'fetchJWTToken'); // Corrected endpoint retrieval

    // Construct the URL 
    // const url = baseURL + `/getJwt`;
    //PC_SU_26
    const response = await client(endpoint, "POST", payload, "")
    // Return the response data 
    console.log(response, "fetchJWTToken RESPONSE");

    return response
}

export const fetchDocuments = async (payload: CaseDetailsPayload, header: string) => {
    const endpoint = getEndpoint('caseSummary', 'fetchDocuments'); // Corrected endpoint retrieval

  
    console.log("this is the actual payload", payload)
    //PC_SU_26
    const response = await client(endpoint, "POST", payload, header)
    // Return the response data 
    console.log("response", response)
    return response
}

export const fetchSummary = async (payload: DeepDiveSummaryPayload, header: string) => {
    try {
        const endpoint = getEndpoint('caseSummary', 'fetchSummary'); // Corrected endpoint retrieval

        const response = await client(endpoint, "POST", payload, header)
        // Return the response data 
        return response.data
    }
    catch (error) {
        console.log("this is the error", error)
        return null
    }
}


export const fetchChunkBoundingBoxData = async (
  // caseId: string,
  chunkIds: string[],
  header: string
  ) => {
  try {
      // const endpoint = getEndpoint('caseSummary', 'getBoundingBox');

      console.log(chunkIds, "chunkIds chunkIds chunkIds");
      
    //   const endpoint = "https://zebchatbot.usclaims.com/chat/getBoundingBox";
      const endpoint = getEndpoint("caseSummary", "fetchBoundingBoxData");

      const payload = { chunkIds };

      const response = await client(endpoint, "POST", payload, header)
      console.log(response, "fetchChunkBoundingBoxData response");
      
      return response.data
    } catch (error) {
    console.error("Error in fetchChunkBoundingBoxData:", error);
    return null;
  }
};


export const postErrorAPI = async (payload: ErrorAPIPayload) => {
    try {
        const endpoint = getEndpoint('caseSummary', 'postErrorAPI'); // Corrected endpoint retrieval

        //PC_SU_26
        const response = await client(endpoint, "POST", payload, "")
        // Return the response data 
        return response
    }
    catch (error) {
        console.log("this is the error", error)
    }
}

