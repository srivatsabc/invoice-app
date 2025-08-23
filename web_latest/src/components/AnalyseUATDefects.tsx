import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertTriangle, RefreshCw, Download, CheckCircle, Clock, BarChart3, Activity, Zap, TrendingUp, Target, Shield } from 'lucide-react';
import AnalysisResultsDisplayUAT from './AnalysisResultsDisplayUAT';

interface UATAnalysisData {
  success: boolean;
  total_processed: number;
  processing_time_seconds: number;
  file_info: {
    original_filename: string;
    output_filename: string;
    output_file_path: string | null;
    total_rows: number;
    processed_rows: number;
    valid_defects?: number;
  };
  summary_data: {
    sdlc_step_distribution: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
    debt_type_distribution: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
    activity_match_distribution: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
    priority_distribution: any;
    status_distribution: any;
    quality_metrics: Array<{
      metric: string;
      value: string;
      percentage: string;
    }>;
  };
  download_info: {
    excel_file_size_bytes: number;
    excel_file_size_mb: number;
    sheets_created: string[];
    file_saved_to: string;
    backup_available?: boolean;
  };
  processing_stats: {
    batch_size_used: number;
    async_mode: boolean;
    average_confidence: number;
    batches_processed: number;
    throughput_per_minute: number;
  };
  excel_file: {
    filename: string;
    content_base64: string;
    mime_type: string;
  };
  message?: string;
}

interface BatchProgress {
  type: string;
  task_id: string;
  data: {
    status: 'pending' | 'processing' | 'batch_complete' | 'completed' | 'failed';
    current_batch: number;
    total_batches: number;
    processed: number;
    total: number;
    message: string;
    result?: UATAnalysisData;
  };
}

