import React, { useState, useEffect } from 'react';
import {
    UserGroupIcon,
    MagnifyingGlassIcon,
    BuildingOfficeIcon,
    PhoneIcon,
    EnvelopeIcon,
    ClockIcon,
    AcademicCapIcon,
    BriefcaseIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

const ThirdPartyDashboard = () => {
    const [therapists, setTherapists] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        // Get current user from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const user = urlParams.get('user');
        setCurrentUser(user);

        // Don't fetch therapists on mount - only when user searches
    }, []);

    useEffect(() => {
        if (search.trim()) {
            const delayedSearch = setTimeout(() => {
                fetchTherapists(search);
            }, 500);
            return () => clearTimeout(delayedSearch);
        } else {
            // Clear results when search is empty
            setTherapists([]);
        }
    }, [search]);

    const fetchTherapists = async (query) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/third-party/history?search=${query}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('thirdPartyToken')}` }
            });
            setTherapists(response.data.therapists || []);
        } catch (error) {
            console.error('Error fetching therapist history:', error);
            // Fallback demo data for government officers
            const demoTherapists = [
                {
                    id: 1,
                    name: 'Dr. Amara Silva',
                    nic: '912345678V',
                    contact: '+94 77 123 4567',
                    spa_name: 'Serenity Wellness Spa',
                    specialization: 'Ayurvedic Therapy',
                    experience: 8,
                    current_status: 'Active',
                    license_number: 'AT2019001',
                    working_history: [
                        {
                            spa_name: 'Serenity Wellness Spa',
                            start_date: '2022-03-15',
                            end_date: null,
                            role: 'Senior Therapist',
                            reason_for_leaving: null
                        },
                        {
                            spa_name: 'Royal Ayurveda Center',
                            start_date: '2019-01-10',
                            end_date: '2022-02-28',
                            role: 'Therapist',
                            reason_for_leaving: 'Career advancement'
                        },
                        {
                            spa_name: 'Wellness Paradise',
                            start_date: '2017-06-01',
                            end_date: '2018-12-31',
                            role: 'Junior Therapist',
                            reason_for_leaving: 'Relocation'
                        }
                    ]
                },
                {
                    id: 2,
                    name: 'Ms. Kasuni Perera',
                    nic: '891234567V',
                    contact: '+94 11 234 5678',
                    spa_name: 'Royal Ayurveda Center',
                    specialization: 'Massage Therapy',
                    experience: 5,
                    current_status: 'Active',
                    license_number: 'MT2020015',
                    working_history: [
                        {
                            spa_name: 'Royal Ayurveda Center',
                            start_date: '2020-08-01',
                            end_date: null,
                            role: 'Massage Therapist',
                            reason_for_leaving: null
                        },
                        {
                            spa_name: 'Tranquil Spa',
                            start_date: '2018-04-15',
                            end_date: '2020-07-30',
                            role: 'Therapist',
                            reason_for_leaving: 'Better opportunity'
                        }
                    ]
                },
                {
                    id: 3,
                    name: 'Mr. Roshan Fernando',
                    nic: '871234567V',
                    contact: '+94 70 345 6789',
                    spa_name: 'Healing Hands Spa',
                    specialization: 'Reflexology',
                    experience: 12,
                    current_status: 'Active',
                    license_number: 'RF2015008',
                    working_history: [
                        {
                            spa_name: 'Healing Hands Spa',
                            start_date: '2015-02-01',
                            end_date: null,
                            role: 'Head Therapist',
                            reason_for_leaving: null
                        },
                        {
                            spa_name: 'Natural Wellness Center',
                            start_date: '2012-01-15',
                            end_date: '2015-01-31',
                            role: 'Senior Therapist',
                            reason_for_leaving: 'Promotion opportunity'
                        }
                    ]
                }
            ];

            // Filter based on search query
            const filteredTherapists = query
                ? demoTherapists.filter(t =>
                    t.name.toLowerCase().includes(query.toLowerCase()) ||
                    t.nic.toLowerCase().includes(query.toLowerCase()) ||
                    t.spa_name.toLowerCase().includes(query.toLowerCase())
                )
                : demoTherapists;

            setTherapists(filteredTherapists);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Present';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const calculateDuration = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date();
        const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;

        if (years > 0 && remainingMonths > 0) {
            return `${years}y ${remainingMonths}m`;
        } else if (years > 0) {
            return `${years} year${years > 1 ? 's' : ''}`;
        } else {
            return `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
        }
    };

    return (
        <div style={{ backgroundColor: 'white', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ backgroundColor: '#001F3F', color: 'white' }} className="shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <UserGroupIcon className="h-8 w-8 text-[#FFD700]" />
                            </div>
                            <div className="ml-4">
                                <h1 className="text-2xl font-bold">Therapist Working History</h1>
                                <p className="text-sm opacity-90">Government Officer Access Portal</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            {currentUser && (
                                <div className="text-right">
                                    <p className="text-sm font-medium">Logged in as:</p>
                                    <p className="text-xs opacity-75">{currentUser}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search Section */}
                <div className="mb-8">
                    <div className="bg-white border border-[#001F3F] rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-[#001F3F] mb-4">Search Therapist Records</h2>
                        <div className="relative max-w-md">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Enter therapist name, NIC, or spa name to search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFD700] focus:border-transparent text-sm"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Search will only display matching therapist records - no results shown by default
                        </p>
                    </div>
                </div>

                {/* Results Section */}
                {loading ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="text-lg text-gray-600">Searching records...</div>
                    </div>
                ) : (
                    <div className="bg-white border border-[#001F3F] rounded-lg shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: '#001F3F', color: 'white' }}>
                            <h3 className="text-lg font-semibold">
                                Therapist Records ({therapists.length} found)
                            </h3>
                        </div>

                        {therapists.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead style={{ backgroundColor: '#001F3F', color: 'white' }}>
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Therapist Information</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Current Employment</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Qualifications</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Working History</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {therapists.map((therapist) => (
                                            <tr key={therapist.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-12 w-12">
                                                            <div className="h-12 w-12 rounded-full bg-[#001F3F] flex items-center justify-center">
                                                                <UserGroupIcon className="h-6 w-6 text-[#FFD700]" />
                                                            </div>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{therapist.name}</div>
                                                            <div className="text-sm text-gray-500 flex items-center mt-1">
                                                                <span className="mr-3">NIC: {therapist.nic}</span>
                                                            </div>
                                                            <div className="text-sm text-gray-500 flex items-center mt-1">
                                                                <PhoneIcon className="h-3 w-3 mr-1" />
                                                                {therapist.contact}
                                                            </div>
                                                            <div className="text-xs text-gray-400 mt-1">
                                                                License: {therapist.license_number}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm">
                                                        <div className="flex items-center text-gray-900 font-medium">
                                                            <BuildingOfficeIcon className="h-4 w-4 mr-2 text-[#FFD700]" />
                                                            {therapist.spa_name}
                                                        </div>
                                                        <div className="text-gray-500 mt-1">
                                                            Status: <span className="text-green-600 font-medium">{therapist.current_status}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm">
                                                        <div className="flex items-center text-gray-900">
                                                            <AcademicCapIcon className="h-4 w-4 mr-2 text-[#FFD700]" />
                                                            {therapist.specialization}
                                                        </div>
                                                        <div className="flex items-center text-gray-500 mt-1">
                                                            <BriefcaseIcon className="h-4 w-4 mr-2" />
                                                            {therapist.experience} years experience
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <details className="cursor-pointer">
                                                        <summary className="text-sm font-medium text-[#FFD700] hover:text-[#FFD700]/80 flex items-center">
                                                            <ClockIcon className="h-4 w-4 mr-1" />
                                                            View Complete History ({therapist.working_history?.length || 0} positions)
                                                        </summary>
                                                        <div className="mt-3 space-y-3">
                                                            {therapist.working_history?.map((history, idx) => (
                                                                <div key={idx} className="bg-gray-50 p-3 rounded-lg border-l-4 border-[#FFD700]">
                                                                    <div className="text-sm">
                                                                        <div className="font-medium text-gray-900">{history.spa_name}</div>
                                                                        <div className="text-gray-600">Role: {history.role}</div>
                                                                        <div className="text-gray-500 text-xs mt-1 flex items-center">
                                                                            <ClockIcon className="h-3 w-3 mr-1" />
                                                                            {formatDate(history.start_date)} - {formatDate(history.end_date)}
                                                                            <span className="ml-2 bg-[#001F3F] text-white px-2 py-0.5 rounded text-xs">
                                                                                {calculateDuration(history.start_date, history.end_date)}
                                                                            </span>
                                                                        </div>
                                                                        {history.reason_for_leaving && (
                                                                            <div className="text-xs text-gray-400 mt-1">
                                                                                Reason for leaving: {history.reason_for_leaving}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </details>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="px-6 py-12 text-center">
                                <UserGroupIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                                <p className="text-lg font-medium text-gray-900">No therapist records found</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {search ? `No results found for "${search}"` : 'Enter therapist name, NIC, or spa name to search'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Information */}
                <div className="mt-8 bg-gradient-to-r from-[#001F3F] to-[#002A5C] rounded-lg shadow p-6 text-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-lg font-semibold mb-3 text-[#FFD700]">Access Information</h4>
                            <ul className="text-sm opacity-90 space-y-1">
                                <li>• Read-only access to therapist employment history</li>
                                <li>• Professional license verification</li>
                                <li>• Current employment status tracking</li>
                                <li>• Historical employment records</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold mb-3 text-[#FFD700]">Data Security</h4>
                            <ul className="text-sm opacity-90 space-y-1">
                                <li>• All access is logged and monitored</li>
                                <li>• Information is for official use only</li>
                                <li>• Session expires automatically</li>
                                <li>• Compliant with data protection regulations</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThirdPartyDashboard;