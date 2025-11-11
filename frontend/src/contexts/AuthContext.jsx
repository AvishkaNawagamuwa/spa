import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const AuthContext = createContext(null);

// Session timeout: 10 minutes (in milliseconds)
const SESSION_TIMEOUT = 10 * 60 * 1000;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const navigate = useNavigate();

    // Check if user is authenticated on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        const storedLastActivity = localStorage.getItem('lastActivity');

        if (storedUser && storedToken) {
            const parsedUser = JSON.parse(storedUser);
            const lastActivityTime = storedLastActivity ? parseInt(storedLastActivity) : Date.now();

            // Check if session has expired
            const timeSinceLastActivity = Date.now() - lastActivityTime;

            if (timeSinceLastActivity > SESSION_TIMEOUT) {
                // Session expired
                logout(true);
            } else {
                setUser(parsedUser);
                setToken(storedToken);
                setLastActivity(lastActivityTime);
            }
        }
    }, []);

    // Update last activity on user interaction
    useEffect(() => {
        const updateActivity = () => {
            const now = Date.now();
            setLastActivity(now);
            localStorage.setItem('lastActivity', now.toString());
        };

        // Track user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

        events.forEach(event => {
            window.addEventListener(event, updateActivity);
        });

        // Cleanup
        return () => {
            events.forEach(event => {
                window.removeEventListener(event, updateActivity);
            });
        };
    }, []);

    // Check session timeout periodically
    useEffect(() => {
        const checkTimeout = setInterval(() => {
            if (user && token) {
                const timeSinceLastActivity = Date.now() - lastActivity;

                if (timeSinceLastActivity > SESSION_TIMEOUT) {
                    logout(true);
                }
            }
        }, 60000); // Check every minute

        return () => clearInterval(checkTimeout);
    }, [user, token, lastActivity]);

    // Login function
    const login = (userData, authToken) => {
        setUser(userData);
        setToken(authToken);
        const now = Date.now();
        setLastActivity(now);

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', authToken);
        localStorage.setItem('lastActivity', now.toString());
    };

    // Logout function
    const logout = (sessionExpired = false) => {
        setUser(null);
        setToken(null);
        setLastActivity(null);

        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('lastActivity');

        if (sessionExpired) {
            Swal.fire({
                title: 'Session Expired',
                text: 'Your session has expired due to inactivity. Please login again.',
                icon: 'warning',
                confirmButtonColor: '#0A1428',
                confirmButtonText: 'Login Again'
            }).then(() => {
                navigate('/login');
            });
        } else {
            Swal.fire({
                title: 'Logged Out',
                text: 'You have been successfully logged out.',
                icon: 'success',
                confirmButtonColor: '#0A1428',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                navigate('/login');
            });
        }
    };

    // Check if user is authenticated
    const isAuthenticated = () => {
        return user !== null && token !== null;
    };

    // Check if user has specific role
    const hasRole = (roles) => {
        if (!user) return false;
        if (Array.isArray(roles)) {
            return roles.includes(user.role);
        }
        return user.role === roles;
    };

    const value = {
        user,
        token,
        login,
        logout,
        isAuthenticated,
        hasRole,
        lastActivity
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
