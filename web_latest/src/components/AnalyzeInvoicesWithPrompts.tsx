import React, { useState, useEffect, useRef } from 'react';
import { Menu, Search, AlertTriangle, ChevronDown, Mountain as Mountains, Settings, BarChart3, ChevronLeft, ChevronRight, MessageSquare, Bell, LineChart, Download } from 'lucide-react';
import { FileUp, Save, Pencil, PlayCircle, RefreshCw, X, Sparkles, Filter, Code, Zap, Plus } from 'lucide-react';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';
import InvoiceViewer from './InvoiceViewer';
import { v4 as uuidv4 } from 'uuid';

interface AnalysisResponse {
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
}

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

interface CountriesToBrandsResponse {
  [countryCode: string]: string[];
}

interface PromptTemplateItem {
  id: number;
  brandName: string;
  processingMethod: string;
  regionCode: string;
  regionName: string;
  countryCode: string;
  countryName: string;
  schemaJson: string;
  prompt: string;
  specialInstructions: string | null;
  feedback: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string | null;
}

interface PromptTemplateResponse {
  brandName: string;
  countryCode: string;
  totalItems: number;
  activeItems: number;
  inactiveItems: number;
  items: PromptTemplateItem[];
}

interface Filters {
  region: string;
  country: string;
  brandName: string;
}

const AnalyzeInvoicesWithPrompts = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inferenceType, setInferenceType] = useState<'image' | 'text'>('text');
  const [processingLevel, setProcessingLevel] = useState<'invoice' | 'page'>('invoice');
  const [maxPages, setMaxPages] = useState<number>(1);
  const [pages, setPages] = useState<string>('1');
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [showPromptSection, setShowPromptSection] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [hasPromptChanged, setHasPromptChanged] = useState(false);
  
  // New state for filtering and template loading
  const [filters, setFilters] = useState<Filters>({
    region: '',
    country: '',
    brandName: ''
  });
  const [regionsData, setRegionsData] = useState<RegionsData | null>(null);
  const [countriesToBrands, setCountriesToBrands] = useState<CountriesToBrandsResponse>({});
  const [brandNames, setBrandNames] = useState<string[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [promptData, setPromptData] = useState<PromptTemplateResponse | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplateItem | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [customSchema, setCustomSchema] = useState('');
  const [customSpecialInstructions, setCustomSpecialInstructions] = useState('');
  const [isCreateNewMode, setIsCreateNewMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptEditorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchRegionsData();
    fetchCountriesToBrands();
  }, []);

  useEffect(() => {
    if (filters.country && countriesToBrands[filters.country]) {
      setBrandNames(countriesToBrands[filters.country]);
    } else {
      setBrandNames([]);
      setFilters(prev => ({ ...prev, brandName: '' }));
    }
  }, [filters.country, countriesToBrands]);

  // Load template when brand is selected
  useEffect(() => {
    if (filters.country && filters.brandName && filters.brandName !== 'create_new') {
      fetchPromptTemplate();
    } else if (filters.brandName === 'create_new') {
      // Set create new mode with empty fields
      setIsCreateNewMode(true);
      setPromptData(null);
      setSelectedTemplate(null);
      setCustomPrompt('');
      setCustomSchema('');
      setCustomSpecialInstructions('');
      setIsEditingPrompt(true); // Enable editing for new templates
      setHasChanges(false);
    } else {
      setIsCreateNewMode(false);
      setPromptData(null);
      setSelectedTemplate(null);
      setCustomPrompt('');
      setCustomSchema('');
      setCustomSpecialInstructions('');
      setHasChanges(false);
    }
  }, [filters.country, filters.brandName]);

  // Track changes in any of the fields
  useEffect(() => {
    if (selectedTemplate && !isCreateNewMode) {
      const hasSchemaChanged = customSchema !== selectedTemplate.schemaJson;
      const hasPromptChanged = customPrompt !== selectedTemplate.prompt;
      const hasInstructionsChanged = customSpecialInstructions !== (selectedTemplate.specialInstructions || '');
      setHasChanges(hasSchemaChanged || hasPromptChanged || hasInstructionsChanged);
    } else if (isCreateNewMode) {
      const hasAnyContent = customSchema.trim() || customPrompt.trim() || customSpecialInstructions.trim();
      setHasChanges(hasAnyContent);
    }
  }, [customSchema, customPrompt, customSpecialInstructions, selectedTemplate, isCreateNewMode]);

  const fetchRegionsData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/regions-management/regions-countries`);
      if (!response.ok) throw new Error('Failed to fetch regions data');
      const data = await response.json();
      setRegionsData(data);
    } catch (err) {
      console.error('Error fetching regions data:', err);
      setError('Failed to load regions data');
    }
  };

  const fetchCountriesToBrands = async () => {
    setIsLoadingBrands(true);
    try {
      const response = await fetch(`${API_BASE_URL}/prompt-registry/countries-to-brands`);
      if (!response.ok) throw new Error('Failed to fetch countries to brands mapping');
      const data: CountriesToBrandsResponse = await response.json();
      setCountriesToBrands(data);
    } catch (err) {
      console.error('Error fetching countries to brands:', err);
      // Fallback to mock data if API fails
      setCountriesToBrands({
        "US": ["caterpillar", "jungheinrich", "toyota"],
        "DE": ["jungheinrich", "volkswagen"],
        "JP": ["honda", "toyota"],
        "CA": ["caterpillar", "toyota"],
        "FR": ["volkswagen", "jungheinrich"],
        "AU": ["caterpillar", "toyota", "honda"]
      });
    } finally {
      setIsLoadingBrands(false);
    }
  };

  const fetchPromptTemplate = async () => {
    if (!filters.country || !filters.brandName || filters.brandName === 'create_new') return;

    setIsLoadingTemplate(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/prompt-registry/countries/${filters.country}/brands/${filters.brandName}`);
      if (!response.ok) throw new Error('Failed to fetch prompt template');
      const data: PromptTemplateResponse = await response.json();
      setPromptData(data);
      
      // Find the active template or the first one if none are active
      const activeTemplate = data.items.find(item => item.isActive) || data.items[0];
      if (activeTemplate) {
        setSelectedTemplate(activeTemplate);
        setCustomPrompt(activeTemplate.prompt);
        setCustomSchema(activeTemplate.schemaJson);
        setCustomSpecialInstructions(activeTemplate.specialInstructions || '');
        setIsEditingPrompt(true); // Allow editing by default
        setIsCreateNewMode(false);
        setHasChanges(false);
      }
    } catch (err) {
      console.error('Error fetching prompt template:', err);
      setError('Failed to load prompt template for selected brand');
      setPromptData(null);
      setSelectedTemplate(null);
      setCustomPrompt('');
      setCustomSchema('');
      setCustomSpecialInstructions('');
      setHasChanges(false);
    } finally {
      setIsLoadingTemplate(false);
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
      country: '',
      brandName: ''
    }));
    setIsCreateNewMode(false);
    setHasChanges(false);
  };

  const handleCountryChange = (countryCode: string) => {
    setFilters(prev => ({
      ...prev,
      country: countryCode,
      brandName: ''
    }));
    setIsCreateNewMode(false);
    setHasChanges(false);
  };

  const handleBrandChange = (brandName: string) => {
    setFilters(prev => ({
      ...prev,
      brandName
    }));
  };

  const handleSaveTemplate = async () => {
    if (!filters.country || !filters.brandName || !customPrompt.trim()) {
      setError('Please ensure country, brand, and prompt are filled');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Get the logged-in username from localStorage
      const loggedInUsername = localStorage.getItem('username') || 'unknown_user';
      
      // Get region and country names
      const selectedRegion = regionsData?.regions.find(r => r.regionCode === filters.region);
      const selectedCountry = selectedRegion?.countries.find(c => c.countryCode === filters.country);
      
      // Determine processing method from current selection or template
      const processingMethod = selectedTemplate?.processingMethod || inferenceType;
      
      const payload = {
        brandName: filters.brandName, // Added brandName to payload
        processingMethod,
        regionCode: filters.region,
        regionName: selectedRegion?.regionName || '',
        countryCode: filters.country,
        countryName: selectedCountry?.countryName || '',
        schemaJson: customSchema,
        prompt: customPrompt,
        specialInstructions: customSpecialInstructions || null,
        feedback: null,
        isActive: true,
        createdBy: loggedInUsername
      };

      const response = await fetch(`${API_BASE_URL}/prompt-registry/countries/${filters.country}/brands/${filters.brandName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      const result = await response.json();
      console.log('Template saved successfully:', result);
      
      setSuccess('Template saved successfully as new version!');
      setHasChanges(false);
      
      // Refresh the template data to show the new version
      await fetchPromptTemplate();
      await fetchCountriesToBrands();
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
      console.error('Error saving template:', err);
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
      setShowPromptSection(true);
      setShowFilters(true);
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setError(null);
        setShowPromptSection(true);
        setShowFilters(true);
      } else {
        setError('Please upload a PDF file');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !customPrompt.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);

    // Generate a random UUID for transaction_id
    const transactionId = uuidv4();

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('processing_method', inferenceType);
    formData.append('processing_level', processingLevel);
    formData.append('processing_max_pages', maxPages.toString());
    formData.append('pages', pages || 'all');
    formData.append('transaction_id', transactionId);
    formData.append('development', 'true');
    formData.append('schemaJson', customSchema);
    formData.append('prompt', customPrompt);
    formData.append('special_instructions', customSpecialInstructions || '');

    try {
      const response = await fetch(API_ENDPOINTS.PROCESS_INVOICE, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process invoice');
      }

      const result = await response.json();
      setAnalysisResult(result);
      setShowViewer(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the invoice');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
    setShowPromptSection(false);
    setShowFilters(false);
    setFilters({ region: '', country: '', brandName: '' });
    setCustomPrompt('');
    setCustomSchema('');
    setCustomSpecialInstructions('');
    setIsCreateNewMode(false);
    setHasChanges(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setInferenceType('text');
    setProcessingLevel('invoice');
    setMaxPages(1);
    setPages('1');
    setError(null);
    setSuccess(null);
    setShowViewer(false);
    setAnalysisResult(null);
    setFilters({ region: '', country: '', brandName: '' });
    setCustomPrompt('');
    setCustomSchema('');
    setCustomSpecialInstructions('');
    setShowPromptSection(false);
    setShowFilters(false);
    setIsEditingPrompt(false);
    setIsCreateNewMode(false);
    setHasChanges(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReAnalyze = async () => {
    if (!selectedFile || !customPrompt.trim() || isReAnalyzing) return;
    
    setIsReAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('invoice_file', selectedFile);
      formData.append('prompt', customPrompt);

      const response = await fetch(`${API_BASE_URL}/invoice-management/analyze-invoice`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to re-analyze invoice');
      }

      const result = await response.json();
      setAnalysisResult(result);
      setHasPromptChanged(false);
    } catch (err) {
      console.error('Error re-analyzing invoice:', err);
    } finally {
      setIsReAnalyzing(false);
    }
  };

  // Refresh prompts when returning from invoice viewer
  const handleViewerClose = () => {
    setShowViewer(false);
    setAnalysisResult(null);
    // Refresh prompts in case new ones were created
    if (showPromptSection) {
      fetchCountriesToBrands();
    }
  };

  if (showViewer && analysisResult) {
    return (
      <InvoiceViewer 
        onClose={handleViewerClose}
        uploadedFile={selectedFile}
        analysisResult={analysisResult}
        customPrompt={customPrompt}
        customSchema={customSchema}
        customSpecialInstructions={customSpecialInstructions}
        templateName={filters.brandName}
        selectedVersion={selectedTemplate ? `v${selectedTemplate.version}` : ''}
        isAnalyzeWithPrompts={true}
        invoiceData={{
          region: filters.region,
          country: filters.country,
          brandName: filters.brandName
        }}
        processingMethod={inferenceType}
        processingLevel={processingLevel}
        maxPages={maxPages}
        pages={pages}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Analyze with AI Prompts</h2>
          </div>
          <div className="flex items-center space-x-2">
            {showFilters && (
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                title="Toggle Filters"
              >
                <Filter className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-red-700">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
            <div className="text-green-700">{success}</div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <Filter className="w-5 h-5 text-purple-500" />
              <span>Template Selection</span>
            </h3>
            <button
              onClick={() => {
                setFilters({ region: '', country: '', brandName: '' });
                setCustomPrompt('');
                setCustomSchema('');
                setCustomSpecialInstructions('');
                setIsCreateNewMode(false);
                setHasChanges(false);
              }}
              className="text-gray-500 hover:text-gray-700 text-sm flex items-center space-x-1"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Region Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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

            {/* Country Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <select
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  !filters.region ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                }`}
                value={filters.country}
                onChange={(e) => handleCountryChange(e.target.value)}
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

            {/* Brand Name Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Name
                {isLoadingBrands && (
                  <RefreshCw className="inline w-3 h-3 ml-1 animate-spin text-purple-500" />
                )}
              </label>
              <select
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  !filters.country || isLoadingBrands ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                }`}
                value={filters.brandName}
                onChange={(e) => handleBrandChange(e.target.value)}
                disabled={!filters.country || isLoadingBrands}
              >
                <option value="">
                  {isLoadingBrands ? 'Loading brands...' : 'Select Brand'}
                </option>
                {/* Create New Option */}
                {filters.country && !isLoadingBrands && (
                  <option value="create_new" className="font-medium text-purple-600">
                    ➕ Create New Template
                  </option>
                )}
                {brandNames.map(brand => (
                  <option key={brand} value={brand}>
                    {brand.charAt(0).toUpperCase() + brand.slice(1)}
                  </option>
                ))}
              </select>
              {filters.country && brandNames.length === 0 && !isLoadingBrands && (
                <p className="text-xs text-gray-500 mt-1">No brands available for selected country</p>
              )}
            </div>
          </div>

          {/* Template Status */}
          {isLoadingTemplate && (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="w-5 h-5 animate-spin text-purple-500 mr-2" />
              <span className="text-gray-600">Loading template...</span>
            </div>
          )}

          {/* Create New Mode Status */}
          {isCreateNewMode && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-green-800 flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Create New Template Mode</span>
                </h4>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  New Template
                </span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p><strong>Mode:</strong> Creating new template from scratch</p>
                <p><strong>Region:</strong> {regionsData?.regions.find(r => r.regionCode === filters.region)?.regionName}</p>
                <p><strong>Country:</strong> {getCountriesForRegion(filters.region).find(c => c.countryCode === filters.country)?.countryName}</p>
                <p><strong>Status:</strong> Ready to define schema, prompt, and instructions</p>
              </div>
            </div>
          )}

          {/* Existing Template Status */}
          {selectedTemplate && !isCreateNewMode && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-purple-800">Template Loaded</h4>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  v{selectedTemplate.version} • {selectedTemplate.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="text-sm text-purple-700 space-y-1">
                <p><strong>Brand:</strong> {selectedTemplate.brandName}</p>
                <p><strong>Processing Method:</strong> {selectedTemplate.processingMethod}</p>
                <p><strong>Region:</strong> {selectedTemplate.regionName} ({selectedTemplate.countryName})</p>
                <p><strong>Created By:</strong> {selectedTemplate.createdBy}</p>
                <p><strong>Last Updated:</strong> {new Date(selectedTemplate.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[600px]">
          <div className="bg-white rounded-xl shadow-sm h-full flex flex-col">
            <div className="flex items-center h-14 px-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <FileUp className="w-5 h-5 text-purple-500" />
                <h3 className="font-medium text-gray-800">Upload Invoice</h3>
              </div>
            </div>

            <div className="p-6 flex-1">
              <div
                className={`h-[180px] border-2 border-dashed rounded-xl flex items-center justify-center transition-all ${
                  isDragging 
                    ? 'border-purple-500 bg-purple-50 scale-98' 
                    : 'border-gray-300 hover:border-purple-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">Uploaded file:</p>
                    <div className="flex items-center justify-center space-x-4 bg-purple-50 p-4 rounded-lg">
                      <FileUp size={24} className="text-purple-500" />
                      <span className="text-gray-700 font-medium">{selectedFile.name}</span>
                      <button
                        onClick={handleRemoveFile}
                        className="p-1 hover:bg-red-100 rounded-full text-red-500 hover:text-red-600 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
                      <FileUp size={32} className="text-purple-500" />
                    </div>
                    <div>
                      <p className="text-gray-600 mb-2 text-lg">
                        Drag and drop your PDF file here, or{' '}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-purple-500 hover:text-purple-600 font-medium"
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-sm text-gray-500">Supported format: PDF</p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Inference Type</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="relative">
                      <input
                        type="radio"
                        value="text"
                        checked={inferenceType === 'text'}
                        onChange={() => setInferenceType('text')}
                        className="sr-only"
                      />
                      <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        inferenceType === 'text'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-200'
                      }`}>
                        <h5 className="font-medium text-gray-900 mb-1">Text Inference</h5>
                        <p className="text-sm text-gray-500">Extract text-based information</p>
                      </div>
                    </label>
                    <label className="relative">
                      <input
                        type="radio"
                        value="image"
                        checked={inferenceType === 'image'}
                        onChange={() => setInferenceType('image')}
                        className="sr-only"
                      />
                      <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        inferenceType === 'image'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-200'
                      }`}>
                        <h5 className="font-medium text-gray-900 mb-1">Image Inference</h5>
                        <p className="text-sm text-gray-500">Analyze visual layout</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Processing Level
                    </label>
                    <select
                      value={processingLevel}
                      onChange={(e) => setProcessingLevel(e.target.value as 'invoice' | 'page')}
                      className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                    >
                      <option value="invoice">Invoice</option>
                      <option value="page">Page</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Pages
                    </label>
                    <select
                      value={maxPages}
                      onChange={(e) => setMaxPages(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pages
                  </label>
                  <input
                    type="text"
                    value={pages}
                    onChange={(e) => setPages(e.target.value)}
                    placeholder="1,2,4-6"
                    className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`h-[600px] transition-all duration-500 ${showPromptSection ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <div className="bg-white rounded-xl shadow-sm h-full flex flex-col">
            <div className="flex items-center h-14 px-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-purple-500" />
                  <h3 className="font-medium text-gray-800">AI Template & Prompts</h3>
                </div>
                {selectedTemplate && !isCreateNewMode && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    Template Loaded
                  </span>
                )}
                {isCreateNewMode && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center space-x-1">
                    <Plus className="w-3 h-3" />
                    <span>Create New</span>
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Schema Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    <Code className="w-4 h-4 inline mr-1" />
                    Schema
                  </label>
                  {selectedTemplate && !isCreateNewMode && (
                    <span className="text-xs text-gray-500">From {selectedTemplate.brandName} template</span>
                  )}
                  {isCreateNewMode && (
                    <span className="text-xs text-blue-600">New template schema</span>
                  )}
                </div>
                <textarea
                  value={customSchema}
                  onChange={(e) => setCustomSchema(e.target.value)}
                  placeholder={isCreateNewMode ? "Enter your JSON schema here..." : "JSON schema will be loaded from selected template..."}
                  className="w-full h-24 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-50 resize-none"
                  disabled={!isEditingPrompt && !isCreateNewMode}
                />
              </div>

              {/* Prompt Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    AI Prompt
                  </label>
                  <div className="flex items-center space-x-2">
                    {selectedTemplate && !isCreateNewMode && (
                      <span className="text-xs text-gray-500">From {selectedTemplate.brandName} template</span>
                    )}
                    {isCreateNewMode && (
                      <span className="text-xs text-blue-600">New template prompt</span>
                    )}
                  </div>
                </div>
                <div className="relative h-[200px]">
                  <textarea
                    ref={promptEditorRef}
                    value={customPrompt}
                    onChange={(e) => {
                      setCustomPrompt(e.target.value);
                      setHasPromptChanged(true);
                    }}
                    placeholder={isCreateNewMode ? "Enter your AI prompt here..." : "AI prompt will be loaded from selected template..."}
                    className="w-full h-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-50 resize-none"
                    disabled={!isEditingPrompt && !isCreateNewMode}
                  />
                  {isLoadingTemplate && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                      <div className="flex items-center space-x-2 text-purple-600">
                        <RefreshCw size={20} className="animate-spin" />
                        <span>Loading template...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Instructions Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    <Zap className="w-4 h-4 inline mr-1" />
                    Special Instructions
                  </label>
                  {selectedTemplate && !isCreateNewMode && (
                    <span className="text-xs text-gray-500">From {selectedTemplate.brandName} template</span>
                  )}
                  {isCreateNewMode && (
                    <span className="text-xs text-blue-600">New template instructions</span>
                  )}
                </div>
                <textarea
                  value={customSpecialInstructions}
                  onChange={(e) => setCustomSpecialInstructions(e.target.value)}
                  placeholder={isCreateNewMode ? "Enter special instructions here..." : "Special instructions will be loaded from selected template..."}
                  className="w-full h-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-50 resize-none"
                  disabled={!isEditingPrompt && !isCreateNewMode}
                />
              </div>

                {/* Common Save Button for all fields */}
              {/* Save Template Button - only show when there are changes */}
              {hasChanges && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleSaveTemplate}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save Template as New Version"
                  >
                    {isSubmitting ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    <span>{isSubmitting ? 'Saving...' : 'Save Template'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Outside the AI Template & Prompts window */}
      <div className="mt-6 flex items-center justify-end space-x-4">
        <button
          onClick={handleReset}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
        >
          Reset
        </button>
        <button
          onClick={handleAnalyze}
          disabled={!selectedFile || !customPrompt.trim() || isAnalyzing || !showPromptSection}
          className={`px-8 py-2 rounded-lg text-white transition-all font-medium ${
            selectedFile && customPrompt.trim() && !isAnalyzing && showPromptSection
              ? 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-purple-100'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isAnalyzing ? (
            <span className="flex items-center space-x-2">
              <RefreshCw size={18} className="animate-spin" />
              <span>Processing...</span>
            </span>
          ) : (
            'Analyze Invoice'
          )}
        </button>
      </div>
    </div>
  );
};

export default AnalyzeInvoicesWithPrompts;