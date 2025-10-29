import React, { useState } from "react";
import Swal from 'sweetalert2';

// ProgressIndicator Component - Improved Design
const ProgressIndicator = ({ currentStep }) => {
  const steps = ["Initial", "Prerequisites", "Details", "Payment"];

  return (
    <div className="relative mb-12 mt-12">
      {/* Progress Track - Sleek modern line */}
      <div className="absolute top-5 left-0 right-0 h-[2px] bg-gray-100 z-0"></div>

      {/* Progress Fill - Premium gradient with subtle shine */}
      <div
        className="absolute top-5 h-[2px] bg-gradient-to-r from-[#0A1428] via-blue-600 to-blue-500 z-0 transition-all duration-700 ease-out"
        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 99}%` }}
      ></div>

      <div className="flex justify-between relative z-10">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            {/* Step Circle - Modern premium design */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ease-out ${currentStep >= index + 1
                ? "bg-gradient-to-br from-[#0A1428] to-blue-600 text-white shadow-2xl shadow-blue-500/30 transform scale-110 ring-2 ring-blue-700 ring-opacity-30"
                : "bg-white border border-gray-200 text-gray-400 shadow-sm"
                } font-semibold relative`}
            >
              {/* Checkmark for completed steps */}
              {currentStep > index + 1 ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}

              {/* Subtle glow effect for active steps */}
              {currentStep === index + 1 && (
                <div className="absolute inset-0 rounded-full bg-blue-400 opacity-20 animate-pulse"></div>
              )}
            </div>

            {/* Step Label - Clean modern typography */}
            <div
              className={`text-sm font-medium tracking-wide transition-colors duration-300 ${currentStep >= index + 1
                ? "text-gray-900 font-semibold"
                : "text-gray-400"
                }`}
            >
              {step}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// InitialStep Component - Redesigned
