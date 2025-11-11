import React, { useState, useContext, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
    FiUserMinus,
    FiSearch,
    FiCheck,
    FiX,
    FiMoreVertical,
    FiCreditCard
} from 'react-icons/fi';
import { useSpaStatus } from '../../contexts/SpaStatusContext';

const ResignTerminate = () => {
    const { spaStatus } = useSpaStatus();

    // Allow access for verified spas
    const hasAccess = spaStatus.status === 'verified';

    const [searchTerm, setSearchTerm] = useState('');
    const [therapists, setTherapists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Get spa_id from logged-in user data
    const getSpaId = () => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                return user.spa_id ? String(user.spa_id) : null;
            } catch (error) {
                console.error('Error parsing user data:', error);
                return null;
            }
        }
        return null;
    };

    // Fetch approved therapists for resign/terminate
    const fetchApprovedTherapists = async () => {
        const token = localStorage.getItem('token');
        const spaId = getSpaId();

        // Check for null, undefined, or "null" string
        if (!token || token === 'null' || token === 'undefined') {
            console.log('❌ No valid token found, redirecting to login');
            setError('Authentication required. Please log in again.');
            setLoading(false);
            // Redirect to login
            window.location.href = '/login';
            return;
        }

        if (!spaId) {
            setError('Spa information not available. Please refresh the page.');
            setLoading(false);
            return;
        }

        try {
            console.log(`🔍 Fetching approved therapists for spa ${spaId} to resign/terminate`);
            const response = await fetch(`/api/admin-spa-new/spas/${spaId}/therapists?status=approved`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`🔍 ResignTerminate response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.success) {
                // Map backend data to frontend expected format
                const mappedTherapists = data.therapists.map(t => ({
                    id: t.id,
                    name: t.name,
                    email: t.email || 'N/A',
                    phone: t.phone || 'N/A',
                    specialization: Array.isArray(t.specializations) ? t.specializations.join(', ') : (t.specializations || 'N/A'),
                    status: 'active', // approved therapists are active
                    joinDate: t.created_at ? new Date(t.created_at).toISOString().split('T')[0] : 'N/A',
                    requestStatus: null
                }));

                setTherapists(mappedTherapists);
                console.log(`📋 Loaded ${mappedTherapists.length} approved therapists for resign/terminate`);
            } else {
                setError('Failed to fetch therapists');
                setTherapists([]);
            }
        } catch (err) {
            console.error('Error fetching therapists:', err);
            setError('Network error. Please check your connection.');
            setTherapists([]);
        } finally {
            setLoading(false);
        }
    };

    // Load therapists when component mounts
    useEffect(() => {
        fetchApprovedTherapists();
    }, []);

    const filteredTherapists = therapists.filter(therapist =>
        therapist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        therapist.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Simple resign function - direct action with confirmation
    const handleResign = async (therapist) => {
        const result = await Swal.fire({
            title: 'Confirm Resignation',
            text: `Are you sure you want to resign ${therapist.name}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0A1428',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, Resign',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const spaId = getSpaId();

                // Update therapist status in database
                const response = await fetch(`/api/admin-spa-new/therapists/${therapist.id}/status`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        status: 'resigned',
                        spa_id: spaId
                    })
                });

                if (response.ok) {
                    // Update therapist status locally after successful database update
                    setTherapists(prevTherapists =>
                        prevTherapists.map(t =>
                            t.id === therapist.id
                                ? { ...t, status: 'resigned', requestStatus: 'resign_completed' }
                                : t
                        )
                    );

                    Swal.fire({
                        title: 'Success!',
                        text: `${therapist.name} has been resigned successfully.`,
                        icon: 'success',
                        confirmButtonColor: '#0A1428'
                    });
                } else {
                    const data = await response.json();
                    throw new Error(data.message || 'Failed to update therapist status');
                }
            } catch (error) {
                console.error('Error resigning therapist:', error);
                Swal.fire({
                    title: 'Error!',
                    text: error.message || 'Failed to resign therapist. Please try again.',
                    icon: 'error',
                    confirmButtonColor: '#0A1428'
                });
            }
        }
    };

    // Simple terminate function - direct action with reason and police report
    const handleTerminate = async (therapist) => {
        // Step 1: Show modal to get reason
        const { value: reason } = await Swal.fire({
            title: 'Confirm Termination',
            html: `
                <div style="text-align: left;">
                    <p style="margin-bottom: 15px;">Please provide a reason for terminating ${therapist.name}:</p>
                    <textarea id="termination-reason" class="swal2-textarea" placeholder="Enter termination reason..." style="width: 100%; min-height: 80px; margin-bottom: 15px;"></textarea>
                    
                    <label style="display: block; margin-bottom: 10px; font-weight: 600;">Upload Police Report (PDF, JPG, PNG):</label>
                    <input type="file" id="police-report" accept=".pdf,.jpg,.jpeg,.png" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;" />
                    <p style="font-size: 12px; color: #6b7280; margin-top: 5px;">Maximum file size: 5MB</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Terminate',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const reasonValue = document.getElementById('termination-reason').value;
                const fileInput = document.getElementById('police-report');
                const file = fileInput.files[0];

                if (!reasonValue || !reasonValue.trim()) {
                    Swal.showValidationMessage('You need to provide a reason!');
                    return false;
                }

                // Validate file if provided
                if (file) {
                    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
                    if (!validTypes.includes(file.type)) {
                        Swal.showValidationMessage('Only PDF, JPG, and PNG files are allowed!');
                        return false;
                    }

                    const maxSize = 5 * 1024 * 1024; // 5MB
                    if (file.size > maxSize) {
                        Swal.showValidationMessage('File size must be less than 5MB!');
                        return false;
                    }
                }

                return {
                    reason: reasonValue,
                    file: file
                };
            }
        });

        if (reason) {
            try {
                const token = localStorage.getItem('token');
                const spaId = getSpaId();

                // Create FormData to send file and data
                const formData = new FormData();
                formData.append('status', 'terminated');
                formData.append('spa_id', spaId);
                formData.append('reason', reason.reason);

                if (reason.file) {
                    formData.append('police_report', reason.file);
                }

                // Update therapist status in database with file upload
                const response = await fetch(`/api/admin-spa-new/therapists/${therapist.id}/status`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                        // Don't set Content-Type header - browser will set it automatically with boundary for multipart/form-data
                    },
                    body: formData
                });

                if (response.ok) {
                    // Update therapist status locally after successful database update
                    setTherapists(prevTherapists =>
                        prevTherapists.map(t =>
                            t.id === therapist.id
                                ? { ...t, status: 'terminated', requestStatus: 'terminate_completed' }
                                : t
                        )
                    );

                    Swal.fire({
                        title: 'Success!',
                        text: `${therapist.name} has been terminated successfully.`,
                        icon: 'success',
                        confirmButtonColor: '#0A1428'
                    });
                } else {
                    const data = await response.json();
                    throw new Error(data.message || 'Failed to update therapist status');
                }
            } catch (error) {
                console.error('Error terminating therapist:', error);
                Swal.fire({
                    title: 'Error!',
                    text: error.message || 'Failed to terminate therapist. Please try again.',
                    icon: 'error',
                    confirmButtonColor: '#0A1428'
                });
            }
        }
    };

    if (!hasAccess) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-lg border-2 border-orange-200">
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiCreditCard className="text-white" size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">Unlock Staff Management</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        Manage staff resignations and terminations with our premium plan.
                    </p>
                    <p className="text-gray-600 mb-6 max-w-md">
                        Subscribe to our service to access therapist management features, including resignation and termination processing.
                    </p>
                    <button
                        onClick={() => window.location.href = '/adminSPA/payment-plans'}
                        className="w-full bg-gradient-to-r from-[#4A90E2] to-[#D4AF37] text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
                    >
                        Unlock Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Manage Staff</h2>
                        <p className="text-gray-600 mt-1">Handle resignations and terminations</p>
                    </div>
                    <div className="text-sm text-gray-500">
                        {filteredTherapists.length} therapist(s) found
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex-1 relative mb-8">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search therapists by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] focus:border-transparent outline-none"
                    />
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0A1428] border-t-transparent"></div>
                        <span className="ml-2 text-gray-600">Loading approved therapists...</span>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <FiX className="text-red-500 mr-2" size={20} />
                                <p className="text-red-700">{error}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setError(null);
                                    fetchApprovedTherapists();
                                }}
                                className="text-red-600 hover:text-red-800 font-medium"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Therapists Grid */}
                {!loading && !error && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTherapists.length > 0 ? filteredTherapists.map((therapist) => (
                            <div key={therapist.id} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow duration-200">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center space-x-3">
                                        <img
                                            src={`http://localhost:3001/api/lsa/therapists/${therapist.id}/document/therapist_image?action=view`}
                                            alt={therapist.name}
                                            className="w-12 h-12 rounded-full object-cover border-2 border-[#0A1428]"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextElementSibling.style.display = 'flex';
                                            }}
                                        />
                                        <div className="w-12 h-12 bg-[#0A1428] rounded-full hidden items-center justify-center text-white font-semibold">
                                            {therapist.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{therapist.name}</h3>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${therapist.status === 'active' ? 'bg-green-100 text-green-800' :
                                                therapist.status === 'resigned' ? 'bg-orange-100 text-orange-800' :
                                                    therapist.status === 'terminated' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {therapist.status === 'active' ? 'Active' :
                                                    therapist.status === 'resigned' ? 'Resigned' :
                                                        therapist.status === 'terminated' ? 'Terminated' : 'Pending'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors">
                                            <FiMoreVertical size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600 mb-4">
                                    <div><span className="font-medium">Email:</span> {therapist.email}</div>
                                    <div><span className="font-medium">Specialty:</span> {therapist.specialization}</div>
                                    <div><span className="font-medium">Join Date:</span> {therapist.joinDate}</div>
                                    {therapist.requestStatus && (
                                        <div className="text-yellow-600 font-medium">
                                            Status: {therapist.requestStatus.replace('_', ' ')}
                                        </div>
                                    )}
                                </div>

                                {/* Simple Action Buttons - Only show for active therapists */}
                                {therapist.status === 'active' && (
                                    <div className="flex space-x-2 pt-4 border-t border-gray-200">
                                        <button
                                            onClick={() => handleResign(therapist)}
                                            className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
                                        >
                                            <FiCheck size={16} />
                                            <span>Resign</span>
                                        </button>
                                        <button
                                            onClick={() => handleTerminate(therapist)}
                                            className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                                        >
                                            <FiX size={16} />
                                            <span>Terminate</span>
                                        </button>
                                    </div>
                                )}

                                {/* Status display for non-active therapists */}
                                {therapist.status !== 'active' && (
                                    <div className="pt-4 border-t border-gray-200">
                                        <div className="text-center text-gray-600 font-medium">
                                            {therapist.status === 'resigned' ? 'Therapist Resigned' :
                                                therapist.status === 'terminated' ? 'Therapist Terminated' :
                                                    'Action Completed'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="col-span-full text-center py-12">
                                <p className="text-gray-500">No staff yet—add your first therapist via the dashboard!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResignTerminate;