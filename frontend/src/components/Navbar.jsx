import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import assets from '../assets/images/images';

const Navbar = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const [isTopVisible, setIsTopVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Refs for dropdown containers
  const aboutDropdownRef = useRef(null);
  const membershipDropdownRef = useRef(null);
  const aboutButtonRef = useRef(null);
  const membershipButtonRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Handle scroll to hide top bar and change navbar background
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      // For main navbar background change
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      // For top info bar
      if (window.scrollY > 100 && window.scrollY > lastScrollY) {
        setIsTopVisible(false);
      } else {
        setIsTopVisible(true);
      }

      lastScrollY = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (aboutDropdownRef.current &&
        !aboutDropdownRef.current.contains(event.target) &&
        !aboutButtonRef.current?.contains(event.target)) {
        setIsAboutOpen(false);
      }
      if (membershipDropdownRef.current &&
        !membershipDropdownRef.current.contains(event.target) &&
        !membershipButtonRef.current?.contains(event.target)) {
        setIsMembershipOpen(false);
      }
      if (mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        !document.querySelector('.mobile-menu-button')?.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Function to handle dropdown hover with delay for better UX
  const handleDropdownHover = (dropdown, isOpen) => {
    if (!isOpen) return;

    setTimeout(() => {
      if (dropdown === 'about' && !aboutDropdownRef.current?.matches(':hover') &&
        !aboutButtonRef.current?.matches(':hover')) {
        setIsAboutOpen(false);
      }
      if (dropdown === 'membership' && !membershipDropdownRef.current?.matches(':hover') &&
        !membershipButtonRef.current?.matches(':hover')) {
        setIsMembershipOpen(false);
      }
    }, 150);
  };

  // Navigation functions
  const navigateTo = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
    setIsAboutOpen(false);
    setIsMembershipOpen(false);
    window.scrollTo(0, 0);
  };

  // Close mobile menu when a link is clicked
  const handleMobileLinkClick = (path) => {
    navigateTo(path);
  };

  return (
    <>
      {/* Top information bar - Hidden on mobile */}
      <div className={`bg-[#0A1428] text-white py-2 transition-all duration-500 ${isTopVisible ? 'translate-y-0' : '-translate-y-full'} z-50 hidden md:block`}>
        <div className="container mx-auto px-4 flex justify-between items-center text-sm">
          <div className="flex space-x-6">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gold-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>+94 11 234 5678</span>
            </div>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gold-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>info@lankaspa.lk</span>
            </div>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gold-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Mon - Sat: 9:00 AM - 6:00 PM</span>
            </div>
          </div>

          <div className="flex space-x-4">
            <a href="#" className="text-white hover:text-gold-500 transition-colors duration-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="#" className="text-white hover:text-gold-500 transition-colors duration-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
            <a href="#" className="text-white hover:text-gold-500 transition-colors duration-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.630c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.630zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="#" className="text-white hover:text-gold-500 transition-colors duration-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.790 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <nav className={`sticky top-0 z-40 transition-all duration-500 ${isScrolled ? 'bg-[#0A1428] shadow-lg' : 'bg-white shadow-md'}`}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            {/* Logo with navigation */}
            <div className="flex items-center cursor-pointer" onClick={() => navigateTo('/')}>
              <img
                src={assets.logo_trans}
                alt="Lanka Spa Association"
                className={`h-20 md:h-20 w-auto transition-all duration-300 ${isScrolled ? '' : ''}`}
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjYwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiIGZpbGw9IiMwQTE0MjgiLz48dGV4dCB4PSIxMCIgeT0iMzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iI0Q0QUYzNyI+TEFOS0EgU1BBIEFTU09DLjwvdGV4dD48L3N2Zz4=';
                }}
              />
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => navigateTo('/')}
                className={`${isScrolled ? 'text-white' : 'text-[#0A1428]'} hover:text-gold-500 font-medium transition-colors duration-300 py-2 relative group`}
              >
                Home
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-500 transition-all duration-300 group-hover:w-full"></span>
              </button>

              {/* About Us with dropdown */}
              <div className="relative">
                <button
                  ref={aboutButtonRef}
                  className={`${isScrolled ? 'text-white' : 'text-[#0A1428]'} hover:text-gold-500 font-medium transition-colors duration-300 py-2 flex items-center relative group`}
                  onMouseEnter={() => setIsAboutOpen(true)}
                  onMouseLeave={() => handleDropdownHover('about', isAboutOpen)}
                  onClick={() => setIsAboutOpen(!isAboutOpen)}
                >
                  About Us
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 transition-transform duration-300 ${isAboutOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-500 transition-all duration-300 group-hover:w-full"></span>
                </button>

                {isAboutOpen && (
                  <div
                    ref={aboutDropdownRef}
                    className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 z-50 border border-gray-100"
                    onMouseEnter={() => setIsAboutOpen(true)}
                    onMouseLeave={() => setIsAboutOpen(false)}
                  >
                    <button
                      onClick={() => navigateTo('/about')}
                      className="block w-full text-left px-4 py-2 text-sm text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200 flex items-center"
                    >
                      <span className="w-1 h-1 bg-gold-500 rounded-full mr-2"></span>
                      About the LSA
                    </button>
                    <button
                      onClick={() => navigateTo('/leader-board')}
                      className="block w-full text-left px-4 py-2 text-sm text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200 flex items-center"
                    >
                      <span className="w-1 h-1 bg-gold-500 rounded-full mr-2"></span>
                      Leader Board
                    </button>
                    <button
                      onClick={() => navigateTo('/standards')}
                      className="block w-full text-left px-4 py-2 text-sm text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200 flex items-center"
                    >
                      <span className="w-1 h-1 bg-gold-500 rounded-full mr-2"></span>
                      Standards
                    </button>
                  </div>
                )}
              </div>

              {/* Membership with dropdown */}
              <div className="relative">
                <button
                  ref={membershipButtonRef}
                  className={`${isScrolled ? 'text-white' : 'text-[#0A1428]'} hover:text-gold-500 font-medium transition-colors duration-300 py-2 flex items-center relative group`}
                  onMouseEnter={() => setIsMembershipOpen(true)}
                  onMouseLeave={() => handleDropdownHover('membership', isMembershipOpen)}
                  onClick={() => setIsMembershipOpen(!isMembershipOpen)}
                >
                  Membership
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 transition-transform duration-300 ${isMembershipOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-500 transition-all duration-300 group-hover:w-full"></span>
                </button>

                {isMembershipOpen && (
                  <div
                    ref={membershipDropdownRef}
                    className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 z-50 border border-gray-100"
                    onMouseEnter={() => setIsMembershipOpen(true)}
                    onMouseLeave={() => setIsMembershipOpen(false)}
                  >
                    <button
                      onClick={() => navigateTo('/membership-instructions')}
                      className="block w-full text-left px-4 py-2 text-sm text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200 flex items-center"
                    >
                      <span className="w-1 h-1 bg-gold-500 rounded-full mr-2"></span>
                      Instructions
                    </button>
                    <button
                      onClick={() => navigateTo('/registration')}
                      className="block w-full text-left px-4 py-2 text-sm text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200 flex items-center"
                    >
                      <span className="w-1 h-1 bg-gold-500 rounded-full mr-2"></span>
                      Registration
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigateTo('/blogs')}
                className={`${isScrolled ? 'text-white' : 'text-[#0A1428]'} hover:text-gold-500 font-medium transition-colors duration-300 py-2 relative group`}
              >
                Blogs
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-500 transition-all duration-300 group-hover:w-full"></span>
              </button>

              <button
                onClick={() => navigateTo('/verified-spas')}
                className={`${isScrolled ? 'text-white' : 'text-[#0A1428]'} hover:text-gold-500 font-medium transition-colors duration-300 py-2 relative group`}
              >
                Verified SPAs
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-500 transition-all duration-300 group-hover:w-full"></span>
              </button>

              <button
                onClick={() => navigateTo('/gallery')}
                className={`${isScrolled ? 'text-white' : 'text-[#0A1428]'} hover:text-gold-500 font-medium transition-colors duration-300 py-2 relative group`}
              >
                Gallery
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-500 transition-all duration-300 group-hover:w-full"></span>
              </button>

              <button
                onClick={() => navigateTo('/contact')}
                className={`${isScrolled ? 'text-white' : 'text-[#0A1428]'} hover:text-gold-500 font-medium transition-colors duration-300 py-2 relative group`}
              >
                Contact Us
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-500 transition-all duration-300 group-hover:w-full"></span>
              </button>

              <button
                onClick={() => navigateTo('/login')}
                className="bg-gold-500 text-[#0A1428] hover:bg-gold-600 font-medium px-4 py-2 rounded-md transition-all duration-300 transform hover:scale-105 shadow-md"
              >
                Login
              </button>

              <button
                onClick={() => navigateTo('/third-party-login')}
                className={`${isScrolled ? 'bg-transparent border-2 border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-[#0A1428]' : 'bg-[#0A1428] text-gold-500 hover:bg-[#001122] border-2 border-[#0A1428]'} font-medium px-4 py-2 rounded-md transition-all duration-300 transform hover:scale-105 shadow-md flex items-center`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Government Officer
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => navigateTo('/login')}
                className="bg-gold-500 text-[#0A1428] hover:bg-gold-600 font-medium px-2 py-1.5 rounded-md transition-all duration-300 mr-1 text-xs"
              >
                Login
              </button>
              <button
                onClick={() => navigateTo('/third-party-login')}
                className="bg-[#0A1428] text-gold-500 hover:bg-[#001122] font-medium px-2 py-1.5 rounded-md transition-all duration-300 mr-2 text-xs flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Gov
              </button>
              <button
                className={`mobile-menu-button ${isScrolled ? 'text-white' : 'text-[#0A1428]'} focus:outline-none`}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div
              ref={mobileMenuRef}
              className="md:hidden bg-white border-t border-gray-200 mt-2 py-3 rounded-b-lg shadow-lg"
            >
              <button
                onClick={() => handleMobileLinkClick('/')}
                className="block w-full text-left py-2 px-4 text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200"
              >
                Home
              </button>

              <div className="border-t border-gray-100">
                <button
                  className="w-full flex justify-between items-center py-2 px-4 text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200"
                  onClick={() => setIsAboutOpen(!isAboutOpen)}
                >
                  <span>About Us</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-300 ${isAboutOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isAboutOpen && (
                  <div className="pl-6 bg-gray-50">
                    <button
                      onClick={() => handleMobileLinkClick('/about')}
                      className="block w-full text-left py-2 px-4 text-sm text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200"
                    >
                      About the LSA
                    </button>
                    <button
                      onClick={() => handleMobileLinkClick('/leader-board')}
                      className="block w-full text-left py-2 px-4 text-sm text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200"
                    >
                      Leader Board
                    </button>
                    <button
                      onClick={() => handleMobileLinkClick('/standards')}
                      className="block w-full text-left py-2 px-4 text-sm text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200"
                    >
                      Standards
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100">
                <button
                  className="w-full flex justify-between items-center py-2 px-4 text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200"
                  onClick={() => setIsMembershipOpen(!isMembershipOpen)}
                >
                  <span>Membership</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-300 ${isMembershipOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isMembershipOpen && (
                  <div className="pl-6 bg-gray-50">
                    <button
                      onClick={() => handleMobileLinkClick('/membership-instructions')}
                      className="block w-full text-left py-2 px-4 text-sm text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200"
                    >
                      Instructions
                    </button>
                    <button
                      onClick={() => handleMobileLinkClick('/registration')}
                      className="block w-full text-left py-2 px-4 text-sm text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200"
                    >
                      Registration
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100">
                <button
                  onClick={() => handleMobileLinkClick('/blogs')}
                  className="block w-full text-left py-2 px-4 text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200"
                >
                  Blogs
                </button>
              </div>

              <div className="border-t border-gray-100">
                <button
                  onClick={() => handleMobileLinkClick('/verified-spas')}
                  className="block w-full text-left py-2 px-4 text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200"
                >
                  Verified SPAs
                </button>
              </div>

              <div className="border-t border-gray-100">
                <button
                  onClick={() => handleMobileLinkClick('/gallery')}
                  className="block w-full text-left py-2 px-4 text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200"
                >
                  Gallery
                </button>
              </div>

              <div className="border-t border-gray-100">
                <button
                  onClick={() => handleMobileLinkClick('/contact')}
                  className="block w-full text-left py-2 px-4 text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200"
                >
                  Contact Us
                </button>
              </div>

              <div className="border-t border-gray-100">
                <button
                  onClick={() => handleMobileLinkClick('/third-party-login')}
                  className="block w-full text-left py-2 px-4 text-[#0A1428] hover:bg-[#0A1428] hover:text-white transition-all duration-200 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Government Officer Login
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;