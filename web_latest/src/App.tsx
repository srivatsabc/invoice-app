import React, { useState, useEffect, useRef } from 'react';
import { Menu, Search, AlertTriangle, ChevronDown, Mountain as Mountains, Settings, BarChart3, ChevronLeft, ChevronRight, MessageSquare, FileSearch, Bell, LineChart, Download, Database, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import SearchInvoices from './components/SearchInvoices';
import FailedInvoices from './components/FailedInvoices';
import ChatBot from './components/ChatBot';
import { API_ENDPOINTS } from './constants/api';
import AnalyzeInvoices from './components/AnalyzeInvoices';
import AnalyzeInvoicesWithPrompts from './components/AnalyzeInvoicesWithPrompts';
import PromptRegistry from './components/PromptRegistry';
import Login from './components/Login';
import NotificationPreferences from './components/NotificationPreferences';
import PerformanceMetrics from './components/PerformanceMetrics';
import ExportForAnalysis from './components/ExportForAnalysis';
import ControlCenter from './components/ControlCenter';
import { generateSessionId } from './utils/session';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Region {
  regionCode: string;
  regionName: string;
  countries: Array<{
    countryCode: string;
    countryName: string;
  }>;
}

interface RegionsData {
  regions: Region[];
}

interface DashboardData {
  statistics: {
    totalProcessed: number;
    totalSuccess: number;
    totalFailed: number;
  };
  processingTrend: {
    labels: string[];
    success: number[];
    failed: number[];
  };
  top5Fields: {
    header: {
      fields: string[];
      values: Array<{
        field: string;
        topValues: Array<{
          value: string;
          count: number;
        }>;
      }>;
    };
    lineItems: {
      fields: string[];
      values: Array<{
        field: string;
        topValues: Array<{
          value: string;
          count: number;
        }>;
      }>;
    };
    taxData: {
      fields: string[];
      values: Array<{
        field: string;
        topValues: Array<{
          value: string;
          count: number;
        }>;
      }>;
    };
  };
  filters: {
    regions: string[];
    countries: {
      [key: string]: string[];
    };
    vendors: string[];
    dateRange: {
      from: string;
      to: string;
    };
  };
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'business_user' | 'admin'>('business_user');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDocked, setIsDocked] = useState(true);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'search' | 'failed' | 'analyze' | 'analyzeWithPrompts' | 'promptRegistry' | 'notifications' | 'metrics' | 'export' | 'controlCenter'>('dashboard');
  const [username, setUsername] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    from: '2024-01-01',
    to: getTodayDate()
  });
  const [selectedFilters, setSelectedFilters] = useState({
    region: '',
    country: '',
    vendor: 'All'
  });
  const [selectedDropdowns, setSelectedDropdowns] = useState({
    header: false,
    lineItems: false,
    taxData: false
  });
  const [showTop5Fields, setShowTop5Fields] = useState(true);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [fieldDetails, setFieldDetails] = useState<Array<{ value: string }>>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [regionsData, setRegionsData] = useState<RegionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { t, i18n } = useTranslation();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isProfileOpen &&
        profileMenuRef.current &&
        profileButtonRef.current &&
        !profileMenuRef.current.contains(event.target as Node) &&
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  useEffect(() => {
    // Initialize app and check for existing session
    const storedUsername = localStorage.getItem('username');
    const storedRole = localStorage.getItem('userRole') as 'business_user' | 'admin' | null;
    
    if (storedUsername && storedRole) {
      setUsername(storedUsername);
      setUserRole(storedRole);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const fetchControlCenterSettings = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.AGENT_CONTROLS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Control Center settings loaded:', data);
        // Settings are loaded and will be handled by the ControlCenter component
      }
    } catch (err) {
      console.error('Error fetching control center settings:', err);
      // Non-critical error, don't show to user
    }
  };

  const handleLogin = (username: string, role: 'business_user' | 'admin') => {
    localStorage.setItem('username', username);
    localStorage.setItem('userRole', role);
    localStorage.setItem('sessionId', generateSessionId());
    setUsername(username);
    setUserRole(role);
    setIsAuthenticated(true);
    setIsDataLoaded(false); // Reset data loaded state for new login
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('sessionId');
    setIsAuthenticated(false);
    setUsername('');
    setUserRole('business_user');
    setIsProfileOpen(false);
    setCurrentPage('dashboard');
    setDashboardData(null);
    setRegionsData(null);
  };

  useEffect(() => {
    if (isAuthenticated && username && !dashboardData) {
      fetchInitialData();
    }
  }, [isAuthenticated, username, dashboardData]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      await fetchRegionsData();
      if (userRole === 'admin') {
        await fetchControlCenterSettings();
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegionsData = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.REGIONS_COUNTRIES);
      if (!response.ok) {
        throw new Error('Failed to fetch regions data');
      }
      const data = await response.json();
      setRegionsData(data);
      
      // Keep default as empty - user must select
      // Don't auto-select any region or country
      await fetchDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load regions data');
      console.error('Error fetching regions data:', err);
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_ENDPOINTS.DASHBOARD);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_ENDPOINTS.DASHBOARD_FILTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_date: dateRange.from,
          to_date: dateRange.to,
          region: selectedFilters.region,
          country: selectedFilters.country,
          vendor: selectedFilters.vendor
        })
      });

      if (!response.ok) {
        throw new Error('Failed to filter dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error filtering dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const barChartData = {
    labels: dashboardData?.processingTrend.labels || [],
    datasets: [
      {
        label: 'Success',
        data: dashboardData?.processingTrend.success || [],
        backgroundColor: '#1e88e5',
      },
      {
        label: 'Failed',
        data: dashboardData?.processingTrend.failed || [],
        backgroundColor: '#dc2626',
      }
    ]
  };

  const pieChartData = {
    labels: ['Success', 'Failed'],
    datasets: [
      {
        data: [
          dashboardData?.statistics.totalSuccess || 0,
          dashboardData?.statistics.totalFailed || 0
        ],
        backgroundColor: ['#1e88e5', '#dc2626'],
      }
    ]
  };

  const handleDateChange = (type: 'from' | 'to', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleSearch = () => {
    handleFilterChange();
  };

  const toggleDropdown = (type: keyof typeof selectedDropdowns, field?: string) => {
    if (field) {
      setSelectedField(field === selectedField ? null : field);
      if (dashboardData?.top5Fields[type].values) {
        const fieldData = dashboardData.top5Fields[type].values.find(v => v.field === field);
        setFieldDetails(
          fieldData?.topValues.map(v => ({ value: `${v.value} (${v.count})` })) || []
        );
      }
    } else {
      setSelectedDropdowns(prev => {
        const newState = {
          ...prev,
          [type]: !prev[type]
        };
        if (!newState[type]) {
          setSelectedField(null);
          setFieldDetails([]);
        }
        return newState;
      });
    }
  };

  const toggleSidebar = () => {
    if (isDocked) {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    } else {
      setIsSidebarOpen(!isSidebarOpen);
    }
  };

  const getCountriesForRegion = (regionCode: string) => {
    if (!regionsData?.regions) return [];
    const region = regionsData.regions.find(r => r.regionCode === regionCode);
    return region?.countries || [];
  };

  const handleRegionChange = (regionCode: string) => {
    const countries = getCountriesForRegion(regionCode);
    setSelectedFilters(prev => ({
      ...prev,
      region: regionCode,
      country: '' // Reset country when region changes
    }));
  };

  // Define menu items based on role
  const getMenuItems = () => {
    const businessUserItems = [
      {
        id: 'dashboard',
        icon: <BarChart3 size={20} className="text-blue-400 flex-shrink-0" />,
        label: t('dashboard')
      },
      {
        id: 'search',
        icon: <Search size={20} className="text-cyan-400 flex-shrink-0" />,
        label: t('searchInvoices')
      },
      {
        id: 'failed',
        icon: <AlertTriangle size={20} className="text-amber-400 flex-shrink-0" />,
        label: t('failedInvoices')
      },
      {
        id: 'analyze',
        icon: <FileSearch size={20} className="text-emerald-400 flex-shrink-0" />,
        label: t('analyzeInvoices')
      },
      {
        id: 'notifications',
        icon: <Bell size={20} className="text-red-400 flex-shrink-0" />,
        label: 'Notification Preferences'
      },
      {
        id: 'metrics',
        icon: <LineChart size={20} className="text-pink-400 flex-shrink-0" />,
        label: 'Performance Metrics'
      },
      {
        id: 'export',
        icon: <Download size={20} className="text-teal-400 flex-shrink-0" />,
        label: 'Export for Analysis'
      }
    ];

    const adminItems = [
      ...businessUserItems,
      {
        id: 'analyzeWithPrompts',
        icon: <MessageSquare size={20} className="text-purple-400 flex-shrink-0" />,
        label: 'Analyze with Prompts'
      },
      {
        id: 'promptRegistry',
        icon: <Database size={20} className="text-indigo-400 flex-shrink-0" />,
        label: 'Prompt Registry'
      },
      {
        id: 'controlCenter',
        icon: <Shield size={20} className="text-orange-400 flex-shrink-0" />,
        label: 'Control Center'
      }
    ];

    return userRole === 'admin' ? adminItems : businessUserItems;
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'search':
        return <SearchInvoices regionsData={regionsData} />;
      case 'analyze':
        return <AnalyzeInvoices />;
      case 'analyzeWithPrompts':
        return <AnalyzeInvoicesWithPrompts />;
      case 'failed':
        return <FailedInvoices />;
      case 'promptRegistry':
        return <PromptRegistry />;
      case 'notifications':
        return <NotificationPreferences />;
      case 'metrics':
        return <PerformanceMetrics />;
      case 'export':
        return <ExportForAnalysis />;
      case 'controlCenter':
        return <ControlCenter />;
      default:
        return (
          <div className="max-w-7xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('region')}</label>
                  <select 
                    className="w-full border border-gray-300 rounded-md p-2"
                    value={selectedFilters.region}
                    onChange={(e) => handleRegionChange(e.target.value)}
                  >
                    <option value="">Select Region</option>
                    {regionsData?.regions.map(region => (
                      <option key={region.regionCode} value={region.regionCode}>
                        {region.regionName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('country')}</label>
                  <select 
                    className={`w-full border border-gray-300 rounded-md p-2 ${
                      !selectedFilters.region ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                    }`}
                    value={selectedFilters.country}
                    onChange={(e) => {
                      setSelectedFilters(prev => ({ ...prev, country: e.target.value }));
                    }}
                    disabled={!selectedFilters.region}
                  >
                    <option value="">Select Country</option>
                    {getCountriesForRegion(selectedFilters.region).map(country => (
                      <option key={country.countryCode} value={country.countryCode}>
                        {country.countryName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('vendor')}</label>
                  <select 
                    className="w-full border border-gray-300 rounded-md p-2"
                    value={selectedFilters.vendor}
                    onChange={(e) => {
                      setSelectedFilters(prev => ({ ...prev, vendor: e.target.value }));
                    }}
                  >
                    <option value="All">All</option>
                    {dashboardData?.filters.vendors.map(vendor => (
                      <option key={vendor} value={vendor}>{vendor}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('receivedFrom')}</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-md p-2" 
                    value={dateRange.from}
                    onChange={(e) => handleDateChange('from', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('receivedTo')}</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-md p-2" 
                    value={dateRange.to}
                    onChange={(e) => handleDateChange('to', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex space-x-4 mt-4">
                <button 
                  className="bg-[#1e88e5] text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors"
                  onClick={handleSearch}
                >
                  {t('search')}
                </button>
                <button className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors">
                  {t('reset')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-medium text-[#1e88e5] mb-2">{t('totalProcessed')}</h3>
                <p className="text-4xl font-bold">{Math.round(dashboardData?.statistics.totalProcessed || 0)}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-medium text-green-600 mb-2">{t('success')}</h3>
                <p className="text-4xl font-bold">{Math.round(dashboardData?.statistics.totalSuccess || 0)}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-medium text-red-600 mb-2">{t('failed')}</h3>
                <p className="text-4xl font-bold">{Math.round(dashboardData?.statistics.totalFailed || 0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">{t('processingTrend')}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="h-64">
                    <Bar 
                      data={barChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          x: {
                            stacked: true,
                          },
                          y: {
                            stacked: true,
                          },
                        },
                      }}
                    />
                  </div>
                  <div className="h-64">
                    <Pie 
                      data={pieChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800">{t('top5Fields')}</h3>
                  <button
                    onClick={() => {
                      setShowTop5Fields(!showTop5Fields);
                      if (showTop5Fields) {
                        setSelectedDropdowns({
                          header: false,
                          lineItems: false,
                          taxData: false
                        });
                        setSelectedField(null);
                        setFieldDetails([]);
                      }
                    }}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ChevronDown
                      size={20}
                      className={`transform transition-transform duration-200 ${
                        showTop5Fields ? '' : '-rotate-90'
                      }`}
                    />
                  </button>
                </div>
                
                {showTop5Fields && (
                  <div className="space-y-3">
                    <div className="relative">
                      <button
                        onClick={() => toggleDropdown('header')}
                        className="w-full flex items-center justify-between p-3 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        <span className="font-medium text-gray-900">{t('header')}</span>
                        <ChevronDown
                          size={20}
                          className={`text-[#1e88e5] transform transition-transform duration-200 ${
                            selectedDropdowns.header ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {selectedDropdowns.header && (
                        <div className="mt-1 border border-gray-200 rounded-md">
                          {dashboardData?.top5Fields.header.fields.map((field, index) => (
                            <div 
                              key={index} 
                              className="p-2 hover:bg-gray-50 cursor-pointer text-gray-900"
                              onClick={() => toggleDropdown('header', field)}
                            >
                              {field}
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedField && dashboardData?.top5Fields.header.fields.includes(selectedField) && selectedDropdowns.header && (
                        <div className="mt-2 space-y-2">
                          {fieldDetails.map((detail, index) => (
                            <div key={index} className="p-2 bg-gray-50 rounded">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-900">{detail.value}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => toggleDropdown('lineItems')}
                        className="w-full flex items-center justify-between p-3 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        <span className="font-medium text-gray-900">{t('lineItems')}</span>
                        <ChevronDown
                          size={20}
                          className={`text-[#1e88e5] transform transition-transform duration-200 ${
                            selectedDropdowns.lineItems ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {selectedDropdowns.lineItems && (
                        <div className="mt-1 border border-gray-200 rounded-md">
                          {dashboardData?.top5Fields.lineItems.fields.map((field, index) => (
                            <div 
                              key={index} 
                              className="p-2 hover:bg-gray-50 cursor-pointer text-gray-900"
                              onClick={() => toggleDropdown('lineItems', field)}
                            >
                              {field}
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedField && dashboardData?.top5Fields.lineItems.fields.includes(selectedField) && selectedDropdowns.lineItems && (
                        <div className="mt-2 space-y-2">
                          {fieldDetails.map((detail, index) => (
                            <div key={index} className="p-2 bg-gray-50 rounded">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-900">{detail.value}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => toggleDropdown('taxData')}
                        className="w-full flex items-center justify-between p-3 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        <span className="font-medium text-gray-900">{t('taxData')}</span>
                        <ChevronDown
                          size={20}
                          className={`text-[#1e88e5] transform transition-transform duration-200 ${
                            selectedDropdowns.taxData ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {selectedDropdowns.taxData && (
                        <div className="mt-1 border border-gray-200 rounded-md">
                          {dashboardData?.top5Fields.taxData.fields.map((field, index) => (
                            <div 
                              key={index} 
                              className="p-2 hover:bg-gray-50 cursor-pointer text-gray-900"
                              onClick={() => toggleDropdown('taxData', field)}
                            >
                              {field}
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedField && dashboardData?.top5Fields.taxData.fields.includes(selectedField) && selectedDropdowns.taxData && (
                        <div className="mt-2 space-y-2">
                          {fieldDetails.map((detail, index) => (
                            <div key={index} className="p-2 bg-gray-50 rounded">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-900">{detail.value}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1e88e5] text-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {!isDocked && (
                <button 
                  onClick={toggleSidebar}
                  className="p-2 hover:bg-blue-600 rounded-lg transition-colors"
                >
                  <Menu size={24} />
                </button>
              )}
              <div className="flex items-center space-x-2">
                <Mountains size={32} />
                <span className="text-xl font-semibold">Company Name</span>
              </div>
              <h1 className="text-xl font-semibold hidden md:block">GBS – Invoice Assistant</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="relative">
                <button 
                  ref={profileButtonRef}
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors"
                >
                  <img 
                    src="/assistant-icon.png" 
                    alt="User" 
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="hidden md:inline">{username}</span>
                  <ChevronDown size={16} />
                </button>
                
                {isProfileOpen && (
                  <div 
                    ref={profileMenuRef}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50"
                  >
                    <div className="px-4 py-2 text-gray-800">
                      <p className="font-medium">{username}</p>
                      <p className="text-sm text-gray-500">{username.toLowerCase()}@company.com</p>
                      <p className="text-xs text-blue-600 mt-1 capitalize">
                        {userRole === 'business_user' ? 'Business User' : 'Administrator'}
                      </p>
                    </div>
                    <hr className="my-2" />
                    <div className="px-4 py-2">
                      <div className="flex items-center space-x-2 text-gray-700">
                        <Settings size={16} />
                        <span>{t('language')}</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        <button
                          onClick={() => changeLanguage('en')}
                          className="w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                        >
                          English
                        </button>
                        <button
                          onClick={() => changeLanguage('pl')}
                          className="w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                        >
                          Polski
                        </button>
                      </div>
                    </div>
                    <hr className="my-2" />
                    <div className="px-4 py-2">
                      <div className="flex items-center justify-between text-gray-700">
                        <span>Sidebar Mode</span>
                        <button
                          onClick={() => setIsDocked(!isDocked)}
                          className={`px-2 py-1 rounded ${isDocked ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                        >
                          {isDocked ? 'Docked' : 'Flyout'}
                        </button>
                      </div>
                    </div>
                    <hr className="my-2" />
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      {t('signOut')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)] relative">
        <div className={`relative ${isDocked || isSidebarOpen ? 'block' : 'hidden'}`}>
          <aside className={`bg-gradient-to-b from-slate-800 via-slate-700 to-slate-800 shadow-xl h-full transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-64'}`}>
            <nav className="p-4 space-y-2">
              {getMenuItems().map(item => (
                <a 
                  key={item.id}
                  href="#" 
                  className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    currentPage === item.id 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105' 
                      : 'text-slate-300 hover:bg-slate-600 hover:text-white hover:transform hover:scale-105'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(item.id as typeof currentPage);
                  }}
                >
                  {item.icon}
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </a>
              ))}
            </nav>
          </aside>
          <div 
            className="absolute -right-1 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-200 transition-colors"
            onClick={toggleSidebar}
          >
            <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-1 shadow-md border border-gray-200">
              {isSidebarCollapsed ? <ChevronRight size={16} className="text-slate-600" /> : <ChevronLeft size={16} className="text-slate-600" />}
            </div>
          </div>
        </div>

        <main className="flex-1 relative">
          <button
            onClick={() => setIsChatOpen(true)}
            className="absolute right-6 top-6 w-12 h-12 flex items-center justify-center transition-transform hover:scale-110"
          >
            <img src="/assistant-icon.png" alt="Chat with AI" className="w-full h-full" />
          </button>

          {renderContent()}
        </main>
      </div>

      <ChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}

export default App;