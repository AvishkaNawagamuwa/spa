import React, { useState, useContext, useEffect } from 'react';
import { FiCheck, FiStar, FiCalendar, FiCreditCard, FiUpload, FiAlertCircle, FiDollarSign } from 'react-icons/fi';
import { SpaContext } from './SpaContext';
import axios from 'axios';
import Swal from 'sweetalert2';

const PaymentPlans = () => {
    const [selectedPlan, setSelectedPlan] = useState('annual');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [bankTransferProof, setBankTransferProof] = useState(null);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [isPlanFixed, setIsPlanFixed] = useState(false); // Track if plan is fixed for the year

    // Enhanced payment form state
    const [cardDetails, setCardDetails] = useState({
        cardNumber: '',
        expiry: '',
        cvv: '',
        holderName: ''
    });
    const [paymentType, setPaymentType] = useState('annual_fee');
    const [validationErrors, setValidationErrors] = useState({});
    const [bankSlipFile, setBankSlipFile] = useState(null);
    const [availablePlans, setAvailablePlans] = useState([]);

    // Handle SpaContext safely
    let subscriptionStatus = 'inactive';
    try {
        const spaContext = useContext(SpaContext);
        subscriptionStatus = spaContext?.subscriptionStatus || 'inactive';
    } catch (error) {
        console.warn('SpaContext not available, using default values');
    }

    const currentDate = new Date('2025-10-03');

    useEffect(() => {
        fetchAvailablePlans();
        checkExistingPayments();
    }, []);

    const checkExistingPayments = async () => {
        try {

            const response = await axios.get('http://localhost:3001/api/admin-spa-enhanced/payment-status', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });



            // Only fix the plan if there's an active payment (completed or pending approval)
            // This means they've already made their payment choice for this year
            if (response.data.success && response.data.data.hasActivePayment) {
                setIsPlanFixed(true);
                // Set the active plan based on existing payment
                if (response.data.data.currentPlan) {
                    const planMapping = {
                        'Monthly': 'monthly',
                        'Quarterly': 'quarterly',
                        'Half-Yearly': 'half-yearly',
                        'Annual': 'annual'
                    };
                    setSelectedPlan(planMapping[response.data.data.currentPlan] || 'annual');
                }

            } else {
                // No active payment - user can freely select any plan
                setIsPlanFixed(false);

            }
        } catch (error) {
            console.error('Error checking existing payments:', error);
            // If there's an error checking, allow plan selection (safer default)
            setIsPlanFixed(false);
        }
    }; const fetchAvailablePlans = async () => {
        try {
            const response = await axios.get('/api/admin-spa-enhanced/payment-plans', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setAvailablePlans(response.data.plans || []);
        } catch (error) {
            console.error('Error fetching payment plans:', error);
        }
    };

    const plans = [
        {
            id: 'monthly',
            name: 'Monthly',
            price: 5000,
            durationMonths: 1,
            duration: '1 Month',
            description: 'Perfect for startups',
            features: [
                'Unlimited Therapist Management',
                'Basic Analytics',
                'Email Support',
                'Mobile App Access',
                'Standard Processing'
            ],
            popular: false
        },
        {
            id: 'quarterly',
            name: 'Quarterly',
            price: 14000,
            originalPrice: 15000,
            durationMonths: 3,
            duration: '3 Months',
            description: 'Balanced growth solution',
            features: [
                'Everything in Monthly',
                'Advanced Analytics',
                'Priority Support',
                'Bulk Operations',
                'Custom Reports'
            ],
            popular: false
        },
        {
            id: 'half-yearly',
            name: 'Half-Yearly',
            price: 25000,
            originalPrice: 30000,
            durationMonths: 6,
            duration: '6 Months',
            description: 'Seasonal growth boost',
            features: [
                'Everything in Quarterly',
                'Advanced Integrations',
                'Dedicated Support',
                'API Access',
                'Training Sessions'
            ],
            popular: false
        },
        {
            id: 'annual',
            name: 'Annual',
            price: 45000,
            originalPrice: 60000,
            durationMonths: 12,
            duration: '12 Months',
            description: 'Best value with premium features',
            features: [
                'Everything in Half-Yearly',
                'Premium Analytics Dashboard',
                '24/7 Priority Support',
                'White-label Options',
                'Advanced Automation',
                'Compliance Tools'
            ],
            popular: true,
            savings: '25% OFF'
        }
    ];

    const handleSelectPlan = (planId) => {
        // If plan is fixed (after first successful payment), prevent changes
        if (isPlanFixed) {
            Swal.fire({
                title: 'Plan Fixed for the Year',
                text: 'Your payment plan is fixed for the complete year according to your spa subscription. You cannot change it until the next renewal period.',
                icon: 'info',
                confirmButtonColor: '#001F3F'
            });
            return;
        }
        // Allow free selection before first payment
        setSelectedPlan(planId);
    };

    const handlePaymentMethodChange = (method) => {
        setSelectedPaymentMethod(method);
    };

    const handleBankTransferUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            setBankTransferProof(file);
        }
    };

    const processCardPayment = async (planData) => {
        try {
            setPaymentProcessing(true);

            const response = await axios.post('/api/admin-spa-enhanced/process-payment', {
                plan_id: planData.id,
                payment_method: 'card',
                amount: planData.price
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.data.success) {
                // Simulate PayHere integration
                Swal.fire({
                    title: 'Payment Successful!',
                    text: `Your ${planData.name} plan has been activated.`,
                    icon: 'success',
                    confirmButtonColor: '#001F3F'
                });
                setShowPaymentModal(false);

                // Refresh payment status to lock the plan
                await checkExistingPayments();
            }
        } catch (error) {
            console.error('Payment error:', error);
            Swal.fire({
                title: 'Payment Failed',
                text: 'Please try again or contact support.',
                icon: 'error',
                confirmButtonColor: '#001F3F'
            });
        } finally {
            setPaymentProcessing(false);
        }
    };

    const processBankTransfer = async (planData) => {
        if (!bankTransferProof) {
            Swal.fire({
                title: 'Upload Required',
                text: 'Please upload proof of bank transfer.',
                icon: 'warning',
                confirmButtonColor: '#001F3F'
            });
            return;
        }

        const formData = new FormData();
        formData.append('plan_id', planData.id);
        formData.append('payment_method', 'bank_transfer');
        formData.append('amount', planData.price);
        formData.append('transfer_proof', bankTransferProof);

        try {
            setPaymentProcessing(true);

            const response = await axios.post('/api/admin-spa-enhanced/process-payment', formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                Swal.fire({
                    title: 'Bank Transfer Submitted',
                    text: 'Your payment is pending approval by LSA Admin.',
                    icon: 'info',
                    confirmButtonColor: '#001F3F'
                });
                setShowPaymentModal(false);
                setBankTransferProof(null);

                // Refresh payment status to lock the plan
                await checkExistingPayments();
            }
        } catch (error) {
            console.error('Bank transfer error:', error);
            Swal.fire({
                title: 'Upload Failed',
                text: 'Please try again or contact support.',
                icon: 'error',
                confirmButtonColor: '#001F3F'
            });
        } finally {
            setPaymentProcessing(false);
        }
    };

    // Card validation functions
    const validateCard = () => {
        const errors = {};

        // Card holder name validation
        if (!cardDetails.holderName.trim()) {
            errors.holderName = 'Card holder name is required';
        }

        // Card number validation (basic Luhn algorithm)
        const cardNumber = cardDetails.cardNumber.replace(/\s/g, '');
        if (!cardNumber) {
            errors.cardNumber = 'Card number is required';
        } else if (cardNumber.length !== 16) {
            errors.cardNumber = 'Card number must be 16 digits';
        } else if (!isValidCardNumber(cardNumber)) {
            errors.cardNumber = 'Invalid card number';
        }

        // Expiry validation
        if (!cardDetails.expiry) {
            errors.expiry = 'Expiry date is required';
        } else {
            const [month, year] = cardDetails.expiry.split('/');
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear() % 100;
            const currentMonth = currentDate.getMonth() + 1;

            if (!month || !year || month > 12 || month < 1) {
                errors.expiry = 'Invalid expiry date format';
            } else if (parseInt(year) < currentYear ||
                (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
                errors.expiry = 'Card has expired';
            }
        }

        // CVV validation
        if (!cardDetails.cvv) {
            errors.cvv = 'CVV is required';
        } else if (cardDetails.cvv.length < 3) {
            errors.cvv = 'CVV must be at least 3 digits';
        }

        return errors;
    };

    // Basic Luhn algorithm for card validation
    const isValidCardNumber = (cardNumber) => {
        let sum = 0;
        let isEven = false;

        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber.charAt(i));

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    };

    const handlePayNow = () => {
        const planData = plans.find(p => p.id === selectedPlan);
        if (!planData) return;

        if (selectedPaymentMethod === 'card') {
            // Validate card details first
            const errors = validateCard();
            setValidationErrors(errors);

            if (Object.keys(errors).length === 0) {
                processEnhancedCardPayment(planData);
            } else {
                Swal.fire({
                    title: 'Validation Error',
                    text: 'Please fix the card details and try again.',
                    icon: 'error',
                    confirmButtonColor: '#001F3F'
                });
            }
        } else {
            processEnhancedBankTransfer(planData);
        }
    };

    const processEnhancedCardPayment = async (planData) => {
        try {
            setPaymentProcessing(true);

            // Enhanced PayHere integration with validation
            const paymentData = {
                plan_id: planData.id,
                payment_method: 'card',
                amount: planData.price,
                card_details: {
                    ...cardDetails,
                    cardNumber: cardDetails.cardNumber.replace(/\s/g, '') // Remove spaces
                }
            };

            const response = await axios.post('http://localhost:3001/api/admin-spa-enhanced/process-card-payment', paymentData, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.data.success) {
                // Fix the selected plan for the year after successful payment (for any plan)
                setIsPlanFixed(true);

                Swal.fire({
                    title: 'Payment Successful!',
                    text: `Your ${planData.name} plan payment has been processed successfully. Your plan is now fixed for the complete year.`,
                    icon: 'success',
                    confirmButtonColor: '#001F3F'
                }).then(() => {
                    setShowPaymentModal(false);
                    // Redirect to payment success page or refresh dashboard
                    window.location.reload();
                });
            } else {
                throw new Error(response.data.message || 'Payment failed');
            }
        } catch (error) {
            console.error('Card payment error:', error);
            Swal.fire({
                title: 'Payment Failed',
                text: error.response?.data?.message || 'Please try again or contact support.',
                icon: 'error',
                confirmButtonColor: '#001F3F'
            });
        } finally {
            setPaymentProcessing(false);
        }
    };

    const processEnhancedBankTransfer = async (planData) => {
        try {
            if (!bankSlipFile) {
                Swal.fire({
                    title: 'File Required',
                    text: 'Please upload the bank transfer slip.',
                    icon: 'warning',
                    confirmButtonColor: '#001F3F'
                });
                return;
            }

            setPaymentProcessing(true);

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('plan_id', planData.id);
            formData.append('payment_method', 'bank_transfer');
            formData.append('amount', planData.price);
            formData.append('transfer_proof', bankSlipFile);

            const response = await axios.post('http://localhost:3001/api/admin-spa-enhanced/process-bank-transfer', formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                // Fix the selected plan for the year after successful payment submission (for any plan)
                setIsPlanFixed(true);

                Swal.fire({
                    title: 'Upload Successful!',
                    text: `Your ${planData.name} plan bank transfer slip has been uploaded successfully. Your payment plan is now fixed for the complete year. Payment will be verified by LSA Admin.`,
                    icon: 'success',
                    confirmButtonColor: '#001F3F'
                }).then(() => {
                    setShowPaymentModal(false);
                    setBankSlipFile(null);
                });
            } else {
                throw new Error(response.data.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Bank transfer error:', error);
            Swal.fire({
                title: 'Upload Failed',
                text: 'Please try again or contact support.',
                icon: 'error',
                confirmButtonColor: '#001F3F'
            });
        } finally {
            setPaymentProcessing(false);
        }
    };

    const formatCurrency = (amount) => `LKR ${amount.toLocaleString()}`;
    const selectedPlanData = plans.find(p => p.id === selectedPlan);

    // Calculate next payment date
    const getNextPaymentDate = () => {
        if (!selectedPlanData) return '';
        const nextDate = new Date(currentDate);
        nextDate.setMonth(nextDate.getMonth() + selectedPlanData.durationMonths);
        return nextDate.toLocaleDateString('en-GB');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Choose Your Plan</h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Unlock the full potential of your spa management system. Choose the plan that fits your business needs.
                </p>


                {/* Plan Status Notification */}
                {isPlanFixed ? (
                    <div className="mt-4 mx-auto max-w-lg bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-center">
                            <FiCheck className="text-green-600 mr-2" size={20} />
                            <div className="text-green-800">
                                <p className="font-semibold">Payment Plan Fixed for the Year</p>
                                <p className="text-sm">Your {plans.find(p => p.id === selectedPlan)?.name} plan is locked for the complete year according to your spa subscription.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mt-4 mx-auto max-w-lg bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-center">
                            <FiCalendar className="text-blue-600 mr-2" size={20} />
                            <div className="text-blue-800">
                                <p className="font-semibold">Select Your Payment Plan</p>
                                <p className="text-sm">Choose any plan that fits your needs. Your selected plan will be fixed for one year after payment.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Pricing Plans */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${selectedPlan === plan.id
                            ? 'border-[#4A90E2] ring-4 ring-[#4A90E2]/20 scale-105'
                            : 'border-gray-200 hover:border-[#4A90E2]/50'
                            } ${plan.popular ? 'ring-2 ring-[#D4AF37]' : ''}`}
                    >
                        {/* Popular Badge */}
                        {plan.popular && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                <div className="bg-gradient-to-r from-[#D4AF37] to-green-500 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center">
                                    <FiStar size={12} className="mr-1" />
                                    MOST POPULAR
                                </div>
                            </div>
                        )}

                        {/* Savings Badge */}
                        {plan.savings && (
                            <div className="absolute -top-2 -right-2">
                                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                                    {plan.savings}
                                </div>
                            </div>
                        )}

                        {/* Fixed Plan Badge */}
                        {isPlanFixed && selectedPlan === plan.id && (
                            <div className="absolute -top-2 -left-2">
                                <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center">
                                    <FiCheck size={10} className="mr-1" />
                                    FIXED FOR YEAR
                                </div>
                            </div>
                        )}

                        <div className="p-6">
                            {/* Plan Header */}
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                                <div className="mb-4">
                                    <div className="flex items-center justify-center">
                                        <span className="text-3xl font-bold text-gray-800">{formatCurrency(plan.price)}</span>
                                    </div>
                                    {plan.originalPrice && (
                                        <div className="flex items-center justify-center mt-1">
                                            <span className="text-sm text-gray-500 line-through mr-2">
                                                {formatCurrency(plan.originalPrice)}
                                            </span>
                                            <span className="text-sm text-[#D4AF37] font-medium">
                                                Save {formatCurrency(plan.originalPrice - plan.price)}
                                            </span>
                                        </div>
                                    )}
                                    <p className="text-gray-500 text-sm">{plan.duration}</p>
                                </div>

                                <button
                                    onClick={() => handleSelectPlan(plan.id)}
                                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${selectedPlan === plan.id
                                        ? isPlanFixed ? 'bg-green-600 text-white shadow-lg' : 'bg-[#4A90E2] text-white shadow-lg'
                                        : isPlanFixed ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    disabled={isPlanFixed && selectedPlan !== plan.id}
                                >
                                    {selectedPlan === plan.id
                                        ? (isPlanFixed ? 'Fixed for Year' : 'Selected')
                                        : (isPlanFixed ? 'Plan Locked' : 'Select Plan')
                                    }
                                </button>
                            </div>

                            {/* Features */}
                            <div className="space-y-3">
                                {plan.features.map((feature, index) => (
                                    <div key={index} className="flex items-center">
                                        <div className="flex-shrink-0 w-5 h-5 bg-[#D4AF37] rounded-full flex items-center justify-center mr-3">
                                            <FiCheck size={12} className="text-white" />
                                        </div>
                                        <span className="text-sm text-gray-600">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Payment Summary Panel */}
            {selectedPlan && (
                <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <FiCalendar className="mr-2 text-[#D4AF37]" />
                        Selected Plan Summary
                    </h3>
                    <div className="overflow-hidden">
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 font-medium text-gray-700">Plan:</td>
                                    <td className="py-3 text-gray-900">{selectedPlanData?.name}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 font-medium text-gray-700">Payment Amount:</td>
                                    <td className="py-3 text-[#0A1428] font-semibold">{formatCurrency(selectedPlanData?.price)}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 font-medium text-gray-700">Next Payment Date:</td>
                                    <td className="py-3 text-gray-900">{getNextPaymentDate()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="mt-6 border-t pt-6">
                        <h4 className="text-md font-semibold text-gray-800 mb-4">Choose Payment Method</h4>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button
                                onClick={() => handlePaymentMethodChange('card')}
                                className={`p-4 border-2 rounded-lg transition-all ${selectedPaymentMethod === 'card'
                                    ? 'border-[#001F3F] bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <FiCreditCard className={`mx-auto mb-2 ${selectedPaymentMethod === 'card' ? 'text-[#001F3F]' : 'text-gray-400'}`} size={24} />
                                <div className="text-sm font-medium">Card Payment</div>
                                <div className="text-xs text-gray-500">PayHere Gateway</div>
                            </button>

                            <button
                                onClick={() => handlePaymentMethodChange('bank_transfer')}
                                className={`p-4 border-2 rounded-lg transition-all ${selectedPaymentMethod === 'bank_transfer'
                                    ? 'border-[#001F3F] bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <FiUpload className={`mx-auto mb-2 ${selectedPaymentMethod === 'bank_transfer' ? 'text-[#001F3F]' : 'text-gray-400'}`} size={24} />
                                <div className="text-sm font-medium">Bank Transfer</div>
                                <div className="text-xs text-gray-500">Manual Approval</div>
                            </button>
                        </div>

                        {/* Payment Type Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                            <select
                                value={paymentType}
                                onChange={(e) => setPaymentType(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
                            >
                                <option value="registration_fee">Registration Fee</option>
                                <option value="annual_fee">Annual Fee</option>
                            </select>
                        </div>

                        {/* Card Details Form */}
                        {selectedPaymentMethod === 'card' && (
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <h5 className="font-medium text-gray-800 mb-4">Card Details</h5>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Card Holder Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="John Doe"
                                            value={cardDetails.holderName}
                                            onChange={(e) => setCardDetails({ ...cardDetails, holderName: e.target.value })}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
                                        />
                                        {validationErrors.holderName && (
                                            <span className="text-red-500 text-sm">{validationErrors.holderName}</span>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Card Number <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="1234 5678 9012 3456"
                                            value={cardDetails.cardNumber}
                                            onChange={(e) => {
                                                // Format card number with spaces
                                                const value = e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
                                                if (value.length <= 19) {
                                                    setCardDetails({ ...cardDetails, cardNumber: value });
                                                }
                                            }}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
                                            maxLength="19"
                                        />
                                        {validationErrors.cardNumber && (
                                            <span className="text-red-500 text-sm">{validationErrors.cardNumber}</span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Expiry Date <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="MM/YY"
                                                value={cardDetails.expiry}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/\D/g, '');
                                                    if (value.length <= 4) {
                                                        const formatted = value.length >= 3 ?
                                                            value.slice(0, 2) + '/' + value.slice(2) : value;
                                                        setCardDetails({ ...cardDetails, expiry: formatted });
                                                    }
                                                }}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
                                                maxLength="5"
                                            />
                                            {validationErrors.expiry && (
                                                <span className="text-red-500 text-sm">{validationErrors.expiry}</span>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                CVV <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="123"
                                                value={cardDetails.cvv}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/\D/g, '');
                                                    if (value.length <= 4) {
                                                        setCardDetails({ ...cardDetails, cvv: value });
                                                    }
                                                }}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
                                                maxLength="4"
                                            />
                                            {validationErrors.cvv && (
                                                <span className="text-red-500 text-sm">{validationErrors.cvv}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Validation Errors Display */}
                                {Object.keys(validationErrors).length > 0 && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex items-center">
                                            <FiAlertCircle className="text-red-500 mr-2" size={16} />
                                            <span className="text-red-700 text-sm font-medium">Please fix the following errors:</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Bank Transfer Upload */}
                        {selectedPaymentMethod === 'bank_transfer' && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <h5 className="font-medium text-gray-800 mb-2">Bank Transfer Details</h5>
                                <div className="text-sm text-gray-600 mb-4">
                                    <p><strong>Bank:</strong> Commercial Bank of Ceylon</p>
                                    <p><strong>Account Name:</strong> Lanka Spa Association</p>
                                    <p><strong>Account Number:</strong> 8001234567</p>
                                    <p><strong>Branch:</strong> Colombo Fort</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Upload Transfer Proof <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) => setBankSlipFile(e.target.files[0])}
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                    />
                                    {bankSlipFile && (
                                        <p className="text-sm text-green-600 mt-2">
                                            ✓ File selected: {bankSlipFile.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Payment Button */}
                        <button
                            onClick={handlePayNow}
                            disabled={paymentProcessing || (selectedPaymentMethod === 'bank_transfer' && !bankSlipFile)}
                            className="w-full bg-[#001F3F] text-white py-3 px-6 rounded-lg font-semibold hover:bg-opacity-90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {paymentProcessing ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Processing...
                                </div>
                            ) : (
                                <div className="flex items-center justify-center">
                                    <FiDollarSign className="mr-2" />
                                    {selectedPaymentMethod === 'card' ? 'Pay Now' : 'Submit for Approval'}
                                </div>
                            )}
                        </button>

                        {selectedPaymentMethod === 'bank_transfer' && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-start">
                                    <FiAlertCircle className="text-yellow-600 mr-2 mt-0.5" size={16} />
                                    <div className="text-sm text-yellow-800">
                                        <strong>Note:</strong> Bank transfer payments require manual approval by LSA Admin.
                                        Your plan will be activated once the payment is verified.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentPlans;
