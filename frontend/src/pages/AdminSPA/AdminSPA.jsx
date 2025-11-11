import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import io from 'socket.io-client';
import {
    FiHome,
    FiCreditCard,
    FiUsers,
    FiUserPlus,
    FiFilter,
    FiSettings,
    FiLogOut,
    FiMenu,
    FiChevronLeft,
    FiCamera,
    FiUpload,
    FiX,
    FiBell
} from 'react-icons/fi';
import assets from '../../assets/images/images';

// Import contexts
import { SpaStatusProvider, useSpaStatus } from '../../contexts/SpaStatusContext';
import { useAuth } from '../../contexts/AuthContext';

// Import validation utilities
import { validateNIC } from '../../utils/validation';

// Import components
import Dashboard from './Dashboard';
import PaymentPlans from './PaymentPlansBackup';
import SpaProfile from './SpaProfile';
import NotificationHistory from './NotificationHistory';
import ResubmitApplication from './ResubmitApplication';
import ResignTerminate from './ResignTerminate';

// AddTherapist Component with NNF Flow and Enhanced Validation
const AddTherapist = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', birthday: '', nic: '', phone: ''
    });
    const [attachments, setAttachments] = useState({
        nicFile: null, medicalFile: null, certificateFile: null, imageFile: null
    });
    const [pendingTherapists, setPendingTherapists] = useState([]);
    const [selectedForBulk, setSelectedForBulk] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [checkingNIC, setCheckingNIC] = useState(false);

    // Camera-specific state for Therapist Image
    const [showCamera, setShowCamera] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [cameraStream, setCameraStream] = useState(null);
    const [cameraLoading, setCameraLoading] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    // Validation function
    const validateStep = (step) => {
        let newErrors = {};

        if (step === 1) {
            // Step 1: Personal Information validation
            if (!formData.firstName.trim()) {
                newErrors.firstName = 'First Name is required';
            }
            if (!formData.lastName.trim()) {
                newErrors.lastName = 'Last Name is required';
            }
            if (!formData.birthday) {
                newErrors.birthday = 'Birthday is required (YYYY-MM-DD)';
            } else {
                // Check if birthday is not in future
                const birthDate = new Date(formData.birthday);
                const today = new Date();
                if (birthDate >= today) {
                    newErrors.birthday = 'Birthday cannot be in the future';
                }
                // Check if age is realistic (between 18-65)
                const age = today.getFullYear() - birthDate.getFullYear();
                if (age < 18) {
                    newErrors.birthday = 'Therapist must be at least 18 years old';
                } else if (age > 65) {
                    newErrors.birthday = 'Please verify the birth year';
                }
            }
            if (!formData.nic.trim()) {
                newErrors.nic = 'NIC Number is required';
            } else {
                const nicValidation = validateNIC(formData.nic);
                if (!nicValidation.valid) {
                    newErrors.nic = nicValidation.message;
                }
            }
            if (!formData.phone.trim()) {
                newErrors.phone = 'Phone Number is required';
            } else if (!/^\+94\d{9}$/.test(formData.phone)) {
                newErrors.phone = 'Invalid phone format (+94xxxxxxxxx)';
            }
        } else if (step === 2) {
            // Step 2: Document validation
            if (!attachments.nicFile) {
                newErrors.nicFile = 'NIC Attachment is required (PDF/JPG/PNG, max 2MB)';
            }
            if (!attachments.medicalFile) {
                newErrors.medicalFile = 'Medical Certificate is required (PDF/JPG/PNG, max 2MB)';
            }
            if (!attachments.certificateFile) {
                newErrors.certificateFile = 'Spa Center Certificate is required (PDF/JPG/PNG, max 2MB)';
            }
            if (!attachments.imageFile) {
                newErrors.imageFile = 'Profile Image is required (JPG/PNG, max 2MB)';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = async () => {
        // First validate the current step
        if (!validateStep(currentStep)) {
            return;
        }

        // If on step 1, check for NIC duplication before proceeding
        if (currentStep === 1 && formData.nic.trim()) {
            setCheckingNIC(true);
            const nicCheckPassed = await checkNICBeforeNext(formData.nic);
            setCheckingNIC(false);

            if (!nicCheckPassed) {
                return; // Don't proceed if NIC is duplicated
            }
        }

        // All validations passed, move to next step
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            setErrors({}); // Clear errors when going back
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // Check if NIC already exists in database (for onBlur - shows warning)
    const checkNICExists = async (nicValue) => {
        if (!nicValue.trim()) return;

        // Basic NIC format validation first
        const oldNICPattern = /^[0-9]{9}[VXvx]$/;
        const newNICPattern = /^[0-9]{12}$/;

        if (!oldNICPattern.test(nicValue) && !newNICPattern.test(nicValue)) {
            return; // Don't check database if format is invalid
        }

        try {
            const response = await fetch('http://localhost:3001/api/admin-spa-new/check-nic', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nic: nicValue })
            });

            const result = await response.json();

            if (result.success && result.exists) {
                // NIC already exists and status is NOT resign/resigned
                setErrors(prev => ({
                    ...prev,
                    nic: `NIC is already registered with status: ${result.status}. Cannot duplicate.`
                }));

                Swal.fire({
                    title: 'NIC Already Registered',
                    text: `This NIC is already registered in the system with status: ${result.status}. Only resigned therapists can re-register.`,
                    icon: 'error',
                    confirmButtonColor: '#d33'
                });
            } else if (result.success && !result.exists) {
                // Clear NIC error if it was previously set
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.nic;
                    return newErrors;
                });
            }
        } catch (error) {
            console.error('Error checking NIC:', error);
            // Don't show error to user, let them proceed and backend will validate
        }
    };

    // Check NIC before allowing Next button (blocking validation)
    const checkNICBeforeNext = async (nicValue) => {
        if (!nicValue.trim()) return true;

        // Basic NIC format validation first
        const oldNICPattern = /^[0-9]{9}[VXvx]$/;
        const newNICPattern = /^[0-9]{12}$/;

        if (!oldNICPattern.test(nicValue) && !newNICPattern.test(nicValue)) {
            return true; // Let the regular validation handle format errors
        }

        try {
            const response = await fetch('http://localhost:3001/api/admin-spa-new/check-nic', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nic: nicValue })
            });

            const result = await response.json();

            if (result.success && result.exists) {
                // NIC already exists and status is NOT resign/resigned
                setErrors(prev => ({
                    ...prev,
                    nic: `NIC is already registered with status: ${result.status}. Cannot duplicate.`
                }));

                Swal.fire({
                    title: 'Cannot Proceed',
                    text: `This NIC is already registered with status: ${result.status}. Please use a different NIC or contact administrator if this is an error.`,
                    icon: 'error',
                    confirmButtonColor: '#d33'
                });

                return false; // Block progression
            }

            return true; // Allow progression
        } catch (error) {
            console.error('Error checking NIC:', error);
            return true; // On error, allow progression (backend will validate)
        }
    }; const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        // File size validation (2MB limit)
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire({
                title: 'File Too Large',
                text: 'Please select a file under 2MB',
                icon: 'error',
                confirmButtonColor: '#0A1428'
            });
            return;
        }

        // File type validation
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            Swal.fire({
                title: 'Invalid File Type',
                text: 'Please select a valid file (PDF, PNG, JPG)',
                icon: 'error',
                confirmButtonColor: '#0A1428'
            });
            return;
        }

        // Clear any existing error for this field
        setErrors(prev => ({ ...prev, [type]: null }));

        if (type === 'imageFile') {
            // Special handling for image file with preview
            setAttachments({ ...attachments, [type]: file });
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target.result);
            reader.readAsDataURL(file);
        } else {
            setAttachments({ ...attachments, [type]: file });
        }
    };

    // WhatsApp-like instant camera connection
    const startCamera = async () => {
        setCameraLoading(true);
        try {
            // Minimal constraints for maximum speed
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setCameraStream(stream);
            setShowCamera(true);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Use oncanplay for immediate rendering - faster than onloadedmetadata
                videoRef.current.oncanplay = () => {
                    requestAnimationFrame(() => {
                        videoRef.current.play().catch(err => console.warn('Autoplay prevented:', err));
                        setCameraLoading(false);
                    });
                };

                // Timeout fallback for slow connections
                setTimeout(() => {
                    if (cameraLoading) {
                        setCameraLoading(false);
                        Swal.fire({
                            title: 'Camera Starting Slowly',
                            text: 'Camera is taking longer than expected. Check permissions or use upload instead.',
                            icon: 'info',
                            confirmButtonColor: '#0A1428'
                        });
                    }
                }, 2000);
            }
        } catch (err) {
            console.error('Camera init failed:', err);
            setCameraLoading(false);
            setShowCamera(false);
            Swal.fire({
                title: 'Camera Access Denied',
                text: 'Ensure HTTPS and camera permissions, or use upload from gallery.',
                icon: 'warning',
                confirmButtonColor: '#0A1428'
            });
        }
    };

    // Direct capture & auto-upload like WhatsApp
    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState === 4) {
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');

            // Simple center crop for speed
            ctx.drawImage(video, 0, 0, 400, 400);

            const imageData = canvas.toDataURL('image/jpeg', 0.9); // Higher quality for professional photos
            const blob = dataURLToBlob(imageData);

            // Direct "upload" to state - WhatsApp style
            setAttachments({ ...attachments, imageFile: blob });
            setImagePreview(imageData);

            // Clean stop and success feedback
            video.srcObject.getTracks().forEach(track => track.stop());
            setShowCamera(false);
            setCameraLoading(false);

            Swal.fire({
                title: 'Photo Captured!',
                text: 'Image ready for upload',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            Swal.fire({
                title: 'Camera Not Ready',
                text: 'Please wait a moment and try again.',
                icon: 'warning',
                confirmButtonColor: '#0A1428'
            });
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setShowCamera(false);
        setCameraLoading(false);
    };

    const removeImage = () => {
        setAttachments({ ...attachments, imageFile: null });
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Convert dataURL to Blob for file handling
    const dataURLToBlob = (dataURL) => {
        const [header, data] = dataURL.split(',');
        const mime = header.match(/:(.*?);/)[1];
        const bstr = atob(data);
        const n = bstr.length;
        const u8arr = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
            u8arr[i] = bstr.charCodeAt(i);
        }
        return new Blob([u8arr], { type: mime });
    };

    const handleSubmit = async () => {
        // Final validation before submit
        if (!validateStep(2)) {
            return;
        }

        setLoading(true);

        try {
            // Create FormData for file uploads
            const formDataToSend = new FormData();
            formDataToSend.append('firstName', formData.firstName);
            formDataToSend.append('lastName', formData.lastName);
            formDataToSend.append('birthday', formData.birthday);
            formDataToSend.append('nic', formData.nic);
            formDataToSend.append('phone', formData.phone);

            // Get spa_id from logged-in user data
            const userData = localStorage.getItem('user');
            const user = userData ? JSON.parse(userData) : null;
            const spaId = user?.spa_id || '1';
            formDataToSend.append('spa_id', spaId);
            formDataToSend.append('name', `${formData.firstName} ${formData.lastName}`);
            formDataToSend.append('email', `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}@spa.com`);
            formDataToSend.append('address', 'Spa Location'); // Default address
            formDataToSend.append('experience_years', '0');
            formDataToSend.append('specializations', JSON.stringify(['General Therapy']));

            // Append files (all are required at this point due to validation)
            formDataToSend.append('nicFile', attachments.nicFile);
            formDataToSend.append('medicalFile', attachments.medicalFile);
            formDataToSend.append('certificateFile', attachments.certificateFile);
            formDataToSend.append('profileImage', attachments.imageFile);

            // Send to the NEW backend endpoint
            const response = await fetch('/api/admin-spa-new/add-therapist', {
                method: 'POST',
                body: formDataToSend
            });

            const result = await response.json();

            if (result.success) {
                // Add to local pending list for immediate UI update
                const newTherapist = {
                    id: result.therapist_id,
                    ...formData,
                    attachments,
                    addedDate: new Date().toLocaleDateString(),
                    status: 'pending'
                };
                setPendingTherapists([...pendingTherapists, newTherapist]);

                Swal.fire({
                    title: 'Success!',
                    text: 'Therapist added successfully! Sent to AdminLSA for approval.',
                    icon: 'success',
                    confirmButtonColor: '#0A1428'
                });

                // Reset form on success
                setCurrentStep(1);
                setFormData({ firstName: '', lastName: '', birthday: '', nic: '', phone: '' });
                setAttachments({ nicFile: null, medicalFile: null, certificateFile: null, imageFile: null });
                setImagePreview(null);
                setErrors({});
                setShowCamera(false);
                setCameraLoading(false);
                if (cameraStream) {
                    cameraStream.getTracks().forEach(track => track.stop());
                    setCameraStream(null);
                }
            } else {
                throw new Error(result.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Error submitting therapist:', error);
            let errorMessage = 'Failed to submit therapist registration. Please try again.';

            if (error.message.includes('Invalid NIC')) {
                errorMessage = 'Invalid NIC format. Use Old NIC (902541234V) or New NIC (200254123456)';
            } else if (error.message.includes('Invalid phone')) {
                errorMessage = 'Invalid phone format. Please use format: +94771234567';
            } else if (error.message) {
                errorMessage = error.message;
            }

            Swal.fire({
                title: 'Error!',
                text: errorMessage,
                icon: 'error',
                confirmButtonColor: '#d33'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSend = () => {
        if (selectedForBulk.length === 0) {
            Swal.fire({
                title: 'No Selection',
                text: 'Please select therapists to send',
                icon: 'warning',
                confirmButtonColor: '#0A1428'
            });
            return;
        }

        Swal.fire({
            title: 'Confirm Bulk Send',
            text: `Send ${selectedForBulk.length} therapist requests to AdminLSA?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0A1428',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Send All!'
        }).then((result) => {
            if (result.isConfirmed) {
                // Remove selected therapists from pending list
                setPendingTherapists(pendingTherapists.filter(t => !selectedForBulk.includes(t.id)));
                setSelectedForBulk([]);

                Swal.fire({
                    title: 'Sent!',
                    text: 'All selected requests sent to AdminLSA',
                    icon: 'success',
                    confirmButtonColor: '#0A1428'
                });
            }
        });
    };

    const toggleSelection = (therapistId) => {
        setSelectedForBulk(prev =>
            prev.includes(therapistId)
                ? prev.filter(id => id !== therapistId)
                : [...prev, therapistId]
        );
    };

    // Cleanup effect for camera
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [cameraStream]);

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Therapist</h2>

                {/* Progress Bar */}
                <div className="flex items-center mb-8">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-[#0A1428] text-white' : 'bg-gray-200'}`}>
                        <FiUserPlus size={20} />
                    </div>
                    <div className={`flex-1 h-1 mx-4 ${currentStep > 1 ? 'bg-[#0A1428]' : 'bg-gray-200'}`}></div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-[#0A1428] text-white' : 'bg-gray-200'}`}>
                        <FiHome size={20} />
                    </div>
                    <div className={`flex-1 h-1 mx-4 ${currentStep > 2 ? 'bg-[#0A1428]' : 'bg-gray-200'}`}></div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-[#0A1428] text-white' : 'bg-gray-200'}`}>
                        <FiUsers size={20} />
                    </div>
                </div>

                <div className="min-h-[400px]">
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-semibold text-gray-800">Personal Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <input
                                        type="text"
                                        name="firstName"
                                        placeholder="First Name"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#0A1428] outline-none ${errors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.firstName && <span className="text-red-500 text-sm mt-1 block">{errors.firstName}</span>}
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        name="lastName"
                                        placeholder="Last Name"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#0A1428] outline-none ${errors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.lastName && <span className="text-red-500 text-sm mt-1 block">{errors.lastName}</span>}
                                </div>
                                <div>
                                    <input
                                        type="date"
                                        name="birthday"
                                        placeholder="Birthday"
                                        value={formData.birthday}
                                        onChange={handleInputChange}
                                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#0A1428] outline-none ${errors.birthday ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.birthday && <span className="text-red-500 text-sm mt-1 block">{errors.birthday}</span>}
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        name="nic"
                                        placeholder="NIC Number (902541234V or 200254123456)"
                                        value={formData.nic}
                                        onChange={handleInputChange}
                                        onBlur={(e) => checkNICExists(e.target.value)}
                                        maxLength="12"
                                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#0A1428] outline-none ${errors.nic ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.nic && <span className="text-red-500 text-sm mt-1 block">{errors.nic}</span>}
                                </div>
                                <div className="md:col-span-1">
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="Phone Number (+94771234567)"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#0A1428] outline-none ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.phone && <span className="text-red-500 text-sm mt-1 block">{errors.phone}</span>}
                                </div>
                            </div>
                        </div>
                    )}
                    {currentStep === 2 && (
                        <div className="space-y-8">
                            <h3 className="text-xl font-semibold text-gray-800">Document Attachments</h3>

                            {/* RELOCATED: Enhanced Therapist Image Module - Now at Top */}
                            <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border-2 border-gray-100 shadow-sm">
                                <div className="text-center">
                                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Therapist Profile Image</h4>
                                    <p className="text-sm text-gray-600 mb-6">Capture or upload your professional profile photo</p>

                                    {/* Square Preview Frame for Better Video Display */}
                                    <div className="relative mx-auto mb-6">
                                        <div className="w-64 h-64 rounded-2xl border-4 border-gray-200 overflow-hidden bg-black hover:border-[#D4AF37] transition-all duration-300 shadow-xl hover:shadow-2xl">
                                            {imagePreview ? (
                                                <img
                                                    src={imagePreview}
                                                    alt="Profile Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : showCamera || cameraLoading ? (
                                                <div className="relative w-full h-full">
                                                    {cameraLoading ? (
                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-white">
                                                            <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#D4AF37] border-t-transparent mb-3"></div>
                                                            <p className="text-sm">Starting camera...</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <video
                                                                ref={videoRef}
                                                                className="w-full h-full object-cover"
                                                                playsInline
                                                                muted
                                                                autoPlay
                                                                aria-label="Live camera preview - position your face to capture"
                                                            />
                                                            {/* Pink face guide overlay like WhatsApp */}
                                                            <div className="absolute inset-6 border-2 border-pink-400 rounded-lg opacity-70 pointer-events-none"></div>
                                                            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">📹 Live Camera</div>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                                    <FiCamera size={64} className="text-gray-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Remove Image Button */}
                                        {imagePreview && !showCamera && (
                                            <button
                                                onClick={removeImage}
                                                className="absolute -top-2 -right-2 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                                                aria-label="Remove image"
                                            >
                                                <FiX size={18} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Camera/Upload Controls */}
                                    {!showCamera ? (
                                        <div className="flex justify-center space-x-4 mb-4">
                                            {/* File Upload Button */}
                                            <label className="cursor-pointer bg-[#0A1428] text-white px-6 py-3 rounded-xl flex items-center space-x-3 hover:bg-[#1a2f4a] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                                                <FiUpload size={18} />
                                                <span className="font-medium">Upload from Gallery</span>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/jpg"
                                                    onChange={(e) => handleFileChange(e, 'imageFile')}
                                                    className="hidden"
                                                />
                                            </label>

                                            {/* Camera Button */}
                                            <button
                                                onClick={startCamera}
                                                disabled={cameraLoading}
                                                className="bg-[#D4AF37] text-white px-6 py-3 rounded-xl flex items-center space-x-3 hover:bg-[#B8941F] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                            >
                                                <FiCamera size={18} />
                                                <span className="font-medium">
                                                    {cameraLoading ? 'Starting...' : 'Open Camera'}
                                                </span>
                                            </button>
                                        </div>
                                    ) : (
                                        /* Camera Controls - WhatsApp Style */
                                        <div className="flex flex-col items-center space-y-4">
                                            {/* Pink Capture Button like WhatsApp */}
                                            <button
                                                onClick={capturePhoto}
                                                disabled={cameraLoading}
                                                className="w-16 h-16 bg-pink-500 text-white rounded-full flex items-center justify-center hover:bg-pink-600 transition-all duration-200 shadow-2xl hover:shadow-pink-500/25 transform hover:scale-110 relative disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                                aria-label="Capture photo from live preview"
                                            >
                                                <span className="text-2xl">📸</span>
                                            </button>

                                            {/* Cancel Button */}
                                            <button
                                                onClick={stopCamera}
                                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                                            >
                                                Cancel
                                            </button>

                                            <div className="text-center">
                                                <p className="text-sm text-gray-700 font-medium">Position your face and tap to capture</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* File Info */}
                                    {attachments.imageFile && !showCamera && (
                                        <div className="text-center bg-green-50 rounded-lg p-3 border border-green-200">
                                            <p className="text-sm text-green-700 font-semibold">✓ Profile Image Ready</p>
                                            <p className="text-xs text-green-600">{attachments.imageFile.name}</p>
                                        </div>
                                    )}

                                    {/* Instructions */}
                                    <div className="text-center mt-4">
                                        <p className="text-xs text-gray-500">
                                            Upload from gallery or capture with live camera • PNG, JPG only • Max 5MB
                                        </p>
                                    </div>

                                    {/* Hidden canvas for photo capture */}
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>
                            </div>

                            {/* Other Document Attachments - Below Image Module */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">NIC Attachment (PDF, PNG, JPG) *</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        onChange={(e) => handleFileChange(e, 'nicFile')}
                                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#0A1428] outline-none ${errors.nicFile ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.nicFile && <p className="text-sm text-red-500">✗ {errors.nicFile}</p>}
                                    {attachments.nicFile && !errors.nicFile && <p className="text-sm text-green-600">✓ {attachments.nicFile.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Medical Certificate (PDF, PNG, JPG) *</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        onChange={(e) => handleFileChange(e, 'medicalFile')}
                                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#0A1428] outline-none ${errors.medicalFile ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.medicalFile && <p className="text-sm text-red-500">✗ {errors.medicalFile}</p>}
                                    {attachments.medicalFile && !errors.medicalFile && <p className="text-sm text-green-600">✓ {attachments.medicalFile.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Spa Center Certificate (PDF, PNG, JPG) *</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        onChange={(e) => handleFileChange(e, 'certificateFile')}
                                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#0A1428] outline-none ${errors.certificateFile ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.certificateFile && <p className="text-sm text-red-500">✗ {errors.certificateFile}</p>}
                                    {attachments.certificateFile && !errors.certificateFile && <p className="text-sm text-green-600">✓ {attachments.certificateFile.name}</p>}
                                </div>
                            </div>

                            {/* Profile Image Error */}
                            {errors.imageFile && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                                    <p className="text-sm text-red-600">✗ {errors.imageFile}</p>
                                </div>
                            )}
                        </div>
                    )}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-semibold text-gray-800">Review & Finish</h3>
                            <div className="bg-gray-50 rounded-lg p-6">
                                <div className="flex items-start space-x-6">
                                    {/* Profile Image Preview */}
                                    {imagePreview && (
                                        <div className="flex-shrink-0">
                                            <div className="w-24 h-24 rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-lg">
                                                <img
                                                    src={imagePreview}
                                                    alt="Therapist Profile"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <p className="text-xs text-center text-gray-500 mt-2">Profile Image</p>
                                        </div>
                                    )}

                                    {/* Information */}
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-800 mb-4">Review Information</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><span className="font-medium">Name:</span> {formData.firstName} {formData.lastName}</div>
                                            <div><span className="font-medium">Birthday:</span> {formData.birthday}</div>
                                            <div><span className="font-medium">NIC:</span> {formData.nic}</div>
                                            <div><span className="font-medium">Phone:</span> {formData.phone}</div>
                                        </div>
                                        <div className="mt-4">
                                            <h5 className="font-medium text-gray-700 mb-2">Attachments:</h5>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className={attachments.nicFile ? 'text-green-600' : 'text-red-500'}>
                                                    NIC: {attachments.nicFile ? '✓ Uploaded' : '✗ Not uploaded'}
                                                </div>
                                                <div className={attachments.medicalFile ? 'text-green-600' : 'text-red-500'}>
                                                    Medical: {attachments.medicalFile ? '✓ Uploaded' : '✗ Not uploaded'}
                                                </div>
                                                <div className={attachments.certificateFile ? 'text-green-600' : 'text-red-500'}>
                                                    Certificate: {attachments.certificateFile ? '✓ Uploaded' : '✗ Not uploaded'}
                                                </div>
                                                <div className={attachments.imageFile ? 'text-green-600' : 'text-red-500'}>
                                                    Image: {attachments.imageFile ? '✓ Uploaded' : '✗ Not uploaded'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                    <button onClick={prevStep} disabled={currentStep === 1 || checkingNIC} className={`flex items-center px-6 py-3 rounded-lg font-medium ${currentStep === 1 || checkingNIC ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <FiChevronLeft className="mr-2" /> Previous
                    </button>
                    <span className="text-gray-500">Step {currentStep} of 3</span>
                    {currentStep < 3 ? (
                        <button
                            onClick={nextStep}
                            disabled={checkingNIC}
                            className={`flex items-center px-6 py-3 rounded-lg font-medium ${checkingNIC
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : 'bg-[#0A1428] text-white hover:bg-[#1a2f4a]'
                                }`}
                        >
                            {checkingNIC ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Validating NIC...
                                </>
                            ) : (
                                <>
                                    Next <FiChevronLeft className="ml-2 rotate-180" />
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`flex items-center px-8 py-3 rounded-lg font-medium ${loading
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                'Add to Pending List'
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Pending Therapists Table */}
            {pendingTherapists.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-semibold text-gray-800">Pending Therapist Requests</h3>
                        <button
                            onClick={handleBulkSend}
                            disabled={selectedForBulk.length === 0}
                            className="bg-[#0A1428] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#1a2f4a] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Send Selected to AdminLSA ({selectedForBulk.length})
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4">
                                        <input
                                            type="checkbox"
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedForBulk(pendingTherapists.map(t => t.id));
                                                } else {
                                                    setSelectedForBulk([]);
                                                }
                                            }}
                                            checked={selectedForBulk.length === pendingTherapists.length && pendingTherapists.length > 0}
                                        />
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-800">Name</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-800">NIC</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-800">Phone</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-800">Added Date</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-800">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingTherapists.map((therapist) => (
                                    <tr key={therapist.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedForBulk.includes(therapist.id)}
                                                onChange={() => toggleSelection(therapist.id)}
                                            />
                                        </td>
                                        <td className="py-3 px-4 font-medium">{therapist.firstName} {therapist.lastName}</td>
                                        <td className="py-3 px-4">{therapist.nic}</td>
                                        <td className="py-3 px-4">{therapist.phone}</td>
                                        <td className="py-3 px-4">{therapist.addedDate}</td>
                                        <td className="py-3 px-4">
                                            <button className="text-[#0A1428] hover:text-[#1a2f4a] font-medium">
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// Status helper functions
const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'approved':
            return 'bg-green-100 text-green-800';
        case 'pending':
            return 'bg-yellow-100 text-yellow-800';
        case 'rejected':
            return 'bg-red-100 text-red-800';
        case 'resigned':
            return 'bg-gray-100 text-gray-800';
        case 'terminated':
            return 'bg-purple-100 text-purple-800';
        case 'suspend':
        case 'suspended':
            return 'bg-orange-100 text-orange-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const getDisplayStatus = (status) => {
    switch (status?.toLowerCase()) {
        case 'suspend':
            return 'Suspended';
        default:
            return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    }
};

// ViewTherapists Component - Dynamic Database Integration
const ViewTherapists = () => {
    const [activeTab, setActiveTab] = useState('approved');
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedTherapist, setSelectedTherapist] = useState(null);
    const [therapists, setTherapists] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Resubmit modal states
    const [showResubmitModal, setShowResubmitModal] = useState(false);
    const [resubmitTherapist, setResubmitTherapist] = useState(null);
    const [resubmitFormData, setResubmitFormData] = useState({
        fname: '', lname: '', birthday: '', nic: '', telno: '', email: '', specialty: ''
    });
    const [resubmitFiles, setResubmitFiles] = useState({
        nic_attachment: null, medical_certificate: null, spa_certificate: null, therapist_image: null
    });
    const [resubmitLoading, setResubmitLoading] = useState(false);

    // Get spa_id from logged-in user data  
    const [spaId, setSpaId] = useState(null);

    // Initialize spa_id when component mounts
    useEffect(() => {
        const userData = localStorage.getItem('user');
        console.log('📱 Raw user data from localStorage:', userData);

        if (userData) {
            try {
                const user = JSON.parse(userData);
                console.log('🎯 Parsed user object:', user);
                console.log('🎯 Setting spa_id for user:', user.username, 'spa_id:', user.spa_id);
                setSpaId(user.spa_id ? String(user.spa_id) : null);
            } catch (error) {
                console.error('Error parsing user data:', error);
                setSpaId(null);
            }
        } else {
            console.error('❌ No user data found in localStorage');
        }
    }, []);

    // Fetch therapists from database
    const fetchTherapists = async (status = 'all') => {
        const token = localStorage.getItem('token');

        // Enhanced token debugging
        console.log('🔍 Token debugging:', {
            tokenExists: !!token,
            tokenValue: token,
            tokenType: typeof token,
            tokenLength: token?.length,
            isNull: token === null,
            isUndefined: token === undefined,
            isEmpty: token === '',
            isStringNull: token === 'null'
        });

        if (!token || token === 'null' || token === 'undefined') {
            console.error('🔑 Invalid token for therapists request:', token);
            console.log('❌ No valid token found, redirecting to login');
            setError('Authentication required. Please log in again.');
            setTherapists([]);
            // Redirect to login
            window.location.href = '/login';
            return;
        }

        if (!spaId) {
            console.error('🏢 No spa_id available for therapists request');
            setError('Spa information not available. Please refresh the page.');
            setTherapists([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            console.log(`🔍 Fetching therapists for SPA ${spaId} with status: ${status}`);
            console.log(`🔑 Frontend token check:`, {
                tokenExists: !!token,
                tokenLength: token?.length,
                tokenStart: token?.substring(0, 15) + '...'
            });

            const response = await fetch(`/api/admin-spa-new/spas/${spaId}/therapists?status=${status}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`📡 Response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                setTherapists(data.therapists || []);
                console.log(`📋 Loaded ${data.therapists?.length || 0} therapists for SPA ${spaId}`);
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

    // Load therapists when component mounts or tab changes (with debounce)
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && token !== 'null' && token !== 'undefined' && spaId) {
            console.log(`🔄 Loading therapists for tab: ${activeTab}, spa: ${spaId}`);

            // Add small delay to prevent race conditions
            const timeoutId = setTimeout(() => {
                fetchTherapists(activeTab === 'all' ? 'all' : activeTab);
            }, 100);

            return () => clearTimeout(timeoutId);
        } else {
            console.log(`⚠️ Skipping therapist load - token: ${!!token}, spaId: ${spaId}`);
            // If there's no valid token, redirect to login
            if (!token || token === 'null' || token === 'undefined') {
                console.log('❌ No valid token in useEffect, redirecting to login');
                window.location.href = '/login';
            }
        }
    }, [activeTab, spaId]);

    // Map database status to display status
    const getDisplayStatus = (dbStatus) => {
        const statusMap = {
            'approved': 'Active',
            'pending': 'Pending Review',
            'rejected': 'Rejected',
            'resigned': 'Resigned',
            'terminated': 'Terminated',
            'suspend': 'Suspended'
        };
        return statusMap[dbStatus] || dbStatus;
    };

    // Format therapist data for display
    const formatTherapist = (therapist) => ({
        id: therapist.id,
        name: therapist.first_name && therapist.last_name
            ? `${therapist.first_name} ${therapist.last_name}`
            : therapist.name || 'Unknown',
        email: therapist.email,
        nic: therapist.nic_number || therapist.nic,
        phone: therapist.phone,
        specialization: Array.isArray(therapist.specializations)
            ? therapist.specializations.join(', ')
            : (therapist.specializations ? JSON.parse(therapist.specializations || '[]').join(', ') : 'General Therapy'),
        status: getDisplayStatus(therapist.status),
        dbStatus: therapist.status,
        experience: `${therapist.experience_years || 0} years`,
        photo: therapist.therapist_image || '/api/placeholder/150/150',
        rejectionReason: therapist.reject_reason,
        dateOfBirth: therapist.date_of_birth,
        address: therapist.address,
        createdAt: therapist.created_at,
        updatedAt: therapist.updated_at
    });

    // Filter therapists based on search term and active tab
    const filteredTherapists = therapists
        .map(formatTherapist)
        .filter(therapist => {
            const matchesSearch =
                therapist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                therapist.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                therapist.nic.includes(searchTerm) ||
                therapist.specialization.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesTab = therapist.dbStatus === activeTab;

            return matchesSearch && matchesTab;
        });

    // Get therapist counts for each tab
    const getTherapistCounts = () => {
        const counts = {
            approved: therapists.filter(t => t.status === 'approved').length,
            pending: therapists.filter(t => t.status === 'pending').length,
            rejected: therapists.filter(t => t.status === 'rejected').length,
            resigned: therapists.filter(t => t.status === 'resigned').length,
            terminated: therapists.filter(t => t.status === 'terminated').length,
            suspended: therapists.filter(t => t.status === 'suspend').length
        };
        counts.all = Object.values(counts).reduce((sum, count) => sum + count, 0);
        return counts;
    };

    const counts = getTherapistCounts();

    const viewDetails = (therapist) => {
        setSelectedTherapist(therapist);
        setShowModal(true);
    };

    const handleResubmit = (therapist) => {
        // Get the original therapist data from the database
        const originalTherapist = therapists.find(t => t.id === therapist.id);

        // Pre-fill the form with existing data
        setResubmitFormData({
            fname: originalTherapist?.fname || originalTherapist?.first_name || '',
            lname: originalTherapist?.lname || originalTherapist?.last_name || '',
            birthday: originalTherapist?.birthday || originalTherapist?.date_of_birth || '',
            nic: originalTherapist?.nic || originalTherapist?.nic_number || '',
            telno: originalTherapist?.telno || originalTherapist?.phone || '',
            email: originalTherapist?.email || '',
            specialty: originalTherapist?.specialty || originalTherapist?.specialization || ''
        });

        // Clear files (user needs to re-upload)
        setResubmitFiles({
            nic_attachment: null, medical_certificate: null, spa_certificate: null, therapist_image: null
        });

        setResubmitTherapist(therapist);
        setShowResubmitModal(true);
    };

    const handleResubmitInputChange = (e) => {
        const { name, value } = e.target;
        setResubmitFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleResubmitFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        // File size validation (2MB limit)
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire({
                title: 'File Too Large',
                text: 'Please select a file under 2MB',
                icon: 'error',
                confirmButtonColor: '#0A1428'
            });
            return;
        }

        setResubmitFiles(prev => ({ ...prev, [type]: file }));
    };

    const submitResubmission = async () => {
        setResubmitLoading(true);
        try {
            const formData = new FormData();

            // Add form fields
            Object.keys(resubmitFormData).forEach(key => {
                formData.append(key, resubmitFormData[key]);
            });

            // Add spa_id
            formData.append('spa_id', spaId);

            // Add files
            Object.keys(resubmitFiles).forEach(key => {
                if (resubmitFiles[key]) {
                    formData.append(key, resubmitFiles[key]);
                }
            });

            const token = localStorage.getItem('token');
            const response = await fetch(`/api/therapists/${resubmitTherapist.id}/resubmit`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Therapist application resubmitted successfully!',
                    icon: 'success',
                    confirmButtonColor: '#0A1428'
                });

                // Close modal and refresh therapists
                setShowResubmitModal(false);
                setResubmitTherapist(null);
                fetchTherapists(activeTab);
            } else {
                throw new Error(result.message || 'Resubmission failed');
            }

        } catch (error) {
            console.error('Resubmission error:', error);
            Swal.fire({
                title: 'Error',
                text: error.message || 'Failed to resubmit application',
                icon: 'error',
                confirmButtonColor: '#0A1428'
            });
        } finally {
            setResubmitLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">View Therapists</h2>
                        <p className="text-gray-600 mt-1">Manage your spa therapist team</p>
                    </div>
                    <div className="text-sm text-gray-500">{filteredTherapists.length} therapist(s) found</div>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Search therapists by name, email, or NIC..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] focus:border-transparent outline-none"
                    />
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                    {[
                        { key: 'approved', label: 'Approved' },
                        { key: 'pending', label: 'Pending' },
                        { key: 'rejected', label: 'Rejected' },
                        { key: 'resigned', label: 'Resigned' },
                        { key: 'terminated', label: 'Terminated' },
                        { key: 'suspended', label: 'Suspended' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-6 py-3 font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === tab.key
                                ? 'border-b-2 border-[#D4AF37] text-[#D4AF37]'
                                : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            {tab.label} ({counts[tab.key] || 0})
                        </button>
                    ))}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0A1428] border-t-transparent"></div>
                        <span className="ml-2 text-gray-600">Loading therapists...</span>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center">
                            <FiX className="text-red-500 mr-2" size={20} />
                            <p className="text-red-700">{error}</p>
                            <button
                                onClick={() => fetchTherapists(activeTab)}
                                className="ml-auto text-red-600 hover:text-red-800 font-medium"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Therapists Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTherapists.map((therapist) => (
                        <div key={therapist.id} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow duration-200">
                            <div className="flex items-center space-x-3 mb-4">
                                <img
                                    src={`http://localhost:3001/api/lsa/therapists/${therapist.id}/document/therapist_image?action=view`}
                                    alt={therapist.name}
                                    className="w-16 h-16 rounded-full object-cover bg-gray-200 border-2 border-[#0A1428]"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                                <div className="w-16 h-16 bg-[#0A1428] rounded-full hidden items-center justify-center text-white font-semibold">
                                    {therapist.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{therapist.name}</h3>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${therapist.status === 'Active' ? 'bg-green-100 text-green-800' :
                                        therapist.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {therapist.status}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div><span className="font-medium">Email:</span> {therapist.email}</div>
                                <div><span className="font-medium">NIC:</span> {therapist.nic}</div>
                                <div><span className="font-medium">Specialty:</span> {therapist.specialization}</div>
                                {activeTab === 'Rejected' && therapist.rejectionReason && (
                                    <div className="text-red-600"><span className="font-medium">Reason:</span> {therapist.rejectionReason}</div>
                                )}
                            </div>
                            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => viewDetails(therapist)}
                                    className="text-[#0A1428] hover:text-[#1a2f4a] font-medium"
                                >
                                    View Details
                                </button>
                                {therapist.dbStatus === 'rejected' && (
                                    <button
                                        onClick={() => handleResubmit(therapist)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                                    >
                                        Resubmit
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredTherapists.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No therapists found matching your search.</p>
                    </div>
                )}
            </div>

            {/* Therapist Details Modal */}
            {showModal && selectedTherapist && (
                <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-800">Therapist Profile</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="flex items-center space-x-6 mb-6">
                            <img
                                src={`http://localhost:3001/api/lsa/therapists/${selectedTherapist.id}/document/therapist_image?action=view`}
                                alt={selectedTherapist.name}
                                className="w-24 h-24 rounded-full object-cover bg-gray-200 border-2 border-[#0A1428]"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                            <div className="w-24 h-24 bg-[#0A1428] rounded-full hidden items-center justify-center text-white font-bold text-2xl">
                                {selectedTherapist.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-gray-800">{selectedTherapist.name}</h4>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedTherapist.status === 'Active' ? 'bg-green-100 text-green-800' :
                                    selectedTherapist.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                    {selectedTherapist.status}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600 block">Email</label>
                                    <p className="text-gray-800">{selectedTherapist.email}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 block">Phone</label>
                                    <p className="text-gray-800">{selectedTherapist.phone}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 block">NIC</label>
                                    <p className="text-gray-800">{selectedTherapist.nic}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600 block">Specialization</label>
                                    <p className="text-gray-800">{selectedTherapist.specialization}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 block">Experience</label>
                                    <p className="text-gray-800">{selectedTherapist.experience}</p>
                                </div>
                                {selectedTherapist.rejectionReason && (
                                    <div>
                                        <label className="text-sm font-medium text-red-600 block">Rejection Reason</label>
                                        <p className="text-red-800 bg-red-50 p-2 rounded">{selectedTherapist.rejectionReason}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Resubmit Therapist Modal */}
            {showResubmitModal && resubmitTherapist && (
                <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800">Resubmit Therapist Application</h3>
                                <p className="text-gray-600 mt-2">Update the information and resubmit for review</p>
                            </div>
                            <button
                                onClick={() => setShowResubmitModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* Show rejection reason */}
                        {resubmitTherapist.rejectionReason && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                <h4 className="text-red-800 font-semibold mb-2">Previous Rejection Reason:</h4>
                                <p className="text-red-700">{resubmitTherapist.rejectionReason}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Information */}
                            <div className="space-y-4">
                                <h4 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h4>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                                    <input
                                        type="text"
                                        name="fname"
                                        value={resubmitFormData.fname}
                                        onChange={handleResubmitInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                                    <input
                                        type="text"
                                        name="lname"
                                        value={resubmitFormData.lname}
                                        onChange={handleResubmitInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Birthday *</label>
                                    <input
                                        type="date"
                                        name="birthday"
                                        value={resubmitFormData.birthday}
                                        onChange={handleResubmitInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">NIC Number *</label>
                                    <input
                                        type="text"
                                        name="nic"
                                        value={resubmitFormData.nic}
                                        onChange={handleResubmitInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                    <input
                                        type="text"
                                        name="telno"
                                        value={resubmitFormData.telno}
                                        onChange={handleResubmitInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] focus:border-transparent"
                                        placeholder="+94xxxxxxxxx"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={resubmitFormData.email}
                                        onChange={handleResubmitInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialty *</label>
                                    <input
                                        type="text"
                                        name="specialty"
                                        value={resubmitFormData.specialty}
                                        onChange={handleResubmitInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Document Uploads */}
                            <div className="space-y-4">
                                <h4 className="text-lg font-semibold text-gray-800 mb-4">Documents</h4>
                                <p className="text-sm text-gray-600 mb-4">Please re-upload all required documents</p>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">NIC Attachment *</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleResubmitFileChange(e, 'nic_attachment')}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] focus:border-transparent"
                                    />
                                    {resubmitFiles.nic_attachment && (
                                        <p className="text-sm text-green-600 mt-1">✓ {resubmitFiles.nic_attachment.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical Certificate *</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleResubmitFileChange(e, 'medical_certificate')}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] focus:border-transparent"
                                    />
                                    {resubmitFiles.medical_certificate && (
                                        <p className="text-sm text-green-600 mt-1">✓ {resubmitFiles.medical_certificate.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Spa Certificate *</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleResubmitFileChange(e, 'spa_certificate')}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] focus:border-transparent"
                                    />
                                    {resubmitFiles.spa_certificate && (
                                        <p className="text-sm text-green-600 mt-1">✓ {resubmitFiles.spa_certificate.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Therapist Image *</label>
                                    <input
                                        type="file"
                                        accept=".jpg,.jpeg,.png"
                                        onChange={(e) => handleResubmitFileChange(e, 'therapist_image')}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1428] focus:border-transparent"
                                    />
                                    {resubmitFiles.therapist_image && (
                                        <p className="text-sm text-green-600 mt-1">✓ {resubmitFiles.therapist_image.name}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                            <button
                                onClick={() => setShowResubmitModal(false)}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                disabled={resubmitLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitResubmission}
                                disabled={resubmitLoading}
                                className="px-6 py-2 bg-[#0A1428] text-white rounded-lg hover:bg-[#1a2f4a] disabled:opacity-50"
                            >
                                {resubmitLoading ? 'Resubmitting...' : 'Resubmit Application'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Main AdminSPA Component with Status Management
const AdminSPAContent = () => {
    const navigate = useNavigate();
    const { logout: authLogout } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    // Socket.io connection
    const [socket, setSocket] = useState(null);

    // Initialize Socket.io connection
    useEffect(() => {
        const spaId = localStorage.getItem('spaId') || '1'; // Get from localStorage or default
        const newSocket = io('http://localhost:3001');

        newSocket.emit('join_spa', spaId);

        newSocket.on('connect', () => {
            console.log('Connected to server');
        });

        newSocket.on('therapist_status_update', (data) => {
            console.log('Received therapist status update:', data);

            // Add notification to state
            const newNotification = {
                id: Date.now(),
                type: data.status,
                message: data.message,
                timestamp: new Date().toISOString(),
                read: false
            };

            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Show SweetAlert notification
            Swal.fire({
                icon: data.status === 'approved' ? 'success' : 'info',
                title: data.status === 'approved' ? 'Therapist Approved!' : 'Therapist Status Update',
                text: data.message,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 5000,
                timerProgressBar: true
            });
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Mark notifications as read
    const markAsRead = (notificationId) => {
        setNotifications(prev =>
            prev.map(notification =>
                notification.id === notificationId
                    ? { ...notification, read: true }
                    : notification
            )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    // Clear all notifications
    const clearAllNotifications = () => {
        setNotifications([]);
        setUnreadCount(0);
    };

    // Close notifications when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showNotifications && !event.target.closest('.notification-container')) {
                setShowNotifications(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNotifications]);

    // Get status-based navigation from context
    const { spaStatus, isTabAllowed, getNavigationItems } = useSpaStatus();

    // Set initial tab based on allowed tabs
    useEffect(() => {
        if (!spaStatus.loading && spaStatus.allowedTabs.length > 0) {
            // If current activeTab is not allowed, switch to first allowed tab
            if (!isTabAllowed(activeTab)) {
                setActiveTab(spaStatus.allowedTabs[0]);
            }
        }
    }, [spaStatus.loading, spaStatus.allowedTabs, activeTab, isTabAllowed]);

    // Use status-based navigation items
    const navItems = getNavigationItems();

    // Map icon strings to actual icon components
    const getIconComponent = (iconName) => {
        const iconMap = {
            'FiHome': <FiHome size={20} />,
            'FiCreditCard': <FiCreditCard size={20} />,
            'FiBell': <FiBell size={20} />,
            'FiUserPlus': <FiUserPlus size={20} />,
            'FiUsers': <FiUsers size={20} />,
            'FiFilter': <FiFilter size={20} />,
            'FiX': <FiX size={20} />,
            'FiSettings': <FiSettings size={20} />
        };
        return iconMap[iconName] || <FiSettings size={20} />;
    };

    const renderContent = () => {
        // Check if the current tab is allowed
        if (!isTabAllowed(activeTab)) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center p-8">
                        <div className="text-6xl mb-4">🚫</div>
                        <h2 className="text-2xl font-bold text-gray-700 mb-2">Access Restricted</h2>
                        <p className="text-gray-500 mb-4">
                            You don't have permission to access this section.
                        </p>
                        <p className="text-sm text-gray-400">
                            Status: {spaStatus.status} | {spaStatus.statusMessage}
                        </p>
                    </div>
                </div>
            );
        }

        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'payment-plans':
                return <PaymentPlans />;
            case 'notification-history':
                return <NotificationHistory />;
            case 'add-therapist':
                return <AddTherapist />;
            case 'view-therapists':
                return <ViewTherapists />;
            case 'resign-terminate':
                return <ResignTerminate />;
            case 'resubmit-application':
                return <ResubmitApplication />;
            case 'spa-profile':
                return <SpaProfile />;
            default:
                // Redirect to first allowed tab
                const firstAllowedTab = spaStatus.allowedTabs[0];
                if (firstAllowedTab && firstAllowedTab !== activeTab) {
                    setActiveTab(firstAllowedTab);
                }
                return <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1428] mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading...</p>
                    </div>
                </div>;
        }
    };

    const handleLogout = () => {
        Swal.fire({
            title: 'Confirm Logout',
            text: 'Are you sure you want to logout from AdminSPA Dashboard?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0A1428',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, Logout',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                // Disconnect socket if connected
                if (socket) {
                    socket.disconnect();
                }

                // Use AuthContext logout
                authLogout();
            }
        });
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const toggleMobileSidebar = () => {
        setIsMobileSidebarOpen(!isMobileSidebarOpen);
    };

    const handleNavClick = (item) => {
        // Check if tab is allowed before navigating
        if (isTabAllowed(item.id)) {
            setActiveTab(item.id);
            setIsMobileSidebarOpen(false);
        } else {
            Swal.fire({
                title: 'Access Restricted',
                text: 'You don\'t have permission to access this section.',
                icon: 'warning',
                confirmButtonColor: '#0A1428'
            });
        }
    };

    // Show loading state while spa status is being fetched
    if (spaStatus.loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0A1428] mx-auto"></div>
                    <p className="mt-4 text-gray-600 text-lg">Loading your dashboard...</p>
                    <p className="text-sm text-gray-500 mt-2">Checking spa status and permissions</p>
                </div>
            </div>
        );
    }

    // Show error state if there's an error fetching spa status
    if (spaStatus.error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-700 mb-2">Error Loading Dashboard</h2>
                    <p className="text-gray-500 mb-4">{spaStatus.error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-[#0A1428] text-white px-6 py-2 rounded-lg hover:bg-[#001F3F] transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Mobile sidebar backdrop */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsMobileSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <div className={`
        fixed lg:relative z-50 bg-[#0A1428] text-white transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-64' : 'w-20'}
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        h-full flex flex-col
      `}>
                {/* Logo Section */}
                <div className="p-4 border-b border-gray-700 flex items-center justify-between h-20">
                    <div className="flex items-center">
                        <img
                            src={assets.logo_trans}
                            alt="LSA Admin"
                            className={`transition-all duration-300 ${isSidebarOpen ? 'h-14' : 'h-10'}`}
                            onError={(e) => {
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiIGZpbGw9IiMwQTE0MjgiLz48dGV4dCB4PSIxMCIgeT0iMjUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI0Q0QUYzNyI+TEFOS0EgU1BBIEFTU09DLjwvdGV4dD48L3N2Zz4=';
                            }}
                        />
                    </div>

                    {isSidebarOpen && (
                        <button
                            onClick={toggleSidebar}
                            className="lg:flex items-center justify-center w-8 h-8 rounded-lg bg-gold-500/20 text-gold-500 hover:bg-gold-500 hover:text-[#0A1428] transition-all duration-300"
                            title="Collapse sidebar"
                        >
                            <FiChevronLeft size={18} />
                        </button>
                    )}
                </div>

                {/* Show toggle button when sidebar is minimized */}
                {!isSidebarOpen && (
                    <div className="p-3 border-b border-gray-700 flex justify-center">
                        <button
                            onClick={toggleSidebar}
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold-500/20 text-gold-500 hover:bg-gold-500 hover:text-[#0A1428] transition-all duration-300"
                            title="Expand sidebar"
                        >
                            <FiChevronLeft size={18} className="transform rotate-180" />
                        </button>
                    </div>
                )}                {/* Navigation Items */}
                <nav className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1 px-2">
                        {navItems.map((item) => (
                            <li key={item.id}>
                                <button
                                    onClick={() => handleNavClick(item)}
                                    className={`w-full flex items-center px-3 py-3 rounded-lg transition-all duration-300 group
                    ${activeTab === item.id
                                            ? 'bg-gold-500 text-[#0A1428] shadow-lg'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                        }
                  `}
                                    title={!isSidebarOpen ? item.label : ''}
                                >
                                    <span className="flex-shrink-0">{getIconComponent(item.icon)}</span>
                                    <span className={`ml-3 transition-all duration-300 ${!isSidebarOpen ? 'opacity-0 absolute' : 'opacity-100'}`}>
                                        {item.label}
                                    </span>

                                    {/* Tooltip for minimized state */}
                                    {!isSidebarOpen && (
                                        <span className="absolute left-14 ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-50">
                                            {item.label}
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Logout Button */}
                <div className="p-3 border-t border-gray-700">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-3 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-300 group"
                        title={!isSidebarOpen ? "Logout" : ""}
                    >
                        <FiLogOut size={20} />
                        <span className={`ml-3 transition-all duration-300 ${!isSidebarOpen ? 'opacity-0 absolute' : 'opacity-100'}`}>
                            Logout
                        </span>

                        {!isSidebarOpen && (
                            <span className="absolute left-14 ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-50">
                                Logout
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="bg-white shadow-sm z-10">
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center">
                            <button
                                onClick={toggleMobileSidebar}
                                className="lg:hidden text-gray-600 p-2 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                <FiMenu size={24} />
                            </button>
                            <h1 className="ml-4 text-xl font-semibold text-gray-800 capitalize">
                                {activeTab.replace(/-/g, ' ')}
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* Notification Bell */}
                            <div className="relative notification-container">
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <FiBell size={20} />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {/* Notifications Dropdown */}
                                {showNotifications && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                                            <h3 className="font-semibold text-gray-800">Notifications</h3>
                                            <button
                                                onClick={clearAllNotifications}
                                                className="text-sm text-blue-600 hover:text-blue-800"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-4 text-center text-gray-500">
                                                    No notifications yet
                                                </div>
                                            ) : (
                                                notifications.map((notification) => (
                                                    <div
                                                        key={notification.id}
                                                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''
                                                            }`}
                                                        onClick={() => markAsRead(notification.id)}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <p className="text-sm text-gray-800">{notification.message}</p>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {new Date(notification.timestamp).toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <div className={`w-2 h-2 rounded-full mt-2 ${notification.type === 'approved' ? 'bg-green-500' :
                                                                notification.type === 'rejected' ? 'bg-red-500' : 'bg-blue-500'
                                                                }`}></div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* User Profile */}
                            <div className="flex items-center space-x-3">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-700">
                                        {(() => {
                                            const userData = localStorage.getItem('user');
                                            if (userData) {
                                                const user = JSON.parse(userData);
                                                return user.full_name || 'User';
                                            }
                                            return 'User';
                                        })()}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {spaStatus.status ? spaStatus.status.charAt(0).toUpperCase() + spaStatus.status.slice(1) : 'Loading...'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Logout"
                                >
                                    <FiLogOut size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* SPA Status Indicator */}
                {spaStatus.status && spaStatus.status !== 'verified' && (
                    <div className={`px-6 py-3 border-l-4 ${spaStatus.status === 'pending' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
                        spaStatus.status === 'rejected' ? 'bg-red-50 border-red-400 text-red-800' :
                            spaStatus.status === 'unverified' ? 'bg-blue-50 border-blue-400 text-blue-800' :
                                spaStatus.status === 'blacklisted' ? 'bg-gray-50 border-gray-400 text-gray-800' :
                                    'bg-gray-50 border-gray-400 text-gray-800'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <span className="text-sm font-medium">
                                    Status: {spaStatus.status.charAt(0).toUpperCase() + spaStatus.status.slice(1)}
                                </span>
                                <span className="mx-2">•</span>
                                <span className="text-sm">
                                    {spaStatus.statusMessage}
                                </span>
                            </div>
                            {spaStatus.status === 'rejected' && (
                                <button
                                    onClick={() => setActiveTab('resubmit-application')}
                                    className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                                >
                                    Resubmit Application
                                </button>
                            )}
                            {spaStatus.status === 'unverified' && (
                                <button
                                    onClick={() => setActiveTab('payment-plans')}
                                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                                >
                                    Complete Payment
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

// Wrapper component with SPA Status Provider
const AdminSPA = () => {
    return (
        <SpaStatusProvider>
            <AdminSPAContent />
        </SpaStatusProvider>
    );
};

export default AdminSPA;