const InitialStep = ({ onSelect }) => {
  return (
    <div className="text-center py-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-8 text-center transition-all duration-300 hover:shadow-2xl border border-gray-100 cursor-pointer group">
          <div className="w-20 h-20 bg-gradient-to-r from-gold-light to-gold rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
            <i className="fas fa-user-plus text-white text-2xl"></i>
          </div>
          <h3 className="text-xl font-semibold text-primary-dark mb-3">
            Register
          </h3>
          <p className="text-gray-600 mb-6">
            Create a new professional account
          </p>
          <button
            onClick={() => onSelect("register")}
            className="bg-gradient-to-r from-gold-light to-gold text-primary-dark px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg"
          >
            Get Started
          </button>
        </div>

        <div className="bg-white rounded-2xl p-8 text-center transition-all duration-300 hover:shadow-2xl border border-gray-100 cursor-pointer group">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
            <i className="fas fa-sign-in-alt text-gray-500 text-2xl"></i>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-3">Login</h3>
          <p className="text-gray-600 mb-6">Access your existing account</p>
          <button
            onClick={() => onSelect("login")}
            className="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:bg-gray-200"
          >
            Sign In
          </button>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 mt-12 pt-6 border-t border-gray-200 max-w-2xl mx-auto">
        <p>
          By proceeding, you agree to our{" "}
          <a href="#" className="text-gold hover:underline font-medium">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-gold hover:underline font-medium">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

// PrerequisitesStep Component - Enhanced with new requirements
const PrerequisitesStep = ({
  prerequisites,
  onPrerequisiteChange,
  onBack,
  onNext,
}) => {
  const allChecked = Object.values(prerequisites).every((value) => value);

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-primary-dark mb-3">Registration Prerequisites</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Please confirm that you have all the required documents ready and agree to our terms before proceeding. All items are compulsory for registration.
        </p>
      </div>

      <div className="bg-gray-50 p-8 rounded-2xl mb-10 border border-gray-200">
        <div className="space-y-5">
          {[
            {
              id: "prereq1",
              name: "doc1",
              label: "NIC (National Identity Card)",
              compulsory: true,
            },
            {
              id: "prereq2",
              name: "doc2",
              label: "BR/Form 1 (Business Registration Certificate)",
              compulsory: true,
            },
            {
              id: "prereq3",
              name: "doc3",
              label: "Spa Banner Image",
              compulsory: true,
            },
            {
              id: "prereq4",
              name: "doc4",
              label: "Spa Facility Photos",
              compulsory: true,
            },
            {
              id: "prereq5",
              name: "doc5",
              label: "I agree with the rules and regulations",
              compulsory: true,
              highlight: true,
              important: true,
            },
          ].map((item, index) => (
            <div
              key={index}
              className={`flex items-start p-4 rounded-lg bg-white border transition-colors duration-300 ${item.important
                ? 'border-red-300 bg-red-50 hover:border-red-400 shadow-lg ring-2 ring-red-200'
                : item.highlight
                  ? 'border-gold-light bg-gold-light bg-opacity-5 hover:border-gold'
                  : 'border-gray-200 hover:border-gold'
                }`}
            >
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  id={item.id}
                  name={item.name}
                  checked={prerequisites[item.name]}
                  onChange={onPrerequisiteChange}
                  className={`w-5 h-5 focus:ring-2 border-gray-300 rounded ${item.important
                    ? 'text-red-600 focus:ring-red-500'
                    : 'text-gold focus:ring-gold'
                    }`}
                  required
                />
              </div>
              <label htmlFor={item.id} className={`ml-3 flex-1 ${item.important
                ? 'text-red-800 font-semibold'
                : 'text-gray-700'
                }`}>
                {item.important && (
                  <i className="fas fa-exclamation-triangle text-red-600 mr-2"></i>
                )}
                {item.label}
                {item.compulsory && (
                  <span className="text-red-500 ml-1 font-semibold">*</span>
                )}
                {item.important && (
                  <div className="mt-2 text-sm text-red-700 bg-red-100 p-2 rounded border border-red-200">
                    <i className="fas fa-info-circle mr-1"></i>
                    By checking this box, you acknowledge that you have read, understood, and agree to abide by all our terms, conditions, and regulations.
                  </div>
                )}
                {item.highlight && !item.important && (
                  <span className="inline-block ml-2 px-2 py-1 text-xs bg-gold text-primary-dark rounded-full font-semibold">
                    NEW
                  </span>
                )}
              </label>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <i className="fas fa-info-circle text-blue-500 mt-1"></i>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-semibold text-blue-800">Important Notice</h4>
              <p className="text-sm text-blue-700 mt-1">
                Please ensure you have your NIC, Business Registration Certificate (BR/Form 1), Spa Banner Image, and Spa Facility Photos ready before proceeding. Most importantly, carefully read and agree to our terms and regulations.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="bg-white text-primary-dark border border-gray-300 px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:border-gold hover:shadow-lg flex items-center"
        >
          <i className="fas fa-arrow-left mr-2"></i>Back
        </button>
        <button
          onClick={onNext}
          disabled={!allChecked}
          className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center ${allChecked
            ? "bg-gradient-to-r from-gold-light to-gold text-primary-dark hover:shadow-lg"
            : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
        >
          Continue<i className="fas fa-arrow-right ml-2"></i>
        </button>
      </div>
    </div>
  );
};

// UserDetailsStep Component - Redesigned
const UserDetailsStep = ({
  userDetails,
  onDetailChange,
  onFileUpload,
  onBack,
  onSubmit,
}) => {
  return (
    <div className="py-0">
      <form onSubmit={onSubmit} className="space-y-8">
        {/* Personal Information */}
        <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200">
          <h3 className="text-xl font-semibold text-primary-dark mb-6 pb-3 border-b border-gray-200">
            Personal Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 mb-3 font-medium">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={userDetails.firstName}
                onChange={onDetailChange}
                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-3 font-medium">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={userDetails.lastName}
                onChange={onDetailChange}
                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-3 font-medium">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={userDetails.email}
                onChange={onDetailChange}
                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-3 font-medium">
                NIC No.
              </label>
              <input
                type="text"
                name="nicNo"
                value={userDetails.nicNo}
                onChange={onDetailChange}
                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-3 font-medium">
                Telephone
              </label>
              <input
                type="tel"
                name="telephone"
                value={userDetails.telephone}
                onChange={onDetailChange}
                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-3 font-medium">
                Cell Phone
              </label>
              <input
                type="tel"
                name="cellphone"
                value={userDetails.cellphone}
                onChange={onDetailChange}
                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-3 font-medium">
                NIC Front Photo
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center transition-all duration-300 hover:border-gold hover:bg-white">
                <i className="fas fa-cloud-upload-alt text-gray-400 text-3xl mb-3"></i>
                <p className="text-gray-600 mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-400">JPG, PNG (Max 5MB)</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileUpload(e, "nicFront")}
                  className="hidden"
                  id="nicFront"
                  required
                />
                <label
                  htmlFor="nicFront"
                  className="mt-3 bg-gray-100 text-primary-dark px-5 py-2 rounded-lg inline-block cursor-pointer transition-all duration-300 hover:bg-gold-light"
                >
                  Select File
                </label>
              </div>
            </div>
            <div>
              <label className="block text-gray-700 mb-3 font-medium">
                NIC Back Photo
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center transition-all duration-300 hover:border-gold hover:bg-white">
                <i className="fas fa-cloud-upload-alt text-gray-400 text-3xl mb-3"></i>
                <p className="text-gray-600 mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-400">JPG, PNG (Max 5MB)</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileUpload(e, "nicBack")}
                  className="hidden"
                  id="nicBack"
                  required
                />
                <label
                  htmlFor="nicBack"
                  className="mt-3 bg-gray-100 text-primary-dark px-5 py-2 rounded-lg inline-block cursor-pointer transition-all duration-300 hover:bg-gold-light"
                >
                  Select File
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Spa Information */}
        <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200">
          <h3 className="text-xl font-semibold text-primary-dark mb-6 pb-3 border-b border-gray-200">
            Spa Information
          </h3>

          <div className="space-y-6">
            <div>
              <label className="block text-gray-700 mb-3 font-medium">
                Spa Name
              </label>
              <input
                type="text"
                name="spaName"
                value={userDetails.spaName}
                onChange={onDetailChange}
                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                required
              />
            </div>

            {/* Updated Address Section */}
            <div>
              <label className="block text-gray-700 mb-3 font-medium">
                Spa Address
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-600 mb-2 text-sm">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    name="spaAddressLine1"
                    value={userDetails.spaAddressLine1}
                    onChange={onDetailChange}
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-600 mb-2 text-sm">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    name="spaAddressLine2"
                    value={userDetails.spaAddressLine2}
                    onChange={onDetailChange}
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 mb-2 text-sm">
                    Province/State
                  </label>
                  <input
                    type="text"
                    name="spaProvince"
                    value={userDetails.spaProvince}
                    onChange={onDetailChange}
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-600 mb-2 text-sm">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="spaPostalCode"
                    value={userDetails.spaPostalCode}
                    onChange={onDetailChange}
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-3 font-medium">
                  Spa Telephone Number
                </label>
                <input
                  type="tel"
                  name="spaTelephone"
                  value={userDetails.spaTelephone}
                  onChange={onDetailChange}
                  className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-3 font-medium">
                  Spa BR Number
                </label>
                <input
                  type="text"
                  name="spaBRNumber"
                  value={userDetails.spaBRNumber}
                  onChange={onDetailChange}
                  className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-3 font-medium">
                  BR Attachment
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center transition-all duration-300 hover:border-gold hover:bg-white">
                  <i className="fas fa-file-pdf text-gray-400 text-3xl mb-3"></i>
                  <p className="text-gray-600 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-400">PDF, DOC (Max 10MB)</p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => onFileUpload(e, "brAttachment")}
                    className="hidden"
                    id="brAttachment"
                    required
                  />
                  <label
                    htmlFor="brAttachment"
                    className="mt-3 bg-gray-100 text-primary-dark px-5 py-2 rounded-lg inline-block cursor-pointer transition-all duration-300 hover:bg-gold-light"
                  >
                    Select File
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-3 font-medium">
                  Any Other Document (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center transition-all duration-300 hover:border-gold hover:bg-white">
                  <i className="fas fa-file-upload text-gray-400 text-3xl mb-3"></i>
                  <p className="text-gray-600 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-400">
                    PDF, DOC, JPG (Max 10MB)
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={(e) => onFileUpload(e, "otherDocument")}
                    className="hidden"
                    id="otherDocument"
                  />
                  <label
                    htmlFor="otherDocument"
                    className="mt-3 bg-gray-100 text-primary-dark px-5 py-2 rounded-lg inline-block cursor-pointer transition-all duration-300 hover:bg-gold-light"
                  >
                    Select File
                  </label>
                </div>
              </div>
            </div>

            {/* New Required Documents Section */}
            <div className="mt-8 p-6 bg-gradient-to-r from-gold-light to-gold bg-opacity-10 rounded-xl border border-gold-light">
              <h3 className="text-lg font-semibold text-primary-dark mb-4 flex items-center">
                <i className="fas fa-star text-gold mr-2"></i>
                Additional Required Documents
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-3 font-medium">
                    Form 1 Certificate Attachment
                    <span className="text-red-500 ml-1 font-semibold">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gold-light rounded-xl p-5 text-center transition-all duration-300 hover:border-gold hover:bg-white">
                    <i className="fas fa-certificate text-gold text-3xl mb-3"></i>
                    <p className="text-gray-600 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-400">PDF, DOC (Max 10MB)</p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => onFileUpload(e, "form1Certificate")}
                      className="hidden"
                      id="form1Certificate"
                      required
                    />
                    <label
                      htmlFor="form1Certificate"
                      className="mt-3 bg-gold text-primary-dark px-5 py-2 rounded-lg inline-block cursor-pointer transition-all duration-300 hover:bg-gold-light font-semibold"
                    >
                      Select File
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Required for private entities (Pvt Thanipudgala Wiyapara)
                  </p>
                </div>

                <div>
                  <label className="block text-gray-700 mb-3 font-medium">
                    Spa Photos Banner Attachment
                    <span className="text-red-500 ml-1 font-semibold">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gold-light rounded-xl p-5 text-center transition-all duration-300 hover:border-gold hover:bg-white">
                    <i className="fas fa-images text-gold text-3xl mb-3"></i>
                    <p className="text-gray-600 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-400">JPG, PNG (Max 10MB)</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onFileUpload(e, "spaPhotosBanner")}
                      className="hidden"
                      id="spaPhotosBanner"
                      required
                    />
                    <label
                      htmlFor="spaPhotosBanner"
                      className="mt-3 bg-gold text-primary-dark px-5 py-2 rounded-lg inline-block cursor-pointer transition-all duration-300 hover:bg-gold-light font-semibold"
                    >
                      Select File
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    High-quality banner image for spa promotion
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <button
            type="button"
            onClick={onBack}
            className="bg-white text-primary-dark border border-gray-300 px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:border-gold hover:shadow-lg flex items-center"
          >
            <i className="fas fa-arrow-left mr-2"></i>Back
          </button>
          <button
            type="submit"
            className="bg-gradient-to-r from-gold-light to-gold text-primary-dark px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg flex items-center"
          >
            Continue<i className="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </form>
    </div>
  );
};

