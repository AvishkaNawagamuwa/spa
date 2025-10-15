import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';

const ResubmitApplication = () => {
    const [rejectedSpa, setRejectedSpa] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        // Personal Information
        firstName: '',
        lastName: '',
        email: '',
        telephone: '',
        cellphone: '',
        nicNo: '',

        // Spa Information  
        spaName: '',
        spaAddressLine1: '',
        spaAddressLine2: '',
        spaProvince: '',
        spaPostalCode: '',
        spaTelephone: '',
        spaBRNumber: ''
    });
    const [files, setFiles] = useState({
        nicFront: null,
        nicBack: null,
        brAttachment: null,
        taxRegistration: null,
        otherDocument: null,
        facilityPhotos: [],
        professionalCertifications: []
    });
    const [updating, setUpdating] = useState(false);

    // File input refs for clearing
    const fileInputRefs = {
        nicFront: useRef(null),
        nicBack: useRef(null),
        brAttachment: useRef(null),
        taxRegistration: useRef(null),
        otherDocument: useRef(null),
        facilityPhotos: useRef(null),
        professionalCertifications: useRef(null)
    };

    useEffect(() => {
        fetchRejectedSpaData();
    }, []);

    const fetchRejectedSpaData = async () => {
        try {
            setLoading(true);

            // Get spa ID from user data in localStorage (consistent with other components)
            const userData = localStorage.getItem('user');
            if (!userData) {
                Swal.fire({
                    title: 'Authentication Error',
                    text: 'Please log in again to access your application.',
                    icon: 'error',
                    confirmButtonColor: '#0A1428'
                });
                return;
            }

            const user = JSON.parse(userData);
            const spaId = user.spa_id;

            if (!spaId) {
                Swal.fire({
                    title: 'Error',
                    text: 'No SPA information found. Please contact support.',
                    icon: 'error',
                    confirmButtonColor: '#0A1428'
                });
                return;
            }

            console.log(`🔍 Fetching SPA profile for spa_id: ${spaId}`);

            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3001/api/spa/profile/${spaId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();

            if (result.success && result.data) {
                const spa = result.data;

                // Only show if spa is rejected
                if (spa.status !== 'rejected') {
                    Swal.fire({
                        title: 'No Rejected Application',
                        text: 'Your SPA registration is not in rejected status.',
                        icon: 'info',
                        confirmButtonColor: '#0A1428'
                    });
                    return;
                }

                setRejectedSpa(spa);

                // Pre-fill form with existing data (using current table structure)
                setFormData({
                    firstName: spa.owner_fname || '',
                    lastName: spa.owner_lname || '',
                    email: spa.email || '',
                    telephone: spa.phone || '',
                    cellphone: spa.phone || '',
                    nicNo: spa.owner_nic || '',
                    spaName: spa.name || '',
                    spaAddressLine1: spa.address ? spa.address.split(',')[0] || '' : '',
                    spaAddressLine2: spa.address ? spa.address.split(',')[1] || '' : '',
                    spaProvince: spa.address ? spa.address.split(',')[2] || '' : '',
                    spaPostalCode: spa.address ? spa.address.split(',')[3] || '' : '',
                    spaTelephone: spa.phone || '',
                    spaBRNumber: spa.reference_number || ''
                });
            } else {
                throw new Error(result.message || 'Failed to fetch SPA data');
            }
        } catch (error) {
            console.error('Error fetching rejected spa:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to load rejected application data. Please try again.',
                icon: 'error',
                confirmButtonColor: '#0A1428'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e, fieldName) => {
        const selectedFiles = e.target.files;

        if (fieldName === 'facilityPhotos' || fieldName === 'professionalCertifications') {
            setFiles(prev => ({
                ...prev,
                [fieldName]: Array.from(selectedFiles)
            }));
        } else {
            setFiles(prev => ({
                ...prev,
                [fieldName]: selectedFiles[0]
            }));
        }
    };

    const clearFile = (fieldName) => {
        setFiles(prev => ({
            ...prev,
            [fieldName]: fieldName === 'facilityPhotos' || fieldName === 'professionalCertifications' ? [] : null
        }));

        if (fileInputRefs[fieldName] && fileInputRefs[fieldName].current) {
            fileInputRefs[fieldName].current.value = '';
        }
    };

    const validateForm = () => {
        const required = [
            'firstName', 'lastName', 'email', 'telephone', 'cellphone', 'nicNo',
            'spaName', 'spaAddressLine1', 'spaProvince', 'spaPostalCode',
            'spaTelephone', 'spaBRNumber'
        ];

        for (let field of required) {
            if (!formData[field] || formData[field].trim() === '') {
                Swal.fire({
                    title: 'Validation Error',
                    text: `Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field.`,
                    icon: 'warning',
                    confirmButtonColor: '#0A1428'
                });
                return false;
            }
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            Swal.fire({
                title: 'Validation Error',
                text: 'Please enter a valid email address.',
                icon: 'warning',
                confirmButtonColor: '#0A1428'
            });
            return false;
        }

        // Validate NIC format
        const nicRegex = /^\d{9}[VvXx]$/;
        if (!nicRegex.test(formData.nicNo)) {
            Swal.fire({
                title: 'Validation Error',
                text: 'Please enter a valid NIC number (9 digits + V/X).',
                icon: 'warning',
                confirmButtonColor: '#0A1428'
            });
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setUpdating(true);

            const formDataToSend = new FormData();

            // Add form fields
            Object.keys(formData).forEach(key => {
                formDataToSend.append(key, formData[key]);
            });

            // Add files
            Object.keys(files).forEach(key => {
                if (files[key]) {
                    if (Array.isArray(files[key])) {
                        files[key].forEach(file => {
                            formDataToSend.append(key, file);
                        });
                    } else {
                        formDataToSend.append(key, files[key]);
                    }
                }
            });

            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3001/api/spa/resubmit/${rejectedSpa.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formDataToSend
            });

            const result = await response.json();

            if (result.success) {
                await Swal.fire({
                    title: 'Application Resubmitted!',
                    text: 'Your corrected application has been resubmitted successfully. It will be reviewed again by AdminLSA.',
                    icon: 'success',
                    confirmButtonColor: '#0A1428'
                });

                // Refresh the data
                fetchRejectedSpaData();
            } else {
                throw new Error(result.message || 'Resubmission failed');
            }
        } catch (error) {
            console.error('Error resubmitting application:', error);
            Swal.fire({
                title: 'Resubmission Failed',
                text: error.message || 'Failed to resubmit application. Please try again.',
                icon: 'error',
                confirmButtonColor: '#0A1428'
            });
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading rejected application...</span>
            </div>
        );
    }

    if (!rejectedSpa) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-600">No Rejected Application Found</h3>
                <p className="text-gray-500 mt-2">You don't have any rejected applications to resubmit.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.56 0L4.254 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-lg font-medium text-red-800">Application Rejected</h3>
                        <div className="mt-2 text-sm text-red-700">
                            <p><strong>Rejection Reason:</strong></p>
                            <p className="mt-1 bg-white p-3 rounded border border-red-200">
                                {rejectedSpa.reject_reason || 'No specific reason provided.'}
                            </p>
                            <p className="mt-3">
                                Please correct the issues mentioned above and resubmit your application.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resubmission Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6 pb-3 border-b border-gray-200">
                        Personal Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Telephone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                name="telephone"
                                value={formData.telephone}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cellphone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                name="cellphone"
                                value={formData.cellphone}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                NIC Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="nicNo"
                                value={formData.nicNo}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="123456789V"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Spa Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6 pb-3 border-b border-gray-200">
                        Spa Information
                    </h3>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Spa Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="spaName"
                                value={formData.spaName}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Address Line 1 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="spaAddressLine1"
                                    value={formData.spaAddressLine1}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Address Line 2
                                </label>
                                <input
                                    type="text"
                                    name="spaAddressLine2"
                                    value={formData.spaAddressLine2}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Province/State <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="spaProvince"
                                    value={formData.spaProvince}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Postal Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="spaPostalCode"
                                    value={formData.spaPostalCode}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Spa Telephone Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    name="spaTelephone"
                                    value={formData.spaTelephone}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Spa BR Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="spaBRNumber"
                                    value={formData.spaBRNumber}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Document Uploads */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6 pb-3 border-b border-gray-200">
                        Document Attachments
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* NIC Front */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                NIC Front Photo
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                <input
                                    type="file"
                                    ref={fileInputRefs.nicFront}
                                    accept="image/*,.pdf"
                                    onChange={(e) => handleFileChange(e, 'nicFront')}
                                    className="w-full"
                                />
                                {files.nicFront && (
                                    <div className="mt-2 flex items-center justify-between text-sm text-green-600">
                                        <span>✓ {files.nicFront.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => clearFile('nicFront')}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* NIC Back */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                NIC Back Photo
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                <input
                                    type="file"
                                    ref={fileInputRefs.nicBack}
                                    accept="image/*,.pdf"
                                    onChange={(e) => handleFileChange(e, 'nicBack')}
                                    className="w-full"
                                />
                                {files.nicBack && (
                                    <div className="mt-2 flex items-center justify-between text-sm text-green-600">
                                        <span>✓ {files.nicBack.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => clearFile('nicBack')}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* BR Attachment */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Business Registration Certificate
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                <input
                                    type="file"
                                    ref={fileInputRefs.brAttachment}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => handleFileChange(e, 'brAttachment')}
                                    className="w-full"
                                />
                                {files.brAttachment && (
                                    <div className="mt-2 flex items-center justify-between text-sm text-green-600">
                                        <span>✓ {files.brAttachment.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => clearFile('brAttachment')}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tax Registration */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tax Registration Documents
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                <input
                                    type="file"
                                    ref={fileInputRefs.taxRegistration}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => handleFileChange(e, 'taxRegistration')}
                                    className="w-full"
                                />
                                {files.taxRegistration && (
                                    <div className="mt-2 flex items-center justify-between text-sm text-green-600">
                                        <span>✓ {files.taxRegistration.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => clearFile('taxRegistration')}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Other Document */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Other Document (Optional)
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                <input
                                    type="file"
                                    ref={fileInputRefs.otherDocument}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => handleFileChange(e, 'otherDocument')}
                                    className="w-full"
                                />
                                {files.otherDocument && (
                                    <div className="mt-2 flex items-center justify-between text-sm text-green-600">
                                        <span>✓ {files.otherDocument.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => clearFile('otherDocument')}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Facility Photos */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Facility Photos (Minimum 5)
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                <input
                                    type="file"
                                    ref={fileInputRefs.facilityPhotos}
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handleFileChange(e, 'facilityPhotos')}
                                    className="w-full"
                                />
                                {files.facilityPhotos.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {files.facilityPhotos.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between text-sm text-green-600">
                                                <span>✓ {file.name}</span>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => clearFile('facilityPhotos')}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remove All
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Professional Certifications */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Professional Certifications
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                <input
                                    type="file"
                                    ref={fileInputRefs.professionalCertifications}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    multiple
                                    onChange={(e) => handleFileChange(e, 'professionalCertifications')}
                                    className="w-full"
                                />
                                {files.professionalCertifications.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {files.professionalCertifications.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between text-sm text-green-600">
                                                <span>✓ {file.name}</span>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => clearFile('professionalCertifications')}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remove All
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-6">
                    <button
                        type="submit"
                        disabled={updating}
                        className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${updating
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                            } text-white`}
                    >
                        {updating ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Resubmitting...
                            </span>
                        ) : (
                            'Resubmit Application'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ResubmitApplication;