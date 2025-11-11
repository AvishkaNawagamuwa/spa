# Authentication & Session Management Implementation

## 🔐 Overview
This document describes the authentication and session management system implemented for the Lanka Spa Association platform.

## ✨ Features Implemented

### 1. **Protected Routes**
- All admin dashboards (`/adminLSA`, `/adminSPA`, `/third-party-dashboard`) are now protected
- Users MUST login to access these routes
- Unauthorized access attempts redirect to `/login`

### 2. **Role-Based Access Control**
- **AdminLSA Dashboard**: Accessible only to `admin_lsa`, `super_admin`, `admin`, `financial_officer`
- **AdminSPA Dashboard**: Accessible only to `admin_spa`
- **Third-Party Dashboard**: Accessible only to `government_officer`
- Wrong role redirects users to their appropriate dashboard

### 3. **Session Timeout (10 Minutes)**
- Automatic logout after **10 minutes of inactivity**
- User activity tracking (mouse clicks, keyboard, scroll, touch)
- Session timer refreshes on user interaction
- Warning message on session expiration: "Your session has expired due to inactivity. Please login again."

### 4. **Secure Logout**
- Logout clears all authentication data
- Must re-enter username & password to login again
- Confirmation dialog before logout
- Automatic redirect to home page after logout

### 5. **Session Persistence**
- Authentication state preserved across page refreshes
- Last activity timestamp stored
- Expired sessions cleared automatically

## 📁 Files Created/Modified

### New Files:
1. **`src/contexts/AuthContext.jsx`** - Authentication context provider
2. **`src/components/ProtectedRoute.jsx`** - Route protection component

### Modified Files:
1. **`src/main.jsx`** - Added AuthProvider wrapper
2. **`src/App.jsx`** - Added ProtectedRoute to admin routes
3. **`src/pages/Login.jsx`** - Integrated AuthContext
4. **`src/pages/AdminLSA/AdminLSA.jsx`** - Updated logout handler
5. **`src/pages/AdminSPA/AdminSPA.jsx`** - Updated logout handler
6. **`src/pages/ThirdPartyDashboard.jsx`** - Updated logout handler

## 🔧 How It Works

### Authentication Flow:
```
1. User visits /adminLSA or /adminSPA
   ↓
2. ProtectedRoute checks if authenticated
   ↓
3. If NOT authenticated → Redirect to /login
   ↓
4. User logs in with credentials
   ↓
5. AuthContext stores user data + token
   ↓
6. User redirected to appropriate dashboard
   ↓
7. Session timer starts (10 minutes)
   ↓
8. User activity resets timer
   ↓
9. After 10 min inactivity → Auto logout
```

### Session Management:
- **localStorage keys:**
  - `user` - User information (name, role, etc.)
  - `token` - Authentication token
  - `lastActivity` - Timestamp of last user activity

- **Activity Events Tracked:**
  - `mousedown`, `keydown`, `scroll`, `touchstart`, `click`

- **Session Check:**
  - Runs every 60 seconds
  - Compares current time with `lastActivity`
  - If difference > 10 minutes → Logout

## 🚀 Usage

### For Users:
1. **Accessing Dashboard:**
   - Go to http://localhost:5173/adminLSA or http://localhost:5173/adminSPA
   - If not logged in → Redirected to `/login`
   - Enter username and password
   - Redirected to dashboard

2. **Session Activity:**
   - Session remains active while using the dashboard
   - Any mouse click, keyboard input, or scroll resets the timer
   - After 10 minutes of no activity → Auto logout

3. **Logging Out:**
   - Click "Logout" button
   - Confirm logout
   - Must login again to access dashboard

### For Developers:
```jsx
// Using AuthContext in components
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, token, logout, isAuthenticated, hasRole } = useAuth();
  
  // Check if authenticated
  if (!isAuthenticated()) {
    // Not logged in
  }
  
  // Check user role
  if (hasRole('admin_lsa')) {
    // User is admin_lsa
  }
  
  // Logout
  logout();
}
```

## 🔒 Security Features

1. **Token-based Authentication**: JWT tokens stored securely
2. **Role Verification**: Routes check user roles before rendering
3. **Session Expiry**: Automatic logout after inactivity
4. **Clean Logout**: All auth data cleared on logout
5. **Protected Routes**: Cannot access admin pages without authentication

## ⚙️ Configuration

To change session timeout duration:
```jsx
// In src/contexts/AuthContext.jsx
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

// Change to 15 minutes:
const SESSION_TIMEOUT = 15 * 60 * 1000;

// Change to 5 minutes:
const SESSION_TIMEOUT = 5 * 60 * 1000;
```

## ✅ Testing Checklist

- [x] Cannot access `/adminLSA` without login
- [x] Cannot access `/adminSPA` without login  
- [x] Cannot access `/third-party-dashboard` without login
- [x] Login redirects to correct dashboard based on role
- [x] Session expires after 10 minutes of inactivity
- [x] User activity resets session timer
- [x] Logout clears all data
- [x] Must re-login after logout
- [x] Wrong role cannot access restricted dashboard
- [x] Session persists across page refresh

## 🎯 Summary

The authentication system is now fully functional with:
- ✅ Protected admin routes
- ✅ 10-minute session timeout
- ✅ Role-based access control
- ✅ Secure logout with mandatory re-login
- ✅ Session activity tracking
- ✅ Automatic session expiry handling

Users **cannot** access admin dashboards without logging in, and sessions automatically expire after 10 minutes of inactivity. All logout actions require users to re-enter their credentials to access the system again.
