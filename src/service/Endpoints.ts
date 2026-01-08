import { EndpointSections } from "../interface/Interface";

export type Environment = 'dev' | 'local' | 'prod';
export type EndpointModule = keyof typeof ENDPOINTS;
export type EndpointName<T extends EndpointModule> = keyof typeof ENDPOINTS[T];

const BASE_URLS = {
	// dev: 'https://zebchatbot.usclaims.com/chat',
	// local: 'http://192.168.228.166:8080/chat',
	// prod:"aicaseapi.usclaims.com",
  dev: 'https://zebchatbot.usclaims.com/chat',
  local: 'http://192.168.228.166:8080/chat',
  prod:  'https://aicaseapi.usclaims.com/chat'

};
const ENDPOINTS:EndpointSections = {

    caseSummary:{
        postCaseDetails:"/getCaseSummary",
        makeAgentRequest:"/chat",
        fetchJWTToken:"/getJwt",
        fetchDocuments:"/getDocumentList",
        fetchSummary:"/getDeepDiveSummary",
        postErrorAPI:"/logError",
        fetchBinaryContent:"/getBinaryContent",
        fetchBoundingBoxData:"/getBoundingBox",
    }
}
// Get current environment with validation
export const getCurrentEnvironment = (): Environment => {
  const env = import.meta.env.VITE_ENVIRONMENT || 'dev';
  if (!Object.keys(BASE_URLS).includes(env)) {
    console.warn(`Invalid environment "${env}", defaulting to "dev"`);
    return 'dev';
  }
  return env as Environment;
};
export const CURRENT_ENVIRONMENT = getCurrentEnvironment();

// Function to get the base URL with validation
export const getBaseUrl = (): string => {
  const url = BASE_URLS[CURRENT_ENVIRONMENT];
  if (!url) {
    throw new Error(`No base URL configured for environment: ${CURRENT_ENVIRONMENT}`);
  }
  return url.endsWith('/') ? url.slice(0, -1) : url; // Ensure no trailing slash
};

// Function to get the full endpoint URL with type safety
export const getEndpoint = <T extends EndpointModule>(
  moduleName: T,
  endpointName: EndpointName<T>
): string => {
  try {
    const baseUrl = getBaseUrl();
    const moduleEndpoints = ENDPOINTS[moduleName];

    if (!moduleEndpoints) {
      throw new Error(`Module "${moduleName}" not found in endpoints configuration`);
    }

    const endpointPath = moduleEndpoints[endpointName];
    if (typeof endpointPath !== 'string') {
      throw new Error(
        `Endpoint "${String(endpointName)}" not found in module "${moduleName}"`
      );
    }

    // Handle leading/trailing slashes intelligently
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const normalizedEndpoint = endpointPath.startsWith('/') 
      ? endpointPath 
      : `/${endpointPath}`;

    return `${normalizedBase}${normalizedEndpoint}`;
  } catch (error) {
    console.error('Failed to construct endpoint URL:', error);
    throw error; // Re-throw to let calling code handle it
  }
};

// Utility function to check if URL is absolute
const isAbsoluteUrl = (url: string): boolean => 
  /^https?:\/\//i.test(url);

// Alternative version that supports absolute URLs in endpoints
export const getSmartEndpoint = <T extends EndpointModule>(
  moduleName: T,
  endpointName: EndpointName<T>
): string => {
  const endpointPath = ENDPOINTS[moduleName][endpointName];
  return isAbsoluteUrl(endpointPath) 
    ? endpointPath
    : getEndpoint(moduleName, endpointName);
};

// Default export for convenience
export default getEndpoint;