// PaymentStep Component - Enhanced with Card and Bank Transfer Options
const PaymentStep = ({ onBack, onPaymentSuccess, userDetails }) => {
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [saveCard, setSaveCard] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardType, setCardType] = useState('');
  const [bankSlip, setBankSlip] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Test data function for development
  const fillTestData = () => {
    const testUserDetails = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@test.com",
      telephone: "0112345678",
      cellphone: "0771234567",
      nicNo: "123456789V",
      spaName: "Test Spa Resort",
      spaAddressLine1: "123 Test Street",
      spaAddressLine2: "Test Area",
      spaProvince: "Western",
      spaPostalCode: "10100",
      spaTelephone: "0112345678",
      spaBRNumber: "PV12345",
      // Note: Files need to be added manually
      nicFront: null,
      nicBack: null,
      brAttachment: null,
      form1Certificate: null,
      spaPhotosBanner: null,
      facilityPhotos: [],
      professionalCertifications: [],
      otherDocument: null,
    };

    // Update parent component's userDetails
    if (userDetails && typeof userDetails === 'object') {
      Object.keys(testUserDetails).forEach(key => {
        if (userDetails.hasOwnProperty(key)) {
          userDetails[key] = testUserDetails[key];
        }
      });
    }

    console.log('Test data filled:', testUserDetails);
  };

  const handlePaymentSubmit = async () => {
    // Basic validation
    if (paymentMethod === 'bank_transfer' && !bankSlip) {
      Swal.fire({
        title: 'Bank Slip Required',
        text: 'Please upload your bank transfer slip to continue.',
        icon: 'warning',
        confirmButtonColor: '#0A1428'
      });
      return;
    }

    // Check if basic user details are filled
    if (!userDetails.firstName || !userDetails.lastName || !userDetails.email) {
      Swal.fire({
        title: 'Incomplete Information',
        text: 'Please go back and complete all previous registration steps first.',
        icon: 'warning',
        confirmButtonColor: '#0A1428'
      });
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();

      console.log('User details being sent:', userDetails);
      console.log('Payment method:', paymentMethod);
      console.log('Bank slip:', bankSlip);

      // Add user details
      Object.keys(userDetails).forEach(key => {
        if (userDetails[key] !== null && userDetails[key] !== undefined) {
          if (userDetails[key] instanceof File) {
            formData.append(key, userDetails[key]);
            console.log(`Added file ${key}:`, userDetails[key].name);
          } else if (Array.isArray(userDetails[key])) {
            // Handle arrays (like facilityPhotos)
            userDetails[key].forEach((item, index) => {
              if (item instanceof File) {
                formData.append(`${key}`, item);
                console.log(`Added array file ${key}[${index}]:`, item.name);
              }
            });
          } else {
            formData.append(key, userDetails[key]);
            console.log(`Added field ${key}:`, userDetails[key]);
          }
        }
      });

      // Add payment details
      formData.append('paymentMethod', paymentMethod);
      console.log('Added paymentMethod:', paymentMethod);

      if (paymentMethod === 'bank_transfer' && bankSlip) {
        formData.append('bankSlip', bankSlip);
        console.log('Added bank slip:', bankSlip.name);
      }

      const response = await fetch('/api/enhanced-registration/submit', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        // Store registration data for success page
        localStorage.setItem('recentRegistration', JSON.stringify(result.data));

        Swal.fire({
          title: 'Registration Completed!',
          text: result.message || 'Your registration has been completed successfully! Your login credentials are ready.',
          icon: 'success',
          confirmButtonColor: '#0A1428',
          confirmButtonText: 'View Credentials & Continue'
        }).then(() => {
          // Redirect to success page with credentials
          window.location.href = '/registration-success';
        });
      } else {
        throw new Error(result.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Swal.fire({
        title: 'Registration Failed',
        text: error.message || 'Please check your details and try again.',
        icon: 'error',
        confirmButtonColor: '#0A1428'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const detectCardType = (number) => {
    const cleaned = number.replace(/\s/g, '');

    if (/^4/.test(cleaned)) {
      return 'visa';
    } else if (/^5[1-5]/.test(cleaned)) {
      return 'mastercard';
    } else if (/^3[47]/.test(cleaned)) {
      return 'amex';
    } else if (/^6(?:011|5)/.test(cleaned)) {
      return 'discover';
    } else {
      return '';
    }
  };

  const formatCardNumber = (value) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    // Limit to 16 digits
    const limitedDigits = digits.slice(0, 16);

    // Add space after every 4 digits
    return limitedDigits.replace(/(\d{4})/g, '$1 ').trim();
  };

  const handleCardNumberChange = (e) => {
    const input = e.target.value;
    const formatted = formatCardNumber(input);
    setCardNumber(formatted);

    // Detect and set card type
    const type = detectCardType(formatted);
    setCardType(type);
  };

  // Get card icon based on type
  const getCardIcon = () => {
    switch (cardType) {
      case 'visa':
        return 'fa-cc-visa';
      case 'mastercard':
        return 'fa-cc-mastercard';
      case 'amex':
        return 'fa-cc-amex';
      case 'discover':
        return 'fa-cc-discover';
      default:
        return 'fa-credit-card';
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handlePaymentSubmit(); }}>
      <div className="py-0">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-primary-dark mb-3">Payment Details</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Choose your preferred payment method to complete the registration process.
          </p>

          {/* Development test button */}
          {/* {process.env.NODE_ENV === 'development' && (
           <button
              ty pe="button"
              onClick={fillTestData}
              className="mt-2 bg-red-500 text-white px-4 py-2 rounded text-sm"
            >
              Fill Test Data (Dev Only)
            </button>
          )} */}
        </div>      {/* Payment Method Selection */}
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
                        className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                        maxLength={19} // 16 digits + 3 spaces
                      />
                      {cardNumber && (
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                          {cardNumber.replace(/\s/g, '').length}/16
                        </div>
                      )}
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
                      <div className="relative">
                        <i
                          className="fas fa-question-circle absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-help"
                          title="3-digit code on the back of your card"
                        ></i>
                        <input
                          type="text"
                          placeholder="123"
                          className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-light focus:border-gold transition-all duration-300"
                        />
                      </div>
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
                </div>

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
                        maxLength={3}
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

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                  <h4 className="font-semibold text-blue-800 mb-3">Bank Account Details</h4>
                  <div className="space-y-2 text-sm text-blue-700">
                    <div className="flex justify-between">
                      <span className="font-medium">Bank Name:</span>
                      <span>Bank of Ceylon</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Account Name:</span>
                      <span>Lanka Spa Association</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Account Number:</span>
                      <span>123-456-789-001</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Branch:</span>
                      <span>Colombo Main Branch</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg text-blue-800 border-t border-blue-200 pt-2 mt-2">
                      <span>Amount:</span>
                      <span>LKR 5,000.00</span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
                  <div className="flex items-start">
                    <i className="fas fa-exclamation-triangle text-amber-500 mt-1 mr-3"></i>
                    <div>
                      <h4 className="font-semibold text-amber-800 mb-2">Important Instructions</h4>
                      <ul className="text-sm text-amber-700 space-y-1">
                        <li>• Transfer the exact amount of LKR 5,000.00</li>
                        <li>• Use your NIC number as the reference</li>
                        <li>• Keep the bank slip as proof of payment</li>
                        <li>• Your registration will be pending until payment is verified</li>
                        <li>• Verification usually takes 1-2 business days</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                    <i className="fas fa-upload text-gold mr-3"></i>
                    Upload Bank Transfer Slip
                    <span className="text-red-500 ml-1 font-semibold">*</span>
                  </h4>

                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center transition-all duration-300 hover:border-gold hover:bg-gray-50">
                    {bankSlip ? (
                      <div className="flex items-center justify-center">
                        <i className="fas fa-file-image text-green-500 text-3xl mr-3"></i>
                        <div>
                          <p className="text-green-600 font-medium">{bankSlip.name}</p>
                          <p className="text-sm text-gray-500">
                            Size: {(bankSlip.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <button
                            type="button"
                            onClick={() => setBankSlip(null)}
                            className="text-red-500 hover:text-red-700 text-sm mt-2 underline"
                          >
                            Remove file
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <i className="fas fa-cloud-upload-alt text-gray-400 text-4xl mb-4"></i>
                        <p className="text-gray-600 mb-2">
                          Click to upload your bank transfer slip
                        </p>
                        <p className="text-sm text-gray-400 mb-4">
                          JPG, PNG, PDF (Max 10MB)
                        </p>
                        <input
                          type="file"
                          name="bankSlip"
                          accept="image/*,.pdf"
                          onChange={(e) => setBankSlip(e.target.files[0])}
                          className="hidden"
                          id="bankSlipUpload"
                          required={paymentMethod === 'bank_transfer'}
                        />
                        <label
                          htmlFor="bankSlipUpload"
                          className="bg-gradient-to-r from-gold-light to-gold text-primary-dark px-6 py-3 rounded-lg inline-block cursor-pointer font-semibold transition-all duration-300 hover:shadow-lg"
                        >
                          Select File
                        </label>
                      </>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 mt-3">
                    Please ensure the bank slip clearly shows the transfer amount, date, and reference number.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="bg-gradient-to-b from-gold-light to-gold rounded-2xl p-8 text-primary-dark">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-5">
                <i className="fas fa-credit-card text-white text-3xl"></i>
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
                  <i className="fas fa-check-circle mr-2"></i> Premium listing in
                  our directory
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check-circle mr-2"></i> Exclusive
                  networking events
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check-circle mr-2"></i> Professional
                  certification
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check-circle mr-2"></i> Marketing support
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check-circle mr-2"></i> Industry insights &
                  reports
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
            type="submit"
            disabled={isProcessing || (paymentMethod === 'bank_transfer' && !bankSlip)}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg flex items-center ${isProcessing || (paymentMethod === 'bank_transfer' && !bankSlip)
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-gold-light to-gold text-primary-dark hover:shadow-lg'
              }`}
          >
            {isProcessing ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Processing...
              </>
            ) : (
              <>
                Complete Registration<i className="fas fa-check ml-2"></i>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

// Main RegistrationPage Component
const Registration = () => {
  const [step, setStep] = useState(1);
  const [prerequisites, setPrerequisites] = useState({
    doc1: false, // NIC
    doc2: false, // BR/Form 1
    doc3: false, // Spa Banner image
    doc4: false, // Spa facility photos
    doc5: false, // Rules and regulations agreement
  });

  const [userDetails, setUserDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    telephone: "",
    cellphone: "",
    nicNo: "",
    nicFront: null,
    nicBack: null,
    spaName: "",
    spaAddressLine1: "",
    spaAddressLine2: "",
    spaProvince: "",
    spaPostalCode: "",
    spaTelephone: "",
    spaBRNumber: "",
    brAttachment: null,
    form1Certificate: null,
    spaPhotosBanner: null,
    facilityPhotos: [],
    professionalCertifications: [],
    otherDocument: null,
  });

  // Handle user type selection
  const handleUserTypeSelect = (type) => {
    if (type === "register") {
      setStep(2);
    } else {
      // Redirect to login page
      console.log("Redirect to login page");
    }
  };

  // Handle prerequisite checkbox changes
  const handlePrerequisiteChange = (e) => {
    const { name, checked } = e.target;
    setPrerequisites({
      ...prerequisites,
      [name]: checked,
    });
  };

  // Handle user details form changes
  const handleUserDetailsChange = (e) => {
    const { name, value } = e.target;
    setUserDetails({
      ...userDetails,
      [name]: value,
    });
  };

  // Handle file uploads
  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    setUserDetails({
      ...userDetails,
      [fieldName]: file,
    });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically validate and send data to your backend
    console.log("Form submitted:", userDetails);
    // Proceed to payment step
    setStep(4);
  };

  // Handle payment success
  const handlePaymentSuccess = () => {
    // Here you would typically process payment and then save data
    Swal.fire({
      title: 'Payment Successful!',
      text: 'Payment processed successfully! Registration complete.',
      icon: 'success',
      confirmButtonColor: '#0A1428'
    });
    // Reset form or redirect to success page
  };

  // Get the appropriate header title based on current step
  const getHeaderTitle = () => {
    switch (step) {
      case 1:
        return "Lanka Spa Association Registration";
      case 2:
        return "Registration Prerequisites";
      case 3:
        return "Add your Spa & User Details";
      case 4:
        return "Add your payment details";
      default:
        return "Lanka Spa Association Registration";
    }
  };

  // Get the appropriate header subtitle based on current step
  const getHeaderSubtitle = () => {
    switch (step) {
      case 1:
        return "Premium Membership Application";
      case 2:
        return "To ensure a smooth registration process, please have the following documents ready before proceeding:";
      case 3:
        return "Please provide your details to complete registration";
      case 4:
        return "Secure payment processing";
      default:
        return "Premium Membership Application";
    }
  };

  // Render the appropriate step
  const renderStep = () => {
    switch (step) {
      case 1:
        return <InitialStep onSelect={handleUserTypeSelect} />;
      case 2:
        return (
          <PrerequisitesStep
            prerequisites={prerequisites}
            onPrerequisiteChange={handlePrerequisiteChange}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        );
      case 3:
        return (
          <UserDetailsStep
            userDetails={userDetails}
            onDetailChange={handleUserDetailsChange}
            onFileUpload={handleFileUpload}
            onBack={() => setStep(2)}
            onSubmit={handleSubmit}
          />
        );
      case 4:
        return (
          <PaymentStep
            userDetails={userDetails}
            onBack={() => setStep(3)}
            onPaymentSuccess={handlePaymentSuccess}
          />
        );
      default:
        return <InitialStep onSelect={handleUserTypeSelect} />;
    }
  };

  return (
    <div className="min-h-auto bg-gradient-to-b from-gray-50 to-gray-100 py-0 px-0">
      <div className="max-w-full mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-dark to-primary-darken py-10 px-10 text-black">
          <div className="text-center mb-6">
            <i className="fas fa-spa text-4xl text-gold mb-4"></i>
            <h1 className="text-4xl font-serif font-bold">
              {getHeaderTitle()}
            </h1>
            <p className="text-gold-light mt-2">
              {getHeaderSubtitle()}
            </p>
          </div>
          <ProgressIndicator currentStep={step} />
        </div>

        {/* Content Area */}
        <div className="px-10 pb-12">{renderStep()}</div>

        {/* Footer */}
      </div>
    </div>
  );
};

export default Registration;