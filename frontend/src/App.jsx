import { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import "./App.css";
import Home from "./pages/Home";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AdminLSA from "./pages/AdminLSA/AdminLSA";
import AdminSPA from "./pages/AdminSPA/AdminSPA";
import { SpaContextProvider } from "./pages/AdminSPA/SpaContext";
import BlogDisplay from './components/BlogDisplay';
import Media from './pages/Blog';
import Gallery from "./pages/Gallery";
import Registration from "./pages/Registration";
import RegistrationSuccess from "./pages/RegistrationSuccess";
import Contact from "./pages/Contact";
import TestNotifications from "./pages/TestNotifications";
import ThirdPartyDashboard from "./pages/ThirdPartyDashboard";
import ThirdPartyLogin from "./pages/ThirdPartyLogin";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifiedSpas from "./pages/VerifiedSpas";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [count, setCount] = useState(0);
  const location = useLocation();

  // Pages where we want to hide Navbar + Footer
  const hideLayoutRoutes = ["/login", "/forgot-password", "/reset-password", "/adminLSA", "/adminSPA", "/test-notifications", "/third-party-dashboard", "/third-party-login"];

  // Check if current path matches any in hideLayoutRoutes
  const hideLayout = hideLayoutRoutes.includes(location.pathname);

  return (
    <>
      {!hideLayout && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/registration-success" element={<RegistrationSuccess />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/verified-spas" element={<VerifiedSpas />} />

        <Route path="/blogs" element={<BlogDisplay />} />
        <Route path="/blogs/:id" element={<Media />} />

        {/* Protected Admin Routes */}
        <Route path="/adminLSA" element={
          <ProtectedRoute allowedRoles={['admin_lsa', 'super_admin', 'admin', 'financial_officer']}>
            <AdminLSA />
          </ProtectedRoute>
        } />
        <Route path="/adminSPA" element={
          <ProtectedRoute allowedRoles={['admin_spa']}>
            <SpaContextProvider>
              <AdminSPA />
            </SpaContextProvider>
          </ProtectedRoute>
        } />
        <Route path="/third-party-dashboard" element={
          <ProtectedRoute allowedRoles={['government_officer']}>
            <ThirdPartyDashboard />
          </ProtectedRoute>
        } />

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/test-notifications" element={<TestNotifications />} />
        <Route path="/third-party-login" element={<ThirdPartyLogin />} />
      </Routes>
      {!hideLayout && <Footer />}
    </>
  );
}

export default App;
