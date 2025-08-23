import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, PenSquare, Search, Filter, FileSearch, BarChart3, Clock, Bot, X, Copy, Download, Settings, Eye, EyeOff } from 'lucide-react';
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
  status: string;
  hasUserFeedback: string;
}

interface SearchResult {
  id: string;
  invoiceNumber: string;
  region: string;
  country: string;
  vendor: string;
  brandName: string;
  invoiceType: string;
  recdDate: string;
  invoiceTotal: string;
  processedDate: string;
  status: string;
  hasUserFeedback: string;
  hasLogs: string; // Added hasLogs field
}

interface InvoiceDetail {
  header: {
    region: string;
    country: string;
    vendor: string;
    invoiceNumber: string;
    vendorAddress: string;
    poNumber: string;
    taxId: string;
    shipmentNumber: string;
    receivedDate: string;
    processedDate: string;
  };
  lineItems: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxRate: number;
  }>;
  taxData: Array<{
    id: string;
    taxAmount: number;
    taxCategory: string;
    taxJurisdiction: string;
    taxRegistration: string;
  }>;
  pdfUrl: string;
}

interface AgentLog {
  transactionId: string;
  log: string;
}

interface AgentLogsResponse {
  logs: AgentLog[];
}

interface LogViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: string;
  transactionId: string;
  logs: string;
}

interface ColumnConfig {
  key: keyof SearchResult | 'agentLogs' | 'actions';
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
            <Settings className="w-5 h-5 text-blue-500" />
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
                  column.visible ? 'bg-blue-500' : 'bg-gray-300'
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
                className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  column.required 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : column.visible 
                    ? 'bg-blue-500' 
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const LogViewerModal: React.FC<LogViewerModalProps> = ({ 
  isOpen, 
  onClose, 
  invoiceNumber, 
  transactionId, 
  logs 
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy logs:', err);
    }
  };

  const handleDownloadLogs = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-logs-${invoiceNumber}-${transactionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      {/* Container positioned relative to the main content area */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* Adjust positioning to account for sidebar */}
        <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[84vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-t-xl p-5 text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Agent Logs</h2>
                  <p className="text-blue-100 mt-1">Invoice: {invoiceNumber} | Transaction: {transactionId}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyLogs}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                  title="Copy logs to clipboard"
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-sm">{isCopied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownloadLogs}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                  title="Download logs as text file"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm">Download</span>
                </button>
                <button
                  onClick={onClose}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Log Content */}
          <div className="flex-1 p-5 overflow-hidden">
            <div className="h-full bg-gray-900 rounded-lg overflow-hidden flex flex-col">
              {/* Log Header */}
              <div className="bg-gray-800 px-4 py-2.5 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4 text-gray-300">
                    <span>📄 Agent Log Output</span>
                    <span>|</span>
                    <span>Size: {(logs.length / 1024).toFixed(2)} KB</span>
                    <span>|</span>
                    <span>Lines: {logs.split('\n').length}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Live</span>
                  </div>
                </div>
              </div>
              
              {/* Scrollable Log Content */}
              <div className="flex-1 overflow-auto p-4 log-viewer-scroll">
                <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap leading-relaxed select-text">
                  {logs}
                </pre>
              </div>
              
