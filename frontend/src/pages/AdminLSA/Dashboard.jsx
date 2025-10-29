import React, { useState, useEffect } from 'react';
import { FiGrid, FiFileText, FiClock, FiRefreshCw } from "react-icons/fi";
import axios from 'axios';

const Dashboard = () => {
  const [dashboardStats, setDashboardStats] = useState({
    total_spas: 0,
    verified_spas: 0,
    total_therapists: 0,
    approved_therapists: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentActivity();

    const interval = setInterval(() => {
      fetchDashboardData();
      fetchRecentActivity();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const spasResponse = await axios.get('http://localhost:3001/api/lsa/dashboard/spas-count');
      const therapistsResponse = await axios.get('http://localhost:3001/api/lsa/dashboard/therapists-count');

      if (spasResponse.data.success && therapistsResponse.data.success) {
        setDashboardStats({
          total_spas: spasResponse.data.data.verified_count || 0,
          verified_spas: spasResponse.data.data.verified_count || 0,
          total_therapists: therapistsResponse.data.data.approved_count || 0,
          approved_therapists: therapistsResponse.data.data.approved_count || 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setDashboardStats({
        total_spas: 0,
        verified_spas: 0,
        total_therapists: 0,
        approved_therapists: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/lsa/dashboard/recent-activity');
      if (response.data.success) {
        setRecentActivity(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">LSA Admin Dashboard</h2>
          <p className="text-gray-600">Enhanced spa management and financial tracking</p>
        </div>
        <button
          onClick={() => {
            fetchDashboardData();
            fetchRecentActivity();
          }}
          className="bg-[#001F3F] text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2"
          disabled={loading}
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#001F3F]">
          <div className="flex items-center">
            <FiGrid className="text-[#001F3F] mr-3" size={20} />
            <div>
              <p className="text-sm text-gray-600">Total Registered Spas</p>
              <p className="text-xl font-bold text-gray-800">{dashboardStats.total_spas}</p>
              <div className="text-xs text-gray-500 mt-1">
                <span className="text-green-600">Verified: {dashboardStats.verified_spas}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center">
            <FiFileText className="text-green-500 mr-3" size={20} />
            <div>
              <p className="text-sm text-gray-600">Total Registered Therapists</p>
              <p className="text-xl font-bold text-gray-800">{dashboardStats.total_therapists}</p>
              <div className="text-xs text-gray-500 mt-1">
                <span className="text-green-600">Approved: {dashboardStats.approved_therapists}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-400">
          <div className="flex items-center">
            <FiClock className="text-blue-400 mr-3" size={20} />
            <div>
              <p className="text-sm text-gray-600">Recent Activity</p>
              <p className="text-xl font-bold text-gray-800">{recentActivity.length}</p>
              <div className="text-xs text-gray-500 mt-1">
                <span className="text-blue-600">Today & Yesterday</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <FiClock className="mr-2 text-[#001F3F]" />
          Recent Activity
        </h3>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <FiRefreshCw className="mx-auto text-2xl text-gray-400 animate-spin mb-2" />
              <p className="text-gray-500">Loading recent activities...</p>
            </div>
          ) : recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-300 border-l-4 border-[#001F3F]">
                <div className="flex-shrink-0 w-12 h-12 bg-[#001F3F] rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {activity.entity_type === 'spa' ? 'SPA' :
                      activity.entity_type === 'therapist' ? 'THR' : 'LSA'}
                  </span>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {activity.description || `${activity.entity_name} ${activity.action}`}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                    <span className="text-xs bg-[#001F3F] text-white px-2 py-1 rounded-full font-medium">
                      {activity.action}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FiClock className="mx-auto text-3xl text-gray-300 mb-2" />
              <p className="text-lg font-medium">No recent activity</p>
              <p className="text-sm">Recent spa and therapist status changes will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;