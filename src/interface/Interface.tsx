export interface UserDetails {
    userName: string;
    email: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profileImage: any;
  }

  export interface JWTTokenPayload{
    userName:string;
    email: string;
    caseId:string;
  }

  export interface ErrorAPIPayload{
    errorDescription:string;
    errorFunction:string;
    errorSource:string;
  }

  // Define the props for the BreadCrumbs component
export interface BreadCrumbsProps {
  data: NavigationItem[];
}

// Define the NavigationItem interface
export interface NavigationItem {
  title: string;
  isActive: boolean;
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state?: any; // Optional state property
}
export type EndpointSections = {
  [sectionKey: string]: {
      [endpointKey: string]: string;
  };
};
