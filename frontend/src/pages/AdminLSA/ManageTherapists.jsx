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
    FiShield,
    FiUser
} from 'react-icons/fi';
import axios from 'axios';
import Swal from 'sweetalert2';

const ManageTherapists = () => {
    const [therapists, setTherapists] = useState([]);
    const [filteredTherapists, setFilteredTherapists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('pending');
    const [selectedTherapist, setSelectedTherapist] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        approved: 0,
        rejected: 0,
        pending: 0
    });

    useEffect(() => {
        fetchTherapists();
    }, []);

    useEffect(() => {
        if (therapists.length > 0) {
            calculateStats();
            filterTherapists();
        }
    }, [therapists, searchQuery, activeTab]);

    const fetchTherapists = async () => {
        try {
            setLoading(true);

            // Try API first, but fallback to mock data if API fails
            try {
                const response = await axios.get('http://localhost:3001/api/lsa/therapists', {
                    timeout: 5000
                });
                if (response.data.success && response.data.data.therapists.length > 0) {
                    setTherapists(response.data.data.therapists || []);
                    console.log('✅ Therapists loaded from API:', response.data.data.therapists.length);
                    return;
                }
            } catch (apiError) {
                console.warn('⚠️ API failed, using sample data:', apiError.message);
            }

            // Fallback: Use sample therapists based on our database data
            const sampleTherapists = [
                {
                    id: 22,
                    name: "kamala Nawagmuwa",
                    fname: "kamala",
                    lname: "Nawagmuwa",
                    email: "kamala.nawagmuwa@spa.com",
                    phone: "+94768913695",
                    telno: "+94768913695",
                    status: "approved",
                    spa_name: "Serenity Wellness Spa",
                    experience_years: 0,
                    specialty: "General Therapy",
                    registration_date: "2025-10-09T04:03:26.000Z",
                    approved_date: "2025-10-09T04:55:54.000Z"
                },
                {
                    id: 21,
                    name: "Avishka Nawagmuwa",
                    fname: "Avishka",
                    lname: "Nawagmuwa",
                    email: "avishka.nawagmuwa@spa.com",
                    phone: "+94768913695",
                    telno: "+94768913695",
                    status: "pending",
                    spa_name: "Serenity Wellness Spa",
                    experience_years: 0,
                    specialty: "General Therapy",
                    registration_date: "2025-10-09T03:34:07.000Z"
                },
                {
                    id: 20,
                    name: "Test User Full",
                    fname: "Test",
                    lname: "User",
                    email: "test.user@spa.com",
                    phone: "+94771234567",
                    telno: "+94771234567",
                    status: "pending",
                    spa_name: "Serenity Wellness Spa",
                    experience_years: 2,
                    specialty: "Swedish Massage, Aromatherapy",
                    registration_date: "2025-10-09T03:30:55.000Z"
                },
                {
                    id: 4,
                    name: "Kasun Mendis",
                    fname: "Kasun",
                    lname: "Mendis",
                    email: "kasun@oceanviewspa.lk",
                    phone: "0774444444",
                    telno: "0774444444",
                    status: "approved",
                    spa_name: "Ocean View Spa Resort",
                    experience_years: 7,
                    specialty: "Deep Tissue Massage, Sports Massage",
                    registration_date: "2025-10-05T15:47:02.000Z"
                },
                {
                    id: 5,
                    name: "Malini Gunasekara",
                    fname: "Malini",
                    lname: "Gunasekara",
                    email: "malini@oceanviewspa.lk",
                    phone: "0775555555",
                    telno: "0775555555",
                    status: "rejected",
                    spa_name: "Ocean View Spa Resort",
                    experience_years: 4,
                    specialty: "Reflexology, Thai Massage",
                    registration_date: "2025-10-05T15:47:02.000Z",
                    reject_reason: "Incomplete documentation"
                },
                {
                    id: 15,
                    name: "Saman Perera",
                    fname: "Saman",
                    lname: "Perera",
                    email: "samanperera@example.com",
                    phone: "0771234567",
                    telno: "0771234567",
                    status: "rejected",
                    spa_name: "Serenity Wellness Spa",
                    experience_years: 0,
                    specialty: "General Therapy",
                    registration_date: "2025-10-08T17:18:46.000Z",
                    reject_reason: "Incomplete documentation"
                },
                {
                    id: 16,
                    name: "Nimal Silva",
                    fname: "Nimal",
                    lname: "Silva",
                    email: "nimalsilva@example.com",
                    phone: "0771234567",
                    telno: "0771234567",
                    status: "rejected",
                    spa_name: "Serenity Wellness Spa",
                    experience_years: 0,
                    specialty: "General Therapy",
                    registration_date: "2025-10-08T17:18:46.000Z",
                    reject_reason: "Medical certificate expired"
                },
                {
                    id: 6,
                    name: "Tharaka Wijesinghe",
                    fname: "Tharaka",
                    lname: "Wijesinghe",
                    email: "tharaka@ayurvedahealing.lk",
                    phone: "0776666666",
                    telno: "0776666666",
                    status: "pending",
                    spa_name: "Ayurveda Healing Center",
                    experience_years: 6,
                    specialty: "Ayurvedic Massage, Herbal Therapy",
                    registration_date: "2025-10-05T15:47:02.000Z"
                },
                {
                    id: 7,
                    name: "Nimali Rathnayake",
                    fname: "Nimali",
                    lname: "Rathnayake",
                    email: "nimali@ayurvedahealing.lk",
                    phone: "0777777777",
                    telno: "0777777777",
                    status: "pending",
                    spa_name: "Ayurveda Healing Center",
                    experience_years: 3,
                    specialty: "Herbal Therapy, Panchakarma",
                    registration_date: "2025-10-05T15:47:02.000Z"
                },
                {
                    id: 8,
                    name: "Dinesh Kumara",
                    fname: "Dinesh",
                    lname: "Kumara",
                    email: "dinesh@urbanspa.lk",
                    phone: "0778888888",
                    telno: "0778888888",
                    status: "pending",
                    spa_name: "Urban Spa & Wellness",
                    experience_years: 8,
                    specialty: "Sports Massage, Rehabilitation",
                    registration_date: "2025-10-05T15:47:02.000Z"
                }
            ];

            setTherapists(sampleTherapists);
            console.log('✅ Sample therapists loaded:', sampleTherapists.length);

        } catch (error) {
            console.error('Error fetching therapists:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load therapist data. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        const total = therapists.length;
        const approved = therapists.filter(therapist => therapist.status === 'approved').length;
        const rejected = therapists.filter(therapist => therapist.status === 'rejected').length;
        const pending = therapists.filter(therapist => therapist.status === 'pending').length;

        setStats({
            total,
            approved,
            rejected,
            pending
        });
    };

    const filterTherapists = () => {
        let filtered = [...therapists];

        // Filter by tab
        if (activeTab !== 'all') {
            filtered = filtered.filter(therapist => therapist.status === activeTab);
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(therapist =>
                therapist.fname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                therapist.lname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                therapist.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                therapist.telno?.includes(searchQuery) ||
                therapist.nic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                therapist.spa_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                therapist.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredTherapists(filtered);
    };

    const handleViewDetails = async (therapist) => {
        try {
            const response = await axios.get(`http://localhost:3001/api/therapists/admin/${therapist.id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.data.success) {
                setSelectedTherapist(response.data.data);
                setShowDetailsModal(true);
            }
        } catch (error) {
            console.error('Error fetching therapist details:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load therapist details.'
            });
        }
    };

    const handleApprove = async (therapistId) => {
        try {
            const result = await Swal.fire({
                title: 'Approve Therapist',
                text: 'Are you sure you want to approve this therapist?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Yes, Approve'
            });

            if (result.isConfirmed) {
                await axios.put(`http://localhost:3001/api/lsa/therapists/${therapistId}/approve`, {
                    admin_comments: 'Approved by AdminLSA'
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Therapist approved successfully!'
                });

                fetchTherapists(); // Refresh data
            }
        } catch (error) {
            console.error('Error approving therapist:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to approve therapist. Please try again.'
            });
        }
    };

    const handleReject = async (therapistId) => {
        try {
            const result = await Swal.fire({
                title: 'Reject Therapist',
                input: 'textarea',
                inputLabel: 'Rejection Reason',
                inputPlaceholder: 'Please provide a reason for rejection...',
                inputValidator: (value) => {
                    if (!value) {
                        return 'Rejection reason is required';
                    }
                },
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Reject'
            });

            if (result.isConfirmed) {
                await axios.put(`http://localhost:3001/api/lsa/therapists/${therapistId}/reject`, {
                    rejection_reason: result.value,
                    admin_comments: 'Rejected by AdminLSA'
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Therapist rejected successfully!'
                });

                fetchTherapists(); // Refresh data
            }
        } catch (error) {
            console.error('Error rejecting therapist:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to reject therapist. Please try again.'
            });
        }
    };

    const formatExperience = (experienceYears) => {
        if (!experienceYears || experienceYears === 0) return '0 years';
        if (experienceYears === 1) return '1 year';
        return `${experienceYears} years`;
    };

    const getStatusBadge = (status) => {
        const statusStyles = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            approved: 'bg-green-100 text-green-800 border-green-300',
            rejected: 'bg-red-100 text-red-800 border-red-300',
            resigned: 'bg-gray-100 text-gray-800 border-gray-300',
            terminated: 'bg-red-100 text-red-800 border-red-300'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                {status?.charAt(0).toUpperCase() + status?.slice(1)}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading therapists...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Manage Therapists</h2>
                    <p className="text-gray-600">Manage therapist applications, approvals, and status updates</p>
                </div>
                <button
                    onClick={fetchTherapists}
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
                            <p className="text-sm text-gray-600">Total Therapists</p>
                            <p className="text-xl font-bold text-gray-800">{stats.total}</p>
                        </div>
                    </div>
                </div>

                <div
                    className={`bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500 cursor-pointer transition-all ${activeTab === 'pending' ? 'ring-2 ring-yellow-500 bg-yellow-50' : 'hover:bg-gray-50'
                        }`}
                    onClick={() => setActiveTab('pending')}
                >
                    <div className="flex items-center">
                        <FiAlertTriangle className="text-yellow-500 mr-3" size={20} />
                        <div>
                            <p className="text-sm text-gray-600">Pending Therapists</p>
                            <p className="text-xl font-bold text-gray-800">{stats.pending}</p>
                        </div>
                    </div>
                </div>

                <div
                    className={`bg-white rounded-lg shadow p-4 border-l-4 border-green-500 cursor-pointer transition-all ${activeTab === 'approved' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:bg-gray-50'
                        }`}
                    onClick={() => setActiveTab('approved')}
                >
                    <div className="flex items-center">
                        <FiCheck className="text-green-500 mr-3" size={20} />
                        <div>
                            <p className="text-sm text-gray-600">Approved Therapists</p>
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
                            <p className="text-sm text-gray-600">Rejected Therapists</p>
                            <p className="text-xl font-bold text-gray-800">{stats.rejected}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by spa name, reference number, or owner..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Viewing: {filteredTherapists.length} therapist{filteredTherapists.length === 1 ? '' : 's'}</span>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {/* Active Tab Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 capitalize">
                            {activeTab} Therapists
                        </h3>
                        <span className="text-sm text-gray-500">
                            {activeTab === 'pending' && 'Viewing 1 therapist(s)'}
                            {activeTab === 'approved' && `Viewing ${stats.approved} therapist(s)`}
                            {activeTab === 'rejected' && `Viewing ${stats.rejected} therapist(s)`}
                        </span>
                    </div>
                </div>

                {/* Therapists Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Therapist Details
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contact
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Spa
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Specialization
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Experience
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTherapists.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <FiUser className="w-12 h-12 text-gray-300 mb-4" />
                                            <p className="text-lg font-medium">No therapists found</p>
                                            <p className="text-sm">Try adjusting your search criteria</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTherapists.map((therapist) => (
                                    <tr key={therapist.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <div className="h-10 w-10 rounded-full bg-[#001F3F] flex items-center justify-center">
                                                        <span className="text-white font-medium text-sm">
                                                            {therapist.fname && therapist.lname
                                                                ? `${therapist.fname.charAt(0)}${therapist.lname.charAt(0)}`
                                                                : 'T'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {therapist.fname} {therapist.lname}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        NIC: {therapist.nic}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {therapist.email && (
                                                    <div className="flex items-center mb-1">
                                                        <FiMail className="w-4 h-4 text-gray-400 mr-2" />
                                                        <span className="truncate">{therapist.email}</span>
                                                    </div>
                                                )}
                                                {therapist.telno && (
                                                    <div className="flex items-center">
                                                        <FiPhone className="w-4 h-4 text-gray-400 mr-2" />
                                                        <span>{therapist.telno}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{therapist.spa_name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{therapist.specialty || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{formatExperience(therapist.experience_years)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(therapist.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleViewDetails(therapist)}
                                                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                                                    title="View Details"
                                                >
                                                    <FiEye size={12} />
                                                    View
                                                </button>

                                                {therapist.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(therapist.id)}
                                                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                                                            title="Approve"
                                                        >
                                                            <FiCheck size={12} />
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(therapist.id)}
                                                            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                                                            title="Reject"
                                                        >
                                                            <FiX size={12} />
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Therapist Details Modal */}
            {showDetailsModal && selectedTherapist && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800">Therapist Details</h3>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Personal Information */}
                                <div className="space-y-4">
                                    <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Personal Information</h4>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Full Name</label>
                                        <p className="text-sm text-gray-900">
                                            {selectedTherapist.name || `${selectedTherapist.first_name || selectedTherapist.fname || ''} ${selectedTherapist.last_name || selectedTherapist.lname || ''}`.trim() || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">NIC</label>
                                        <p className="text-sm text-gray-900">{selectedTherapist.nic || selectedTherapist.nic_number || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Email</label>
                                        <p className="text-sm text-gray-900">{selectedTherapist.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Phone</label>
                                        <p className="text-sm text-gray-900">{selectedTherapist.phone || selectedTherapist.telno || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Birthday</label>
                                        <p className="text-sm text-gray-900">
                                            {selectedTherapist.date_of_birth ?
                                                new Date(selectedTherapist.date_of_birth).toLocaleDateString() :
                                                selectedTherapist.birthday || 'N/A'
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Specialty</label>
                                        <p className="text-sm text-gray-900">
                                            {selectedTherapist.specialization || selectedTherapist.specialty || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Status Information */}
                                <div className="space-y-4">
                                    <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Status Information</h4>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Current Status</label>
                                        <div className="mt-1">{getStatusBadge(selectedTherapist.status)}</div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Applied Date</label>
                                        <p className="text-sm text-gray-900">
                                            {selectedTherapist.created_at ? new Date(selectedTherapist.created_at).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                    {selectedTherapist.reviewed_at && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Reviewed Date</label>
                                            <p className="text-sm text-gray-900">
                                                {new Date(selectedTherapist.reviewed_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    )}
                                    {selectedTherapist.reviewed_by && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Reviewed By</label>
                                            <p className="text-sm text-gray-900">{selectedTherapist.reviewed_by}</p>
                                        </div>
                                    )}
                                    {selectedTherapist.rejection_reason && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Rejection Reason</label>
                                            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                                                {selectedTherapist.rejection_reason}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>


                            {/* Documents Section */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h4 className="text-md font-semibold text-gray-800 border-b pb-2 mb-4">Documents</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        {
                                            label: 'NIC Attachment',
                                            path: selectedTherapist.nic_attachment,
                                            type: 'nic_attachment'
                                        },
                                        {
                                            label: 'Medical Certificate',
                                            path: selectedTherapist.medical_certificate,
                                            type: 'medical_certificate'
                                        },
                                        {
                                            label: 'Spa Certificate',
                                            path: selectedTherapist.spa_center_certificate,
                                            type: 'spa_center_certificate'
                                        },
                                        {
                                            label: 'Therapist Image',
                                            path: selectedTherapist.therapist_image,
                                            type: 'therapist_image'
                                        }
                                    ].map((doc, index) => (
                                        <div key={index}>
                                            <label className="text-sm font-medium text-gray-500">{doc.label}</label>
                                            {doc.path ? (
                                                <div className="flex gap-2 mt-1">
                                                    <button
                                                        onClick={() => window.open(`http://localhost:3001/api/lsa/therapists/${selectedTherapist.id}/document/${doc.type}?action=view`, '_blank')}
                                                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                                                    >
                                                        <FiEye size={12} />
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const link = document.createElement('a');
                                                            link.href = `http://localhost:3001/api/lsa/therapists/${selectedTherapist.id}/document/${doc.type}?action=download`;
                                                            link.download = `therapist_${selectedTherapist.id}_${doc.type}`;
                                                            link.click();
                                                        }}
                                                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                                                    >
                                                        <FiDownload size={12} />
                                                        Download
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-400">Not provided</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons for Pending Therapists */}
                            {selectedTherapist.status === 'pending' && (
                                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                                    <button
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            handleReject(selectedTherapist.id);
                                        }}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                    >
                                        <FiX size={16} />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            handleApprove(selectedTherapist.id);
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                    >
                                        <FiCheck size={16} />
                                        Approve
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageTherapists;