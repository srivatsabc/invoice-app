import React, { useState } from 'react';
import { MessageSquare, CheckCircle, AlertCircle, Save, Pencil, X, RefreshCw, Zap, Code, Sparkles } from 'lucide-react';
import InvoiceViewerLayout from './InvoiceViewerLayout';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';
import { v4 as uuidv4 } from 'uuid';

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

interface InvoiceViewerProps {
  onClose: () => void;
  uploadedFile?: File | null;
  analysisResult?: AnalysisResponse | null;
  pdfUrl?: string;
  customPrompt?: string;
  customSchema?: string;
  customSpecialInstructions?: string;
  templateName?: string;
  selectedVersion?: string;
  invoiceData?: {
    region?: string;
    country?: string;
    vendor?: string;
    brandName?: string;
  };
  // New props for analyze with prompts workflow
  isAnalyzeWithPrompts?: boolean;
  processingMethod?: string;
  processingLevel?: string;
  maxPages?: number;
  pages?: string;
  onReAnalyze?: (updatedSchema: string, updatedPrompt: string, updatedInstructions: string) => Promise<AnalysisResponse>;
}

interface PromptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  schema: string;
  prompt: string;
  instructions: string;
  onFieldChange: (field: 'schema' | 'prompt' | 'instructions', value: string) => void;
  hasChanges: boolean;
  onReAnalyze: () => void;
  isReAnalyzing: boolean;
}

const PromptViewerModal: React.FC<PromptViewerModalProps> = ({
  isOpen,
  onClose,
  schema,
  prompt,
  instructions,
  onFieldChange,
  hasChanges,
  onReAnalyze,
  isReAnalyzing
}) => {
  const [activeTab, setActiveTab] = useState<'schema' | 'prompt' | 'instructions'>('schema');
  const [formattedSchema, setFormattedSchema] = useState('');
  const [isValidJson, setIsValidJson] = useState(true);

  // Auto-format JSON when schema changes
  React.useEffect(() => {
    if (activeTab === 'schema' && schema.trim()) {
      try {
        const parsed = JSON.parse(schema);
        const formatted = JSON.stringify(parsed, null, 2);
        setFormattedSchema(formatted);
        setIsValidJson(true);
      } catch (err) {
        setFormattedSchema(schema);
        setIsValidJson(false);
      }
    } else {
      setFormattedSchema(schema);
      setIsValidJson(true);
    }
  }, [schema, activeTab]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'schema', label: 'Schema', icon: Code },
    { id: 'prompt', label: 'Prompt', icon: MessageSquare },
    { id: 'instructions', label: 'Instructions', icon: Zap }
  ];

  const getCurrentContent = () => {
    switch (activeTab) {
      case 'schema': return formattedSchema;
      case 'prompt': return prompt;
      case 'instructions': return instructions;
    }
  };

  const handleContentChange = (value: string) => {
    if (activeTab === 'schema') {
      // Update the formatted schema and validation state
      setFormattedSchema(value);
      try {
        JSON.parse(value);
        setIsValidJson(true);
      } catch (err) {
        setIsValidJson(false);
      }
    }
    onFieldChange(activeTab, value);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-xl p-3 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold">AI Prompt Editor</h2>
                <p className="text-purple-100 text-sm">Edit schema, prompt, and instructions for real-time re-analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {hasChanges && (
                <button
                  onClick={onReAnalyze}
                  disabled={isReAnalyzing}
                  className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 text-sm"
                >
                  {isReAnalyzing ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                  <span>{isReAnalyzing ? 'Re-analyzing...' : 'Re-analyze'}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex-shrink-0">
          <div className="flex space-x-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'schema' | 'prompt' | 'instructions')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600 bg-purple-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full">
            {/* JSON validation indicator for schema */}
            {activeTab === 'schema' && formattedSchema.trim() && (
              <div className="mb-2 flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isValidJson ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className={`text-xs ${
                  isValidJson ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isValidJson ? 'Valid JSON' : 'Invalid JSON format'}
                </span>
              </div>
            )}
            <textarea
              value={getCurrentContent()}
              onChange={(e) => handleContentChange(e.target.value)}
              className={`w-full ${activeTab === 'schema' && formattedSchema.trim() ? 'h-[calc(100%-2rem)]' : 'h-full'} border rounded-lg px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                activeTab === 'schema' ? 'font-mono bg-white text-gray-800 border-gray-300' : 'border-gray-300'
              } ${
                activeTab === 'schema' && !isValidJson && getCurrentContent().trim() 
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : ''
              }`}
              spellCheck={activeTab !== 'schema'}
              placeholder={
                activeTab === 'schema' 
                  ? 'Enter your JSON schema here...'
                  : activeTab === 'prompt'
                  ? 'Enter your AI prompt here...'
                  : 'Enter special instructions here...'
              }
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 rounded-b-xl flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>💡 Changes are tracked automatically</span>
              {hasChanges && (
                <>
                  <span>•</span>
                  <span className="text-orange-600 font-medium">Unsaved changes detected</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${hasChanges ? 'bg-orange-500' : 'bg-green-500'}`}></div>
              <span>{hasChanges ? 'Modified' : 'Synchronized'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FeedbackEditorProps {
  onClose: () => void;
  feedbackContent: string;
  onSave: (content: string) => void;
  isSaving: boolean;
}

const FeedbackEditor: React.FC<FeedbackEditorProps> = ({ 
  onClose, 
  feedbackContent, 
  onSave, 
  isSaving 
}) => {
  const [editedContent, setEditedContent] = useState(feedbackContent);
  const [isEditing, setIsEditing] = useState(feedbackContent === '');
  const [hasChanges, setHasChanges] = useState(false);

  React.useEffect(() => {
    setHasChanges(editedContent !== feedbackContent);
  }, [editedContent, feedbackContent]);

  const handleSave = () => {
    onSave(editedContent);
    setIsEditing(false);
    setHasChanges(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Feedback Editor</h3>
              <p className="text-sm text-gray-600">
                {feedbackContent ? 'Edit existing feedback' : 'Create new feedback'}
                {hasChanges && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Modified
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-blue-600 hover:text-blue-700 rounded-lg transition-colors"
                title="Edit Feedback"
              >
                <Pencil size={20} />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="p-2 text-blue-600 hover:text-blue-700 rounded-lg transition-colors disabled:opacity-50"
                title="Save Feedback"
              >
                <Save size={20} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="prose max-w-none">
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-[60vh] bg-gray-50 p-4 rounded-lg text-sm resize-none border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your feedback here..."
              disabled={isSaving}
            />
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[60vh]">
              {feedbackContent ? (
                <pre className="whitespace-pre-wrap text-sm">{feedbackContent}</pre>
              ) : (
                <p className="text-gray-500 italic">No feedback provided</p>
              )}
            </div>
          )}
        </div>

        {isSaving && (
          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Saving feedback...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function InvoiceViewer({
  onClose,
  uploadedFile,
  analysisResult,
  pdfUrl,
  customPrompt,
  customSchema,
  customSpecialInstructions,
  templateName,
  selectedVersion,
  invoiceData,
  isAnalyzeWithPrompts = false,
  processingMethod = 'text',
  processingLevel = 'invoice',
  maxPages = 1,
  pages = '',
  onReAnalyze
}: InvoiceViewerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<any>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [showFeedbackEditor, setShowFeedbackEditor] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  
  // New state for analyze with prompts workflow
  const [showPromptViewer, setShowPromptViewer] = useState(false);
  const [currentSchema, setCurrentSchema] = useState(customSchema || '');
  const [currentPrompt, setCurrentPrompt] = useState(customPrompt || '');
  const [currentInstructions, setCurrentInstructions] = useState(customSpecialInstructions || '');
  const [hasPromptChanges, setHasPromptChanges] = useState(false);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [currentAnalysisResult, setCurrentAnalysisResult] = useState(analysisResult);
  const [regionsData, setRegionsData] = useState<RegionsData | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveTemplateError, setSaveTemplateError] = useState<string | null>(null);
  const [saveTemplateSuccess, setSaveTemplateSuccess] = useState<string | null>(null);
  const [hasBeenSaved, setHasBeenSaved] = useState(false);

  // Fetch regions data on mount for template saving
  React.useEffect(() => {
    if (isAnalyzeWithPrompts) {
      fetchRegionsData();
    }
  }, [isAnalyzeWithPrompts]);

  const fetchRegionsData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/regions-management/regions-countries`);
      if (!response.ok) throw new Error('Failed to fetch regions data');
      const data = await response.json();
      setRegionsData(data);
    } catch (err) {
      console.error('Error fetching regions data:', err);
    }
  };

  // Track changes in prompt fields
  React.useEffect(() => {
    const schemaChanged = currentSchema !== (customSchema || '');
    const promptChanged = currentPrompt !== (customPrompt || '');
    const instructionsChanged = currentInstructions !== (customSpecialInstructions || '');
    const hasChanges = schemaChanged || promptChanged || instructionsChanged;
    setHasPromptChanges(hasChanges);
    
    // Reset hasBeenSaved when user makes new changes after saving
    if (hasChanges && hasBeenSaved) {
      setHasBeenSaved(false);
    }
  }, [currentSchema, currentPrompt, currentInstructions, customSchema, customPrompt, customSpecialInstructions]);

  const handleSubmit = async () => {
    if (isAnalyzeWithPrompts) {
      await handleSaveTemplate();
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Add your submit logic here
      console.log('Submitting invoice data...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onClose();
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!invoiceData?.country || !invoiceData?.brandName || !currentPrompt.trim() || !currentSchema.trim()) {
      setSaveTemplateError('Please ensure country, brand, schema, and prompt are filled');
      return;
    }
    
    setIsSavingTemplate(true);
    setSaveTemplateError(null);
    setSaveTemplateSuccess(null);
    
    try {
      // Get the logged-in username from localStorage
      const loggedInUsername = localStorage.getItem('username') || 'unknown_user';
      
      // Get region and country names from regionsData
      const selectedRegion = regionsData?.regions.find(r => r.regionCode === invoiceData.region);
      const selectedCountry = selectedRegion?.countries.find(c => c.countryCode === invoiceData.country);
      
      // Determine processing method from current selection
      const processingMethodToUse = processingMethod || 'text';
      
      const payload = {
        brandName: invoiceData.brandName,
        processingMethod: processingMethodToUse,
        regionCode: invoiceData.region || '',
        regionName: selectedRegion?.regionName || '',
        countryCode: invoiceData.country,
        countryName: selectedCountry?.countryName || '',
        schemaJson: currentSchema,
        prompt: currentPrompt,
        specialInstructions: currentInstructions || null,
        feedback: '',
        isActive: true,
        createdBy: loggedInUsername
      };

      const response = await fetch(`${API_BASE_URL}/prompt-registry/countries/${invoiceData.country}/brands/${invoiceData.brandName}`, {
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
      
      setSaveTemplateSuccess('Template saved successfully as new version!');
      setHasBeenSaved(true);
      setHasPromptChanges(false); // Reset changes after successful save
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSaveTemplateSuccess(null);
      }, 3000);
      
    } catch (err) {
      setSaveTemplateError(err instanceof Error ? err.message : 'Failed to save template');
      console.error('Error saving template:', err);
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setSaveTemplateError(null);
      }, 5000);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleFeedback = async () => {
    setIsFetchingFeedback(true);
    setFeedbackError(null);
    setFeedbackSuccess(false);
    
    try {
      // Get values from invoice data or analysis result
      const regionName = invoiceData?.region || currentAnalysisResult?.header.region;
      const countryCode = invoiceData?.country || currentAnalysisResult?.header.country;
      const brandName = invoiceData?.brandName;
           
      // Construct the dynamic API endpoint
      const feedbackEndpoint = `${API_BASE_URL}/invoice-management/regions/${regionName}/countries/${countryCode}/brands/${brandName}/feedback`;
      
      console.log('Calling feedback API:', feedbackEndpoint);
      console.log('Using values:', { regionName, countryCode, brandName: brandName });
      
      const response = await fetch(feedbackEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.status === 404) {
        // Feedback not found, show empty editor
        setFeedbackContent('');
        setShowFeedbackEditor(true);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch feedback: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setFeedbackData(data);
      setFeedbackContent(data.feedback || data.content || '');
      setFeedbackSuccess(true);
      setShowFeedbackEditor(true);
      console.log('Feedback data received:', data);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setFeedbackSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error fetching feedback:', error);
      setFeedbackError(error instanceof Error ? error.message : 'Failed to fetch feedback');
      
      // If error is not 404, show empty editor anyway
      setFeedbackContent('');
      setShowFeedbackEditor(true);
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setFeedbackError(null);
      }, 5000);
    } finally {
      setIsFetchingFeedback(false);
    }
  };

  const handleSaveFeedback = async (content: string) => {
    setIsSavingFeedback(true);
    setFeedbackError(null);
    
    try {
      // Get values from invoice data or analysis result
      const regionName = invoiceData?.region || currentAnalysisResult?.header.region || 'EMEA';
      const countryCode = invoiceData?.country || currentAnalysisResult?.header.country || 'DE';
      const brandName = invoiceData?.brandName;
      
      // Construct the dynamic API endpoint for POST
      const feedbackEndpoint = `${API_BASE_URL}/invoice-management/regions/${regionName}/countries/${countryCode}/brands/${brandName}/feedback`;
      
      console.log('Saving feedback to API:', feedbackEndpoint);
      console.log('Feedback content:', content);
      console.log('Using brand name as-is:', brandName);
      
      const response = await fetch(feedbackEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: content,
          region: regionName,
          country: countryCode,
          brand: brandName,
          timestamp: new Date().toISOString(),
          updatedBy: localStorage.getItem('username') || 'unknown_user'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save feedback: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Feedback saved successfully:', result);
      
      // Update local state
      setFeedbackContent(content);
      setFeedbackSuccess(true);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setFeedbackSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error saving feedback:', error);
      setFeedbackError(error instanceof Error ? error.message : 'Failed to save feedback');
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setFeedbackError(null);
      }, 5000);
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const handlePromptFieldChange = (field: 'schema' | 'prompt' | 'instructions', value: string) => {
    switch (field) {
      case 'schema':
        setCurrentSchema(value);
        break;
      case 'prompt':
        setCurrentPrompt(value);
        break;
      case 'instructions':
        setCurrentInstructions(value);
        break;
    }
  };

  const handleReAnalyze = async () => {
    if (!uploadedFile || !isAnalyzeWithPrompts) return;
    
    setIsReAnalyzing(true);
    try {
      // Generate a random UUID for transaction_id
      const transactionId = uuidv4();

      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('processing_method', processingMethod);
      formData.append('processing_level', processingLevel);
      formData.append('processing_max_pages', maxPages.toString());
      formData.append('pages', pages || 'all');
      formData.append('transaction_id', transactionId);
      formData.append('development', 'true');
      formData.append('schemaJson', currentSchema);
      formData.append('prompt', currentPrompt);
      formData.append('special_instructions', currentInstructions || '');

      const response = await fetch(API_ENDPOINTS.PROCESS_INVOICE, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to re-analyze invoice');
      }

      const result = await response.json();
      setCurrentAnalysisResult(result);
      
      // Close the prompt viewer to show updated results
      setShowPromptViewer(false);
      
      // Reset the change tracking
      setHasPromptChanges(false);
      
    } catch (err) {
      console.error('Error re-analyzing invoice:', err);
      // You might want to show an error message here
    } finally {
      setIsReAnalyzing(false);
    }
  };

  return (
    <>
      <InvoiceViewerLayout
        onClose={onClose}
        uploadedFile={uploadedFile}
        analysisResult={currentAnalysisResult}
        pdfUrl={pdfUrl}
        customPrompt={currentPrompt}
        templateName={templateName}
        selectedVersion={selectedVersion}
        isAnalyzeWithPrompts={isAnalyzeWithPrompts}
      >
        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Status Messages */}
            {saveTemplateError && (
              <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                <AlertCircle size={16} />
                <span>{saveTemplateError}</span>
              </div>
            )}
            {saveTemplateSuccess && (
              <div className="flex items-center space-x-2 text-green-600 text-sm bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <CheckCircle size={16} />
                <span>{saveTemplateSuccess}</span>
              </div>
            )}
            {feedbackError && (
              <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                <AlertCircle size={16} />
                <span>{feedbackError}</span>
              </div>
            )}
            {feedbackSuccess && (
              <div className="flex items-center space-x-2 text-green-600 text-sm bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <CheckCircle size={16} />
                <span>Feedback {feedbackContent ? 'loaded' : 'saved'} successfully</span>
              </div>
            )}
            {feedbackData && !feedbackSuccess && (
              <div className="text-blue-600 text-sm bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                Feedback data available in console
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Feedback Button - only show for non-analyze-with-prompts workflow */}
            {!isAnalyzeWithPrompts && (
              <button
                onClick={handleFeedback}
                disabled={isFetchingFeedback}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-all font-medium ${
                  isFetchingFeedback
                    ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-100'
                }`}
              >
                <MessageSquare size={16} />
                <span>{isFetchingFeedback ? 'Loading...' : 'Feedback'}</span>
              </button>
            )}
            
            {/* AI Prompts Button - only show for analyze with prompts workflow */}
            {isAnalyzeWithPrompts && (
              <button
                onClick={() => setShowPromptViewer(true)}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-all font-medium ${
                  hasPromptChanges
                    ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg hover:shadow-orange-100'
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-purple-100'
                }`}
              >
                <Sparkles size={16} />
                <span>{hasPromptChanges ? 'Modified Prompts' : 'AI Prompts'}</span>
                {hasPromptChanges && (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                )}
              </button>
            )}
            
            {/* Cancel Button */}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            {/* Conditional Submit/Re-run Analysis Button */}
            {isAnalyzeWithPrompts && hasPromptChanges ? (
              <button
                onClick={handleReAnalyze}
                disabled={isReAnalyzing}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
              >
                {isReAnalyzing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Re-analyzing...</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    <span>Re-run Analysis</span>
                  </>
                )}
              </button>
            ) : !hasBeenSaved ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isSavingTemplate}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {(isSubmitting || isSavingTemplate) ? 'Saving...' : isAnalyzeWithPrompts ? 'Save Template' : 'Submit'}
              </button>
            ) : null}
          </div>
        </div>
      </InvoiceViewerLayout>

      {/* Prompt Viewer Modal - only for analyze with prompts workflow */}
      {isAnalyzeWithPrompts && (
        <PromptViewerModal
          isOpen={showPromptViewer}
          onClose={() => setShowPromptViewer(false)}
          schema={currentSchema}
          prompt={currentPrompt}
          instructions={currentInstructions}
          onFieldChange={handlePromptFieldChange}
          hasChanges={hasPromptChanges}
          onReAnalyze={handleReAnalyze}
          isReAnalyzing={isReAnalyzing}
        />
      )}

      {/* Feedback Editor Modal - only for non-analyze-with-prompts workflow */}
      {!isAnalyzeWithPrompts && showFeedbackEditor && (
        <FeedbackEditor
          onClose={() => setShowFeedbackEditor(false)}
          feedbackContent={feedbackContent}
          onSave={handleSaveFeedback}
          isSaving={isSavingFeedback}
        />
      )}
    </>
  );
}