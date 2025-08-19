import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit3, Copy, Trash2, Eye, Calendar, User, Tag, ChevronDown, RefreshCw, Sparkles, FileText, Clock, Star, Activity, CheckCircle, XCircle, Code, MessageSquare, Zap, X } from 'lucide-react';
import { API_BASE_URL } from '../constants/api';
import SchemaViewer from './SchemaViewer';
import PromptViewer from './PromptViewer';
import SpecialInstructionsViewer from './SpecialInstructionsViewer';
import NewTemplate from './NewTemplate';

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
  searchTerm: string;
  isActive: boolean | null;
}

const PromptRegistry = () => {
  const [filters, setFilters] = useState<Filters>({
    region: '',
    country: '',
    brandName: '',
    searchTerm: '',
    isActive: null
  });

  const [promptData, setPromptData] = useState<PromptTemplateResponse | null>(null);
  const [regionsData, setRegionsData] = useState<RegionsData | null>(null);
  const [brandNames, setBrandNames] = useState<string[]>([]);
  const [countriesToBrands, setCountriesToBrands] = useState<CountriesToBrandsResponse>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplateItem | null>(null);
  const [showPromptViewer, setShowPromptViewer] = useState(false);
  const [showSchemaViewer, setShowSchemaViewer] = useState(false);
  const [showSpecialInstructionsViewer, setShowSpecialInstructionsViewer] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'usage'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editedItems, setEditedItems] = useState<Set<number>>(new Set());
  const [activatingItems, setActivatingItems] = useState<Set<number>>(new Set());
  const [editedItemsData, setEditedItemsData] = useState<Map<number, PromptTemplateItem>>(new Map());

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

  const fetchPromptTemplates = async () => {
    if (!filters.country || !filters.brandName) {
      setError('Please select both country and brand name to search for templates');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/prompt-registry/countries/${filters.country}/brands/${filters.brandName}`);
      if (!response.ok) throw new Error('Failed to fetch prompt templates');
      const data: PromptTemplateResponse = await response.json();
      setPromptData(data);
      // Clear edited items when fetching new data
      setEditedItems(new Set());
      setEditedItemsData(new Map());
    } catch (err) {
      console.error('Error fetching prompt templates:', err);
      setError('Failed to load prompt templates. Please try again.');
      setPromptData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateTemplate = async (item: PromptTemplateItem) => {
    setActivatingItems(prev => new Set([...prev, item.id]));
    setError(null);

    try {
      // Get the edited data if it exists, otherwise use original
      const itemToActivate = editedItemsData.get(item.id) || item;
      
      // Get the logged-in username from localStorage
      const loggedInUsername = localStorage.getItem('username') || 'unknown_user';
      
      const payload = {
        id: itemToActivate.id,
        brandName: itemToActivate.brandName,
        processingMethod: itemToActivate.processingMethod,
        regionCode: itemToActivate.regionCode,
        regionName: itemToActivate.regionName,
        countryCode: itemToActivate.countryCode,
        countryName: itemToActivate.countryName,
        schemaJson: itemToActivate.schemaJson,
        prompt: itemToActivate.prompt,
        specialInstructions: itemToActivate.specialInstructions,
        feedback: itemToActivate.feedback,
        isActive: true, // Set to active when activating
        version: itemToActivate.version,
        createdAt: itemToActivate.createdAt,
        updatedAt: new Date().toISOString(),
        createdBy: itemToActivate.createdBy,
        updatedBy: loggedInUsername // Use the logged-in username
      };

      // Use the correct activation API endpoint
      const response = await fetch(`${API_BASE_URL}/prompt-registry/countries/${itemToActivate.countryCode}/brands/${itemToActivate.brandName}/overwrite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to activate template');
      }

      // Remove from edited items and refresh data
      setEditedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });

      setEditedItemsData(prev => {
        const newMap = new Map(prev);
        newMap.delete(item.id);
        return newMap;
      });

      // Refresh the prompt templates
      await fetchPromptTemplates();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate template');
      console.error('Error activating template:', err);
    } finally {
      setActivatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const handleCancelEdit = (itemId: number) => {
    setEditedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });

    setEditedItemsData(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });
  };

  const markAsEdited = (itemId: number, updatedItem: PromptTemplateItem) => {
    setEditedItems(prev => new Set([...prev, itemId]));
    setEditedItemsData(prev => new Map([...prev, [itemId, updatedItem]]));
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
    setPromptData(null);
    setEditedItems(new Set());
    setEditedItemsData(new Map());
  };

  const handleCountryChange = (countryCode: string) => {
    setFilters(prev => ({
      ...prev,
      country: countryCode,
      brandName: ''
    }));
    setPromptData(null);
    setEditedItems(new Set());
    setEditedItemsData(new Map());
  };

  const handleFilterChange = (key: keyof Filters, value: string | boolean | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    fetchPromptTemplates();
  };

  const handleReset = () => {
    setFilters({
      region: '',
      country: '',
      brandName: '',
      searchTerm: '',
      isActive: null
    });
    setBrandNames([]);
    setPromptData(null);
    setError(null);
    setEditedItems(new Set());
    setEditedItemsData(new Map());
  };

  const handleViewPrompt = (prompt: PromptTemplateItem) => {
    setSelectedPrompt(prompt);
    setShowPromptViewer(true);
  };

  const handleViewSchema = (prompt: PromptTemplateItem) => {
    setSelectedPrompt(prompt);
    setShowSchemaViewer(true);
  };

  const handleViewSpecialInstructions = (prompt: PromptTemplateItem) => {
    setSelectedPrompt(prompt);
    setShowSpecialInstructionsViewer(true);
  };

  const handleViewerEdit = (updatedContent: string, type: 'schema' | 'prompt' | 'instructions') => {
    if (!selectedPrompt) return;

    let updatedItem = { ...selectedPrompt };
    
    switch (type) {
      case 'schema':
        updatedItem.schemaJson = updatedContent;
        break;
      case 'prompt':
        updatedItem.prompt = updatedContent;
        break;
      case 'instructions':
        updatedItem.specialInstructions = updatedContent;
        break;
    }

    markAsEdited(selectedPrompt.id, updatedItem);
    
    // Auto-close the viewer and return to main page
    setShowSchemaViewer(false);
    setShowPromptViewer(false);
    setShowSpecialInstructionsViewer(false);
    setSelectedPrompt(null);
  };

  const handleNewTemplateSuccess = () => {
    // Refresh the current search if we have filters set
    if (filters.country && filters.brandName) {
      fetchPromptTemplates();
    }
    // Refresh the brands list in case a new brand was created
    fetchCountriesToBrands();
  };

  const getFilteredAndSortedPrompts = () => {
    if (!promptData?.items) return [];

    let filteredPrompts = promptData.items;

    // Apply search filter
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filteredPrompts = filteredPrompts.filter(prompt =>
        prompt.prompt.toLowerCase().includes(searchTerm) ||
        prompt.brandName.toLowerCase().includes(searchTerm) ||
        prompt.processingMethod.toLowerCase().includes(searchTerm) ||
        (prompt.specialInstructions && prompt.specialInstructions.toLowerCase().includes(searchTerm))
      );
    }

    // Apply status filter
    if (filters.isActive !== null) {
      filteredPrompts = filteredPrompts.filter(prompt => prompt.isActive === filters.isActive);
    }

    // Sort prompts
    return filteredPrompts.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'usage':
          aValue = a.version;
          bValue = b.version;
          break;
        default:
          aValue = a.brandName.toLowerCase();
          bValue = b.brandName.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const filteredPrompts = getFilteredAndSortedPrompts();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Prompt Registry</h1>
              <p className="text-indigo-100 mt-1">Manage and organize your AI prompt templates</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowNewTemplate(true)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Template</span>
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
              <Filter className="w-5 h-5 text-indigo-500" />
              <span>Filters</span>
            </h3>
            <button
              onClick={handleReset}
              className="text-gray-500 hover:text-gray-700 text-sm flex items-center space-x-1"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Region Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={filters.region}
                onChange={(e) => handleRegionChange(e.target.value)}
              >
                <option value="">All Regions</option>
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
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  !filters.region ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                }`}
                value={filters.country}
                onChange={(e) => handleCountryChange(e.target.value)}
                disabled={!filters.region}
              >
                <option value="">All Countries</option>
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
                  <RefreshCw className="inline w-3 h-3 ml-1 animate-spin text-indigo-500" />
                )}
              </label>
              <select
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  !filters.country || isLoadingBrands ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                }`}
                value={filters.brandName}
                onChange={(e) => handleFilterChange('brandName', e.target.value)}
                disabled={!filters.country || isLoadingBrands}
              >
                <option value="">
                  {isLoadingBrands ? 'Loading brands...' : 'All Brands'}
                </option>
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

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={filters.isActive === null ? '' : filters.isActive.toString()}
                onChange={(e) => handleFilterChange('isActive', e.target.value === '' ? null : e.target.value === 'true')}
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          {/* Search and Sort */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates by prompt content, brand, processing method, or special instructions..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'usage')}
              >
                <option value="name">Sort by Brand</option>
                <option value="date">Sort by Date</option>
                <option value="usage">Sort by Version</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
              <button
                onClick={handleSearch}
                disabled={isLoading || !filters.country || !filters.brandName}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {promptData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Templates</p>
                <p className="text-2xl font-bold text-gray-900">{promptData.totalItems}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-gray-900">{promptData.activeItems}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Inactive</p>
                <p className="text-2xl font-bold text-gray-900">{promptData.inactiveItems}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Brand</p>
                <p className="text-lg font-bold text-gray-900 capitalize">{promptData.brandName}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              Prompt Templates ({filteredPrompts.length})
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Last updated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-4" />
            <p className="text-gray-500">Loading prompt templates...</p>
          </div>
        ) : !promptData ? (
          <div className="p-12 text-center">
            <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg mb-2">Ready to search</p>
            <p className="text-gray-400">Select country and brand name, then click search to view templates</p>
          </div>
        ) : filteredPrompts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg mb-2">No prompt templates found</p>
            <p className="text-gray-400">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand & Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Region & Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Processing Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPrompts.map((prompt, index) => (
                  <tr key={prompt.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900 capitalize">
                            {prompt.brandName}
                            {editedItems.has(prompt.id) && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Edited
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Version {prompt.version}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{prompt.regionName}</div>
                      <div className="text-xs text-gray-500">{prompt.countryName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {prompt.processingMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {prompt.isActive ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-green-600">Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-medium text-red-600">Inactive</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {prompt.createdBy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(prompt.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {editedItems.has(prompt.id) ? (
                          // Show Activate/Cancel buttons when edited
                          <>
                            <button
                              onClick={() => handleActivateTemplate(prompt)}
                              disabled={activatingItems.has(prompt.id)}
                              className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors flex items-center space-x-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Activate Changes"
                            >
                              {activatingItems.has(prompt.id) ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Zap className="w-3 h-3" />
                              )}
                              <span>Activate</span>
                            </button>
                            <button
                              onClick={() => handleCancelEdit(prompt.id)}
                              className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors flex items-center space-x-1 text-xs"
                              title="Cancel Changes"
                            >
                              <X className="w-3 h-3" />
                              <span>Cancel</span>
                            </button>
                          </>
                        ) : (
                          // Show normal view buttons when not edited
                          <>
                            <button
                              onClick={() => handleViewSchema(prompt)}
                              disabled={!prompt.isActive}
                              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 text-xs ${
                                prompt.isActive
                                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                              title={prompt.isActive ? "View Schema" : "Schema editing disabled for inactive prompts"}
                            >
                              <Code className="w-3 h-3" />
                              <span>Schema</span>
                            </button>
                            <button
                              onClick={() => handleViewPrompt(prompt)}
                              disabled={!prompt.isActive}
                              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 text-xs ${
                                prompt.isActive
                                  ? 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                              title={prompt.isActive ? "View Prompt" : "Prompt editing disabled for inactive prompts"}
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Prompt</span>
                            </button>
                            <button
                              onClick={() => handleViewSpecialInstructions(prompt)}
                              disabled={!prompt.isActive}
                              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 text-xs ${
                                prompt.isActive
                                  ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                              title={prompt.isActive ? "View Special Instructions" : "Instructions editing disabled for inactive prompts"}
                            >
                              <Zap className="w-3 h-3" />
                              <span>Instructions</span>
                            </button>
                            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                              <Copy className="w-3 h-3" />
                            </button>
                            <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-3 h-3" />
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
        )}
      </div>

      {/* New Template Modal */}
      {showNewTemplate && (
        <NewTemplate
          onClose={() => setShowNewTemplate(false)}
          onSuccess={handleNewTemplateSuccess}
        />
      )}

      {/* Schema Viewer Modal */}
      {showSchemaViewer && selectedPrompt && (
        <SchemaViewer
          onClose={() => {
            setShowSchemaViewer(false);
            setSelectedPrompt(null);
          }}
          schemaName={`${selectedPrompt.brandName} Schema`}
          version={`v${selectedPrompt.version}`}
          content={selectedPrompt.schemaJson}
          onEdit={(updatedContent) => handleViewerEdit(updatedContent, 'schema')}
        />
      )}

      {/* Prompt Viewer Modal */}
      {showPromptViewer && selectedPrompt && (
        <PromptViewer
          onClose={() => {
            setShowPromptViewer(false);
            setSelectedPrompt(null);
          }}
          promptName={`${selectedPrompt.brandName} Prompt`}
          version={`v${selectedPrompt.version}`}
          content={selectedPrompt.prompt}
          onEdit={(updatedContent) => handleViewerEdit(updatedContent, 'prompt')}
        />
      )}

      {/* Special Instructions Viewer Modal */}
      {showSpecialInstructionsViewer && selectedPrompt && (
        <SpecialInstructionsViewer
          onClose={() => {
            setShowSpecialInstructionsViewer(false);
            setSelectedPrompt(null);
          }}
          instructionsName={`${selectedPrompt.brandName} Instructions`}
          version={`v${selectedPrompt.version}`}
          content={selectedPrompt.specialInstructions || ''}
          onEdit={(updatedContent) => handleViewerEdit(updatedContent, 'instructions')}
        />
      )}
    </div>
  );
};

export default PromptRegistry;