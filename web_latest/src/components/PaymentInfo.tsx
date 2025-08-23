import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, Search, Filter, CreditCard, BarChart3, Clock, DollarSign, Settings, Eye, EyeOff, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  invoiceNumber: string;
  batchNumber: string;
  payRuleId: string;
  paymentDateFrom: string;
  paymentDateTo: string;
  currency: string;
  createdBy: string;
}

interface PaymentResult {
  id: number;
  invoice_header_id: string;
  invoice_number: string;
  batch_number: number;
  pay_rule_id: string;
  payment_time: string;
  payment_date: string;
  batch_amount: number;
  currency: string;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface PaymentResponse {
  payments: PaymentResult[];
  total_count: number;
  total_amount: number;
}

interface ColumnConfig {
  key: keyof PaymentResult | 'actions';
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
            <Settings className="w-5 h-5 text-green-500" />
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
                  column.visible ? 'bg-green-500' : 'bg-gray-300'
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
                className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                  column.required 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : column.visible 
                    ? 'bg-green-500' 
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
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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

const PaymentInfo = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<SearchFilters>({
    region: '',
    country: '',
    vendor: '',
    invoiceNumber: '',
    batchNumber: '',
    payRuleId: '',
    paymentDateFrom: '2024-01-01',
    paymentDateTo: getTodayDate(),
    currency: 'All',
    createdBy: ''
  });

  const [searchResults, setSearchResults] = useState<PaymentResult[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [regionsData, setRegionsData] = useState<RegionsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof PaymentResult;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'invoice_number', label: 'Invoice No.', visible: true, required: true },
    { key: 'batch_number', label: 'Batch No.', visible: true, required: true },
    { key: 'pay_rule_id', label: 'Pay Rule ID', visible: true },
    { key: 'payment_time', label: 'Time', visible: true },
    { key: 'payment_date', label: 'Date', visible: true },
    { key: 'batch_amount', label: 'Batch Amount', visible: true },
    { key: 'currency', label: 'Currency', visible: true },
    { key: 'amount_paid', label: 'Amount Paid', visible: true },
    { key: 'created_by', label: 'Created By', visible: true }
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
      setError('Failed to load regions data');
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

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (filters.invoiceNumber) queryParams.append('invoice_number', filters.invoiceNumber);
      if (filters.batchNumber) queryParams.append('batch_number', filters.batchNumber);
      if (filters.payRuleId) queryParams.append('pay_rule_id', filters.payRuleId);
      if (filters.paymentDateFrom) queryParams.append('payment_date_from', filters.paymentDateFrom);
      if (filters.paymentDateTo) queryParams.append('payment_date_to', filters.paymentDateTo);
      if (filters.currency && filters.currency !== 'All') queryParams.append('currency', filters.currency);
      if (filters.createdBy) queryParams.append('created_by', filters.createdBy);
      
      queryParams.append('page', currentPage.toString());
      queryParams.append('page_size', itemsPerPage.toString());