              {/* Log Footer */}
              <div className="bg-gray-800 px-4 py-2.5 border-t border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>💡 Tip: Use Ctrl+F to search within logs</span>
                  <span>Scroll to navigate • Select text to copy portions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-5 py-4 bg-gray-50 rounded-b-xl flex-shrink-0">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <span>📊 Log Analysis Ready</span>
                <span>•</span>
                <span>Transaction ID: {transactionId}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Agent Monitoring Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SearchInvoicesProps {
  regionsData: RegionsData | null;
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const SearchInvoices: React.FC<SearchInvoicesProps> = ({ regionsData }) => {
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
    status: 'All',
    hasUserFeedback: 'Select'
  });

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [showInvoiceViewer, setShowInvoiceViewer] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [sortConfig, setSortConfig] = useState({
    field: 'invoiceNumber' as keyof SearchResult,
    direction: 'asc' as 'asc' | 'desc'
  });
  const [isLoggingEnabled, setIsLoggingEnabled] = useState(false);
  const [isInvoiceProcessingEnabled, setIsInvoiceProcessingEnabled] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<{
    invoiceNumber: string;
    transactionId: string;
    logs: string;
  } | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'invoiceNumber', label: 'Invoice No.', visible: true, required: true },
    { key: 'region', label: 'Region', visible: true },
    { key: 'country', label: 'Country', visible: true },
    { key: 'vendor', label: 'Vendor', visible: true },
    { key: 'invoiceType', label: 'Invoice Type', visible: true },
    { key: 'recdDate', label: 'Recd. Date', visible: true },
    { key: 'invoiceTotal', label: 'Invoice Total', visible: true },
    { key: 'status', label: 'Status', visible: true, required: true },
    { key: 'agentLogs', label: 'Agent Logs', visible: true },
    { key: 'actions', label: 'Actions', visible: true, required: true }
  ]);
  const itemsPerPage = 10;

  // Check if logging and invoice processing are enabled on component mount and when returning from other pages
  useEffect(() => {
    checkControlSettings();
  }, []);

  const checkControlSettings = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.AGENT_CONTROLS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check logging control
        const loggingControl = data.controls.find((control: any) => control.control === 'logging');
        setIsLoggingEnabled(loggingControl?.isActive || false);
        
        // Check invoice processing control
        const invoiceProcessingControl = data.controls.find((control: any) => control.control === 'invoice_processing');
        setIsInvoiceProcessingEnabled(invoiceProcessingControl?.isActive || false);
      }
    } catch (err) {
      console.error('Error checking control settings:', err);
      // Default to false if we can't check
      setIsLoggingEnabled(false);
      setIsInvoiceProcessingEnabled(false);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
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

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        filters,
        pagination: {
          page: currentPage,
          pageSize: itemsPerPage
        },
        sort: {
          field: sortConfig.field,
          direction: sortConfig.direction
        }
      };

      const response = await fetch(`${API_ENDPOINTS.SEARCH_INVOICES}/search-invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }

      const data = await response.json();
      setSearchResults(data.results || []);
      
      // Use pagination info from API response
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 0);
        // Update current page if it's different from what we expected
        if (data.pagination.page !== currentPage) {
          setCurrentPage(data.pagination.page);
        }
      } else {
        // Fallback to calculating from total count
        setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error searching invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewInvoice = async (invoiceNumber: string, invoiceId: string, invoiceData: SearchResult) => {
    setIsLoading(true);
    setError(null);
    try {
      // Use the new API endpoint format with both invoice number and ID
      const response = await fetch(`${API_ENDPOINTS.SEARCH_INVOICES}/invoices/${invoiceNumber}/ids/${invoiceId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoice details');
      }
      const data = await response.json();
      setSelectedInvoice(data);
      setSelectedInvoiceData(invoiceData || null);
      setShowInvoiceViewer(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching invoice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAgentLogs = async (transactionId: string, invoiceNumber: string) => {
    setIsLoadingLogs(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.AGENT_LOGS}/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch agent logs');
      }

      const data: AgentLogsResponse = await response.json();
      
      if (data.logs && data.logs.length > 0) {
        // Get the first log entry (assuming there's typically one per transaction)
        const logEntry = data.logs[0];
        setSelectedLogs({
          invoiceNumber,
          transactionId: logEntry.transactionId,
          logs: logEntry.log
        });
        setShowLogViewer(true);
      } else {
        setError('No logs found for this transaction');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agent logs');
      console.error('Error fetching agent logs:', err);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSort = (field: keyof SearchResult) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    handleSearch();
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
      status: 'All',
      hasUserFeedback: 'Select'
    });
    setSearchResults([]);
    setCurrentPage(1);
    setTotalPages(0);
    setSortConfig({
      field: 'invoiceNumber',
      direction: 'asc'
    });
    setError(null);
  };

  // Function to determine if action button should be enabled
  const isActionButtonEnabled = (status: string) => {
    if (isInvoiceProcessingEnabled) {
      // When invoice processing is enabled, allow actions on both "extracted" and "processed" status
      return status.toLowerCase() === 'extracted' || status.toLowerCase() === 'processed';
    } else {
      // When invoice processing is disabled, only allow actions on "processed" status
      return status.toLowerCase() === 'processed';
    }
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

  useEffect(() => {
    // Trigger search when page changes (but not on initial load when no results exist)
    if (searchResults.length > 0) {
      handleSearch();
    }
  }, [currentPage]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{t('searchInvoices')}</h1>
              <p className="text-blue-100 mt-1">Find and manage your processed invoices with advanced search capabilities</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-medium">{searchResults.length} Results</span>
            </div>
            {isLoggingEnabled && (
              <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
                <Bot className="w-4 h-4" />
                <span className="text-sm font-medium">Logging Active</span>
              </div>
            )}
            {isInvoiceProcessingEnabled && (
              <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
                <PenSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Edits Enabled</span>
              </div>
            )}
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
              <Filter className="w-5 h-5 text-blue-500" />
              <span>Search Filters</span>
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.invoiceNumber}
                onChange={(e) => handleFilterChange('invoiceNumber', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Type
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.invoiceType}
                onChange={(e) => handleFilterChange('invoiceType', e.target.value)}
              >
                <option value="All">All</option>
                <option value="PO">PO</option>
                <option value="Non-PO">Non-PO</option>
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="All">All</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
                <option value="In Review">In Review</option>
                <option value="Extracted">Extracted</option>
                <option value="Processed">Processed</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className={`bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 ${
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

      {/* Results Section */}
      {searchResults.length > 0 && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                  <FileSearch className="w-5 h-5 text-blue-500" />
                  <span>Search Results ({searchResults.length})</span>
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
                  <tr className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 border-b-2 border-blue-300">
                    {visibleColumns.map((column) => {
                      if (column.key === 'agentLogs' && !isLoggingEnabled) return null;
                      
                      return (
                        <th 
                          key={column.key}
                          className={`px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider ${
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
                                <ChevronUp size={12} className={sortConfig.field === column.key && sortConfig.direction === 'asc' ? 'text-yellow-300' : 'text-white/60'} />
                                <ChevronDown size={12} className={sortConfig.field === column.key && sortConfig.direction === 'desc' ? 'text-yellow-300' : 'text-white/60'} />
                              </div>
                            )}
                            {column.key === 'agentLogs' && (
                              <Bot className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {searchResults.map((result, index) => (
                    <tr key={result.id} className={`transition-all duration-200 hover:bg-blue-50 hover:shadow-sm ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}>
                      {visibleColumns.map((column) => {
                        if (column.key === 'agentLogs' && !isLoggingEnabled) return null;
                        
                        if (column.key === 'agentLogs') {
                          return (
                            <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center justify-center">
                                {result.hasLogs === 'Yes' ? (
                                  <button
                                    onClick={() => handleViewAgentLogs(result.id, result.invoiceNumber)}
                                    disabled={isLoadingLogs}
                                    className="w-full flex items-center justify-center space-x-2 hover:bg-blue-100 px-3 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 hover:scale-105"
                                    title="Click to view agent logs"
                                  >
                                    <img 
                                      src="/robot.png" 
                                      alt="Agent Logs Available" 
                                      className="w-5 h-5 drop-shadow-sm"
                                    />
                                    <span className="text-xs text-green-700 font-semibold">Available</span>
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-500 font-medium">No logs</span>
                                )}
                              </div>
                            </td>
                          );
                        }
                        
                        if (column.key === 'actions') {
                          return (
                            <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm">
                              <button 
                                className={`p-2 rounded-lg transition-all duration-200 ${
                                  isActionButtonEnabled(result.status)
                                    ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 hover:scale-110'
                                    : 'text-gray-400 cursor-not-allowed opacity-50'
                                }`}
                                onClick={() => isActionButtonEnabled(result.status) && handleViewInvoice(result.invoiceNumber, result.id, result)}
                                disabled={isLoading || !isActionButtonEnabled(result.status)}
                                title={
                                  isActionButtonEnabled(result.status)
                                    ? 'View invoice details'
                                    : isInvoiceProcessingEnabled
                                    ? 'Action available only for extracted and processed invoices'
                                    : 'Action available only for processed invoices'
                                }
                              >
                                <PenSquare size={18} />
                              </button>
                            </td>
                          );
                        }
                        
                        if (column.key === 'status') {
                          return (
                            <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${
                                result.status === 'Approved' 
                                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200'
                                 : result.status === 'Posted'
                                 ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200'
                                  : result.status === 'Pending'
                                  ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200'
                                  : result.status === 'In Review'
                                  ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200'
                                  : result.status === 'Extracted'
                                  ? 'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border border-purple-200'
                                  : result.status === 'Processed'
                                  ? 'bg-gradient-to-r from-cyan-100 to-teal-100 text-cyan-800 border border-cyan-200'
                                  : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200'
                              }`}>
                                {result.status}
                              </span>
                            </td>
                          );
                        }
                        
                        return (
                          <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
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

      {/* Log Viewer Modal */}
      {selectedLogs && (
        <LogViewerModal
          isOpen={showLogViewer}
          onClose={() => {
            setShowLogViewer(false);
            setSelectedLogs(null);
          }}
          invoiceNumber={selectedLogs.invoiceNumber}
          transactionId={selectedLogs.transactionId}
          logs={selectedLogs.logs}
        />
      )}

      {showInvoiceViewer && selectedInvoice && (
        <InvoiceViewer 
          onClose={() => {
            setShowInvoiceViewer(false);
            setSelectedInvoice(null);
            setSelectedInvoiceData(null);
          }}
          analysisResult={selectedInvoice}
          pdfUrl={selectedInvoice.pdfUrl}
          invoiceData={{
            region: selectedInvoiceData?.region,
            country: selectedInvoiceData?.country,
            vendor: selectedInvoiceData?.vendor,
            brandName: selectedInvoiceData?.brandName,
            headerId: selectedInvoiceData?.id
          }}
        />
      )}
    </div>
  );
};

export default SearchInvoices;