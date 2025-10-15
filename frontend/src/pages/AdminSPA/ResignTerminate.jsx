import React, { useState, useContext, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
    FiUserMinus,
    FiLock,
    FiAlertTriangle,
    FiCheck,
    FiX,
    FiFileText,
    FiCalendar,
    FiClock,
    FiArrowRight,
    FiArrowLeft,
    FiSearch,
    FiMoreVertical,
    FiSliders,
    FiSend,
    FiCreditCard
} from 'react-icons/fi';
import { SpaContext } from './SpaContext';

const ResignTerminate = () => {
    const { subscriptionStatus } = useContext(SpaContext);
    const isSubscriptionActive = subscriptionStatus === 'active';

    const [showModal, setShowModal] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedTherapists, setSelectedTherapists] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        therapistId: '',
        therapistName: '',
        type: 'resign', // 'resign' or 'terminate'
        reason: '',
        reasonCategory: '',
        notes: '',
        effectiveDate: ''
    });
    const [isSlideConfirmed, setIsSlideConfirmed] = useState(false);
    const [slidePosition, setSlidePosition] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Enhanced therapist data with status
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

    const resignReasons = [
        'Voluntary Resignation',
        'Relocation',
        'Career Change',
        'Personal Reasons',
        'Better Opportunity'
    ];

    const terminateReasons = [
        'Performance Issues',
        'Misconduct',
        'Attendance Problems',
        'Policy Violation',
        'Other'
    ];

    const filteredTherapists = therapists.filter(therapist =>
        therapist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        therapist.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openModal = (therapist, type) => {
        setFormData({
            therapistId: therapist.id,
            therapistName: therapist.name,
            type: type,
            reason: '',
            reasonCategory: '',
            notes: '',
            effectiveDate: ''
        });
        setCurrentStep(1);
        setShowModal(true);
        setIsSlideConfirmed(false);
        setSlidePosition(0);
    };

    const nextStep = () => {
        if (currentStep < 3) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleSlideConfirm = async () => {
        setIsSubmitting(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update therapist status immutably
            setTherapists(prevTherapists =>
                prevTherapists.map(t =>
                    t.id === formData.therapistId
                        ? { ...t, status: 'pending_review', requestStatus: `${formData.type}_requested` }
                        : t
                )
            );

            Swal.fire({
                title: 'Request Sent!',
                text: `${formData.type === 'resign' ? 'Resignation' : 'Termination'} request sent successfully! Admin approval is pending.`,
                icon: 'success',
                confirmButtonColor: '#0A1428'
            });
            setShowModal(false);
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: 'Error sending request. Please try again.',
                icon: 'error',
                confirmButtonColor: '#0A1428'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSlideMove = (e) => {
        const slider = e.target;
        const rect = slider.getBoundingClientRect();
        const percentage = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);

        setSlidePosition(percentage * 100);

        if (percentage > 0.8) {
            setIsSlideConfirmed(true);
            handleSlideConfirm();
        }
    };

    if (!isSubscriptionActive) {
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
                                        <div className="w-12 h-12 bg-[#0A1428] rounded-full flex items-center justify-center text-white font-semibold">
                                            {therapist.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{therapist.name}</h3>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${therapist.status === 'active' ? 'bg-green-100 text-green-800' :
                                                therapist.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {therapist.status === 'pending_review' ? 'Pending Review' : therapist.status}
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

                                {therapist.status === 'active' && (
                                    <div className="flex space-x-2 pt-4 border-t border-gray-200">
                                        <button
                                            onClick={() => openModal(therapist, 'resign')}
                                            className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                                        >
                                            Resign
                                        </button>
                                        <button
                                            onClick={() => openModal(therapist, 'terminate')}
                                            className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors"
                                        >
                                            Terminate
                                        </button>
                                    </div>
                                )}

                                {therapist.status === 'pending_review' && (
                                    <div className="pt-4 border-t border-gray-200">
                                        <div className="text-center text-yellow-600 font-medium">Request Pending Admin Approval</div>
                                        <button className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700">
                                            24h undo available
                                        </button>
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

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl transform animate-scaleIn border-2 border-[#0A1428] border-opacity-20 ring-4 ring-[#0A1428] ring-opacity-10">
                            {/* Header with gradient */}
                            <div className="bg-gradient-to-r from-[#0A1428] to-[#1a2f4a] p-6 rounded-t-3xl">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                                            <FiUserMinus size={24} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white">
                                                {formData.type === 'resign' ? 'Process Resignation' : 'Process Termination'}
                                            </h3>
                                            <p className="text-blue-100 text-sm">Therapist: {formData.therapistName}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-xl transition-all duration-200 text-white hover:text-gray-200"
                                    >
                                        <FiX size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 bg-gradient-to-b from-white to-gray-50">

                                {/* Enhanced Progress Bar */}
                                <div className="relative mb-10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${currentStep >= 1 ? 'bg-gradient-to-br from-[#0A1428] to-[#1a2f4a] text-white transform scale-110' : 'bg-gray-200 text-gray-500'}`}>
                                                <FiUserMinus size={22} />
                                            </div>
                                            <span className="text-xs font-medium mt-2 text-gray-600">Select</span>
                                        </div>

                                        <div className={`flex-1 h-2 mx-4 rounded-full transition-all duration-500 ${currentStep > 1 ? 'bg-gradient-to-r from-[#0A1428] to-[#1a2f4a]' : 'bg-gray-200'}`}></div>

                                        <div className="flex flex-col items-center">
                                            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${currentStep >= 2 ? 'bg-gradient-to-br from-[#0A1428] to-[#1a2f4a] text-white transform scale-110' : 'bg-gray-200 text-gray-500'}`}>
                                                <FiFileText size={22} />
                                            </div>
                                            <span className="text-xs font-medium mt-2 text-gray-600">Details</span>
                                        </div>

                                        <div className={`flex-1 h-2 mx-4 rounded-full transition-all duration-500 ${currentStep > 2 ? 'bg-gradient-to-r from-[#0A1428] to-[#1a2f4a]' : 'bg-gray-200'}`}></div>

                                        <div className="flex flex-col items-center">
                                            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${currentStep >= 3 ? 'bg-gradient-to-br from-[#0A1428] to-[#1a2f4a] text-white transform scale-110' : 'bg-gray-200 text-gray-500'}`}>
                                                <FiSend size={22} />
                                            </div>
                                            <span className="text-xs font-medium mt-2 text-gray-600">Submit</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Step Content */}
                                <div className="min-h-[300px]">
                                    {currentStep === 1 && (
                                        <div className="space-y-6">
                                            <h4 className="text-xl font-semibold text-gray-800">Select Action</h4>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <div className="w-10 h-10 bg-[#0A1428] rounded-full flex items-center justify-center text-white font-semibold">
                                                        {formData.therapistName.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <h5 className="font-semibold text-gray-900">{formData.therapistName}</h5>
                                                        <p className="text-sm text-gray-600">Selected for {formData.type}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="block text-sm font-medium text-gray-700">Reason Category</label>
                                                <select
                                                    value={formData.reasonCategory}
                                                    onChange={(e) => setFormData({ ...formData, reasonCategory: e.target.value })}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] outline-none"
                                                >
                                                    <option value="">Select a reason</option>
                                                    {(formData.type === 'resign' ? resignReasons : terminateReasons).map(reason => (
                                                        <option key={reason} value={reason}>{reason}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 2 && (
                                        <div className="space-y-6">
                                            <h4 className="text-xl font-semibold text-gray-800">Reason & Notes</h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Effective Date</label>
                                                    <input
                                                        type="date"
                                                        value={formData.effectiveDate}
                                                        onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes (Optional)</label>
                                                    <textarea
                                                        value={formData.notes}
                                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                        rows="4"
                                                        placeholder="Add any additional details or context..."
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] outline-none resize-none"
                                                    />
                                                </div>
                                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                    <div className="flex items-start space-x-3">
                                                        <FiAlertTriangle className="text-yellow-600 mt-0.5" size={20} />
                                                        <div>
                                                            <h6 className="font-medium text-yellow-800">Important Notice</h6>
                                                            <p className="text-sm text-yellow-700 mt-1">
                                                                Admin approval is required for this action. Once approved, this action is irreversible.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 3 && (
                                        <div className="space-y-6">
                                            <h4 className="text-xl font-semibold text-gray-800">Slide to Confirm</h4>
                                            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                                <div><strong>Therapist:</strong> {formData.therapistName}</div>
                                                <div><strong>Action:</strong> {formData.type === 'resign' ? 'Resignation' : 'Termination'}</div>
                                                <div><strong>Reason:</strong> {formData.reasonCategory}</div>
                                                <div><strong>Effective Date:</strong> {formData.effectiveDate}</div>
                                                {formData.notes && <div><strong>Notes:</strong> {formData.notes}</div>}
                                            </div>

                                            {/* Slide to Confirm */}
                                            <div className="relative bg-gray-200 rounded-full h-16 p-2">
                                                <div
                                                    className="absolute top-2 left-2 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200"
                                                    style={{ left: `${slidePosition}%` }}
                                                    onMouseDown={handleSlideMove}
                                                >
                                                    <FiSend className="text-white" size={20} />
                                                </div>
                                                <div className="flex items-center justify-center h-full text-gray-600 font-medium pointer-events-none">
                                                    {isSubmitting ? 'Sending Request...' : 'Slide to Send Request'}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Navigation Buttons */}
                                <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                                    <button
                                        onClick={prevStep}
                                        disabled={currentStep === 1}
                                        className={`flex items-center px-6 py-3 rounded-lg font-medium ${currentStep === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        <FiArrowLeft className="mr-2" /> Previous
                                    </button>

                                    <span className="text-gray-500">Step {currentStep} of 3</span>

                                    {currentStep < 3 ? (
                                        <button
                                            onClick={nextStep}
                                            disabled={currentStep === 1 && !formData.reasonCategory}
                                            className="flex items-center px-6 py-3 bg-[#0A1428] text-white rounded-lg font-medium hover:bg-[#1a2f4a] disabled:bg-gray-400"
                                        >
                                            Next <FiArrowRight className="ml-2" />
                                        </button>
                                    ) : (
                                        <div className="text-sm text-gray-500">Slide above to confirm</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResignTerminate;