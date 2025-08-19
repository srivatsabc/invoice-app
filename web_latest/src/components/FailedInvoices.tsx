import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, PenSquare, AlertTriangle, Filter, Clock, XCircle, TrendingDown, Settings, Eye, EyeOff, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import InvoiceViewer from './InvoiceViewer';
import Pagination from './Pagination';
import { API_ENDPOINTS } from '../constants/api';

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

interface SearchFilters {
  region: string;
  country: string;
  vendor: string;
  poNumber: string;
  invoiceNumber: string;
  invoiceType: string;
  receivedFrom: string;
  receivedTo: string;
  errorType: string;
  status: string;
}

interface SearchResult {
  invoiceNumber: string;
  region: string;
  country: string;
  vendor: string;
  invoiceType: string;
  recdDate: string;
  errorType: string;
  errorMessage: string;
  status: string;
}

interface ColumnConfig {
  key: keyof SearchResult | 'actions';
  label: string;
  visible: boolean;
  required?: boolean;
}

interface ColumnSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onColumnToggle: (columnKey: string) => void;
  onResetColumns: () => void;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  isOpen,
  onClose,
  columns,
  onColumnToggle,
  onResetColumns
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Column Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {columns.map((column) => (
            <div key={column.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded flex items-center justify-center ${
                  column.visible ? 'bg-red-500' : 'bg-gray-300'
                }`}>
                  {column.visible && <Eye className="w-3 h-3 text-white" />}
                  {!column.visible && <EyeOff className="w-3 h-3 text-gray-500" />}
                </div>
                <span className={`text-sm font-medium ${
                  column.required ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  {column.label}
                  {column.required && <span className="text-red-500 ml-1">*</span>}
                </span>
              </div>
              <button
                onClick={() => onColumnToggle(column.key)}
                disabled={column.required}
                className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                  column.required 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : column.visible 
                    ? 'bg-red-500' 
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ${
                    column.visible ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={onResetColumns}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const FailedInvoices = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<SearchFilters>({
    region: '',
    country: '',
    vendor: 'All',
    poNumber: '',
    invoiceNumber: '',
    invoiceType: 'All',
    receivedFrom: '2024-01-01',
    receivedTo: getTodayDate(),
    errorType: 'All',
    status: 'All'
  });

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [showInvoiceViewer, setShowInvoiceViewer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [regionsData, setRegionsData] = useState<RegionsData | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof SearchResult;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'invoiceNumber', label: 'Invoice No.', visible: true, required: true },
    { key: 'region', label: 'Region', visible: true },
    { key: 'country', label: 'Country', visible: true },
    { key: 'vendor', label: 'Vendor', visible: true },
    { key: 'invoiceType', label: 'Invoice Type', visible: true },
    { key: 'recdDate', label: 'Recd. Date', visible: true },
    { key: 'errorType', label: 'Error Type', visible: true },
    { key: 'errorMessage', label: 'Error Message', visible: true },
    { key: 'status', label: 'Status', visible: true, required: true },
    { key: 'actions', label: 'Actions', visible: true, required: true }
  ]);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchRegionsData();
  }, []);

  const fetchRegionsData = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.REGIONS_COUNTRIES);
      if (!response.ok) {
        throw new Error('Failed to fetch regions data');
      }
      const data = await response.json();
      setRegionsData(data);
    } catch (err) {
      console.error('Error fetching regions data:', err);
    }
  };

  const getCountriesForRegion = (regionCode: string) => {
    if (!regionsData?.regions) return [];
    const region = regionsData.regions.find(r => r.regionCode === regionCode);
    return region?.countries || [];
  };

  const handleRegionChange = (regionCode: string) => {
    setFilters(prev => ({
      ...prev,
      region: regionCode,
      country: '' // Reset country when region changes
    }));
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const generateMockResults = () => {
    const vendors = ['ADP India PVT Ltd.', 'Stanley Engg.', 'Global Tech Solutions', 'Innovate Systems'];
    const errorTypes = ['Validation Error', 'Missing Data', 'Format Error', 'System Error'];
    const errorMessages = [
      'Invalid tax calculation',
      'Missing vendor details',
      'Incorrect date format',
      'System processing timeout'
    ];
    const statuses = ['Pending Review', 'In Progress', 'Rejected'];
    
    const results: SearchResult[] = Array.from({ length: 35 }, (_, index) => ({
      invoiceNumber: `INV-${Math.random().toString(36).substring(7).toUpperCase()}`,
      region: 'NA',
      country: 'USA',
      vendor: vendors[Math.floor(Math.random() * vendors.length)],
      invoiceType: 'PO',
      recdDate: '06/17/2024',
      errorType: errorTypes[Math.floor(Math.random() * errorTypes.length)],
      errorMessage: errorMessages[Math.floor(Math.random() * errorMessages.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)]
    }));
    return results;
  };

  const handleSearch = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const results = generateMockResults();
    setSearchResults(results);
    setCurrentPage(1);
    setIsLoading(false);
  };

  const handleReset = () => {
    setFilters({
      region: '',
      country: '',
      vendor: 'All',
      poNumber: '',
      invoiceNumber: '',
      invoiceType: 'All',
      receivedFrom: '2024-01-01',
      receivedTo: getTodayDate(),
      errorType: 'All',
      status: 'All'
    });
    setSearchResults([]);
  };

  const handleSort = (key: keyof SearchResult) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    setSortConfig({ key, direction });

    const sortedResults = [...searchResults].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setSearchResults(sortedResults);
  };

  const handleColumnToggle = (columnKey: string) => {
    setColumns(prev => prev.map(col => 
      col.key === columnKey && !col.required 
        ? { ...col, visible: !col.visible }
        : col
    ));
  };

  const handleResetColumns = () => {
    setColumns(prev => prev.map(col => ({ ...col, visible: true })));
  };

  // Filter visible columns
  const visibleColumns = columns.filter(col => col.visible);

  const totalPages = Math.ceil(searchResults.length / itemsPerPage);
  const paginatedResults = searchResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{t('failedInvoices')}</h1>
              <p className="text-red-100 mt-1">Review and manage invoices that require attention and correction</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm font-medium">{searchResults.length} Failed</span>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
              <XCircle className="w-4 h-4" />
              <span className="text-sm font-medium">This Week</span>
            </div>
            <button 
              onClick={() => setShowColumnSelector(true)}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              title="Column Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <Filter className="w-5 h-5 text-red-500" />
              <span>Filter Failed Invoices</span>
            </h3>
            <button
              onClick={handleReset}
              className="text-gray-500 hover:text-gray-700 text-sm flex items-center space-x-1"
            >
              <span>Reset All</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('region')}
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={filters.region}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('country')}
              </label>
              <select
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  !filters.region ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                }`}
                value={filters.country}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                disabled={!filters.region}
              >
                <option value="">Select Country</option>
                {getCountriesForRegion(filters.region).map(country => (
                  <option key={country.countryCode} value={country.countryCode}>
                    {country.countryName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('vendor')}
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={filters.vendor}
                onChange={(e) => handleFilterChange('vendor', e.target.value)}
              >
                <option value="All">All</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PO No.
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={filters.poNumber}
                onChange={(e) => handleFilterChange('poNumber', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice No.
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={filters.invoiceNumber}
                onChange={(e) => handleFilterChange('invoiceNumber', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Error Type
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={filters.errorType}
                onChange={(e) => handleFilterChange('errorType', e.target.value)}
              >
                <option value="All">All</option>
                <option value="Validation">Validation Error</option>
                <option value="Missing">Missing Data</option>
                <option value="Format">Format Error</option>
                <option value="System">System Error</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recd. From
              </label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  value={filters.receivedFrom}
                  onChange={(e) => handleFilterChange('receivedFrom', e.target.value)}
                />
                <Calendar className="absolute right-3 top-2.5 text-gray-400" size={20} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recd. To
              </label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  value={filters.receivedTo}
                  onChange={(e) => handleFilterChange('receivedTo', e.target.value)}
                />
                <Calendar className="absolute right-3 top-2.5 text-gray-400" size={20} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="All">All</option>
                <option value="Pending">Pending Review</option>
                <option value="InProgress">In Progress</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className={`bg-red-600 text-white px-8 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{isLoading ? 'Searching...' : 'Search'}</span>
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-500 text-white px-8 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Results Section */}
      {searchResults.length > 0 && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span>Failed Invoices ({searchResults.length})</span>
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>Last updated: {new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {visibleColumns.map((column) => (
                      <th 
                        key={column.key}
                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                          ['invoiceNumber', 'vendor', 'recdDate'].includes(column.key) ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => {
                          if (['invoiceNumber', 'vendor', 'recdDate'].includes(column.key)) {
                            handleSort(column.key as keyof SearchResult);
                          }
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{column.label}</span>
                          {['invoiceNumber', 'vendor', 'recdDate'].includes(column.key) && (
                            <div className="flex flex-col">
                              <ChevronUp size={12} className={sortConfig?.key === column.key && sortConfig.direction === 'asc' ? 'text-red-600' : ''} />
                              <ChevronDown size={12} className={sortConfig?.key === column.key && sortConfig.direction === 'desc' ? 'text-red-600' : ''} />
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedResults.map((result, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {visibleColumns.map((column) => {
                        if (column.key === 'actions') {
                          return (
                            <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <button 
                                className="text-red-600 hover:text-red-800"
                                onClick={() => setShowInvoiceViewer(true)}
                              >
                                <PenSquare size={18} />
                              </button>
                            </td>
                          );
                        }
                        
                        if (column.key === 'errorType') {
                          return (
                            <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                {result.errorType}
                              </span>
                            </td>
                          );
                        }
                        
                        if (column.key === 'status') {
                          return (
                            <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                result.status === 'Pending Review' 
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : result.status === 'In Progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {result.status}
                              </span>
                            </td>
                          );
                        }
                        
                        return (
                          <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result[column.key as keyof SearchResult]}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {/* Column Selector Modal */}
      <ColumnSelector
        isOpen={showColumnSelector}
        onClose={() => setShowColumnSelector(false)}
        columns={columns}
        onColumnToggle={handleColumnToggle}
        onResetColumns={handleResetColumns}
      />

      {showInvoiceViewer && (
        <InvoiceViewer onClose={() => setShowInvoiceViewer(false)} />
      )}
    </div>
  );
};

export default FailedInvoices;