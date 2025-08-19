import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Sparkles, Zap, Brain, Settings } from 'lucide-react';
import { API_BASE_URL } from '../constants/api';
import InvoiceViewer from './InvoiceViewer';

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

const AnalyzeInvoices = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inferenceType, setInferenceType] = useState<'image' | 'text'>('text');
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please upload a PDF file');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('invoice_file', selectedFile);
    formData.append('inference_type', inferenceType);

    try {
      const response = await fetch(`${API_BASE_URL}/invoice-management/analyze-invoice`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze invoice');
      }

      const result = await response.json();
      setAnalysisResult(result);
      setShowViewer(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while analyzing the invoice');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setInferenceType('text');
    setError(null);
    setShowViewer(false);
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (showViewer && analysisResult) {
    return (
      <InvoiceViewer 
        onClose={() => setShowViewer(false)} 
        uploadedFile={selectedFile}
        analysisResult={analysisResult}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Analyze Invoices</h1>
              <p className="text-emerald-100 mt-1">Upload and analyze invoice documents using advanced AI technology</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">AI Powered</span>
            </div>
            <div className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </div>
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

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
            <Upload className="w-5 h-5 text-emerald-500" />
            <span>Upload Invoice Document</span>
          </h3>
          {selectedFile && (
            <div className="flex items-center space-x-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
              <FileText className="w-4 h-4" />
              <span>File Ready</span>
            </div>
          )}
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragging 
              ? 'border-emerald-500 bg-emerald-50 scale-98' 
              : 'border-gray-300 hover:border-emerald-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <FileText size={32} className="text-emerald-600" />
              </div>
              <div className="flex items-center justify-center space-x-4 bg-emerald-50 p-4 rounded-lg">
                <span className="text-gray-700 font-medium">{selectedFile.name}</span>
                <button
                  onClick={handleRemoveFile}
                  className="p-1 hover:bg-red-100 rounded-full text-red-500 hover:text-red-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • PDF Document
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <Upload size={32} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-gray-600 mb-2 text-lg">
                  Drag and drop your PDF file here, or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-emerald-500 hover:text-emerald-600 font-medium underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-sm text-gray-500">Supported format: PDF • Maximum size: 50MB</p>
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
      </div>

      {/* Analysis Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <span>Analysis Configuration</span>
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Processing Method
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="relative">
              <input
                type="radio"
                value="text"
                checked={inferenceType === 'text'}
                onChange={() => setInferenceType('text')}
                className="sr-only"
              />
              <div className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                inferenceType === 'text'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-emerald-200'
              }`}>
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    inferenceType === 'text' ? 'bg-emerald-100' : 'bg-gray-100'
                  }`}>
                    <FileText className={`w-4 h-4 ${
                      inferenceType === 'text' ? 'text-emerald-600' : 'text-gray-500'
                    }`} />
                  </div>
                  <h5 className="font-medium text-gray-900">Text Inference</h5>
                </div>
                <p className="text-sm text-gray-500">
                  Extract information using advanced text-based analysis and natural language processing
                </p>
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
              <div className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                inferenceType === 'image'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-emerald-200'
              }`}>
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    inferenceType === 'image' ? 'bg-emerald-100' : 'bg-gray-100'
                  }`}>
                    <Brain className={`w-4 h-4 ${
                      inferenceType === 'image' ? 'text-emerald-600' : 'text-gray-500'
                    }`} />
                  </div>
                  <h5 className="font-medium text-gray-900">Image Inference</h5>
                </div>
                <p className="text-sm text-gray-500">
                  Analyze invoice layout and structure using computer vision and OCR technology
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={handleReset}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
        >
          Reset
        </button>
        <button
          onClick={handleAnalyze}
          disabled={!selectedFile || isAnalyzing}
          className={`px-8 py-3 rounded-lg text-white transition-all font-medium flex items-center space-x-2 ${
            selectedFile && !isAnalyzing
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg hover:shadow-emerald-100'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Zap size={18} />
              <span>Analyze Invoice</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AnalyzeInvoices;