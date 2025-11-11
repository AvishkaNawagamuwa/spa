import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import { FiUser, FiLock, FiEye, FiEyeOff, FiShield, FiArrowLeft } from 'react-icons/fi';
import assets from '../assets/images/images';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      // Redirect to home or appropriate dashboard
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Please fill in all required fields',
        icon: 'error',
        confirmButtonColor: '#0A1428'
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Use AuthContext login method
        login(data.user, data.token);
        console.log('Stored user data:', data.user);

        // Show success message
        Swal.fire({
          title: 'Login Successful!',
          text: `Welcome back, ${data.user.full_name}!`,
          icon: 'success',
          confirmButtonColor: '#0A1428',
          timer: 1500,
          showConfirmButton: false
        });

        // Navigate based on user role
        setTimeout(() => {
          switch (data.user.role) {
            case 'admin_lsa':
            case 'super_admin':
            case 'admin':
            case 'financial_officer':
              navigate('/adminLSA');
              break;
            case 'admin_spa':
              navigate('/adminSPA');
              break;
            case 'government_officer':
              navigate('/third-party-dashboard');
              break;
            default:
              navigate('/');
          }
        }, 1500);

      } else {
        // Handle specific error cases for spa status
        if (data.access_denied && data.spa_status) {
          let title = 'Access Denied';
          let icon = 'warning';
          let message = data.message;

          // Customize alert based on spa status
          switch (data.spa_status) {
            case 'pending':
              title = 'Application Pending';
              icon = 'info';
              break;
            case 'blacklisted':
              title = 'Account Suspended';
              icon = 'error';
              break;
            default:
              title = 'Access Restricted';
              icon = 'warning';
          }

          Swal.fire({
            title: title,
            text: message,
            icon: icon,
            confirmButtonColor: '#0A1428',
            confirmButtonText: 'Understood'
          });
        } else {
          // Regular login failure
          Swal.fire({
            title: 'Login Failed',
            text: data.message || 'Invalid username or password',
            icon: 'error',
            confirmButtonColor: '#0A1428'
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);

      let errorMessage = 'Unable to connect to server. Please try again.';
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        errorMessage = 'Backend server is not running. Please start the backend server on port 3001.';
      }

      Swal.fire({
        title: 'Connection Error',
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#0A1428',
        html: `
          <p>${errorMessage}</p>
          <br>
          <small style="color: #666;">
            Expected server URL: http://localhost:3001/api/auth/login<br>
            Please ensure the backend server is running.
          </small>
        `
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1428] via-[#001F3F] to-[#003366] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#FFD700] bg-opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-[#FFD700] bg-opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-white bg-opacity-5 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back to Home Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-white hover:text-[#FFD700] transition-colors duration-300 text-sm font-medium group"
          >
            <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            Back to Home
          </button>
        </div>

        {/* Main Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden backdrop-blur-sm">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-[#0A1428] to-[#001F3F] text-white p-8 text-center relative">
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4 w-16 h-16 border border-white rounded-full"></div>
              <div className="absolute bottom-4 left-4 w-12 h-12 border border-white rounded-full"></div>
            </div>

            <div className="relative z-10">
              {/* LSA Logo */}
              <div className="mb-6 flex justify-center">
                <img
                  src={assets.logo_trans}
                  alt="Lanka Spa Association"
                  className="h-16 w-auto"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="h-16 w-16 bg-[#FFD700] rounded-full items-center justify-center hidden">
                  <FiShield className="h-8 w-8 text-[#0A1428]" />
                </div>
              </div>

              <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
              <p className="text-[#FFD700] opacity-90 font-medium">Lanka Spa Association Portal</p>
            </div>
          </div>

          {/* Login Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username or Email Field */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Username or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent transition-all duration-300 text-gray-700 bg-gray-50 focus:bg-white"
                    placeholder="Enter your username or email"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-xs text-[#0A1428] hover:text-[#FFD700] font-medium transition-colors duration-300"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent transition-all duration-300 text-gray-700 bg-gray-50 focus:bg-white"
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-300 ${isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#0A1428] to-[#001F3F] hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                  } shadow-lg`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <FiShield className="mr-2 h-5 w-5" />
                    Secure Login
                  </div>
                )}
              </button>
            </form>

            {/* Additional Information */}
            <div className="mt-8 space-y-4">
              {/* Registration Link */}
              <div className="text-center">
                <div className="text-sm text-gray-500">
                  Don't have an account?{' '}
                  <button
                    onClick={() => navigate('/registration')}
                    className="text-[#0A1428] hover:text-[#FFD700] font-semibold transition-colors duration-300"
                  >
                    Register here
                  </button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-gradient-to-r from-[#FFD700] to-[#F5D76E] bg-opacity-10 border border-[#FFD700] border-opacity-20 rounded-xl p-4 mt-6">
                <div className="flex items-start">
                  <FiShield className="h-5 w-5 text-[#0A1428] mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1">Secure Access Portal</p>
                    <p className="text-xs text-gray-600">
                      Administrative credentials are provided by LSA management.
                      Government officers should use credentials issued by the association.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Links */}
              <div className="border-t border-gray-100 pt-4 text-center">
                <div className="text-xs text-gray-500 space-y-1">
                  <p>© {new Date().getFullYear()} Lanka Spa Association</p>
                  <p>Promoting Excellence in Sri Lanka's Wellness Industry</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;