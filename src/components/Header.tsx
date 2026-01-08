// Header.tsx
import React, {useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../configurations/AuthContext';
// import { useUser } from './UserContext';
//SQ 1.1 - 4.2 --> The HeaderComponent is a React functional component that displays a user profile dropdown. It manages the dropdown's open/close state, retrieves the user's name and profile photo from local storage, and provides a logout function that clears session and local storage, navigates to the login page with an optional case ID, and refreshes the page. The component also includes functionality to close the dropdown when clicking outside of it.
export const HeaderComponent: React.FC = () => {
  const navigate = useNavigate();
  // const { userDetails } = useUser();
  // const { logout } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const UserName = sessionStorage.getItem('userName');
let profilePhoto = sessionStorage.getItem('profilePhoto');

//SQ_1.8 - 1.9  Validate URL (allow only http/https/data URIs) This function ensures that the URL is safe to use by checking its protocol.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizeImageUrl = (url:any) => {
  if (!url) return null; // Fallback if empty
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'data:'].includes(parsed.protocol)) {
      return null; // Block javascript:, file:, etc.
    }
    return url;
  } catch {
    return null; // Invalid URL
  }
};

const safeProfilePhoto = sanitizeImageUrl(profilePhoto) || 'assets/images/user-profile.svg';
  if(!profilePhoto){
    profilePhoto = "assets/images/user-profile.svg"
  }
  
  const profileDropdownRef = useRef<HTMLUListElement>(null);
  const profileButtonRef = useRef<HTMLAnchorElement>(null);
  //SQ_3.0 - 3.3 --> The useEffect hook sets up an event listener that detects clicks outside of the profile dropdown and profile button. When a click occurs, the handleClickOutside function checks if the click target is outside both the dropdown and the button. If it is, the function sets the state isProfileOpen to false, effectively closing the dropdown. The event listener is added when the component mounts and is cleaned up (removed) when the component unmounts to prevent memory leaks and unintended behavior.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (
            profileDropdownRef.current && 
            !profileDropdownRef.current.contains(event.target as Node) &&
            profileButtonRef.current && 
            !profileButtonRef.current.contains(event.target as Node)
        ) {
            setIsProfileOpen(false);
        }
    };

    // Add event listener for clicks
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup event listener on component unmount
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
 
//SQ_NO-2.0-2.6
  const handleProfileClick = () => {
    setIsProfileOpen(!isProfileOpen);

    console.log(isProfileOpen,"HELLLLLLLLOOOOOOOO");
    
  };
  // SQ 4.0 - 4.8 --> The handleLogout function is responsible for logging the user out of the application. It retrieves a caseID from local storage, clears both session and local storage to remove user data, and then navigates the user to the login page, appending the caseID as a query parameter. Finally, it refreshes the page to ensure that all components reflect the logged-out state. If any errors occur during this process, they are caught and logged to the console.
  const handleLogout = () => {
    try {
        const caseID = sessionStorage.getItem("caseID")
        sessionStorage.clear();
        sessionStorage.clear();
        navigate(`/login?caseID=${caseID}`);
        window.location.reload();
    }catch(error){
        console.error("navigateToLogin Error:", error);
    }
  };

  

  return (<>
      <div className="d-flex justify-content-between w-100">
      <a className="navbar-brand" href="/dashboard">
        <img src="assets/images/usclaims-logo.svg" alt="Logo" />
      </a>
      <div className="d-flex" role="search">
        <ul className="nav">
          <li className="nav-item dropdown">
            <a className="nav-link dropdown-toggle" role="button" onClick={handleProfileClick}  ref={profileButtonRef} aria-expanded="false">
              <img className="profile-image" src={safeProfilePhoto}  alt="user profile image"/>
            </a>
            {isProfileOpen && (
                <ul className="dropdown-menu profile-dropdown show" ref={profileDropdownRef}>
                  <li><p className="ps-3"><i className="bi bi-person me-1" />{ UserName }</p></li>
                  <li><a className="dropdown-item text-danger" style={{cursor:"pointer"}} 
                  // onClick={() => logout()}
                  onClick= {handleLogout}
                  >
                    <i className="bi bi-box-arrow-right me-1" />Logout</a></li>
                </ul>
            )}
          </li>
        </ul>
      </div>
    </div>
  </>
  );
};





