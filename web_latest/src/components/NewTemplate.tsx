import React, { useState, useEffect } from 'react';
import { Plus, Save, X, RefreshCw, Code, MessageSquare, Zap, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../constants/api';

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

interface NewTemplateProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface TemplateData {
  region: string;
  country: string;
  brandName: string;
  isNewBrand: boolean;
  newBrandName: string;
  processingMethod: string;
  schema: string;
  prompt: string;
  specialInstructions: string;
}

const NewTemplate: React.FC<NewTemplateProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState<TemplateData>({
    region: '',
    country: '',
    brandName: '',
    isNewBrand: false,
    newBrandName: '',
    processingMethod: '',
    schema: '',
    prompt: '',
    specialInstructions: ''
  });

  const [regionsData, setRegionsData] = useState<RegionsData | null>(null);
  const [countriesToBrands, setCountriesToBrands] = useState<CountriesToBrandsResponse>({});
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRegionsData();
    fetchCountriesToBrands();
  }, []);

  useEffect(() => {
    if (formData.country && countriesToBrands[formData.country]) {
      setAvailableBrands(countriesToBrands[formData.country]);
    } else {
      setAvailableBrands([]);
      setFormData(prev => ({ ...prev, brandName: '' }));
    }
  }, [formData.country, countriesToBrands]);

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

  const getCountriesForRegion = (regionCode: string) => {
    if (!regionsData?.regions) return [];
    const region = regionsData.regions.find(r => r.regionCode === regionCode);
    return region?.countries || [];
  };

  const handleRegionChange = (regionCode: string) => {
    setFormData(prev => ({
      ...prev,
      region: regionCode,
      country: '',
      brandName: '',
      isNewBrand: false,
      newBrandName: ''
    }));
    setValidationErrors(prev => ({ ...prev, region: '', country: '', brandName: '' }));
  };

  const handleCountryChange = (countryCode: string) => {
    setFormData(prev => ({
      ...prev,
      country: countryCode,
      brandName: '',
      isNewBrand: false,
      newBrandName: ''
    }));
    setValidationErrors(prev => ({ ...prev, country: '', brandName: '' }));
  };

  const handleInputChange = (field: keyof TemplateData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.region) errors.region = 'Region is required';
    if (!formData.country) errors.country = 'Country is required';
    
    if (formData.isNewBrand) {
      if (!formData.newBrandName.trim()) errors.newBrandName = 'New brand name is required';
    } else {
      if (!formData.brandName) errors.brandName = 'Brand selection is required';
    }
    
    if (!formData.processingMethod) errors.processingMethod = 'Processing method is required';
    if (!formData.schema.trim()) errors.schema = 'Schema is required';
    if (!formData.prompt.trim()) errors.prompt = 'Prompt is required';

    // Validate JSON schema
    if (formData.schema.trim()) {
      try {
        JSON.parse(formData.schema);
      } catch (err) {
        errors.schema = 'Invalid JSON format in schema';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setError('Please fix the validation errors before submitting');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const selectedRegion = regionsData?.regions.find(r => r.regionCode === formData.region);
      const selectedCountry = selectedRegion?.countries.find(c => c.countryCode === formData.country);
      
      const brandName = formData.isNewBrand ? formData.newBrandName.toLowerCase().trim() : formData.brandName;

      // Get the logged-in username from localStorage
      const loggedInUsername = localStorage.getItem('username') || 'unknown_user';

      const payload = {
        brandName,
        processingMethod: formData.processingMethod,
        regionCode: formData.region,
        regionName: selectedRegion?.regionName || '',
        countryCode: formData.country,
        countryName: selectedCountry?.countryName || '',
        schemaJson: formData.schema,
        prompt: formData.prompt,
        specialInstructions: formData.specialInstructions || null,
        feedback: null,
        isActive: false, // New templates start as inactive
        version: 1,
        createdBy: loggedInUsername, // Use the logged-in username
        updatedBy: null
      };

      const response = await fetch(`${API_BASE_URL}/prompt-registry/countries/${formData.country}/brands/${brandName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to create template');
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
      console.error('Error creating template:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatJsonSchema = () => {
    if (!formData.schema.trim()) return;
    
    try {
      const parsed = JSON.parse(formData.schema);
      const formatted = JSON.stringify(parsed, null, 2);
      setFormData(prev => ({ ...prev, schema: formatted }));
      setValidationErrors(prev => ({ ...prev, schema: '' }));
    } catch (err) {
      setValidationErrors(prev => ({ ...prev, schema: 'Invalid JSON format' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Create New Template</h2>
                <p className="text-indigo-100 mt-1">Set up a new prompt template for invoice processing</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
              <div className="flex items-center space-x-3">
                <div className="text-red-500">⚠️</div>
                <div className="text-red-700">{error}</div>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {/* Location & Brand Section */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-bold">1</span>
                </div>
                <span>Location & Brand</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Region */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Region <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      validationErrors.region ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={formData.region}
                    onChange={(e) => handleRegionChange(e.target.value)}
                  >
                    <option value="">Select Region</option>
                    {regionsData?.regions.map(region => (
                      <option key={region.regionCode} value={region.regionCode}>
                        {region.regionName}
                      </option>
                    ))}
                  </select>
                  {validationErrors.region && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.region}</p>
                  )}
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      !formData.region ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                    } ${validationErrors.country ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    disabled={!formData.region}
                  >
                    <option value="">Select Country</option>
                    {getCountriesForRegion(formData.region).map(country => (
                      <option key={country.countryCode} value={country.countryCode}>
                        {country.countryName}
                      </option>
                    ))}
                  </select>
                  {validationErrors.country && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.country}</p>
                  )}
                </div>

                {/* Brand Type Selection */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Brand <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={!formData.isNewBrand}
                          onChange={() => handleInputChange('isNewBrand', false)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Existing Brand</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={formData.isNewBrand}
                          onChange={() => handleInputChange('isNewBrand', true)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>New Brand</span>
                      </label>
                    </div>

                    {!formData.isNewBrand ? (
                      <div>
                        <select
                          className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                            !formData.country || isLoadingBrands ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                          } ${validationErrors.brandName ? 'border-red-500' : 'border-gray-300'}`}
                          value={formData.brandName}
                          onChange={(e) => handleInputChange('brandName', e.target.value)}
                          disabled={!formData.country || isLoadingBrands}
                        >
                          <option value="">
                            {isLoadingBrands ? 'Loading brands...' : 'Select Brand'}
                          </option>
                          {availableBrands.map(brand => (
                            <option key={brand} value={brand}>
                              {brand.charAt(0).toUpperCase() + brand.slice(1)}
                            </option>
                          ))}
                        </select>
                        {validationErrors.brandName && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.brandName}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <input
                          type="text"
                          placeholder="Enter new brand name"
                          className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                            validationErrors.newBrandName ? 'border-red-500' : 'border-gray-300'
                          }`}
                          value={formData.newBrandName}
                          onChange={(e) => handleInputChange('newBrandName', e.target.value)}
                        />
                        {validationErrors.newBrandName && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.newBrandName}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Processing Method Section */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-sm font-bold">2</span>
                </div>
                <span>Processing Method</span>
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Processing Method <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['text', 'image', 'hybrid'].map((method) => (
                    <label key={method} className="relative">
                      <input
                        type="radio"
                        value={method}
                        checked={formData.processingMethod === method}
                        onChange={(e) => handleInputChange('processingMethod', e.target.value)}
                        className="sr-only"
                      />
                      <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.processingMethod === method
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-200'
                      }`}>
                        <h5 className="font-medium text-gray-900 mb-1 capitalize">{method}</h5>
                        <p className="text-sm text-gray-500">
                          {method === 'text' && 'Extract text-based information'}
                          {method === 'image' && 'Analyze visual layout and structure'}
                          {method === 'hybrid' && 'Combine text and image analysis'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                {validationErrors.processingMethod && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.processingMethod}</p>
                )}
              </div>
            </div>

            {/* Schema Section */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Code className="w-3 h-3 text-blue-600" />
                </div>
                <span>Schema Definition</span>
              </h3>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    JSON Schema <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={formatJsonSchema}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
                  >
                    <Code className="w-3 h-3" />
                    <span>Format JSON</span>
                  </button>
                </div>
                <textarea
                  rows={12}
                  placeholder="Enter your JSON schema here..."
                  className={`w-full border rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    validationErrors.schema ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.schema}
                  onChange={(e) => handleInputChange('schema', e.target.value)}
                />
                {validationErrors.schema && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.schema}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Define the structure for data extraction from invoices
                </p>
              </div>
            </div>

            {/* Prompt Section */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-3 h-3 text-purple-600" />
                </div>
                <span>AI Prompt</span>
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt Template <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={8}
                  placeholder="Enter your AI prompt template here..."
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    validationErrors.prompt ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.prompt}
                  onChange={(e) => handleInputChange('prompt', e.target.value)}
                />
                {validationErrors.prompt && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.prompt}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Instructions for the AI model to process invoices
                </p>
              </div>
            </div>

            {/* Special Instructions Section */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-3 h-3 text-orange-600" />
                </div>
                <span>Special Instructions</span>
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions (Optional)
                </label>
                <textarea
                  rows={6}
                  placeholder="Enter any special processing instructions..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.specialInstructions}
                  onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Additional instructions for specific processing requirements
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Creating...' : 'Create Template'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewTemplate;