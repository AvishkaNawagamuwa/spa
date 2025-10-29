// Enhanced Payment Step Component
const PaymentStep = ({ onBack, onPaymentSuccess }) => {
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [saveCard, setSaveCard] = useState(false);
    const [cardNumber, setCardNumber] = useState('');
    const [cardType, setCardType] = useState('');

    // Bank transfer state
    const [bankDetails, setBankDetails] = useState({
        bankName: '',
        accountNumber: '',
        branch: '',
        accountHolderName: ''
    });

    // Card number formatting and detection
    const formatCardNumber = (value) => {
        return value
            .replace(/\s+/g, '')
            .replace(/[^0-9]/gi, '')
            .substr(0, 16)
            .match(/.{1,4}/g)
            ?.join(' ') || '';
    };

    const detectCardType = (number) => {
        const cleanNumber = number.replace(/\s/g, '');
        if (cleanNumber.match(/^4/)) return 'visa';
        if (cleanNumber.match(/^5[1-5]/)) return 'mastercard';
        if (cleanNumber.match(/^3[47]/)) return 'amex';
        if (cleanNumber.match(/^6/)) return 'discover';
        return '';
    };

    const handleCardNumberChange = (e) => {
        const input = e.target.value;
        const formatted = formatCardNumber(input);
        setCardNumber(formatted);
        setCardType(detectCardType(formatted));
    };

    const getCardIcon = () => {
        switch (cardType) {
            case 'visa': return 'fa-cc-visa';
            case 'mastercard': return 'fa-cc-mastercard';
            case 'amex': return 'fa-cc-amex';
            case 'discover': return 'fa-cc-discover';
            default: return 'fa-credit-card';
        }
    };

    const handleBankDetailsChange = (e) => {
        const { name, value } = e.target;
        setBankDetails(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="py-0">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-primary-dark mb-3">Payment Details</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Choose your preferred payment method to complete the registration process.
                </p>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <div
                        className={`border-2 rounded-xl p-4 transition-all duration-300 opacity-50 cursor-not-allowed bg-gray-100 border-gray-300`}
                    >
                        <div className="flex items-center">
                            <input
                                type="radio"
                                id="card-payment"
                                name="payment-method"
                                value="card"
                                checked={paymentMethod === 'card'}
                                onChange={() => setPaymentMethod('card')}
                                className="w-5 h-5 text-gray-400 focus:ring-gray-400 border-gray-300"
                                disabled
                            />
                            <label htmlFor="card-payment" className="ml-3 flex items-center cursor-not-allowed">
                                <i className="fas fa-credit-card text-2xl text-gray-400 mr-3"></i>
                                <div>
                                    <div className="font-semibold text-gray-500">Card Payment</div>
                                    <div className="text-sm text-gray-400">Pay securely with your card (Currently Unavailable)</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-300 ${paymentMethod === 'bank_transfer'
                            ? 'border-gold bg-gold bg-opacity-10'
                            : 'border-gray-200 hover:border-gold-light'
                            }`}
                        onClick={() => setPaymentMethod('bank_transfer')}
                    >
                        <div className="flex items-center">
                            <input
                                type="radio"
                                id="bank-transfer"
                                name="payment-method"
                                value="bank_transfer"
                                checked={paymentMethod === 'bank_transfer'}
                                onChange={() => setPaymentMethod('bank_transfer')}
                                className="w-5 h-5 text-gold focus:ring-gold border-gray-300"
                            />
                            <label htmlFor="bank-transfer" className="ml-3 flex items-center cursor-pointer">
                                <i className="fas fa-university text-2xl text-gold mr-3"></i>
                                <div>
                                    <div className="font-semibold text-gray-800">Bank Transfer</div>
                                    <div className="text-sm text-gray-600">Transfer directly to our account</div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-8">
                    {paymentMethod === 'card' && (
                        <>
                            <h3 className="text-xl font-semibold text-primary-dark mb-6 pb-3 border-b border-gray-200 flex items-center">
                                <i className="fas fa-credit-card text-gold mr-3"></i>
                                Card Payment Details
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-gray-700 mb-3 font-medium">
                                        Card Number
                                    </label>
                                    <div className="relative">
                                        <i className={`fas ${getCardIcon()} absolute left-4 top-1/2 transform -translate-y-1/2 ${cardType ? 'text-blue-500' : 'text-gray-400'}`}></i>
                                        <input
                                            type="text"
                                            value={cardNumber}
                                            onChange={handleCardNumberChange}
                                            placeholder="1234 5678 9012 3456"
                                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                                            maxLength={19}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-gray-700 mb-3 font-medium">
                                            Expiry Date
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="MM/YY"
                                            className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-3 font-medium">
                                            CVV
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="123"
                                            maxLength={4}
                                            className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-3 font-medium">
                                        Cardholder Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                                    />
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="saveCard"
                                        checked={saveCard}
                                        onChange={() => setSaveCard(!saveCard)}
                                        className="mr-3 w-5 h-5 text-gold focus:ring-gold border-gray-300 rounded"
                                    />
                                    <label htmlFor="saveCard" className="text-gray-700">
                                        Save card details for future payments
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    {paymentMethod === 'bank_transfer' && (
                        <>
                            <h3 className="text-xl font-semibold text-primary-dark mb-6 pb-3 border-b border-gray-200 flex items-center">
                                <i className="fas fa-university text-gold mr-3"></i>
                                Bank Transfer Details
                            </h3>

                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                <h4 className="font-semibold text-blue-800 mb-2">LSA Bank Account Details</h4>
                                <div className="space-y-1 text-sm text-blue-700">
                                    <p><strong>Bank:</strong> Bank of Ceylon</p>
                                    <p><strong>Account Name:</strong> Lanka Spa Association</p>
                                    <p><strong>Account Number:</strong> 87654321</p>
                                    <p><strong>Branch:</strong> Colombo Fort</p>
                                    <p><strong>Amount:</strong> LKR 5,000.00</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-gray-700 mb-3 font-medium">
                                        Your Bank Name
                                    </label>
                                    <input
                                        type="text"
                                        name="bankName"
                                        value={bankDetails.bankName}
                                        onChange={handleBankDetailsChange}
                                        placeholder="e.g., Commercial Bank"
                                        className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-3 font-medium">
                                        Your Account Number
                                    </label>
                                    <input
                                        type="text"
                                        name="accountNumber"
                                        value={bankDetails.accountNumber}
                                        onChange={handleBankDetailsChange}
                                        placeholder="Your account number"
                                        className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-3 font-medium">
                                        Branch
                                    </label>
                                    <input
                                        type="text"
                                        name="branch"
                                        value={bankDetails.branch}
                                        onChange={handleBankDetailsChange}
                                        placeholder="Your branch name"
                                        className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-3 font-medium">
                                        Account Holder Name
                                    </label>
                                    <input
                                        type="text"
                                        name="accountHolderName"
                                        value={bankDetails.accountHolderName}
                                        onChange={handleBankDetailsChange}
                                        placeholder="Name as on account"
                                        className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <div className="flex items-start">
                                    <i className="fas fa-exclamation-triangle text-amber-500 mt-1 mr-3"></i>
                                    <div>
                                        <h4 className="text-sm font-semibold text-amber-800">Bank Transfer Instructions</h4>
                                        <p className="text-sm text-amber-700 mt-1">
                                            After transferring LKR 5,000 to our account, your registration will be pending approval.
                                            We will verify the payment and activate your account within 24-48 hours.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="bg-gradient-to-b from-gold-light to-gold rounded-2xl p-8 text-primary-dark">
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-5">
                            <i className={`fas ${paymentMethod === 'card' ? 'fa-credit-card' : 'fa-university'} text-white text-3xl`}></i>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Registration Fee</h3>
                        <p className="text-4xl font-bold my-3">LKR 5,000</p>
                        <p className="text-primary-dark text-opacity-80">
                            One-time payment for annual membership
                        </p>
                    </div>

                    <div className="bg-white bg-opacity-20 rounded-xl p-5 mt-6">
                        <h4 className="font-semibold mb-3">Membership Benefits</h4>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center">
                                <i className="fas fa-check-circle mr-2"></i> Premium listing in our directory
                            </li>
                            <li className="flex items-center">
                                <i className="fas fa-check-circle mr-2"></i> Exclusive networking events
                            </li>
                            <li className="flex items-center">
                                <i className="fas fa-check-circle mr-2"></i> Professional certification
                            </li>
                            <li className="flex items-center">
                                <i className="fas fa-check-circle mr-2"></i> Marketing support
                            </li>
                            <li className="flex items-center">
                                <i className="fas fa-check-circle mr-2"></i> Industry insights & reports
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="flex justify-between pt-6">
                <button
                    onClick={onBack}
                    className="bg-white text-primary-dark border border-gray-300 px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:border-gold hover:shadow-lg flex items-center"
                >
                    <i className="fas fa-arrow-left mr-2"></i>Back
                </button>
                <button
                    onClick={() => onPaymentSuccess(paymentMethod, paymentMethod === 'bank_transfer' ? bankDetails : null)}
                    className="bg-gradient-to-r from-gold-light to-gold text-primary-dark px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg flex items-center"
                >
                    {paymentMethod === 'card' ? 'Complete Payment' : 'Submit for Approval'}
                    <i className={`fas ${paymentMethod === 'card' ? 'fa-lock' : 'fa-check'} ml-2`}></i>
                </button>
            </div>
        </div>
    );
};