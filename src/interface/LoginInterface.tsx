
export interface LoginProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    myProp?: any;
  }
  
  export interface MsalConfigAuth {
    clientId: string;
    authority: string;
    redirectUri: string;
  }
  
  export interface MsalConfigCache {
    cacheLocation: "sessionStorage";
    storeAuthStateInCookie: boolean;
  }
  
  export interface MsalConfig {
    auth: MsalConfigAuth;
    cache: MsalConfigCache;
  }
  
  export interface Account {
    tenantId: string;
  }
  
  export interface LoginRequest {
    scopes: string[];
  }
  