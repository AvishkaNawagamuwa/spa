import React, { useState, useEffect } from 'react';
import { FiUsers, FiClock, FiCreditCard, FiAlertCircle, FiCheckCircle, FiXCircle } from "react-icons/fi";
import axios from 'axios';

const Dashboard = () => {
    const [dashboardStats, setDashboardStats] = useState({
        approved_therapists: 0,
        pending_therapists: 0,
        payment_status: 'active',
        next_payment_date: null,
        days_until_due: 0,
        current_plan: null
    });
    const [paymentStatus, setPaymentStatus] = useState({
        is_overdue: false,
        access_restricted: false,
        allowed_sections: ['dashboard', 'payment']
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
        fetchRecentActivity();

        // Auto-refresh every 30 seconds for real-time updates
        const interval = setInterval(() => {
            fetchDashboardData();
            fetchRecentActivity();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            console.log('🔑 Dashboard: Token from localStorage:', token ? 'Present' : 'Missing');

            // Check for null, undefined, or "null" string
            if (!token || token === 'null' || token === 'undefined') {
                console.log('❌ No valid token found, redirecting to login');
                window.location.href = '/login';
                return;
            }

            // Fetch dynamic counts from backend
            const response = await axios.get('/api/admin-spa-new/dashboard-stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setDashboardStats(response.data);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            console.error('Response:', error.response?.data);
            // Set default values if API fails
            setDashboardStats({
                approved_therapists: 0,
                pending_therapists: 0
            });
        }
    };

    const fetchRecentActivity = async () => {
        try {
            const token = localStorage.getItem('token');

            // Check for null, undefined, or "null" string
            if (!token || token === 'null' || token === 'undefined') {
                console.log('❌ No valid token found, redirecting to login');
                window.location.href = '/login';
                return;
            }

            // Fetch recent activity for today and yesterday only
            const response = await axios.get('/api/admin-spa-new/recent-activity', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Ensure we always get an array
            const activities = Array.isArray(response.data) ? response.data :
                (response.data?.activities && Array.isArray(response.data.activities)) ? response.data.activities :
                    [];

            setRecentActivity(activities);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching recent activity:', error);
            setRecentActivity([]);
            setLoading(false);
        }
    };

    const getPaymentStatusColor = () => {
        if (paymentStatus.is_overdue) return 'text-red-600';
        if (dashboardStats.days_until_due <= 7) return 'text-orange-600';
        return 'text-green-600';
    };

    const getPaymentStatusIcon = () => {
        if (paymentStatus.is_overdue) return <FiXCircle className="text-red-600" />;
        if (dashboardStats.days_until_due <= 7) return <FiAlertCircle className="text-orange-600" />;
        return <FiCheckCircle className="text-green-600" />;
    };

    if (loading) {
        return (
            <div className="animate-fadeIn flex justify-center items-center h-64">
                <div className="text-lg text-gray-600">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">AdminSPA Dashboard</h2>
                <p className="text-gray-600">Enhanced Spa Management with Payment Tracking</p>
            </div>

            {/* Payment Status Alert */}
            {paymentStatus.is_overdue && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-lg">
                    <div className="flex items-center">
                        <FiAlertCircle className="text-red-400 mr-3" size={20} />
                        <div>
                            <h3 className="text-red-800 font-medium">Payment Overdue</h3>
                            <p className="text-red-700 text-sm">Your payment is overdue. Some features may be restricted until payment is made.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Dynamic Stats Cards - Only Approved and Pending Therapists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6 transition-transform duration-300 hover:scale-105 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mb-2">
                                <FiUsers size={24} />
                            </div>
                            <h3 className="text-sm font-medium text-gray-600">Approved Therapists</h3>
                            <p className="text-2xl font-bold text-gray-800" id="approved-count">{dashboardStats.approved_therapists}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 transition-transform duration-300 hover:scale-105 border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mb-2">
                                <FiClock size={24} />
                            </div>
                            <h3 className="text-sm font-medium text-gray-600">Pending Requests</h3>
                            <p className="text-2xl font-bold text-gray-800" id="pending-count">{dashboardStats.pending_therapists}</p>
                        </div>
                    </div>
                </div>
            </div>



            {/* Recent Activity - Today and Yesterday Only */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <FiClock className="mr-2 text-[#FFD700]" />
                    Recent Activity (Today & Yesterday)
                </h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {Array.isArray(recentActivity) && recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {activity.created_at ? new Date(activity.created_at).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        Therapist {activity.name || 'Unknown'} {activity.status} request
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${activity.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                            {activity.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                                        No recent activity for today or yesterday
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


        </div>
    );
};

export default Dashboard;