const AnalyseUATDefects = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<UATAnalysisData | null>(null);
  const [processingMode, setProcessingMode] = useState<'immediate' | 'batch'>('immediate');
  const [batchSize, setBatchSize] = useState<number>(10);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
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
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx'))) {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please upload an Excel file (.xlsx)');
    }
  };

  const handleProcessingModeToggle = () => {
    setProcessingMode(processingMode === 'immediate' ? 'batch' : 'immediate');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please upload an Excel file (.xlsx)');
      }
    }
  };

  const connectWebSocket = (taskId: string) => {
    const wsUrl = `wss://apimaznazone1dev04-ena3aegrf4ffcte3.eastus-01.azurewebsites.net/api/v1/uat-analytics/ws/${taskId}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected for UAT analytics');
    };
    
    ws.onmessage = (event) => {
      try {
        const data: BatchProgress = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        setBatchProgress(data);
        
        if (data.type === 'completion' && data.data) {
          // Handle completion message with final results
          setAnalysisResult(data.data as UATAnalysisData);
          setIsAnalyzing(false);
          setBatchProgress(null);
          ws.close();
        } else if (data.data?.status === 'completed' && data.data.result) {
          // Handle regular completion with result
          setAnalysisResult(data.data.result);
          setIsAnalyzing(false);
          setBatchProgress(null);
          ws.close();
        } else if (data.data?.status === 'failed') {
          setError(data.data.message || 'Analysis failed');
          setIsAnalyzing(false);
          setBatchProgress(null);
          ws.close();
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error occurred');
      setIsAnalyzing(false);
      setBatchProgress(null);
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setWebsocket(null);
    };
    
    setWebsocket(ws);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    setBatchProgress(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    
    if (processingMode === 'batch') {
      formData.append('async_mode', 'true');
      formData.append('batch_size', batchSize.toString());
    }

    try {
      const response = await fetch('https://apimaznazone1dev04-ena3aegrf4ffcte3.eastus-01.azurewebsites.net/api/v1/uat-analytics/upload-uat-defects', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze UAT defects');
      }

      const result = await response.json();
      
      if (processingMode === 'batch' && result.task_id) {
        // Connect to WebSocket for batch processing updates
        connectWebSocket(result.task_id);
        setBatchProgress({
          type: 'progress',
          task_id: result.task_id,
          data: {
            status: 'pending',
            current_batch: 0,
            total_batches: 0,
            processed: 0,
            total: 0,
            message: 'Starting batch processing...'
          }
        });
      } else {
        // Immediate processing completed
        setAnalysisResult(result);
        setIsAnalyzing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while analyzing UAT defects');
      setIsAnalyzing(false);
    }
  };

  const handleDownload = () => {
    if (analysisResult?.excel_file) {
      try {
        const byteCharacters = atob(analysisResult.excel_file.content_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { 
          type: analysisResult.excel_file.mime_type 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = analysisResult.excel_file.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Error downloading file:', err);
        setError('Failed to download the analysis results');
      }
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
    setError(null);
    setAnalysisResult(null);
    setBatchProgress(null);
    setIsAnalyzing(false);
    setProcessingMode('immediate');
    setBatchSize(10);
    if (websocket) {
      websocket.close();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getProgressColor = () => {
    if (!batchProgress?.data) return 'bg-blue-500';
    
    switch (batchProgress.data.status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'processing': return 'bg-blue-500';
      case 'batch_complete': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    if (!batchProgress?.data) return <Clock className="w-5 h-5" />;
    
    switch (batchProgress.data.status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'processing': return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'batch_complete': return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getProgressPercentage = () => {
    if (!batchProgress?.data || batchProgress.data.total === 0) return 0;
    return Math.round((batchProgress.data.processed / batchProgress.data.total) * 100);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Analyse UAT Defects</h1>
              <p className="text-purple-100 mt-1">Upload and analyze UAT defects to identify SDLC patterns and technical debt</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">UAT Analytics</span>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">AI Powered</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div className="text-red-700">{error}</div>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
            <Upload className="w-5 h-5 text-purple-500" />
            <span>Upload UAT Defects File</span>
          </h3>
          {selectedFile && (
            <div className="flex items-center space-x-2 text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-lg">
              <FileText className="w-4 h-4" />
              <span>File Ready</span>
            </div>
          )}
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
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
              <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <FileText size={32} className="text-purple-600" />
              </div>
              <div className="flex items-center justify-center space-x-4 bg-purple-50 p-4 rounded-lg">
                <span className="text-gray-700 font-medium">{selectedFile.name}</span>
                <button
                  onClick={handleRemoveFile}
                  className="p-1 hover:bg-red-100 rounded-full text-red-500 hover:text-red-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Excel Document
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Upload size={32} className="text-purple-500" />
              </div>
              <div>
                <p className="text-gray-600 mb-2 text-lg">
                  Drag and drop your Excel file here, or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-purple-500 hover:text-purple-600 font-medium underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-sm text-gray-500">Supported format: Excel (.xlsx) • Maximum size: 50MB</p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Processing Configuration Section - Matching Incident Analytics Style */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center space-x-2">
          <Activity className="w-5 h-5 text-purple-500" />
          <span>Processing Configuration</span>
        </h3>
        
        {/* Processing Mode Toggle - Matching Incident Analytics */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-purple-800">Processing Mode</h4>
                <p className="text-sm text-purple-600">
                  {processingMode === 'immediate' 
                    ? 'Process entire file at once for faster results' 
                    : 'Process large files in batches with real-time progress updates'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <span className={`text-sm font-medium ${
                  processingMode === 'immediate' ? 'text-purple-700' : 'text-gray-500'
                }`}>
                  Sync
                </span>
                <button
                  onClick={handleProcessingModeToggle}
                  className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    processingMode === 'batch' ? 'bg-purple-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform duration-200 ${
                      processingMode === 'batch' ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${
                  processingMode === 'batch' ? 'text-purple-700' : 'text-gray-500'
                }`}>
                  Async
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Batch Size Configuration - Only show when async mode is selected */}
        {processingMode === 'batch' && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-blue-800">Batch Configuration</h4>
                  <p className="text-sm text-blue-600">Configure batch size for optimal processing performance</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-blue-700">Batch Size:</label>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value))}
                  className="border border-blue-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-blue-800 font-medium"
                >
                  <option value={2}>2 rows</option>
                  <option value={5}>5 rows</option>
                  <option value={10}>10 rows</option>
                  <option value={20}>20 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-100 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-700">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium">
                  Batch Mode: Processing {batchSize} rows at a time with real-time progress updates
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Processing Method Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-xl border-2 transition-all ${
            processingMode === 'immediate'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                processingMode === 'immediate' ? 'bg-purple-100' : 'bg-gray-100'
              }`}>
                <Zap className={`w-5 h-5 ${
                  processingMode === 'immediate' ? 'text-purple-600' : 'text-gray-500'
                }`} />
              </div>
              <h5 className="text-lg font-semibold text-gray-900">Synchronous Processing</h5>
            </div>
            <p className="text-sm text-gray-600">
              Process the entire file at once for faster results with smaller datasets
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                processingMode === 'immediate' ? 'bg-purple-500' : 'bg-gray-400'
              }`}></div>
              <span className={`text-xs font-medium ${
                processingMode === 'immediate' ? 'text-purple-600' : 'text-gray-500'
              }`}>
                {processingMode === 'immediate' ? 'Active Mode' : 'Available'}
              </span>
            </div>
          </div>
          
          <div className={`p-6 rounded-xl border-2 transition-all ${
            processingMode === 'batch'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                processingMode === 'batch' ? 'bg-purple-100' : 'bg-gray-100'
              }`}>
                <BarChart3 className={`w-5 h-5 ${
                  processingMode === 'batch' ? 'text-purple-600' : 'text-gray-500'
                }`} />
              </div>
              <h5 className="text-lg font-semibold text-gray-900">Asynchronous Processing</h5>
            </div>
            <p className="text-sm text-gray-600">
              Process large files in batches with real-time progress updates and better resource management
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                processingMode === 'batch' ? 'bg-purple-500' : 'bg-gray-400'
              }`}></div>
              <span className={`text-xs font-medium ${
                processingMode === 'batch' ? 'text-purple-600' : 'text-gray-500'
              }`}>
                {processingMode === 'batch' ? 'Active Mode' : 'Available'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Progress Section - Matching Incident Analytics Style */}
      {batchProgress && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              {getStatusIcon()}
              <span>Processing Status</span>
            </h3>
            <div className="text-sm text-gray-500">
              Task ID: {batchProgress.task_id}
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Main Progress Bar */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{batchProgress.data.message || 'Processing UAT defects...'}</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${getProgressColor()}`}
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
            </div>
            
            {/* Batch Progress Details */}
            {batchProgress.data.total_batches > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Batch Progress</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">
                    {batchProgress.data.current_batch} / {batchProgress.data.total_batches}
                  </p>
                  <p className="text-xs text-blue-600">Batches completed</p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Records Processed</span>
                  </div>
                  <p className="text-lg font-bold text-green-900">
                    {batchProgress.data.processed} / {batchProgress.data.total}
                  </p>
                  <p className="text-xs text-green-600">UAT defects analyzed</p>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Status</span>
                  </div>
                  <p className="text-lg font-bold text-purple-900 capitalize">
                    {batchProgress.data.status === 'batch_complete' ? 'In Progress' : (batchProgress.data.status || '').replace('_', ' ')}
                  </p>
                  <p className="text-xs text-purple-600">Current state</p>
                </div>
              </div>
            )}
            
            {/* Status-specific messages */}
            {batchProgress.data.status === 'batch_complete' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-blue-700">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">
                    Completing batch {batchProgress.data.current_batch} of {batchProgress.data.total_batches}...
                  </span>
                </div>
              </div>
            )}
            
            {batchProgress.data.status === 'processing' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-blue-700">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">
                    Processing batch {batchProgress.data.current_batch}... ({batchProgress.data.processed} records completed)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 mb-6">
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
              ? 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-purple-100'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <TrendingUp size={18} />
              <span>Analyze UAT Defects</span>
            </>
          )}
        </button>
      </div>

      {/* Results Section */}
      {analysisResult && (
        <AnalysisResultsDisplayUAT 
          analysisData={analysisResult} 
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};

export default AnalyseUATDefects;