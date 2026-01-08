import { Configuration } from "@azure/msal-browser";
 
export const msalConfig: Configuration = {
  auth: {
    clientId: "2b6e6b3c-7ee2-467f-84b6-b2320020c1e9",
    authority:
      "https://login.microsoftonline.com/58ae8d26-824e-420f-8faa-ec1543a3d5f3",
    redirectUri: "http://localhost:3000/dashboard",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};
 