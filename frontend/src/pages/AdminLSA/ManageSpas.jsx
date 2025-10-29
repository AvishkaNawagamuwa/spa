import React, { useState, useEffect } from 'react';
import {
    FiGrid,
    FiSearch,
    FiFilter,
    FiEye,
    FiCheck,
    FiX,
    FiAlertTriangle,
    FiDollarSign,
    FiCalendar,
    FiMapPin,
    FiPhone,
    FiMail,
    FiFileText,
    FiDownload,
    FiRefreshCw,
    FiUserX,
    FiShield
} from 'react-icons/fi';
import axios from 'axios';
import Swal from 'sweetalert2';

const ManageSpas = () => {
    const [spas, setSpas] = useState([]);
    const [filteredSpas, setFilteredSpas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('approved');
    const [approvedSubCategory, setApprovedSubCategory] = useState('all');
    const [selectedSpa, setSelectedSpa] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        verified: 0,
        unverified: 0,
        blacklisted: 0
    });

    useEffect(() => {
        fetchSpas();
    }, []);

    useEffect(() => {
        if (spas.length > 0) {
            calculateStats();
            filterSpas();
        }
    }, [spas, searchQuery, activeTab, approvedSubCategory]);

    // Enhanced helper function to parse JSON document fields
    const parseJsonField = (field) => {
        if (!field) return null;

        // Handle string representations of JSON arrays
        if (typeof field === 'string') {
            try {
                // Try to parse as JSON
                const parsed = JSON.parse(field);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Clean up the path by replacing all backslashes with forward slashes
                    let cleanPath = parsed[0].replace(/\\/g, '/');
                    // Ensure the path starts with a forward slash for proper URL construction
                    if (!cleanPath.startsWith('/')) {
                        cleanPath = '/' + cleanPath;
                    }
                    return cleanPath;
                }
                return field;
            } catch (e) {
                // If parsing fails, treat as regular string path
                let cleanPath = field.replace(/\\/g, '/');
                if (!cleanPath.startsWith('/')) {
                    cleanPath = '/' + cleanPath;
                }
                return cleanPath;
            }
        }

        // Handle array directly
        if (Array.isArray(field) && field.length > 0) {
            let cleanPath = field[0].replace(/\\/g, '/');
            if (!cleanPath.startsWith('/')) {
                cleanPath = '/' + cleanPath;
            }
            return cleanPath;
        }

        return field;
    };



    const fetchSpas = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:3001/api/lsa/spas', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.data.success) {
                let rawSpas = response.data.data.spas || [];

                // Process spa data to handle JSON document fields
                const processedSpas = rawSpas.map(spa => ({
                    ...spa,
                    // Parse document paths from JSON arrays if they exist
                    form1_certificate_path: parseJsonField(spa.form1_certificate_path),
                    nic_front_path: parseJsonField(spa.nic_front_path),
                    nic_back_path: parseJsonField(spa.nic_back_path),
                    br_attachment_path: parseJsonField(spa.br_attachment_path),
                    other_document_path: parseJsonField(spa.other_document_path),
                    spa_banner_photos_path: parseJsonField(spa.spa_banner_photos_path),

                    // Handle spa photos for gallery display
                    spa_photos_banner: spa.spa_banner_photos_path ? parseJsonField(spa.spa_banner_photos_path) : spa.spa_photos_banner
                }));

                setSpas(processedSpas);
                console.log('Spas loaded and processed:', processedSpas);
            }
        } catch (error) {
            console.error('Error fetching spas:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load spa data. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        const total = spas.length;
        const approved = spas.filter(spa =>
            spa.status === 'approved' || spa.status === 'verified' || spa.verification_status === 'approved'
        ).length;
        const rejected = spas.filter(spa =>
            spa.status === 'rejected'
        ).length;
        const pending = spas.filter(spa =>
            spa.status === 'pending'
        ).length;

        // Calculate sub-categories based on status
        const verified = spas.filter(spa =>
            spa.status === 'verified'
        ).length;
        const unverified = spas.filter(spa =>
            spa.status === 'unverified'
        ).length;
        const blacklisted = spas.filter(spa =>
            spa.status === 'blacklisted'
        ).length;

        // Debug: Log the blacklisted spas to verify count
        const blacklistedSpas = spas.filter(spa => spa.status === 'blacklisted');
        console.log('=== STATS DEBUG ===');
        console.log('Total spas:', total);
        console.log('Approved spas count:', approved);
        console.log('Blacklisted spas count:', blacklisted);
        console.log('All spa statuses:', spas.map(spa => ({
            name: spa.spa_name,
            status: spa.status,
            verification_status: spa.verification_status
        })));
        console.log('Blacklisted spas:', blacklistedSpas);

        setStats({
            total,
            approved,
            rejected,
            pending,
            verified,
            unverified,
            blacklisted
        });
    };

    const filterSpas = () => {
        let filtered = spas;

        // Search filter - search by spa name, reference number, owner name
        if (searchQuery) {
            filtered = filtered.filter(spa => {
                const searchTerm = searchQuery.toLowerCase();
                return (
                    spa.spa_name?.toLowerCase().includes(searchTerm) ||
                    spa.spa_id?.toString().includes(searchTerm) ||
                    spa.owner_name?.toLowerCase().includes(searchTerm) ||
                    spa.email?.toLowerCase().includes(searchTerm)
                );
            });
        }

        // Main category filter based on status
        filtered = filtered.filter(spa => {
            switch (activeTab) {
                case 'approved':
                    return spa.status === 'approved' || spa.status === 'verified' || spa.verification_status === 'approved';
                case 'rejected':
                    return spa.status === 'rejected';
                case 'pending':
                    return spa.status === 'pending';
                default:
                    return true;
            }
        });

        // Sub-category filter for approved spas
        if (activeTab === 'approved' && approvedSubCategory !== 'all') {
            filtered = filtered.filter(spa => {
                switch (approvedSubCategory) {
                    case 'verified':
                        return spa.status === 'verified';
                    case 'unverified':
                        return spa.status === 'unverified';
                    case 'blacklisted':
                        return spa.status === 'blacklisted';
                    default:
                        return true;
                }
            });
        }

        setFilteredSpas(filtered);
    };

    const handleStatusUpdate = async (spaId, action, reason = null) => {
        try {
            let endpoint = '';
            let successMessage = '';
            let payload = {};

            switch (action) {
                case 'approve':
                    endpoint = `http://localhost:3001/api/admin-lsa-enhanced/spas/${spaId}/approve`;
                    successMessage = 'Spa approved successfully';
                    break;
                case 'reject':
                    endpoint = `http://localhost:3001/api/admin-lsa-enhanced/spas/${spaId}/reject`;
                    successMessage = 'Spa rejected successfully';
                    payload = { reason };
                    break;
                case 'blacklist':
                    endpoint = `http://localhost:3001/api/admin-lsa-enhanced/spas/${spaId}/blacklist`;
                    successMessage = 'Spa blacklisted successfully';
                    payload = { reason };
                    break;
                default:
                    return;
            }

            const response = await axios.patch(endpoint, payload, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: successMessage,
                    showConfirmButton: false,
                    timer: 1500
                });

                fetchSpas();
            }
        } catch (error) {
            console.error(`Error ${action} spa:`, error);
            Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: `Failed to ${action} spa. Please try again.`
            });
        }
    };

    const handleApprove = async (spa) => {
        const result = await Swal.fire({
            title: 'Approve Spa Registration',
            text: `Are you sure you want to approve ${spa.spa_name || spa.name}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#001F3F',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, Approve',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            handleStatusUpdate(spa.spa_id, 'approve');
        }
    };

    const handleReject = async (spa) => {
        const { value: reason } = await Swal.fire({
            title: 'Reject Spa Registration',
            text: `Please provide a reason for rejecting ${spa.spa_name || spa.name}:`,
            input: 'textarea',
            inputPlaceholder: 'Enter rejection reason...',
            showCancelButton: true,
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Reject',
            cancelButtonText: 'Cancel',
            inputValidator: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Please provide a reason for rejection';
                }
            }
        });

        if (reason) {
            handleStatusUpdate(spa.spa_id, 'reject', reason.trim());
        }
    };

    const handleBlacklist = async (spa) => {
        const { value: reason } = await Swal.fire({
            title: 'Blacklist Spa',
            text: `Please provide a reason for blacklisting ${spa.spa_name || spa.name}:`,
            input: 'textarea',
            inputPlaceholder: 'Enter blacklist reason...',
            showCancelButton: true,
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Blacklist',
            cancelButtonText: 'Cancel',
            inputValidator: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Please provide a reason for blacklisting';
                }
            }
        });

        if (reason) {
            handleStatusUpdate(spa.spa_id, 'blacklist', reason.trim());
        }
    };

    const handleViewDetails = async (spa) => {
        try {
            setLoading(true);

            // Fetch detailed spa information with payment details
            const response = await axios.get(`http://localhost:3001/api/lsa/spas/${spa.spa_id}/detailed`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.data.success) {
                setSelectedSpa(response.data.data);
                setShowDetailsModal(true);
                console.log('Detailed spa data loaded:', response.data.data);
            } else {
                // Fallback to basic spa data if detailed fetch fails
                setSelectedSpa(spa);
                setShowDetailsModal(true);
            }
        } catch (error) {
            console.error('Error fetching spa details:', error);
            // Fallback to basic spa data
            setSelectedSpa(spa);
            setShowDetailsModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDocument = async (spaId, documentType) => {
        try {
            // First try to get the document path directly from the selected spa
            const spa = spas.find(s => s.spa_id === spaId);
            if (spa) {
                const documentMap = {
                    'certificate': spa.certificate_path,
                    'form1_certificate': spa.form1_certificate_path,
                    'nic_front': spa.nic_front_path,
                    'nic_back': spa.nic_back_path,
                    'br_attachment': spa.br_attachment_path,
                    'other_document': spa.other_document_path,
                    'spa_banner_photos': spa.spa_banner_photos_path
                };

                const documentPath = documentMap[documentType];
                if (documentPath) {
                    // Construct direct URL to the file
                    const fileUrl = `http://localhost:3001${documentPath}`;
                    window.open(fileUrl, '_blank');
                    return;
                }
            }

            // Fallback to API endpoint
            const url = `http://localhost:3001/api/lsa/spas/${spaId}/documents/${documentType}?action=view`;
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error viewing document:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to view document. Please try again.'
            });
        }
    };

    const handleDownloadDocument = async (spaId, documentType) => {
        try {
            // Get the document path directly from the selected spa
            const spa = spas.find(s => s.spa_id === spaId);
            if (spa) {
                const documentMap = {
                    'certificate': spa.certificate_path,
                    'form1_certificate': spa.form1_certificate_path,
                    'nic_front': spa.nic_front_path,
                    'nic_back': spa.nic_back_path,
                    'br_attachment': spa.br_attachment_path,
                    'other_document': spa.other_document_path,
                    'spa_banner_photos': spa.spa_banner_photos_path
                };

                const documentPath = documentMap[documentType];
                if (documentPath) {
                    // Create download link
                    const fileUrl = `http://localhost:3001${documentPath}`;
                    const link = document.createElement('a');
                    link.href = fileUrl;
                    link.download = documentPath.split('/').pop(); // Get filename from path
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    return;
                }
            }

            // Fallback to API endpoint
            const url = `http://localhost:3001/api/lsa/spas/${spaId}/documents/${documentType}?action=download`;
            const link = document.createElement('a');
            link.href = url;
            link.download = '';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error downloading document:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to download document. Please try again.'
            });
        }
    };

    const handleViewPaymentSlip = (slipPath) => {
        try {
            if (slipPath) {
                // Create full URL for payment slip
                const fileUrl = slipPath.startsWith('http') ? slipPath : `http://localhost:3001${slipPath.startsWith('/') ? slipPath : '/' + slipPath}`;
                window.open(fileUrl, '_blank');
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Payment slip not available.'
                });
            }
        } catch (error) {
            console.error('Error viewing payment slip:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to view payment slip. Please try again.'
            });
        }
    };

    const handleDownloadPaymentSlip = (slipPath, slipName) => {
        try {
            if (slipPath) {
                // Create download link
                const fileUrl = slipPath.startsWith('http') ? slipPath : `http://localhost:3001${slipPath.startsWith('/') ? slipPath : '/' + slipPath}`;
                const link = document.createElement('a');
                link.href = fileUrl;
                link.download = slipName || slipPath.split('/').pop(); // Use slip name or extract from path
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Payment slip not available for download.'
                });
            }
        } catch (error) {
            console.error('Error downloading payment slip:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to download payment slip. Please try again.'
            });
        }
    };

    const getStatusBadge = (spa) => {
        if (spa.blacklist_reason) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Blacklisted</span>;
        } else if (spa.verification_status === 'approved' || spa.status === 'verified' || spa.status === 'approved') {
            if (spa.payment_status === 'paid') {
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Verified</span>;
            } else {
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Unverified</span>;
            }
        } else if (spa.verification_status === 'pending' || spa.status === 'pending') {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Pending</span>;
        } else if (spa.verification_status === 'rejected' || spa.status === 'rejected') {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Rejected</span>;
        }
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Unknown</span>;
    };

    const renderActions = (spa) => {
        const actions = [];

        // View action - always available
        actions.push(
            <button
                key="view"
                onClick={() => handleViewDetails(spa)}
                className="px-3 py-1 text-xs bg-[#001F3F] text-white rounded hover:bg-opacity-80 transition-colors flex items-center gap-1"
                title="View Details"
            >
                <FiEye size={12} />
                View
            </button>
        );

        // Pending spas: Approve/Reject actions
        if (spa.verification_status === 'pending' || spa.status === 'pending') {
            actions.push(
                <button
                    key="approve"
                    onClick={() => handleApprove(spa)}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                    title="Approve Spa"
                >
                    <FiCheck size={12} />
                    Approve
                </button>
            );
            actions.push(
                <button
                    key="reject"
                    onClick={() => handleReject(spa)}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                    title="Reject Spa"
                >
                    <FiX size={12} />
                    Reject
                </button>
            );
        }

        // Approved spas (verified/unverified): Blacklist action
        // Only show blacklist button for approved spas that are NOT already blacklisted
        if ((spa.verification_status === 'approved' || spa.status === 'verified' || spa.status === 'approved') &&
            !spa.blacklist_reason &&
            spa.status !== 'blacklisted') {
            actions.push(
                <button
                    key="blacklist"
                    onClick={() => handleBlacklist(spa)}
                    className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors flex items-center gap-1"
                    title="Add to Blacklist"
                >
                    <FiUserX size={12} />
                    Blacklist
                </button>
            );
        }

        return (
            <div className="flex gap-2 flex-wrap">
                {actions}
            </div>
        );
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Manage Spas</h2>
                    <p className="text-gray-600">Enhanced spa management like therapist management system</p>
                </div>
                <button
                    onClick={fetchSpas}
                    className="bg-[#001F3F] text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2"
                    disabled={loading}
                >
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                    Refresh Data
                </button>
            </div>

            {/* Main Category Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#001F3F]">
                    <div className="flex items-center">
                        <FiGrid className="text-[#001F3F] mr-3" size={20} />
                        <div>
                            <p className="text-sm text-gray-600">Total Spas</p>
                            <p className="text-xl font-bold text-gray-800">{stats.total}</p>
                        </div>
                    </div>
                </div>

                <div
                    className={`bg-white rounded-lg shadow p-4 border-l-4 border-green-500 cursor-pointer transition-all ${activeTab === 'approved' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:bg-gray-50'
                        }`}
                    onClick={() => {
                        setActiveTab('approved');
                        setApprovedSubCategory('all');
                    }}
                >
                    <div className="flex items-center">
                        <FiCheck className="text-green-500 mr-3" size={20} />
                        <div>
                            <p className="text-sm text-gray-600">Approved Spas</p>
                            <p className="text-xl font-bold text-gray-800">{stats.approved}</p>
                        </div>
                    </div>
                </div>

                <div
                    className={`bg-white rounded-lg shadow p-4 border-l-4 border-red-500 cursor-pointer transition-all ${activeTab === 'rejected' ? 'ring-2 ring-red-500 bg-red-50' : 'hover:bg-gray-50'
                        }`}
                    onClick={() => setActiveTab('rejected')}
                >
                    <div className="flex items-center">
                        <FiX className="text-red-500 mr-3" size={20} />
                        <div>
                            <p className="text-sm text-gray-600">Rejected Spas</p>
                            <p className="text-xl font-bold text-gray-800">{stats.rejected}</p>
                        </div>
                    </div>
                </div>

                <div
                    className={`bg-white rounded-lg shadow p-4 border-l-4 border-blue-400 cursor-pointer transition-all ${activeTab === 'pending' ? 'ring-2 ring-blue-400 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                    onClick={() => setActiveTab('pending')}
                >
                    <div className="flex items-center">
                        <FiFileText className="text-blue-400 mr-3" size={20} />
                        <div>
                            <p className="text-sm text-gray-600">Pending Spas</p>
                            <p className="text-xl font-bold text-gray-800">{stats.pending}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-Category Stats Cards (Show only when Approved is selected) */}
            {activeTab === 'approved' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div
                        className={`bg-white rounded-lg shadow p-4 border-l-4 border-green-400 cursor-pointer transition-all ${approvedSubCategory === 'verified' ? 'ring-2 ring-green-400 bg-green-50' : 'hover:bg-gray-50'
                            }`}
                        onClick={() => setApprovedSubCategory(approvedSubCategory === 'verified' ? 'all' : 'verified')}
                    >
                        <div className="flex items-center">
                            <FiCheck className="text-green-400 mr-3" size={18} />
                            <div>
                                <p className="text-sm text-gray-600">Verified</p>
                                <p className="text-lg font-bold text-gray-800">{stats.verified}</p>
                                <p className="text-xs text-gray-500">Paid annual fee</p>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`bg-white rounded-lg shadow p-4 border-l-4 border-orange-500 cursor-pointer transition-all ${approvedSubCategory === 'unverified' ? 'ring-2 ring-orange-500 bg-orange-50' : 'hover:bg-gray-50'
                            }`}
                        onClick={() => setApprovedSubCategory(approvedSubCategory === 'unverified' ? 'all' : 'unverified')}
                    >
                        <div className="flex items-center">
                            <FiCalendar className="text-orange-500 mr-3" size={18} />
                            <div>
                                <p className="text-sm text-gray-600">Unverified</p>
                                <p className="text-lg font-bold text-gray-800">{stats.unverified}</p>
                                <p className="text-xs text-gray-500">Unpaid annual fee</p>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`bg-white rounded-lg shadow p-4 border-l-4 border-red-600 cursor-pointer transition-all ${approvedSubCategory === 'blacklisted' ? 'ring-2 ring-red-600 bg-red-50' : 'hover:bg-gray-50'
                            }`}
                        onClick={() => setApprovedSubCategory(approvedSubCategory === 'blacklisted' ? 'all' : 'blacklisted')}
                    >
                        <div className="flex items-center">
                            <FiAlertTriangle className="text-red-600 mr-3" size={18} />
                            <div>
                                <p className="text-sm text-gray-600">Blacklisted</p>
                                <p className="text-lg font-bold text-gray-800">{stats.blacklisted}</p>
                                <p className="text-xs text-gray-500">Admin blacklisted</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by spa name, reference number, or owner..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
                        />
                    </div>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Spa List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">
                        {activeTab === 'approved'
                            ? `Approved Spas ${approvedSubCategory !== 'all' ? `- ${approvedSubCategory.charAt(0).toUpperCase() + approvedSubCategory.slice(1)}` : ''}`
                            : activeTab === 'rejected'
                                ? 'Rejected Spas'
                                : 'Pending Spas'
                        }
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Viewing: {filteredSpas.length} spa(s)
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <FiRefreshCw className="animate-spin text-2xl text-gray-400 mr-3" />
                        <span className="text-gray-500">Loading spas...</span>
                    </div>
                ) : filteredSpas.length === 0 ? (
                    <div className="text-center py-12">
                        <FiGrid className="mx-auto text-4xl text-gray-300 mb-4" />
                        <p className="text-lg font-medium text-gray-500">No spas found</p>
                        <p className="text-sm text-gray-400">
                            {searchQuery ? 'Try adjusting your search terms' : `No ${activeTab} spas available`}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Spa Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Reference
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Payment
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Registration Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredSpas.map((spa, index) => (
                                    <tr key={spa.spa_id || index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <div className="h-10 w-10 rounded-full bg-[#001F3F] flex items-center justify-center">
                                                        <span className="text-white font-medium text-sm">
                                                            {spa.spa_name?.charAt(0)?.toUpperCase() || 'S'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {spa.spa_name || 'N/A'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {spa.owner_name || 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {spa.email || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{spa.reference_number || `SPA-${spa.spa_id}` || 'N/A'}</div>
                                            <div className="text-sm text-gray-500">{spa.address || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(spa)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {spa.payment_status === 'paid' ?
                                                    <span className="text-green-600 font-medium">Paid</span> :
                                                    <span className="text-orange-600 font-medium">Pending</span>
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {spa.created_at ? new Date(spa.created_at).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {renderActions(spa)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Spa Details Modal */}
            {showDetailsModal && selectedSpa && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800">Spa Details</h3>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Basic Information */}
                                <div className="space-y-4">
                                    <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Basic Information</h4>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Spa Name</label>
                                        <p className="text-sm text-gray-900">{selectedSpa.spa_name || selectedSpa.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Reference Number</label>
                                        <p className="text-sm text-gray-900">{selectedSpa.reference_number || `SPA-${selectedSpa.spa_id}` || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Contact Phone</label>
                                        <p className="text-sm text-gray-900">{selectedSpa.contact_phone || selectedSpa.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Status</label>
                                        <div className="mt-1">{getStatusBadge(selectedSpa)}</div>
                                    </div>
                                </div>

                                {/* Owner Information */}
                                <div className="space-y-4">
                                    <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Owner Information</h4>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Owner Name</label>
                                        <p className="text-sm text-gray-900">
                                            {selectedSpa.owner_name ||
                                                (selectedSpa.owner_fname && selectedSpa.owner_lname ?
                                                    `${selectedSpa.owner_fname} ${selectedSpa.owner_lname}` : 'N/A')
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Email</label>
                                        <p className="text-sm text-gray-900">{selectedSpa.email || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Address Information */}
                                <div className="space-y-4">
                                    <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Address Information</h4>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Address</label>
                                        <p className="text-sm text-gray-900">
                                            {selectedSpa.address || selectedSpa.city || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Registration Information */}
                                <div className="space-y-4">
                                    <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Registration Information</h4>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Registration Date</label>
                                        <p className="text-sm text-gray-900">
                                            {selectedSpa.created_at ? new Date(selectedSpa.created_at).toLocaleString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Annual Payment Status</label>
                                        <p className="text-sm text-gray-900">
                                            {selectedSpa.payment_status === 'paid' || selectedSpa.annual_payment_status === 'paid' ?
                                                <span className="text-green-600 font-medium">✅ Paid</span> :
                                                selectedSpa.payment_status === 'overdue' || selectedSpa.annual_payment_status === 'overdue' ?
                                                    <span className="text-red-600 font-medium">⚠️ Overdue</span> :
                                                    <span className="text-orange-600 font-medium">⏳ Pending</span>
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Payment Method</label>
                                        <p className="text-sm text-gray-900">
                                            {selectedSpa.payment_method ?
                                                (selectedSpa.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Card Payment') :
                                                'Not specified'
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Next Payment Due</label>
                                        <p className="text-sm text-gray-900">
                                            {selectedSpa.next_payment_date ?
                                                new Date(selectedSpa.next_payment_date).toLocaleDateString() :
                                                'Not set'
                                            }
                                        </p>
                                    </div>
                                    {selectedSpa.blacklist_reason && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Blacklist Reason</label>
                                            <p className="text-sm text-red-600">{selectedSpa.blacklist_reason}</p>
                                        </div>
                                    )}
                                    {selectedSpa.reject_reason && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Rejection Reason</label>
                                            <p className="text-sm text-red-600">{selectedSpa.reject_reason}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Registration Payment Details */}
                            {selectedSpa.payments && selectedSpa.payments.length > 0 && (
                                <div className="mt-6 space-y-4">
                                    <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Registration Payment Details</h4>
                                    {selectedSpa.payments.map((payment, index) => (
                                        <div key={payment.payment_id} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-500">Payment Type</label>
                                                <p className="text-sm text-gray-900 capitalize">{payment.payment_type || 'Registration Fee'}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-500">Amount</label>
                                                <p className="text-sm text-gray-900">
                                                    {payment.amount ? `LKR ${parseFloat(payment.amount).toLocaleString()}` : 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-500">Payment Status</label>
                                                <div className="mt-1">
                                                    {payment.payment_status === 'completed' || payment.payment_status === 'paid' ? (
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                            ✅ Paid
                                                        </span>
                                                    ) : payment.payment_status === 'pending' || payment.payment_status === 'pending_approval' ? (
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                            ⏳ Pending
                                                        </span>
                                                    ) : payment.payment_status === 'rejected' ? (
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                            ❌ Rejected
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                                            {payment.payment_status || 'Unknown'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-500">Created Date</label>
                                                <p className="text-sm text-gray-900">
                                                    {payment.payment_created_at ? new Date(payment.payment_created_at).toLocaleDateString() : 'N/A'}
                                                </p>
                                            </div>
                                            {(payment.slip_path || payment.bank_slip_path) && (
                                                <div className="md:col-span-2">
                                                    <label className="text-sm font-medium text-gray-500">Payment Slip</label>
                                                    <div className="mt-2 flex gap-2">
                                                        <button
                                                            onClick={() => handleViewPaymentSlip(payment.slip_path || payment.bank_slip_path)}
                                                            className="flex items-center gap-1 px-3 py-1 bg-[#001F3F] text-white text-xs rounded hover:bg-opacity-90 transition-colors"
                                                        >
                                                            <FiEye size={12} /> View Slip
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadPaymentSlip(payment.slip_path || payment.bank_slip_path, `payment-slip-${payment.payment_reference || payment.payment_id}`)}
                                                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-opacity-90 transition-colors"
                                                        >
                                                            <FiDownload size={12} /> Download
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Documents Section */}
                            <div className="mt-6 space-y-4">
                                <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Documents & Certificates</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(() => {
                                        const documents = [
                                            { key: 'form1_certificate', label: 'Form 1 Certificate', path: selectedSpa.form1_certificate_path },
                                            { key: 'spa_banner_photos', label: 'Spa Banner Photos', path: selectedSpa.spa_banner_photos_path },
                                            { key: 'nic_front', label: 'NIC Front', path: selectedSpa.nic_front_path },
                                            { key: 'nic_back', label: 'NIC Back', path: selectedSpa.nic_back_path },
                                            { key: 'br_attachment', label: 'Business Registration', path: selectedSpa.br_attachment_path },
                                            { key: 'other_document', label: 'Other Documents', path: selectedSpa.other_document_path }
                                        ];

                                        return documents.map(doc => (
                                            <div key={doc.key} className={`border rounded-lg p-3 ${doc.path ? 'hover:bg-gray-50' : 'bg-gray-50'}`}>
                                                <label className="text-sm font-medium text-gray-700 block mb-2">{doc.label}</label>
                                                {doc.path ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleViewDocument(selectedSpa.spa_id, doc.key)}
                                                            className="flex items-center gap-1 px-3 py-1 bg-[#001F3F] text-white text-xs rounded hover:bg-opacity-90 transition-colors"
                                                        >
                                                            <FiEye size={12} /> View
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadDocument(selectedSpa.spa_id, doc.key)}
                                                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-opacity-90 transition-colors"
                                                        >
                                                            <FiDownload size={12} /> Download
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400">No document uploaded</p>
                                                )}
                                            </div>
                                        ));
                                    })()}
                                </div>



                                {/* No Documents Message */}
                                {!selectedSpa.certificate_path && !selectedSpa.form1_certificate_path &&
                                    !selectedSpa.nic_front_path && !selectedSpa.nic_back_path &&
                                    !selectedSpa.br_attachment_path && !selectedSpa.other_document_path && (
                                        <div className="text-center py-4 text-gray-500">
                                            <FiFileText className="mx-auto text-2xl text-gray-300 mb-2" />
                                            <p className="text-sm">No documents uploaded</p>
                                        </div>
                                    )}
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                                >
                                    Close
                                </button>
                                {(selectedSpa.verification_status === 'pending' || selectedSpa.status === 'pending') && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setShowDetailsModal(false);
                                                handleApprove(selectedSpa);
                                            }}
                                            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowDetailsModal(false);
                                                handleReject(selectedSpa);
                                            }}
                                            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}
                                {((selectedSpa.verification_status === 'approved' || selectedSpa.status === 'verified' || selectedSpa.status === 'approved') && !selectedSpa.blacklist_reason) && (
                                    <button
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            handleBlacklist(selectedSpa);
                                        }}
                                        className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                                    >
                                        Add to Blacklist
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageSpas;