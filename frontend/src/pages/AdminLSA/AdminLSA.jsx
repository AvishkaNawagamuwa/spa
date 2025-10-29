import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  PhotoIcon,
  KeyIcon,
  BellIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  DocumentIcon,
  PlayIcon,
  SpeakerWaveIcon,
  NewspaperIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CogIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowPathIcon,
  CreditCardIcon,
  ArrowDownTrayIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import {
  FiHome,
  FiUsers,
  FiUserPlus,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiChevronLeft,
  FiBell
} from 'react-icons/fi';
import axios from 'axios';
import Swal from 'sweetalert2';
import io from 'socket.io-client';
import assets from '../../assets/images/images';

// Import existing and new components
import Dashboard from './Dashboard';
import ManageSpas from './ManageSpas';
import ManageTherapists from './ManageTherapists';

// Helper function to fix bank slip URLs
const fixBankSlipUrl = (bankSlipPath) => {
  if (!bankSlipPath) return null;

  let bankSlipUrl = bankSlipPath;

  // If the URL contains '/api/bank-slip/', replace it with '/uploads/payment-slips/'
  if (bankSlipUrl.includes('/api/bank-slip/')) {
    bankSlipUrl = bankSlipUrl.replace('/api/bank-slip/', '/uploads/payment-slips/');
  }

  // Ensure it starts with the correct base URL
  if (!bankSlipUrl.startsWith('http')) {
    if (bankSlipUrl.startsWith('/uploads/')) {
      bankSlipUrl = `http://localhost:3001${bankSlipUrl}`;
    } else if (bankSlipUrl.startsWith('uploads/')) {
      bankSlipUrl = `http://localhost:3001/${bankSlipUrl}`;
    } else {
      bankSlipUrl = `http://localhost:3001/uploads/payment-slips/${bankSlipUrl}`;
    }
  }

  return bankSlipUrl;
};

const AdminLSA = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Socket.io connection
  const [socket, setSocket] = useState(null);

  // Initialize Socket.io connection for LSA
  useEffect(() => {
    const newSocket = io('http://localhost:3001');

    newSocket.emit('join_lsa');

    newSocket.on('connect', () => {
      console.log('LSA connected to server');
    });

    newSocket.on('new_therapist_registration', (data) => {
      console.log('New therapist registration:', data);

      // Refresh therapist list
      loadTherapists();
      loadDashboardData();

      // Show notification
      Swal.fire({
        icon: 'info',
        title: 'New Therapist Registration',
        text: data.message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true
      });
    });

    // Listen for new database notifications
    newSocket.on('newNotification', (notification) => {
      console.log('New notification received:', notification);

      // Refresh notification count and data
      checkForNewNotifications();
      loadNotifications();

      // If it's on the therapists page, refresh the list
      if (notification.type === 'therapist_registration') {
        loadTherapists();
        loadDashboardData();
      }
    });

    setSocket(newSocket);

    // Listen for tab change events from Dashboard quick actions
    const handleTabChange = (event) => {
      setActiveTab(event.detail);
    };

    window.addEventListener('changeTab', handleTabChange);

    // Load initial data
    loadDashboardData();
    loadNotifications();

    return () => {
      newSocket.disconnect();
      window.removeEventListener('changeTab', handleTabChange);
    };
  }, []);

  // Dashboard data
  const [dashboardStats, setDashboardStats] = useState({
    totalSpas: 0,
    verifiedSpas: 0,
    pendingSpas: 0,
    totalTherapists: 0,
    approvedTherapists: 0,
    pendingTherapists: 0,
    recentActivities: []
  });

  // Spa management
  const [spas, setSpas] = useState([]);
  const [selectedSpa, setSelectedSpa] = useState(null);
  const [spaFilters, setSpaFilters] = useState({ status: 'all', verification: 'all' });

  // Therapist management
  const [therapists, setTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [therapistTab, setTherapistTab] = useState('pending');
  const [rejectionReason, setRejectionReason] = useState('');

  // Media management
  const [mediaTab, setMediaTab] = useState('photos');
  const [mediaItems, setMediaItems] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [newsContent, setNewsContent] = useState('');
  const [newsTitle, setNewsTitle] = useState('');

  // Third-party login
  const [thirdPartyCredentials, setThirdPartyCredentials] = useState({ username: '', password: '' });
  const [isThirdPartyLoggedIn, setIsThirdPartyLoggedIn] = useState(false);
  const [governmentOfficers, setGovernmentOfficers] = useState([]);
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Modal states
  const [showSpaModal, setShowSpaModal] = useState(false);
  const [showTherapistModal, setShowTherapistModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAddSpaModal, setShowAddSpaModal] = useState(false);
  const [showMediaUploadModal, setShowMediaUploadModal] = useState(false);
  const [showNotificationHistory, setShowNotificationHistory] = useState(false);

  // Notification history
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Enhanced notification history system
  const [notificationFilters, setNotificationFilters] = useState({
    type: 'all',
    status: 'all',
    limit: '100'
  });
  const [notificationSummary, setNotificationSummary] = useState({
    therapists: { total: 0, pending: 0, approved: 0, rejected: 0, resigned: 0, terminated: 0 },
    spas: { total: 0, pending: 0, verified: 0, rejected: 0, blacklisted: 0 },
    activity: { therapist_actions_today: 0, spa_actions_today: 0, therapist_actions_week: 0, spa_actions_week: 0 }
  });

  // API base URL
  const API_BASE = 'http://localhost:3001/api';

  // Simple headers without authentication
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json'
    };
  };

  // Notification system state
  const [lastNotificationCheck, setLastNotificationCheck] = useState(Date.now());
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Financial management states
  const [financialData, setFinancialData] = useState({
    totalRegistration: 0,
    totalAnnual: 0,
    monthlyData: [],
    summary: {}
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [bankTransfers, setBankTransfers] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [financialTab, setFinancialTab] = useState('overview');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Show new therapist notification
  const showNewTherapistNotification = (count) => {
    Swal.fire({
      title: '🔔 New Therapist Request!',
      text: `${count} new therapist ${count === 1 ? 'request has' : 'requests have'} been submitted for approval.`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'View Requests',
      cancelButtonText: 'Later',
      toast: true,
      position: 'top-end',
      timer: 10000,
      timerProgressBar: true,
      showClass: {
        popup: 'animate__animated animate__fadeInDown'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setActiveTab('therapists');
        setTherapistTab('pending');
      }
    });
  };

  // Check for new notifications
  const checkForNewNotifications = async () => {
    try {
      // Get unread count
      const countResponse = await axios.get(`${API_BASE}/lsa/notifications/unread`);
      if (countResponse.data.success) {
        const currentUnreadCount = countResponse.data.data.count;

        // If there are new notifications, refresh the notifications list
        if (currentUnreadCount > unreadNotifications) {
          // Load all notifications to get the latest ones
          await loadNotifications();

          // Update unread count
          setUnreadNotifications(currentUnreadCount);
        }
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  // Load enhanced notification history from database
  const loadNotificationHistory = async () => {
    try {
      setLoading(true);

      // Build query parameters based on filters
      const params = new URLSearchParams({
        limit: notificationFilters.limit,
        offset: '0',
        type: notificationFilters.type,
        status: notificationFilters.status
      });

      console.log('📊 Loading notification history with filters:', notificationFilters);

      const response = await axios.get(`${API_BASE}/lsa/notifications/history?${params.toString()}`);

      if (response.data.success) {
        setNotificationHistory(response.data.data);
        console.log(`✅ Loaded ${response.data.data.length} notification history records`);

        // Also load summary
        await loadNotificationSummary();
      } else {
        console.error('❌ Failed to load notification history:', response.data.message);
        setNotificationHistory([]);
      }
    } catch (error) {
      console.error('❌ Error loading notification history:', error);
      setNotificationHistory([]);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load notification history. Please try again.',
        toast: true,
        position: 'top-end',
        timer: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  // Load notification summary statistics
  const loadNotificationSummary = async () => {
    try {
      const response = await axios.get(`${API_BASE}/lsa/notifications/summary`);

      if (response.data.success) {
        setNotificationSummary(response.data.data);
        console.log('📊 Loaded notification summary statistics');
      } else {
        console.error('❌ Failed to load notification summary:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error loading notification summary:', error);
    }
  };

  // Load all notifications from database
  const loadNotifications = async () => {
    try {
      const response = await axios.get(`${API_BASE}/lsa/notifications`);
      if (response.data.success) {
        setNotifications(response.data.data);
        // Update unread count
        const unreadCount = response.data.data.filter(n => n.is_read === 0).length;
        setUnreadNotifications(unreadCount);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Use existing in-memory notifications as fallback
    }
  };

  // Enhanced View Details functionality
  const handleViewTherapistDetails = async (therapistId) => {
    try {
      setLoading(true);

      // Load therapist details
      const therapistResponse = await axios.get(`${API_BASE}/lsa/therapists`);
      if (therapistResponse.data.success) {
        const therapist = therapistResponse.data.data.find(t => t.id === therapistId || t.therapist_id === therapistId);
        if (therapist) {
          setSelectedTherapist(therapist);
          setShowTherapistModal(true);

          // Load notification history for this therapist
          await loadNotificationHistory(therapistId);
        } else {
          Swal.fire('Error', 'Therapist not found', 'error');
        }
      }
    } catch (error) {
      console.error('Error loading therapist details:', error);
      Swal.fire('Error', 'Failed to load therapist details', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle therapist rejection with reason
  const handleTherapistReject = async () => {
    if (!rejectionReason.trim()) {
      Swal.fire({
        title: 'Missing Information',
        text: 'Please provide a reason for rejection',
        icon: 'warning',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(`${API_BASE}/lsa/therapists/${selectedTherapist.id || selectedTherapist.therapist_id}/reject`, {
        reason: rejectionReason
      });

      if (response.data.success) {
        Swal.fire({
          title: '❌ Rejected',
          text: `Therapist has been rejected. The spa has been notified with your feedback.`,
          icon: 'info',
          confirmButtonColor: '#3b82f6',
          timer: 3000
        });

        // Reset form and close modals
        setRejectionReason('');
        setShowRejectModal(false);
        setSelectedTherapist(null);

        // Refresh therapist list
        loadTherapists();
        loadDashboardData();
      }
    } catch (error) {
      console.error('Therapist rejection error:', error);
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to reject therapist',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/lsa/dashboard`);
      if (response.data.success) {
        const data = response.data.data;
        const previousPending = dashboardStats.pendingTherapists;
        const currentPending = data.therapist_statistics?.pending_applications || 0;

        setDashboardStats({
          totalSpas: data.spa_statistics?.total_spas || 0,
          verifiedSpas: data.spa_statistics?.verified_spas || 0,
          pendingSpas: data.spa_statistics?.pending_verification || 0,
          totalTherapists: data.therapist_statistics?.total_therapists || 0,
          approvedTherapists: data.therapist_statistics?.approved_therapists || 0,
          pendingTherapists: currentPending,
          recentActivities: data.recent_activities || []
        });

        // Check for new pending therapists and show notification
        if (previousPending > 0 && currentPending > previousPending) {
          const newRequests = currentPending - previousPending;
          showNewTherapistNotification(newRequests);
        }

        setNotifications(data.system_notifications || []);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
      // Set dummy data for demonstration
      setDashboardStats({
        totalSpas: 45,
        verifiedSpas: 32,
        pendingSpas: 8,
        totalTherapists: 156,
        approvedTherapists: 134,
        pendingTherapists: 15,
        recentActivities: [
          { id: 1, message: 'New spa registration from Colombo Wellness Center', time: '2 hours ago', type: 'spa' },
          { id: 2, message: 'Therapist application approved for Jane Smith', time: '4 hours ago', type: 'therapist' },
          { id: 3, message: 'Spa verification completed for Royal Spa', time: '1 day ago', type: 'verification' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  // Load spas
  const loadSpas = async () => {
    try {
      setLoading(true);
      let url = `${API_BASE}/lsa/spas?page=1&limit=50`;
      if (spaFilters.status !== 'all') url += `&status=${spaFilters.status}`;
      if (spaFilters.verification !== 'all') url += `&verification_status=${spaFilters.verification}`;
      if (searchQuery) url += `&search=${searchQuery}`;

      const response = await axios.get(url);
      if (response.data.success) {
        setSpas(response.data.data.spas || []);
      }
    } catch (error) {
      console.error('Spas load error:', error);
      // Set dummy data
      setSpas([
        {
          spa_id: 1,
          spa_name: 'Luxury Wellness Spa',
          owner_name: 'John Doe',
          email: 'john@luxuryspa.com',
          contact_phone: '+94771234567',
          city: 'Colombo',
          verification_status: 'pending',
          status: 'active',
          created_at: '2024-01-15'
        },
        {
          spa_id: 2,
          spa_name: 'Royal Treatment Center',
          owner_name: 'Sarah Johnson',
          email: 'sarah@royal.lk',
          contact_phone: '+94771234568',
          city: 'Kandy',
          verification_status: 'verified',
          status: 'active',
          created_at: '2024-01-10'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Load therapists
  const loadTherapists = async (showNotification = false) => {
    try {
      setLoading(true);
      const prevCount = therapists.filter(t => t.status === 'pending').length;
      const response = await axios.get(`${API_BASE}/lsa/therapists?status=${therapistTab}&page=1&limit=50`);
      if (response.data.success) {
        const newTherapists = response.data.data.therapists || [];
        setTherapists(newTherapists);

        // Check for new pending therapists if this is a refresh
        if (showNotification && therapistTab === 'pending') {
          const newCount = newTherapists.length;
          if (newCount > prevCount) {
            const newRequestsCount = newCount - prevCount;
            showNewTherapistNotification(newRequestsCount);
          }
        }
      }
    } catch (error) {
      console.error('Therapists load error:', error);
      // Set dummy data
      setTherapists([
        {
          therapist_id: 1,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          phone: '+94771234569',
          spa_name: 'Luxury Wellness Spa',
          specialization: ['massage', 'aromatherapy'],
          experience_years: 5,
          status: therapistTab,
          created_at: '2024-01-12',
          nic_attachment: '/uploads/therapists/nic1.jpg',
          medical_certificate: '/uploads/therapists/medical1.pdf'
        },
        {
          therapist_id: 2,
          first_name: 'Mike',
          last_name: 'Wilson',
          email: 'mike@example.com',
          phone: '+94771234570',
          spa_name: 'Royal Treatment Center',
          specialization: ['facial', 'body_treatment'],
          experience_years: 3,
          status: therapistTab,
          created_at: '2024-01-14',
          nic_attachment: '/uploads/therapists/nic2.jpg',
          medical_certificate: '/uploads/therapists/medical2.pdf'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Verify spa (approve/reject)
  const verifySpa = async (spaId, action, comments = '') => {
    try {
      setLoading(true);
      const response = await axios.put(`${API_BASE}/lsa/spas/${spaId}/verify`, {
        action,
        admin_comments: comments
      });

      if (response.data.success) {
        setSuccess(`Spa ${action}d successfully`);
        loadSpas();
        loadDashboardData();
        setShowSpaModal(false);
      }
    } catch (error) {
      setError(`Failed to ${action} spa: ${error.message}`);
      // Simulate success for demo
      setSuccess(`Spa ${action}d successfully (Demo)`);
      loadSpas();
      loadDashboardData();
      setShowSpaModal(false);
    } finally {
      setLoading(false);
    }
  };

  // Approve/Reject therapist
  const handleTherapistAction = async (therapistId, action, reason = '') => {
    try {
      setLoading(true);
      let response;

      if (action === 'approve') {
        response = await axios.put(`${API_BASE}/lsa/therapists/${therapistId}/approve`, {
          admin_comments: 'Approved by LSA Admin'
        });
      } else {
        response = await axios.put(`${API_BASE}/lsa/therapists/${therapistId}/reject`, {
          rejection_reason: reason,
          admin_comments: reason
        });
      }

      if (response.data.success) {
        // Show success message
        Swal.fire({
          icon: 'success',
          title: `Therapist ${action === 'approve' ? 'Approved' : 'Rejected'}!`,
          text: `The therapist has been ${action}d successfully. The spa has been notified.`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 5000,
          timerProgressBar: true
        });

        setSuccess(`Therapist ${action}d successfully`);
        loadTherapists();
        loadDashboardData();
        setShowRejectModal(false);
        setRejectionReason('');
      }
    } catch (error) {
      setError(`Failed to ${action} therapist: ${error.message}`);
      // Simulate success for demo
      setSuccess(`Therapist ${action}d successfully (Demo)`);
      loadTherapists();
      loadDashboardData();
      setShowRejectModal(false);
      setRejectionReason('');
    } finally {
      setLoading(false);
    }
  };

  // Handle third-party login
  const handleThirdPartyLogin = async (e) => {
    e.preventDefault();
    if (!thirdPartyCredentials.username || !thirdPartyCredentials.password) {
      Swal.fire('Error', 'Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/lsa/third-party/create`, {
        username: thirdPartyCredentials.username,
        password: thirdPartyCredentials.password,
        duration: 8 // 8 hours expiry
      });

      if (response.data.success) {
        setGeneratedPassword(response.data.data.temporaryPassword);
        setIsThirdPartyLoggedIn(true);
        await loadGovernmentOfficers(); // Refresh the list
        Swal.fire({
          title: 'Account Created!',
          html: `
            <p><strong>Username:</strong> ${response.data.data.username}</p>
            <p><strong>Status:</strong> Active</p>
            <p><strong>Expires:</strong> ${new Date(response.data.data.expiresAt).toLocaleString()}</p>
            <p class="text-sm text-gray-600 mt-2">Government officer account created successfully!</p>
          `,
          icon: 'success',
          confirmButtonText: 'Got it!'
        });
      }
    } catch (error) {
      console.error('Error creating government officer account:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create account';
      Swal.fire('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load government officer accounts
  const loadGovernmentOfficers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/lsa/third-party/accounts`);
      if (response.data.success) {
        setGovernmentOfficers(response.data.data);
      }
    } catch (error) {
      console.error('Error loading government officers:', error);
    }
  };

  // Delete government officer account
  const deleteGovernmentOfficer = async (id, username) => {
    const result = await Swal.fire({
      title: 'Delete Account?',
      text: `Are you sure you want to delete the account for ${username}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const response = await axios.delete(`${API_BASE}/lsa/third-party/account/${id}`);
        if (response.data.success) {
          await loadGovernmentOfficers(); // Refresh the list
          Swal.fire('Deleted!', 'The account has been deleted.', 'success');
        }
      } catch (error) {
        console.error('Error deleting government officer:', error);
        Swal.fire('Error', 'Failed to delete account', 'error');
      }
    }
  };

  // Financial data functions
  const loadFinancialData = async (year = selectedYear) => {
    try {
      setLoading(true);
      console.log('🔄 Loading financial data for year:', year);

      const response = await axios.get(`${API_BASE}/lsa/enhanced/financial/monthly?year=${year}`);

      console.log('📥 Financial API response:', response.data);

      if (response.data.success) {
        setFinancialData(response.data.data);
        setError(''); // Clear any previous errors
        console.log('✅ Financial data loaded successfully');
      } else {
        setError('API returned unsuccessful response');
        console.log('❌ API returned unsuccessful response:', response.data);
      }
    } catch (error) {
      console.error('❌ Error loading financial data:', error);
      setError(`Failed to load financial data: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading payment history...');

      const response = await axios.get(`${API_BASE}/lsa/enhanced/payments/history`);

      if (response.data.success) {
        setPaymentHistory(response.data.data);
        setError(''); // Clear any previous errors
        console.log('✅ Payment history loaded:', response.data.data.length, 'records');
      }
    } catch (error) {
      console.error('❌ Error loading payment history:', error);
      setError('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const loadBankTransfers = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading bank transfers...');

      const response = await axios.get(`${API_BASE}/lsa/enhanced/payments/bank-transfers`);

      if (response.data.success) {
        setBankTransfers(response.data.data);
        setError(''); // Clear any previous errors
        console.log('✅ Bank transfers loaded:', response.data.data.length, 'records');
      }
    } catch (error) {
      console.error('❌ Error loading bank transfers:', error);
      setError('Failed to load bank transfers');
    } finally {
      setLoading(false);
    }
  };

  const approveBankTransfer = async (paymentId, notes = '') => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/lsa/enhanced/payments/${paymentId}/approve`, {
        notes
      });

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Payment Approved',
          text: 'Bank transfer has been approved successfully',
          timer: 2000
        });

        // Refresh data
        await loadBankTransfers();
        await loadPaymentHistory();
        await loadFinancialData();
      }
    } catch (error) {
      console.error('Error approving bank transfer:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to approve bank transfer'
      });
    } finally {
      setLoading(false);
    }
  };

  const rejectBankTransfer = async (paymentId, reason) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/lsa/enhanced/payments/${paymentId}/reject`, {
        reason
      });

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Payment Rejected',
          text: 'Bank transfer has been rejected',
          timer: 2000
        });

        // Refresh data
        await loadBankTransfers();
        await loadPaymentHistory();
      }
    } catch (error) {
      console.error('Error rejecting bank transfer:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to reject bank transfer'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle logout function
  const handleLogout = () => {
    Swal.fire({
      title: 'Confirm Logout',
      text: 'Are you sure you want to logout from AdminLSA Dashboard?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0A1428',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, Logout',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        // Clear authentication data
        localStorage.removeItem('userData');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');

        // Disconnect socket if connected
        if (socket) {
          socket.disconnect();
        }

        // Show success message
        Swal.fire({
          title: 'Logged Out Successfully',
          text: 'You have been logged out from AdminLSA Dashboard',
          icon: 'success',
          confirmButtonColor: '#0A1428',
          timer: 1500,
          showConfirmButton: false
        });

        // Navigate to home page
        setTimeout(() => {
          navigate('/');
        }, 1000);
      }
    });
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardData();
    } else if (activeTab === 'spas') {
      loadSpas();
    } else if (activeTab === 'therapists') {
      loadTherapists();
    } else if (activeTab === 'financial') {
      if (financialTab === 'overview') {
        loadFinancialData();
      } else if (financialTab === 'history') {
        loadPaymentHistory();
      } else if (financialTab === 'approvals') {
        loadBankTransfers();
      }
    } else if (activeTab === 'third-party') {
      loadGovernmentOfficers();
    } else if (activeTab === 'notifications') {
      loadNotificationHistory();
    }
  }, [activeTab, spaFilters, therapistTab, searchQuery, notificationFilters, financialTab, selectedYear]);

  // Real-time notification polling
  useEffect(() => {
    // Initial load
    loadDashboardData();
    loadNotifications();
    checkForNewNotifications();

    // Set up polling for new notifications every 5 seconds, more frequent if on notification history
    const notificationInterval = setInterval(() => {
      checkForNewNotifications();
      // If on notification history page, refresh notifications more frequently
      if (activeTab === 'notification_history') {
        loadNotifications();
      }
    }, 5000);

    // Set up dashboard refresh every 30 seconds
    const dashboardInterval = setInterval(() => {
      if (activeTab === 'dashboard') {
        loadDashboardData();
      }
    }, 30000);

    return () => {
      clearInterval(notificationInterval);
      clearInterval(dashboardInterval);
    };
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Load financial data when financial tab changes
  useEffect(() => {
    console.log('💳 Financial tab effect triggered:', { activeTab, financialTab, selectedYear });

    if (activeTab === 'financial' && financialTab) {
      console.log('🎯 Loading financial data for tab:', financialTab);
      if (financialTab === 'overview') {
        loadFinancialData();
      } else if (financialTab === 'history') {
        loadPaymentHistory();
      } else if (financialTab === 'approvals') {
        loadBankTransfers();
      }
    }
  }, [activeTab, financialTab, selectedYear]);

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
    { id: 'spas', label: 'Manage Spas', icon: BuildingOfficeIcon },
    { id: 'therapists', label: 'Manage Therapists', icon: UserGroupIcon },
    { id: 'financial', label: 'Financial', icon: CreditCardIcon },
    { id: 'third-party', label: 'Third-Party Login', icon: KeyIcon },
    { id: 'notifications', label: 'Notification History', icon: BellIcon },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'spas':
        return <ManageSpas />;
      case 'therapists':
        return <ManageTherapists />;
      case 'financial':
        return renderFinancialOverview();
      case 'third-party':
        return renderThirdPartyLogin();
      case 'notifications':
        return renderNotificationHistory();
      default:
        return <Dashboard />;
    }
  };

  const renderDashboard = () => (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">LSA Admin Dashboard</h1>
        <button
          onClick={loadDashboardData}
          className="bg-[#0A1428] text-white px-4 py-2 rounded-lg hover:bg-[#0A1428]/90 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <BuildingOfficeIcon className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Spas</h3>
              <p className="text-3xl font-bold text-gray-900">{dashboardStats.totalSpas}</p>
              <div className="flex items-center mt-2 text-sm">
                <span className="text-green-600 font-medium">Verified: {dashboardStats.verifiedSpas}</span>
                <span className="text-orange-600 font-medium ml-4">Pending: {dashboardStats.pendingSpas}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <UserGroupIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Therapists</h3>
              <p className="text-3xl font-bold text-gray-900">{dashboardStats.totalTherapists}</p>
              <div className="flex items-center mt-2 text-sm">
                <span className="text-green-600 font-medium">Approved: {dashboardStats.approvedTherapists}</span>
                <span className="text-orange-600 font-medium ml-4">Pending: {dashboardStats.pendingTherapists}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <ClockIcon className="w-8 h-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Pending Actions</h3>
              <p className="text-3xl font-bold text-gray-900">
                {dashboardStats.pendingSpas + dashboardStats.pendingTherapists}
              </p>
              <div className="flex items-center mt-2 text-sm">
                <span className="text-orange-600 font-medium">
                  {dashboardStats.pendingSpas} Spas, {dashboardStats.pendingTherapists} Therapists
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          {dashboardStats.recentActivities.length > 0 ? (
            <div className="space-y-4">
              {dashboardStats.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full mt-2 ${activity.type === 'spa' ? 'bg-yellow-500' :
                      activity.type === 'therapist' ? 'bg-blue-400' :
                        'bg-green-400'
                      }`}></div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderSpaManagement = () => (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Spa Management</h1>
        <button
          onClick={() => setShowAddSpaModal(true)}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Spa
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
            <select
              value={spaFilters.status}
              onChange={(e) => setSpaFilters({ ...spaFilters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Verification Status</label>
            <select
              value={spaFilters.verification}
              onChange={(e) => setSpaFilters({ ...spaFilters, verification: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Verification</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search spas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Spa List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spa Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {spas.map((spa) => (
                <tr key={spa.spa_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{spa.spa_name}</div>
                      <div className="text-sm text-gray-500">{spa.city}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{spa.owner_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{spa.email}</div>
                    <div className="text-sm text-gray-500">{spa.contact_phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${spa.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                        spa.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                        {spa.verification_status}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${spa.status === 'active' ? 'bg-green-100 text-green-800' :
                        spa.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                        {spa.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedSpa(spa);
                          setShowSpaModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="View Details"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      {spa.verification_status === 'pending' && (
                        <>
                          <button
                            onClick={() => verifySpa(spa.spa_id, 'approve')}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSpa(spa);
                              setShowRejectModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTherapistManagement = () => (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Therapist Management</h1>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['pending', 'approved', 'rejected'].map((tab) => (
              <button
                key={tab}
                onClick={() => setTherapistTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${therapistTab === tab
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} ({therapists.filter(t => t.status === tab).length || 0})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Therapist List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Therapist</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {therapists.filter(t => t.status === therapistTab).map((therapist) => (
                <tr key={therapist.id || therapist.therapist_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {therapist.first_name} {therapist.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{therapist.email}</div>
                    <div className="text-sm text-gray-500">{therapist.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{therapist.spa_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {Array.isArray(therapist.specialization)
                        ? therapist.specialization.join(', ')
                        : therapist.specialization}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{therapist.experience_years} years</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedTherapist(therapist);
                          setShowTherapistModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="View Details"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      {therapist.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleTherapistAction(therapist.id || therapist.therapist_id, 'approve')}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTherapist(therapist);
                              setShowRejectModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderMediaGallery = () => (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Media Gallery Management</h1>
        <button
          onClick={() => setShowMediaUploadModal(true)}
          className="bg-[#0A1428] text-white px-4 py-2 rounded-lg hover:bg-[#0A1428]/90 transition-colors flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Upload Media
        </button>
      </div>

      {/* Media Type Tabs */}
      <div className="mb-6">
        <div className="flex space-x-4">
          {[
            { id: 'photos', label: 'Photos', icon: PhotoIcon },
            { id: 'videos', label: 'Videos', icon: PlayIcon },
            { id: 'news', label: 'News', icon: NewspaperIcon },
            { id: 'voice', label: 'Voice Cuts', icon: SpeakerWaveIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMediaTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium ${mediaTab === tab.id
                ? 'bg-[#0A1428] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Demo media items */}
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
              {mediaTab === 'photos' && <PhotoIcon className="w-12 h-12 text-gray-400" />}
              {mediaTab === 'videos' && <PlayIcon className="w-12 h-12 text-gray-400" />}
              {mediaTab === 'news' && <NewspaperIcon className="w-12 h-12 text-gray-400" />}
              {mediaTab === 'voice' && <SpeakerWaveIcon className="w-12 h-12 text-gray-400" />}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">
                {mediaTab === 'news' ? `News Article ${item}` : `${mediaTab.charAt(0).toUpperCase() + mediaTab.slice(1)} ${item}`}
              </span>
              <div className="flex space-x-2">
                <button className="text-blue-600 hover:text-blue-800">
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button className="text-red-600 hover:text-red-800">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            {mediaTab === 'news' && (
              <p className="text-sm text-gray-600 mt-2">
                This is a sample news article content preview...
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderNotificationHistory = () => (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notification History</h1>
          <p className="text-gray-600 mt-2">View all therapist and spa actions dynamically from database</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadNotificationHistory}
            className="bg-[#0A1428] text-white px-4 py-2 rounded-lg hover:bg-[#0A1428]/90 flex items-center"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Dynamic Stats from Database */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <BellIcon className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">{notificationHistory.length}</p>
              <p className="text-gray-600">Total Actions</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <CheckIcon className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">
                {notificationHistory.filter(n => n.status === 'approved' || n.status === 'verified').length}
              </p>
              <p className="text-gray-600">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <XMarkIcon className="w-8 h-8 text-red-600" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">
                {notificationHistory.filter(n => n.status === 'rejected').length}
              </p>
              <p className="text-gray-600">Rejected</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <UserGroupIcon className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">
                {notificationHistory.filter(n => n.entity_type === 'therapist').length}
              </p>
              <p className="text-gray-600">Therapist Actions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Notifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
            <select
              value={notificationFilters.type}
              onChange={(e) => setNotificationFilters({ ...notificationFilters, type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Types</option>
              <option value="therapist">Therapists</option>
              <option value="spa">Spas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={notificationFilters.status}
              onChange={(e) => setNotificationFilters({ ...notificationFilters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="resigned">Resigned</option>
              <option value="terminated">Terminated</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Limit</label>
            <select
              value={notificationFilters.limit}
              onChange={(e) => setNotificationFilters({ ...notificationFilters, limit: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
            >
              <option value="50">50 Records</option>
              <option value="100">100 Records</option>
              <option value="200">200 Records</option>
              <option value="500">500 Records</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadNotificationHistory}
              className="w-full bg-[#0A1428] text-white px-4 py-2 rounded-lg hover:bg-[#0A1428]/90"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Notifications List from Database */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Action History</h3>
          <p className="text-sm text-gray-600 mt-1">Real-time data from therapists and spas tables</p>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <ArrowPathIcon className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading History...</h3>
              <p className="text-gray-600">Fetching latest data from database...</p>
            </div>
          ) : notificationHistory.length === 0 ? (
            <div className="p-8 text-center">
              <BellIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Action History</h3>
              <p className="text-gray-600">No actions found with current filters.</p>
            </div>
          ) : (
            notificationHistory.map((notification, index) => (
              <div
                key={`${notification.entity_type}-${notification.therapist_id || notification.spa_id}-${index}`}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`w-3 h-3 rounded-full mt-3 flex-shrink-0 ${notification.entity_type === 'therapist' ?
                      (notification.status === 'approved' ? 'bg-green-500' :
                        notification.status === 'rejected' ? 'bg-red-500' :
                          notification.status === 'pending' ? 'bg-yellow-500' :
                            notification.status === 'resigned' ? 'bg-orange-500' :
                              notification.status === 'terminated' ? 'bg-red-700' :
                                'bg-blue-500') :
                      (notification.status === 'verified' ? 'bg-green-500' :
                        notification.status === 'rejected' ? 'bg-red-500' :
                          notification.status === 'pending' ? 'bg-yellow-500' :
                            notification.status === 'blacklisted' ? 'bg-red-800' :
                              'bg-blue-500')
                      }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-lg font-medium text-gray-900">
                          {notification.action_title}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${notification.entity_type === 'therapist' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                          {notification.entity_type.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${notification.status === 'approved' || notification.status === 'verified' ? 'bg-green-100 text-green-800' :
                          notification.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            notification.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              notification.status === 'resigned' ? 'bg-orange-100 text-orange-800' :
                                notification.status === 'terminated' ? 'bg-red-200 text-red-900' :
                                  notification.status === 'blacklisted' ? 'bg-red-200 text-red-900' :
                                    'bg-gray-100 text-gray-800'
                          }`}>
                          {notification.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">{notification.action_message}</p>

                      {/* Entity Details */}
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <strong className="text-gray-700">Name:</strong>
                            <span className="ml-2 text-gray-900">{notification.first_name} {notification.last_name}</span>
                          </div>
                          <div>
                            <strong className="text-gray-700">
                              {notification.entity_type === 'therapist' ? 'Phone:' : 'Email:'}
                            </strong>
                            <span className="ml-2 text-gray-900">
                              {notification.entity_type === 'therapist' ? notification.phone : notification.email}
                            </span>
                          </div>
                          {notification.entity_type === 'therapist' && (
                            <div>
                              <strong className="text-gray-700">Spa:</strong>
                              <span className="ml-2 text-gray-900">{notification.spa_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Additional Details */}
                        {notification.rejection_reason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <strong className="text-red-700">Rejection Reason:</strong>
                            <span className="ml-2 text-red-900">{notification.rejection_reason}</span>
                          </div>
                        )}

                        {notification.termination_reason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <strong className="text-red-700">Termination Reason:</strong>
                            <span className="ml-2 text-red-900">{notification.termination_reason}</span>
                          </div>
                        )}

                        {notification.reviewed_by && (
                          <div className="mt-2 text-sm">
                            <strong className="text-gray-700">Reviewed by:</strong>
                            <span className="ml-2 text-gray-900">{notification.reviewed_by}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center">
                          <ClockIcon className="w-4 h-4 mr-1" />
                          Action Date: {new Date(notification.action_date).toLocaleString()}
                        </span>
                        <span>
                          Created: {new Date(notification.created_at).toLocaleString()}
                        </span>
                        <span>
                          ID: #{notification.entity_type === 'therapist' ? notification.therapist_id : notification.spa_id}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        // View specific entity details
                        if (notification.entity_type === 'therapist') {
                          handleViewTherapistDetails(notification.therapist_id);
                        } else {
                          // Handle spa details view
                          setSelectedSpa({
                            spa_id: notification.spa_id,
                            spa_name: notification.spa_name,
                            owner_name: `${notification.first_name} ${notification.last_name}`,
                            email: notification.email,
                            status: notification.status
                          });
                          setShowSpaModal(true);
                        }
                      }}
                      className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                    >
                      View Details
                    </button>
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {notificationHistory.length > 0 && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {notificationHistory.length} records
              </p>
              <button
                onClick={() => {
                  setNotificationFilters({ ...notificationFilters, limit: String(parseInt(notificationFilters.limit) + 100) });
                  loadNotificationHistory();
                }}
                className="text-yellow-600 hover:text-yellow-800 font-medium text-sm"
              >
                Load More Records
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderThirdPartyLogin = () => (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Third-Party Login Management</h1>
        <p className="text-gray-600 mt-2">Create temporary login credentials for government officers</p>
      </div>

      {/* Create Government Officer Form */}
      <div className="max-w-md mb-8">
        <form onSubmit={handleThirdPartyLogin} className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Government Officer Account</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              placeholder="Enter username (e.g., officer123)"
              value={thirdPartyCredentials.username}
              onChange={(e) => setThirdPartyCredentials({ ...thirdPartyCredentials, username: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={thirdPartyCredentials.password || ''}
              onChange={(e) => setThirdPartyCredentials({ ...thirdPartyCredentials, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0A1428] text-white py-2 rounded-lg hover:bg-[#0A1428]/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Government Officer Account'}
          </button>
        </form>
      </div>

      {/* Government Officers Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Government Officer Accounts</h3>
          <p className="text-sm text-gray-600 mt-1">Manage temporary access accounts for government officers</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Full Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {governmentOfficers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No government officer accounts found. Create one above to get started.
                  </td>
                </tr>
              ) : (
                governmentOfficers.map((officer) => (
                  <tr key={officer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{officer.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{officer.full_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${officer.status === 'active' ? 'bg-green-100 text-green-800' :
                        officer.status === 'never_logged_in' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                        {officer.status === 'never_logged_in' ? 'Never Logged In' :
                          officer.status.charAt(0).toUpperCase() + officer.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(officer.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {officer.last_login ? new Date(officer.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => deleteGovernmentOfficer(officer.id, officer.username)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {governmentOfficers.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Total: {governmentOfficers.length} government officer account{governmentOfficers.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Financial Overview Component
  const renderFinancialOverview = () => {
    return (
      <div>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Overview</h1>
            <p className="text-gray-600 mt-2">Total revenue, monthly tracking, and financial reports</p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button
              onClick={() => {
                loadFinancialData();
                loadPaymentHistory();
                loadBankTransfers();
              }}
              className="bg-[#0A1428] text-white px-4 py-2 rounded-lg hover:bg-[#0A1428]/90 transition-colors"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Financial Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: CreditCardIcon },
                { id: 'history', label: 'Payment History', icon: DocumentIcon },
                { id: 'approvals', label: 'Bank Transfer Approvals', icon: CheckIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFinancialTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${financialTab === tab.id
                    ? 'border-[#FFD700] text-[#001F3F]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                  {tab.id === 'approvals' && bankTransfers.length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {bankTransfers.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Financial Content */}
        {financialTab === 'overview' && renderFinancialOverviewContent()}
        {financialTab === 'history' && renderPaymentHistory()}
        {financialTab === 'approvals' && renderBankTransferApprovals()}
      </div>
    );
  };

  // Financial Overview Content Component
  const renderFinancialOverviewContent = () => (
    <div>
      {/* Financial Stats Cards - Only Annual Fee */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-[#001F3F] mx-auto max-w-md">
          <div className="flex items-center">
            <div className="p-3 bg-[#001F3F]/20 rounded-lg">
              <CreditCardIcon className="w-8 h-8 text-[#001F3F]" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-[#001F3F]">Total Annual Fee Paid</h3>
              <p className="text-3xl font-bold text-[#FFD700]">
                LKR {financialData.summary?.total_annual?.toLocaleString() || '0'}
              </p>
              <div className="text-xs text-gray-500 mt-1">Year {selectedYear}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Financial Chart Placeholder */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <ArrowPathIcon className="mr-2 text-[#FFD700] w-5 h-5" />
          Monthly Financial Overview - {selectedYear}
        </h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center text-gray-500">
            <ArrowPathIcon className="mx-auto mb-4 opacity-50 w-12 h-12" />
            <p className="text-lg font-medium">Financial Chart</p>
            <p className="text-sm">Chart.js integration ready</p>
            <p className="text-sm">Install Chart.js to see monthly revenue graphs</p>
          </div>
        </div>
      </div>

      {/* Monthly Financial Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Monthly Breakdown - {selectedYear}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#001F3F', color: 'white' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Annual Fees (LKR)</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Payment Count</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {financialData.monthly_data?.length > 0 ? (
                financialData.monthly_data.map((row, index) => {
                  const monthName = new Date(selectedYear, row.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  const annual = parseFloat(row.annual_fees) || 0;
                  const paymentCount = row.total_payments || 0;

                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{monthName}</td>
                      <td className="px-6 py-4 text-sm font-medium text-[#FFD700]">{annual.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{paymentCount}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    {loading ? 'Loading financial data...' : 'No financial data available for this year'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Payment History Component
  const renderPaymentHistory = () => (
    <div>
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Payment History</h3>
            <p className="text-sm text-gray-600 mt-1">Complete payment records with details</p>
          </div>
          <div className="flex gap-2">
            <select
              className="border border-gray-300 rounded px-3 py-1 text-sm"
              onChange={(e) => {
                // Filter by payment type
                // Implementation can be added here
              }}
            >
              <option value="">All Types</option>
              <option value="registration">Registration</option>
              <option value="annual">Annual Fee</option>
              <option value="monthly">Monthly Fee</option>
            </select>
            <select
              className="border border-gray-300 rounded px-3 py-1 text-sm"
              onChange={(e) => {
                // Filter by status
                // Implementation can be added here
              }}
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spa Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paymentHistory.length > 0 ? (
                paymentHistory.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payment.spa_name}</div>
                      <div className="text-sm text-gray-500">{payment.spa_reference}</div>
                      <div className="text-sm text-gray-500">{payment.owner_fname} {payment.owner_lname}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${payment.payment_type === 'registration' ? 'bg-blue-100 text-blue-800' :
                        payment.payment_type === 'annual' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                        {payment.payment_type ? payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1) : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      LKR {parseFloat(payment.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${payment.payment_method === 'card' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-orange-100 text-orange-800'
                        }`}>
                        {payment.payment_method === 'card' ? 'Card Payment' : 'Bank Transfer'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                      {payment.payment_method === 'bank_transfer' && (
                        <div className="text-xs text-gray-500 mt-1">{payment.approval_status}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedPayment(payment)}
                        className="text-[#001F3F] hover:text-[#FFD700] text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {loading ? 'Loading payment history...' : 'No payment history found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Payment Details Modal Component
  const renderPaymentDetailsModal = () => {
    if (!selectedPayment) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Payment Details</h3>
            <button
              onClick={() => setSelectedPayment(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Spa Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Spa Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <p className="font-medium">{selectedPayment.spa_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Reference:</span>
                  <p className="font-medium">{selectedPayment.spa_reference}</p>
                </div>
                <div>
                  <span className="text-gray-500">Owner:</span>
                  <p className="font-medium">{selectedPayment.owner_fname} {selectedPayment.owner_lname}</p>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <p className="font-medium">{selectedPayment.owner_email}</p>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Payment Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Amount:</span>
                  <p className="font-medium text-lg">LKR {parseFloat(selectedPayment.amount).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>
                  <p className="font-medium">{selectedPayment.payment_type.charAt(0).toUpperCase() + selectedPayment.payment_type.slice(1)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Method:</span>
                  <p className="font-medium">{selectedPayment.payment_method === 'card' ? 'Card Payment' : 'Bank Transfer'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${selectedPayment.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                    selectedPayment.payment_status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                    {selectedPayment.payment_status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Reference Number:</span>
                  <p className="font-medium">{selectedPayment.reference_number}</p>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <p className="font-medium">{new Date(selectedPayment.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Bank Transfer Details */}
            {selectedPayment.payment_method === 'bank_transfer' && (
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Bank Transfer Details</h4>
                <div className="text-sm">
                  {selectedPayment.bank_slip_path && (
                    <div className="mb-2">
                      <span className="text-gray-500">Bank Slip:</span>
                      <button
                        onClick={() => {
                          const bankSlipUrl = fixBankSlipUrl(selectedPayment.bank_slip_path);
                          if (bankSlipUrl) {
                            console.log('Opening bank slip URL:', bankSlipUrl);
                            window.open(bankSlipUrl, '_blank');
                          }
                        }}
                        className="ml-2 text-blue-600 hover:text-blue-800 underline"
                      >
                        View Bank Slip
                      </button>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Approval Status:</span>
                    <p className="font-medium">{selectedPayment.approval_status}</p>
                  </div>
                  {selectedPayment.approved_at && (
                    <div>
                      <span className="text-gray-500">Approved Date:</span>
                      <p className="font-medium">{new Date(selectedPayment.approved_at).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedPayment.rejection_reason && (
                    <div>
                      <span className="text-gray-500">Rejection Reason:</span>
                      <p className="font-medium text-red-600">{selectedPayment.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setSelectedPayment(null)}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Bank Transfer Approvals Component  
  const renderBankTransferApprovals = () => (
    <div>
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Bank Transfer Approvals</h3>
              <p className="text-sm text-gray-600 mt-1">Review and approve bank transfer payments</p>
            </div>
            {bankTransfers.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="text-red-600 font-medium text-sm">
                  {bankTransfers.length} pending approval{bankTransfers.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spa Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Slip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bankTransfers.length > 0 ? (
                bankTransfers.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payment.spa_name}</div>
                      <div className="text-sm text-gray-500">{payment.reference_number}</div>
                      <div className="text-sm text-gray-500">{payment.owner_fname} {payment.owner_lname}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">LKR {parseFloat(payment.amount).toLocaleString()}</div>
                      <div className="text-sm text-gray-500">
                        {payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1)} Fee
                      </div>
                      <div className="text-sm text-gray-500">Ref: {payment.reference_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.bank_slip_path ? (
                        <button
                          onClick={() => {
                            const bankSlipUrl = fixBankSlipUrl(payment.bank_slip_path);
                            if (bankSlipUrl) {
                              console.log('Opening bank slip URL:', bankSlipUrl);
                              window.open(bankSlipUrl, '_blank');
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                          View Bank Slip
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">No slip uploaded</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveBankTransfer(payment.id)}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
                          disabled={loading}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            Swal.fire({
                              title: 'Reject Payment',
                              text: 'Enter rejection reason:',
                              input: 'textarea',
                              inputPlaceholder: 'Reason for rejection...',
                              showCancelButton: true,
                              confirmButtonText: 'Reject',
                              confirmButtonColor: '#d33',
                            }).then((result) => {
                              if (result.isConfirmed && result.value) {
                                rejectBankTransfer(payment.id, result.value);
                              }
                            });
                          }}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                          disabled={loading}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {loading ? 'Loading bank transfer requests...' : 'No pending bank transfer approvals'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`fixed lg:relative z-50 bg-[#0A1428] text-white transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-20'} h-full flex flex-col`}>
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
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-[#0A1428] transition-all duration-300"
              title="Collapse sidebar"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Show toggle button when sidebar is minimized */}
        {!isSidebarOpen && (
          <div className="p-3 border-b border-gray-700 flex justify-center">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-[#0A1428] transition-all duration-300"
              title="Expand sidebar"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center px-3 py-3 rounded-lg transition-all duration-300 group ${isActive
                      ? 'bg-yellow-500 text-[#0A1428] shadow-lg'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    title={!isSidebarOpen ? item.label : ''}
                  >
                    <span className="flex-shrink-0"><Icon className="w-5 h-5" /></span>
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
              );
            })}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-300 group"
            title={!isSidebarOpen ? "Logout" : ""}
          >
            <FiLogOut className="w-5 h-5 flex-shrink-0" />
            <span className={`ml-3 transition-all duration-300 ${!isSidebarOpen ? 'opacity-0 absolute' : 'opacity-100'}`}>
              Logout
            </span>

            {/* Tooltip for minimized state */}
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
              <h1 className="ml-4 text-xl font-semibold text-gray-800 capitalize">
                {activeTab.replace(/-/g, ' ')}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search spas, therapists, media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              {/* Notification Bell */}
              <div className="relative notification-container">
                <button
                  onClick={() => {
                    Swal.fire({
                      title: 'Notifications',
                      html: notifications.length > 0
                        ? notifications.map(n => `<div class="text-left p-2 border-b"><strong>${n.title}</strong><br/><small>${n.message}</small></div>`).join('')
                        : '<p>No new notifications</p>',
                      confirmButtonText: 'Close',
                      confirmButtonColor: '#0A1428'
                    });
                    setUnreadNotifications(0);
                  }}
                  className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <BellIcon className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </button>
              </div>

              {/* User Profile Dropdown */}
              <div className="relative group">
                <div className="flex items-center space-x-3 cursor-pointer">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">LSA Admin</div>
                    <div className="text-xs text-gray-500">Administrator</div>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-r from-[#0A1428] to-[#FFD700] rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    A
                  </div>
                </div>

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-700">Signed in as</p>
                      <p className="text-sm text-gray-500 truncate">admin@lankaspa.lk</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center"
                    >
                      <FiLogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {/* Alert Messages */}
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex">
                <XMarkIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                {error}
              </div>
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
              <div className="flex">
                <CheckIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                {success}
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mr-3"></div>
                  <span className="text-gray-700">Loading...</span>
                </div>
              </div>
            </div>
          )}

          {/* Render Content */}
          {renderContent()}
        </main>
      </div>

      {/* Modals */}
      {/* Spa Details Modal */}
      {showSpaModal && selectedSpa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Spa Details</h2>
                <button
                  onClick={() => setShowSpaModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">Basic Information</h3>
                  <p><strong>Name:</strong> {selectedSpa.spa_name}</p>
                  <p><strong>Owner:</strong> {selectedSpa.owner_name}</p>
                  <p><strong>Email:</strong> {selectedSpa.email}</p>
                  <p><strong>Phone:</strong> {selectedSpa.contact_phone}</p>
                  <p><strong>City:</strong> {selectedSpa.city}</p>
                  <p><strong>Status:</strong> {selectedSpa.status}</p>
                  <p><strong>Verification:</strong> {selectedSpa.verification_status}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                {selectedSpa.verification_status === 'pending' && (
                  <>
                    <button
                      onClick={() => verifySpa(selectedSpa.spa_id, 'approve')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setShowSpaModal(false);
                        setShowRejectModal(true);
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowSpaModal(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Therapist Details Modal */}
      {showTherapistModal && selectedTherapist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedTherapist.first_name} {selectedTherapist.last_name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Registration ID: #TH{String(selectedTherapist.id || selectedTherapist.therapist_id).padStart(4, '0')}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedTherapist.status === 'approved' ? 'bg-green-100 text-green-800' :
                    selectedTherapist.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                    {selectedTherapist.status?.toUpperCase()}
                  </span>
                  <button
                    onClick={() => setShowTherapistModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Personal Details */}
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <UserGroupIcon className="w-5 h-5 mr-2" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Full Name:</span>
                        <span className="text-gray-900">{selectedTherapist.first_name} {selectedTherapist.last_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">NIC:</span>
                        <span className="text-gray-900">{selectedTherapist.nic || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Phone:</span>
                        <span className="text-gray-900">{selectedTherapist.phone_number || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Birthday:</span>
                        <span className="text-gray-900">{selectedTherapist.birthday || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CogIcon className="w-5 h-5 mr-2" />
                      Professional Details
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Spa ID:</span>
                        <span className="text-gray-900">#{selectedTherapist.spa_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Registration Date:</span>
                        <span className="text-gray-900">
                          {selectedTherapist.created_at ? new Date(selectedTherapist.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Updated:</span>
                        <span className="text-gray-900">
                          {selectedTherapist.updated_at ? new Date(selectedTherapist.updated_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <DocumentIcon className="w-5 h-5 mr-2" />
                      Documents
                    </h3>
                    <div className="space-y-3">
                      {/* NIC Attachment */}
                      <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <div className="flex items-center">
                          <DocumentIcon className="w-6 h-6 text-blue-500 mr-3" />
                          <span className="font-medium">NIC Attachment</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${selectedTherapist.nic_attachment ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {selectedTherapist.nic_attachment ? 'Available' : 'Not provided'}
                          </span>
                          {selectedTherapist.nic_attachment && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => window.open(`${API_BASE}/lsa/therapists/${selectedTherapist.id}/document/nic_attachment?action=view`, '_blank')}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                title="View Document"
                              >
                                <EyeIcon className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = `${API_BASE}/lsa/therapists/${selectedTherapist.id}/document/nic_attachment?action=download`;
                                  link.download = `therapist_${selectedTherapist.id}_nic_attachment`;
                                  link.click();
                                }}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                title="Download Document"
                              >
                                <ArrowDownTrayIcon className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Medical Certificate */}
                      <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <div className="flex items-center">
                          <DocumentIcon className="w-6 h-6 text-green-500 mr-3" />
                          <span className="font-medium">Medical Certificate</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${selectedTherapist.medical_certificate ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {selectedTherapist.medical_certificate ? 'Available' : 'Not provided'}
                          </span>
                          {selectedTherapist.medical_certificate && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => window.open(`${API_BASE}/lsa/therapists/${selectedTherapist.id}/document/medical_certificate?action=view`, '_blank')}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                title="View Document"
                              >
                                <EyeIcon className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = `${API_BASE}/lsa/therapists/${selectedTherapist.id}/document/medical_certificate?action=download`;
                                  link.download = `therapist_${selectedTherapist.id}_medical_certificate`;
                                  link.click();
                                }}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                title="Download Document"
                              >
                                <ArrowDownTrayIcon className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SPA Center Certificate */}
                      <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <div className="flex items-center">
                          <DocumentIcon className="w-6 h-6 text-purple-500 mr-3" />
                          <span className="font-medium">SPA Certificate</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${selectedTherapist.spa_center_certificate ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {selectedTherapist.spa_center_certificate ? 'Available' : 'Not provided'}
                          </span>
                          {selectedTherapist.spa_center_certificate && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => window.open(`${API_BASE}/lsa/therapists/${selectedTherapist.id}/document/spa_center_certificate?action=view`, '_blank')}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                title="View Document"
                              >
                                <EyeIcon className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = `${API_BASE}/lsa/therapists/${selectedTherapist.id}/document/spa_center_certificate?action=download`;
                                  link.download = `therapist_${selectedTherapist.id}_spa_certificate`;
                                  link.click();
                                }}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                title="Download Document"
                              >
                                <ArrowDownTrayIcon className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Therapist Image */}
                      <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <div className="flex items-center">
                          <UserCircleIcon className="w-6 h-6 text-orange-500 mr-3" />
                          <span className="font-medium">Therapist Image</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${selectedTherapist.therapist_image ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {selectedTherapist.therapist_image ? 'Available' : 'Not provided'}
                          </span>
                          {selectedTherapist.therapist_image && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => window.open(`${API_BASE}/lsa/therapists/${selectedTherapist.id}/document/therapist_image?action=view`, '_blank')}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                title="View Image"
                              >
                                <EyeIcon className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = `${API_BASE}/lsa/therapists/${selectedTherapist.id}/document/therapist_image?action=download`;
                                  link.download = `therapist_${selectedTherapist.id}_image`;
                                  link.click();
                                }}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                title="Download Image"
                              >
                                <ArrowDownTrayIcon className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Actions & History */}
                <div className="space-y-6">
                  {/* Quick Actions */}
                  {selectedTherapist.status === 'pending' && (
                    <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-400">
                      <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                        <ClockIcon className="w-5 h-5 mr-2" />
                        Pending Review
                      </h3>
                      <p className="text-sm text-yellow-700 mb-4">
                        This therapist registration is awaiting your review. Please approve or reject based on the provided information.
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            handleTherapistAction(selectedTherapist.id || selectedTherapist.therapist_id, 'approve');
                            setShowTherapistModal(false);
                          }}
                          disabled={loading}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                        >
                          <CheckIcon className="w-4 h-4 mr-2" />
                          {loading ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => {
                            setShowRejectModal(true);
                          }}
                          disabled={loading}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                        >
                          <XMarkIcon className="w-4 h-4 mr-2" />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Admin Comments */}
                  {selectedTherapist.admin_comments && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <ChatBubbleLeftEllipsisIcon className="w-5 h-5 mr-2" />
                        Admin Comments
                      </h3>
                      <p className="text-gray-700 bg-white p-3 rounded border">
                        {selectedTherapist.admin_comments}
                      </p>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {selectedTherapist.rejection_reason && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
                        <XMarkIcon className="w-5 h-5 mr-2" />
                        Rejection Reason
                      </h3>
                      <p className="text-red-700 bg-white p-3 rounded border">
                        {selectedTherapist.rejection_reason}
                      </p>
                    </div>
                  )}

                  {/* Notification History */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <BellIcon className="w-5 h-5 mr-2" />
                        Notification History
                      </h3>
                      <button
                        onClick={() => setShowNotificationHistory(!showNotificationHistory)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {showNotificationHistory ? 'Hide' : 'Show All'}
                      </button>
                    </div>

                    <div className={`space-y-2 ${showNotificationHistory ? 'max-h-64 overflow-y-auto' : 'max-h-32 overflow-hidden'}`}>
                      {/* Registration Notification */}
                      <div className="flex items-start space-x-3 p-3 bg-white rounded border">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Registration Submitted</p>
                          <p className="text-xs text-gray-600">
                            {selectedTherapist.created_at ? new Date(selectedTherapist.created_at).toLocaleString() : 'Unknown time'}
                          </p>
                        </div>
                      </div>

                      {/* Status Change Notifications */}
                      {selectedTherapist.updated_at && selectedTherapist.updated_at !== selectedTherapist.created_at && (
                        <div className="flex items-start space-x-3 p-3 bg-white rounded border">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${selectedTherapist.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              Status Changed to {selectedTherapist.status?.toUpperCase()}
                            </p>
                            <p className="text-xs text-gray-600">
                              {new Date(selectedTherapist.updated_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Add more notification entries here based on actual notification data */}
                    </div>

                    {!showNotificationHistory && (
                      <div className="text-center mt-2">
                        <button
                          onClick={() => setShowNotificationHistory(true)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Click to see more notifications...
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-6 pt-4 border-t flex justify-between items-center">
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      // Refresh therapist data
                      loadTherapists();
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                  >
                    <ArrowPathIcon className="w-4 h-4 mr-1" />
                    Refresh Data
                  </button>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowTherapistModal(false)}
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (selectedSpa || selectedTherapist) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Reject {selectedSpa ? 'Spa' : 'Therapist'}
                </h2>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  rows="4"
                  placeholder="Please provide a detailed reason for rejection..."
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedSpa) {
                      verifySpa(selectedSpa.spa_id, 'reject', rejectionReason);
                    } else if (selectedTherapist) {
                      handleTherapistAction(selectedTherapist.id || selectedTherapist.therapist_id, 'reject', rejectionReason);
                    }
                  }}
                  disabled={!rejectionReason.trim()}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Upload Modal */}
      {showMediaUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Upload {mediaTab}</h2>
                <button
                  onClick={() => setShowMediaUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {mediaTab === 'news' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Enter news title..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                    <textarea
                      value={newsContent}
                      onChange={(e) => setNewsContent(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      rows="6"
                      placeholder="Enter news content..."
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select {mediaTab === 'photos' ? 'Image' : mediaTab === 'videos' ? 'Video' : 'Audio'} File
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    accept={
                      mediaTab === 'photos' ? 'image/*' :
                        mediaTab === 'videos' ? 'video/*' :
                          'audio/*'
                    }
                  />
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowMediaUploadModal(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadMedia}
                  disabled={mediaTab === 'news' ? !newsTitle || !newsContent : !uploadFile}
                  className="bg-[#0A1428] text-white px-4 py-2 rounded-lg hover:bg-[#0A1428]/90 disabled:opacity-50"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {renderPaymentDetailsModal()}
    </div>
  );
};

export default AdminLSA;