      const response = await fetch(`${API_ENDPOINTS.SEARCH_INVOICES}/payments?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment data');
      }

      const data: PaymentResponse = await response.json();
      setSearchResults(data.payments || []);
      setTotalCount(data.total_count || 0);
      setTotalAmount(data.total_amount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while searching payments');
      console.error('Error searching payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      region: '',
      country: '',
      vendor: '',
      invoiceNumber: '',
      batchNumber: '',
      payRuleId: '',
      paymentDateFrom: '2024-01-01',
      paymentDateTo: getTodayDate(),
      currency: 'All',
      createdBy: ''
    });
    setSearchResults([]);
    setCurrentPage(1);
    setTotalCount(0);
    setTotalAmount(0);
    setError(null);
  };

  const handleSort = (key: keyof PaymentResult) => {
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

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const formatTime = (timeString: string) => {
    return timeString; // Already in HH:MM:SS format
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Payment Info</h1>
              <p className="text-green-100 mt-1">Search and manage payment records and transaction details</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-medium">{searchResults.length} Payments</span>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">{formatCurrency(totalAmount, 'USD')}</span>
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

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-3">
            <div className="text-red-500">⚠️</div>
            <div className="text-red-700">{error}</div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <Filter className="w-5 h-5 text-green-500" />
              <span>Search Payments</span>
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
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
                Currency
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={filters.currency}
                onChange={(e) => handleFilterChange('currency', e.target.value)}
              >
                <option value="All">All</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice No.
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={filters.invoiceNumber}
                onChange={(e) => handleFilterChange('invoiceNumber', e.target.value)}
                placeholder="Enter invoice number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch No.
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={filters.batchNumber}
                onChange={(e) => handleFilterChange('batchNumber', e.target.value)}
                placeholder="Enter batch number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pay Rule ID
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={filters.payRuleId}
                onChange={(e) => handleFilterChange('payRuleId', e.target.value)}
                placeholder="Enter pay rule ID"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date From
              </label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={filters.paymentDateFrom}
                  onChange={(e) => handleFilterChange('paymentDateFrom', e.target.value)}
                />
                <Calendar className="absolute right-3 top-2.5 text-gray-400" size={20} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date To
              </label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={filters.paymentDateTo}
                  onChange={(e) => handleFilterChange('paymentDateTo', e.target.value)}
                />
                <Calendar className="absolute right-3 top-2.5 text-gray-400" size={20} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Created By
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={filters.createdBy}
                onChange={(e) => handleFilterChange('createdBy', e.target.value)}
                placeholder="Enter username"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className={`bg-green-600 text-white px-8 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Search className="w-4 h-4" />
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

      {/* Summary Cards */}
      {searchResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-medium text-green-600 mb-2">Total Payments</h3>
            <p className="text-4xl font-bold">{totalCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-medium text-blue-600 mb-2">Total Amount</h3>
            <p className="text-4xl font-bold">{formatCurrency(totalAmount, 'USD')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-medium text-purple-600 mb-2">Average Payment</h3>
            <p className="text-4xl font-bold">
              {totalCount > 0 ? formatCurrency(totalAmount / totalCount, 'USD') : '$0.00'}
            </p>
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
                  <CreditCard className="w-5 h-5 text-green-500" />
                  <span>Payment Records ({searchResults.length})</span>
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
                  <tr className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 border-b-2 border-green-300">
                    {visibleColumns.map((column) => (
                      <th 
                        key={column.key}
                        className={`px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider ${
                          ['invoice_number', 'batch_number', 'payment_date', 'batch_amount'].includes(column.key) ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => {
                          if (['invoice_number', 'batch_number', 'payment_date', 'batch_amount'].includes(column.key)) {
                            handleSort(column.key as keyof PaymentResult);
                          }
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{column.label}</span>
                          {['invoice_number', 'batch_number', 'payment_date', 'batch_amount'].includes(column.key) && (
                            <div className="flex flex-col">
                              <ChevronUp size={12} className={sortConfig?.key === column.key && sortConfig.direction === 'asc' ? 'text-yellow-300' : 'text-white/60'} />
                              <ChevronDown size={12} className={sortConfig?.key === column.key && sortConfig.direction === 'desc' ? 'text-yellow-300' : 'text-white/60'} />
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {searchResults.map((result, index) => (
                    <tr key={result.id} className={`transition-all duration-200 hover:bg-green-50 hover:shadow-sm ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}>
                      {visibleColumns.map((column) => {
                        if (column.key === 'payment_time') {
                          return (
                            <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
                              {formatTime(result.payment_time)}
                            </td>
                          );
                        }
                        
                        if (column.key === 'payment_date') {
                          return (
                            <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
                              {formatDate(result.payment_date)}
                            </td>
                          );
                        }
                        
                        if (column.key === 'batch_amount' || column.key === 'amount_paid') {
                          return (
                            <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className="font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg">
                                {formatCurrency(result[column.key], result.currency)}
                              </span>
                            </td>
                          );
                        }
                        
                        if (column.key === 'batch_number') {
                          return (
                            <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200 shadow-sm">
                                #{result.batch_number}
                              </span>
                            </td>
                          );
                        }
                        
                        return (
                          <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
                            {result[column.key as keyof PaymentResult]}
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
    </div>
  );
};

export default PaymentInfo;