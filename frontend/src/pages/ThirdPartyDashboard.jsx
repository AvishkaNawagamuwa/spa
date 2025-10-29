import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiSearch, FiUser, FiClock, FiFileText, FiShield, FiLogOut,
    FiEye, FiDownload, FiCalendar, FiMapPin, FiPhone, FiMail,
    FiBriefcase, FiImage, FiFile, FiUsers, FiActivity
} from 'react-icons/fi';
import axios from 'axios';
import Swal from 'sweetalert2';

const ThirdPartyDashboard = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedTherapist, setSelectedTherapist] = useState(null);
    const [selectedTherapistDetails, setSelectedTherapistDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [userInfo, setUserInfo] = useState({});
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [currentDocument, setCurrentDocument] = useState(null);
    const [allTherapists, setAllTherapists] = useState([]);

    useEffect(() => {
        // DEMO TOKEN: This now connects to real database through backend bypass
        if (!localStorage.getItem('thirdPartyToken')) {
            localStorage.setItem('thirdPartyToken', 'demo-token-for-testing');
            localStorage.setItem('thirdPartyUser', JSON.stringify({
                username: 'demo_officer',
                fullName: 'Demo Government Officer',
                department: 'Ministry of Health - Spa Regulation Division'
            }));
        }

        fetchUserInfo();
        // Don't load all therapists on mount - only show results when user searches
    }, []);

    const fetchUserInfo = async () => {
        try {
            const response = await axios.get('/api/third-party/user-info', {
                headers: { Authorization: `Bearer ${localStorage.getItem('thirdPartyToken')}` }
            });
            setUserInfo(response.data.data);
        } catch (error) {
            console.error('Error fetching user info:', error);
            // Show error notification
            Swal.fire({
                icon: 'error',
                title: 'Authentication Failed',
                text: 'Unable to fetch user information. Please check your connection.',
                timer: 3000
            });
        }
    };

    // Load all therapists from the database
    const loadAllTherapists = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/third-party/therapists/search', {
                headers: { Authorization: `Bearer ${localStorage.getItem('thirdPartyToken')}` }
            });
            if (response.data.success) {
                setAllTherapists(response.data.data.therapists || []);
                setSearchResults(response.data.data.therapists || []);
            }
        } catch (error) {
            console.error('Error loading therapists:', error);
            // Show error and stop loading
            Swal.fire({
                icon: 'error',
                title: 'Data Loading Failed',
                text: 'Unable to load therapist data from database. Please check your connection.',
                timer: 3000
            });
            setSearchResults([]);
            setAllTherapists([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        // Clear results if search query is empty
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get('/api/third-party/therapists/search', {
                params: { query: searchQuery },
                headers: { Authorization: `Bearer ${localStorage.getItem('thirdPartyToken')}` }
            });
            if (response.data.success) {
                setSearchResults(response.data.data.therapists || []);
            }
        } catch (error) {
            console.error('Search error:', error);
            Swal.fire({
                title: 'Search Failed',
                text: 'Unable to search therapists. Please try again.',
                icon: 'error',
                confirmButtonColor: '#001F3F'
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle real-time search as user types
    const handleSearchInputChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        console.log('🔍 Search query:', query);

        // Clear results if query is empty - don't show all therapists
        if (!query.trim()) {
            console.log('🔍 Clearing search results');
            setSearchResults([]);
        }
    };

    // Add useEffect for debounced search
    useEffect(() => {
        if (searchQuery.trim()) {
            const delayedSearch = setTimeout(() => {
                handleSearch();
            }, 500);
            return () => clearTimeout(delayedSearch);
        }
    }, [searchQuery]);

    const handleTherapistSelect = async (therapist) => {
        setSelectedTherapist(therapist);
        setDetailsLoading(true);

        try {
            // Fetch detailed therapist information
            const response = await axios.get(`/api/third-party/therapist/${therapist.id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('thirdPartyToken')}` }
            });

            if (response.data.success) {
                setSelectedTherapistDetails(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching therapist details:', error);
            // DEMO MODE: Create detailed info from the basic therapist data
            const demoDetails = {
                id: therapist.id,
                personal_info: {
                    full_name: therapist.name,
                    first_name: therapist.name.split(' ')[0],
                    last_name: therapist.name.split(' ').slice(1).join(' '),
                    nic: therapist.nic,
                    email: therapist.email,
                    phone: therapist.phone,
                    birthday: therapist.birthday,
                    specialty: therapist.specialty,
                    registration_date: therapist.registration_date,
                    status: therapist.status
                },
                current_employment: {
                    spa_name: therapist.spa_name,
                    spa_br_number: 'BR/SPA/' + String(therapist.id).padStart(6, '0'),
                    spa_owner: therapist.spa_owner,
                    spa_owner_email: therapist.spa_owner ? therapist.spa_owner.toLowerCase().replace(' ', '.') + '@spa.com' : null,
                    spa_owner_phone: therapist.spa_phone,
                    spa_address: therapist.spa_address,
                    spa_province: therapist.spa_province
                },
                documents: therapist.documents || {
                    nic_attachment: '/demo-documents/nic' + therapist.id + '.jpg',
                    medical_certificate: '/demo-documents/medical' + therapist.id + '.pdf',
                    spa_center_certificate: '/demo-documents/spa-cert' + therapist.id + '.pdf',
                    therapist_image: '/demo-documents/profile' + therapist.id + '.jpg'
                },
                working_history: therapist.working_history || [],
                review_info: {
                    reviewed_at: therapist.reviewed_at,
                    reviewed_by: therapist.reviewed_by,
                    rejection_reason: therapist.rejection_reason,
                    resigned_at: therapist.resigned_at,
                    terminated_at: therapist.terminated_at,
                    termination_reason: therapist.termination_reason
                }
            };
            setSelectedTherapistDetails(demoDetails);
        } finally {
            setDetailsLoading(false);
        }
    };

    // Handle document viewing
    const viewDocument = (documentPath, documentType) => {
        if (!documentPath) {
            Swal.fire({
                title: 'Document Not Available',
                text: 'This document has not been uploaded.',
                icon: 'warning',
                confirmButtonColor: '#001F3F'
            });
            return;
        }

        // Ensure the document path includes the correct backend URL
        const fullPath = documentPath.startsWith('http')
            ? documentPath
            : `http://localhost:3001${documentPath.startsWith('/') ? documentPath : '/' + documentPath}`;

        setCurrentDocument({
            path: fullPath,
            type: documentType
        });
        setShowDocumentModal(true);
    };

    // Get status color
    const getStatusColor = (status) => {
        const statusColors = {
            approved: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            rejected: 'bg-red-100 text-red-800',
            resigned: 'bg-gray-100 text-gray-800',
            terminated: 'bg-red-200 text-red-900'
        };
        return statusColors[status] || 'bg-gray-100 text-gray-800';
    };

    const handleLogout = () => {
        Swal.fire({
            title: 'Confirm Logout',
            text: 'Are you sure you want to logout from Government Portal?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#001F3F',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, Logout',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                // Clear authentication data
                localStorage.removeItem('thirdPartyToken');
                localStorage.removeItem('thirdPartyUser');

                // Show success message
                Swal.fire({
                    title: 'Logged Out Successfully',
                    text: 'You have been logged out from Government Portal',
                    icon: 'success',
                    confirmButtonColor: '#001F3F',
                    timer: 1500,
                    showConfirmButton: false
                });

                // Navigate to home page instead of third-party-login
                setTimeout(() => {
                    navigate('/');
                }, 1000);
            }
        });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-[#001F3F] text-white p-6">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center">
                        <FiShield size={32} className="text-[#FFD700] mr-4" />
                        <div>
                            <h1 className="text-2xl font-bold">Government Officer Portal</h1>
                            <p className="text-blue-200">Lanka Spa Association - Therapist Verification System</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="font-medium">{userInfo.full_name}</p>
                            <p className="text-sm text-blue-200">{userInfo.department}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors flex items-center"
                        >
                            <FiLogOut className="mr-2" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {/* Search Section */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                        <FiSearch className="mr-2 text-[#FFD700]" />
                        Therapist Search & Verification
                    </h2>
                    <div className="flex space-x-4">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchInputChange}
                            placeholder="Enter therapist name or NIC number to search..."
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="bg-[#001F3F] text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-colors disabled:bg-gray-400 flex items-center"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Searching...
                                </>
                            ) : (
                                <>
                                    <FiSearch className="mr-2" />
                                    Search
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Search Results */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <FiUser className="mr-2 text-[#FFD700]" />
                            Search Results {searchResults.length > 0 && `(${searchResults.length} found)`}
                        </h3>

                        {searchResults.length > 0 ? (
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {searchResults.map((therapist, index) => (
                                    <div
                                        key={therapist.id || index}
                                        onClick={() => handleTherapistSelect(therapist)}
                                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${selectedTherapist?.id === therapist.id
                                            ? 'border-[#001F3F] bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-800">{therapist.name}</h4>
                                                <p className="text-sm text-gray-600 flex items-center mt-1">
                                                    <FiUser className="mr-1" size={12} />
                                                    NIC: {therapist.nic}
                                                </p>
                                                <p className="text-sm text-gray-600 flex items-center mt-1">
                                                    <FiBriefcase className="mr-1" size={12} />
                                                    {therapist.specialty || 'General Therapy'}
                                                </p>
                                                <p className="text-sm text-gray-500 flex items-center mt-1">
                                                    <FiMapPin className="mr-1" size={12} />
                                                    {therapist.spa_name || 'No current spa'}
                                                </p>
                                                <p className="text-sm text-gray-500 flex items-center mt-1">
                                                    <FiCalendar className="mr-1" size={12} />
                                                    Registered: {formatDate(therapist.registration_date)}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end space-y-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(therapist.status)}`}>
                                                    {therapist.status.charAt(0).toUpperCase() + therapist.status.slice(1)}
                                                </span>
                                                {therapist.working_history && therapist.working_history.length > 0 && (
                                                    <span className="text-xs text-blue-600 flex items-center">
                                                        <FiActivity className="mr-1" size={10} />
                                                        {therapist.working_history.length} workplace{therapist.working_history.length > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <FiSearch size={48} className="mx-auto mb-4 opacity-50" />
                                <p>
                                    {loading
                                        ? 'Searching therapists...'
                                        : searchQuery.trim()
                                            ? `No therapists found for "${searchQuery}"`
                                            : 'Enter therapist name or NIC number to search'
                                    }
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Comprehensive Therapist Details */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <FiFileText className="mr-2 text-[#FFD700]" />
                            Comprehensive Therapist Details
                        </h3>

                        {selectedTherapistDetails ? (
                            <div className="space-y-6 max-h-96 overflow-y-auto">
                                {/* Personal Information */}
                                <div className="border-b pb-4">
                                    <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                                        <FiUser className="mr-2 text-blue-600" />
                                        Personal Information
                                    </h4>
                                    <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-sm text-gray-600">Full Name</span>
                                            <p className="font-medium">{selectedTherapistDetails.personal_info.full_name}</p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">NIC Number</span>
                                            <p className="font-medium">{selectedTherapistDetails.personal_info.nic}</p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Email</span>
                                            <p className="font-medium flex items-center">
                                                <FiMail className="mr-1" size={14} />
                                                {selectedTherapistDetails.personal_info.email || 'Not provided'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Phone</span>
                                            <p className="font-medium flex items-center">
                                                <FiPhone className="mr-1" size={14} />
                                                {selectedTherapistDetails.personal_info.phone}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Birthday</span>
                                            <p className="font-medium flex items-center">
                                                <FiCalendar className="mr-1" size={14} />
                                                {selectedTherapistDetails.personal_info.birthday ? formatDate(selectedTherapistDetails.personal_info.birthday) : 'Not provided'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Specialty</span>
                                            <p className="font-medium flex items-center">
                                                <FiBriefcase className="mr-1" size={14} />
                                                {selectedTherapistDetails.personal_info.specialty || 'General Therapy'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Status</span>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTherapistDetails.personal_info.status)}`}>
                                                {selectedTherapistDetails.personal_info.status.charAt(0).toUpperCase() + selectedTherapistDetails.personal_info.status.slice(1)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Registration Date</span>
                                            <p className="font-medium">{formatDate(selectedTherapistDetails.personal_info.registration_date)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Current Employment */}
                                <div className="border-b pb-4">
                                    <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                                        <FiMapPin className="mr-2 text-green-600" />
                                        Current Employment
                                    </h4>
                                    <div className="bg-green-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-sm text-gray-600">Spa Name</span>
                                            <p className="font-medium">{selectedTherapistDetails.current_employment.spa_name || 'No current spa'}</p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Business Reg. Number</span>
                                            <p className="font-medium">{selectedTherapistDetails.current_employment.spa_br_number || 'Not available'}</p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Spa Owner</span>
                                            <p className="font-medium">{selectedTherapistDetails.current_employment.spa_owner || 'Not available'}</p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Owner Contact</span>
                                            <p className="font-medium">{selectedTherapistDetails.current_employment.spa_owner_phone || 'Not available'}</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <span className="text-sm text-gray-600">Spa Address</span>
                                            <p className="font-medium">{selectedTherapistDetails.current_employment.spa_address || 'Not available'}, {selectedTherapistDetails.current_employment.spa_province || ''}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Documents Section */}
                                <div className="border-b pb-4">
                                    <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                                        <FiFile className="mr-2 text-purple-600" />
                                        Documents & Attachments
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <div className="bg-blue-50 p-4 rounded-lg border-2 border-dashed border-blue-200">
                                                <FiFile className="mx-auto text-blue-600 mb-2" size={24} />
                                                <p className="text-sm font-medium text-gray-800">NIC Document</p>
                                                <button
                                                    onClick={() => viewDocument(selectedTherapistDetails.documents.nic_attachment, 'NIC Document')}
                                                    className={`mt-2 px-3 py-1 rounded text-xs ${selectedTherapistDetails.documents.nic_attachment
                                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        }`}
                                                    disabled={!selectedTherapistDetails.documents.nic_attachment}
                                                >
                                                    <FiEye className="inline mr-1" size={12} />
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="bg-green-50 p-4 rounded-lg border-2 border-dashed border-green-200">
                                                <FiFile className="mx-auto text-green-600 mb-2" size={24} />
                                                <p className="text-sm font-medium text-gray-800">Medical Certificate</p>
                                                <button
                                                    onClick={() => viewDocument(selectedTherapistDetails.documents.medical_certificate, 'Medical Certificate')}
                                                    className={`mt-2 px-3 py-1 rounded text-xs ${selectedTherapistDetails.documents.medical_certificate
                                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        }`}
                                                    disabled={!selectedTherapistDetails.documents.medical_certificate}
                                                >
                                                    <FiEye className="inline mr-1" size={12} />
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="bg-yellow-50 p-4 rounded-lg border-2 border-dashed border-yellow-200">
                                                <FiFile className="mx-auto text-yellow-600 mb-2" size={24} />
                                                <p className="text-sm font-medium text-gray-800">Spa Certificate</p>
                                                <button
                                                    onClick={() => viewDocument(selectedTherapistDetails.documents.spa_center_certificate, 'Spa Center Certificate')}
                                                    className={`mt-2 px-3 py-1 rounded text-xs ${selectedTherapistDetails.documents.spa_center_certificate
                                                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        }`}
                                                    disabled={!selectedTherapistDetails.documents.spa_center_certificate}
                                                >
                                                    <FiEye className="inline mr-1" size={12} />
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="bg-red-50 p-4 rounded-lg border-2 border-dashed border-red-200">
                                                <FiImage className="mx-auto text-red-600 mb-2" size={24} />
                                                <p className="text-sm font-medium text-gray-800">Profile Image</p>
                                                <button
                                                    onClick={() => viewDocument(selectedTherapistDetails.documents.therapist_image, 'Therapist Profile Image')}
                                                    className={`mt-2 px-3 py-1 rounded text-xs ${selectedTherapistDetails.documents.therapist_image
                                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        }`}
                                                    disabled={!selectedTherapistDetails.documents.therapist_image}
                                                >
                                                    <FiEye className="inline mr-1" size={12} />
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Working History */}
                                <div>
                                    <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                                        <FiClock className="mr-2 text-orange-600" />
                                        Complete Working History
                                    </h4>
                                    {selectedTherapistDetails.working_history && selectedTherapistDetails.working_history.length > 0 ? (
                                        <div className="space-y-3">
                                            {selectedTherapistDetails.working_history.map((work, index) => (
                                                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-orange-50">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h5 className="font-medium text-gray-800 text-lg">
                                                            {work.spa_details?.name || `Spa ID: ${work.spa_id}`}
                                                        </h5>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${work.end_date
                                                            ? 'bg-gray-100 text-gray-800'
                                                            : 'bg-green-100 text-green-800'
                                                            }`}>
                                                            {work.end_date ? 'Former Employment' : 'Current Employment'}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-gray-600">Position:</span>
                                                            <p className="font-medium">{work.role || 'Therapist'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Duration:</span>
                                                            <p className="font-medium">{work.duration}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Start Date:</span>
                                                            <p className="font-medium">{work.start_date ? formatDate(work.start_date) : 'Not specified'}</p>
                                                        </div>
                                                        {work.end_date && (
                                                            <div>
                                                                <span className="text-gray-600">End Date:</span>
                                                                <p className="font-medium">{formatDate(work.end_date)}</p>
                                                            </div>
                                                        )}
                                                        {work.spa_details?.address_line1 && (
                                                            <div className="md:col-span-2">
                                                                <span className="text-gray-600">Spa Address:</span>
                                                                <p className="font-medium">{work.spa_details.address_line1}, {work.spa_details.province}</p>
                                                            </div>
                                                        )}
                                                        {work.reason_for_leaving && (
                                                            <div className="md:col-span-2">
                                                                <span className="text-gray-600">Reason for Leaving:</span>
                                                                <p className="font-medium text-red-600">{work.reason_for_leaving}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                                            <FiClock size={32} className="mx-auto mb-2 opacity-50" />
                                            <p>No working history available</p>
                                        </div>
                                    )}
                                </div>

                                {/* Review Information */}
                                {selectedTherapistDetails.review_info && (selectedTherapistDetails.review_info.reviewed_at || selectedTherapistDetails.review_info.resigned_at || selectedTherapistDetails.review_info.terminated_at) && (
                                    <div className="border-t pt-4">
                                        <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                                            <FiUsers className="mr-2 text-indigo-600" />
                                            Review & Status Information
                                        </h4>
                                        <div className="bg-indigo-50 p-4 rounded-lg space-y-3">
                                            {selectedTherapistDetails.review_info.reviewed_at && (
                                                <div>
                                                    <span className="text-sm text-gray-600">Reviewed On:</span>
                                                    <p className="font-medium">{formatDate(selectedTherapistDetails.review_info.reviewed_at)} by {selectedTherapistDetails.review_info.reviewed_by}</p>
                                                </div>
                                            )}
                                            {selectedTherapistDetails.review_info.rejection_reason && (
                                                <div>
                                                    <span className="text-sm text-gray-600">Rejection Reason:</span>
                                                    <p className="font-medium text-red-600">{selectedTherapistDetails.review_info.rejection_reason}</p>
                                                </div>
                                            )}
                                            {selectedTherapistDetails.review_info.resigned_at && (
                                                <div>
                                                    <span className="text-sm text-gray-600">Resigned On:</span>
                                                    <p className="font-medium">{formatDate(selectedTherapistDetails.review_info.resigned_at)}</p>
                                                </div>
                                            )}
                                            {selectedTherapistDetails.review_info.terminated_at && (
                                                <div>
                                                    <span className="text-sm text-gray-600">Terminated On:</span>
                                                    <p className="font-medium text-red-600">{formatDate(selectedTherapistDetails.review_info.terminated_at)}</p>
                                                    {selectedTherapistDetails.review_info.termination_reason && (
                                                        <p className="text-sm text-red-500 mt-1">Reason: {selectedTherapistDetails.review_info.termination_reason}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : selectedTherapist && detailsLoading ? (
                            <div className="text-center py-8 text-gray-500">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001F3F] mx-auto mb-4"></div>
                                <p>Loading detailed information...</p>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <FiFileText size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Select a therapist from the search results to view comprehensive details</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Access Information */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <FiShield className="text-blue-600 mr-3 mt-1" size={20} />
                        <div className="text-sm text-blue-800">
                            <p><strong>Access Information:</strong></p>
                            <p>This portal provides read-only access to comprehensive therapist information including working history, documents, and verification status for government verification purposes.</p>
                            <p>Session expires: {userInfo.expires_at ? formatDate(userInfo.expires_at) : 'N/A'}</p>
                            <p>All access is logged and monitored for security purposes.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Document Viewer Modal */}
            {showDocumentModal && currentDocument && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-800">{currentDocument.type}</h3>
                            <div className="flex space-x-2">
                                {currentDocument.path && (
                                    <a
                                        href={currentDocument.path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center"
                                    >
                                        <FiDownload className="mr-1" size={14} />
                                        Download
                                    </a>
                                )}
                                <button
                                    onClick={() => setShowDocumentModal(false)}
                                    className="text-gray-500 hover:text-gray-700 p-1"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="p-4 max-h-[70vh] overflow-auto">
                            {currentDocument.path ? (
                                <div className="text-center">
                                    {currentDocument.type.toLowerCase().includes('image') || currentDocument.path.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                                        <img
                                            src={currentDocument.path}
                                            alt={currentDocument.type}
                                            className="max-w-full h-auto mx-auto rounded-lg shadow-md"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                            }}
                                        />
                                    ) : (
                                        <div className="text-center py-8">
                                            <FiFile size={64} className="mx-auto text-gray-400 mb-4" />
                                            <p className="text-gray-600 mb-4">Document: {currentDocument.type}</p>
                                            <p className="text-sm text-gray-500 mb-4">This file type cannot be previewed in the browser.</p>
                                            <a
                                                href={currentDocument.path}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-flex items-center"
                                            >
                                                <FiDownload className="mr-2" />
                                                Download to View
                                            </a>
                                        </div>
                                    )}
                                    <div style={{ display: 'none' }} className="text-center py-8">
                                        <FiFile size={64} className="mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-600 mb-4">Could not load image</p>
                                        <a
                                            href={currentDocument.path}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-flex items-center"
                                        >
                                            <FiDownload className="mr-2" />
                                            Download Document
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <FiFile size={64} className="mx-auto mb-4 opacity-50" />
                                    <p>Document not available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThirdPartyDashboard;