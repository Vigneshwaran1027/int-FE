import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
// import { User, AuthContextProps } from '../../interface/interface';

 interface User {
    user_id: string;
    user_name: string;
    user_email: string;
    profile_picture : string;
   
}
   interface AuthContextProps {
      user: User | null;
      token: string | null;
      setToken: (token: string) => void;
      setUser: (user: User) => void;
      logout: () => void;
  }

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [token, setTokenState] = useState<string | null>(sessionStorage.getItem('token'));
    const [user, setUserState] = useState<User | null>(() => {
        const storedUser = sessionStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const navigate = useNavigate();

    // useEffect(() => {
    //     if (token) {
    //         try {
    //             const decodedToken = JSON.parse(atob(token.split('.')[1]));

    //             // Check if token is expired
    //             if (new Date(decodedToken.expiry_time) < new Date()) {
    //                 logout();
    //                 navigate('/login');
    //                 return;
    //             }

    //             const newUser: User = {
    //                 user_id: decodedToken.user_id,
    //                 user_name: decodedToken.user_name,
    //                 user_email: decodedToken.user_email,
    //                 is_admin: decodedToken.is_admin,
    //                 expiry_time: decodedToken.expiry_time,
    //                 profile_picture: decodedToken.profile_picture,
    //                 job_title: decodedToken.job_title,
    //                 department: decodedToken.department
    //             };

    //             setUserState(newUser);
    //             sessionStorage.setItem('user', JSON.stringify(newUser));
    //         } catch (error) {
    //             logout();
    //             console.error('Invalid token provided', error);
    //         }
    //     }
    // }, [token, navigate]);

        useEffect(() => {
        // for defaultly we set the user here for check 
        setUser({
            user_id: user?.user_id ?? '',
            user_name: user?.user_name ?? '',
            user_email: user?.user_email ?? '',
            profile_picture : user?.profile_picture ?? ''
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setToken = (newToken: string) => {
        setTokenState(newToken);
        sessionStorage.setItem('token', newToken);
    };

    const setUser = (newUser: User) => {
        setUserState(newUser);
        sessionStorage.setItem('user', JSON.stringify(newUser));
    };

    const logout = () => {
        setTokenState(null);
        setUserState(null);
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/');
    };

    return (
        <AuthContext.Provider value={{ token, user, setToken, setUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};