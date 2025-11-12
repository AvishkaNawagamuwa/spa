import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VerifiedSpas = () => {
  const [spas, setSpas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const spasPerPage = 12;

  useEffect(() => {
    fetchVerifiedSpas();
  }, [currentPage, searchTerm]);

  const fetchVerifiedSpas = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3001/api/public/verified-spas`, {
        params: {
          page: currentPage,
          limit: spasPerPage,
          search: searchTerm
        }
      });

      if (response.data.success) {
        setSpas(response.data.data.spas);
        setTotalPages(Math.ceil(response.data.data.total / spasPerPage));
      } else {
        setError('Failed to load verified SPAs');
      }
    } catch (err) {
      console.error('Error fetching verified SPAs:', err);
      setError('Error loading verified SPAs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-96 w-full">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1540555700478-4be289fbecef?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80)'
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-4">Verified SPAs in Sri Lanka</h1>
            <p className="text-xl text-gold-500 font-light">Discover certified and verified wellness centers</p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-[#0A1428] text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center">
            <div>
              <h3 className="text-3xl font-bold text-gold-500">{spas.length}</h3>
              <p className="text-white">Verified SPAs</p>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gold-500">100%</h3>
              <p className="text-white">Certified Quality</p>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gold-500">24/7</h3>
              <p className="text-white">Quality Assurance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search SPAs by name, BR number, or location..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* SPAs Grid Section */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-500 text-lg mb-4">{error}</div>
            <button
              onClick={fetchVerifiedSpas}
              className="bg-gold-500 text-[#0A1428] px-6 py-3 rounded-lg hover:bg-gold-600 transition-colors duration-300"
            >
              Try Again
            </button>
          </div>
        ) : spas.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-500 text-lg mb-4">
              {searchTerm ? 'No SPAs found matching your search.' : 'No verified SPAs found.'}
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="bg-gold-500 text-[#0A1428] px-6 py-3 rounded-lg hover:bg-gold-600 transition-colors duration-300"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-3xl font-bold text-[#0A1428] mb-8 text-center">
              Verified SPAs ({spas.length} found)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {spas.map((spa) => {
                // Parse spa_banner_photos_path to get the image URL
                let bannerImage = null;
                if (spa.spa_banner_photos_path) {
                  try {
                    const parsed = JSON.parse(spa.spa_banner_photos_path);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      // Convert backslashes to forward slashes and ensure it starts with /
                      let path = parsed[0].replace(/\\/g, '/');
                      bannerImage = path.startsWith('/') ? path : `/${path}`;
                    }
                  } catch (e) {
                    // If it's already a string path, use it directly
                    let path = spa.spa_banner_photos_path.replace(/\\/g, '/');
                    bannerImage = path.startsWith('/') ? path : `/${path}`;
                  }
                }

                return (
                  <div key={spa.id} className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                    {/* SPA Banner Image */}
                    <div className="w-full h-48 overflow-hidden bg-gradient-to-br from-[#0A1428] to-[#1a2f4a] flex items-center justify-center">
                      {bannerImage ? (
                        <img
                          src={`http://localhost:3001${bannerImage}`}
                          alt={`${spa.name} banner`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Show placeholder if image fails to load
                            e.target.style.display = 'none';
                            const placeholder = document.createElement('div');
                            placeholder.className = 'flex flex-col items-center justify-center text-gold-500';
                            placeholder.innerHTML = `
                              <svg class="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <span class="text-sm font-medium">${spa.name}</span>
                            `;
                            e.target.parentElement.appendChild(placeholder);
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gold-500">
                          <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="text-sm font-medium text-center px-4">{spa.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      {/* SPA Name */}
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-[#0A1428] mb-2">{spa.name}</h3>
                        <div className="w-12 h-0.5 bg-gold-500"></div>
                      </div>

                      {/* BR Number */}
                      <div className="mb-4">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-gold-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm font-semibold text-gray-700">BR: </span>
                          <span className="text-sm text-gray-900 ml-1">{spa.spa_br_number || 'Not provided'}</span>
                        </div>
                      </div>

                      {/* Owner Information */}
                      <div className="mb-4">
                        <div className="flex items-center mb-2">
                          <svg className="w-4 h-4 text-gold-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-sm font-semibold text-gray-700">Owner</span>
                        </div>
                        <p className="text-gray-900 font-medium">{spa.owner_fname} {spa.owner_lname}</p>
                      </div>

                      {/* Contact Information */}
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-gold-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-600 break-all">{spa.email || 'Not provided'}</span>
                        </div>

                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-gold-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="text-sm text-gray-600">{spa.phone || 'Not provided'}</span>
                        </div>

                        <div className="flex items-start">
                          <svg className="w-4 h-4 text-gold-500 mr-2 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm text-gray-600 leading-relaxed">{spa.address || 'Not provided'}</span>
                        </div>
                      </div>

                      {/* Verification Badge */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-center bg-green-50 rounded-lg py-2">
                          <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium text-green-700">Verified SPA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-12">
                <div className="flex space-x-2">
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg border transition-colors duration-300 ${currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                      : 'bg-white text-[#0A1428] hover:bg-gold-500 hover:text-white border-gray-300 hover:border-gold-500'
                      }`}
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`px-4 py-2 rounded-lg border transition-colors duration-300 ${currentPage === pageNumber
                          ? 'bg-gold-500 text-white border-gold-500'
                          : 'bg-white text-[#0A1428] hover:bg-gold-500 hover:text-white border-gray-300 hover:border-gold-500'
                          }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg border transition-colors duration-300 ${currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                      : 'bg-white text-[#0A1428] hover:bg-gold-500 hover:text-white border-gray-300 hover:border-gold-500'
                      }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifiedSpas;
