import React, { useState, useRef, useEffect } from 'react';
import { Upload, BarChart3, AlertTriangle, Clock, TrendingUp, Settings, Filter, Search, RefreshCw, FileText, Download, X, Zap, CheckCircle, ChevronDown, Activity } from 'lucide-react';
import { INCIDENT_API_ENDPOINTS } from '../constants/incidentApi';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface CategoryData {
  category: string;
  count: number;
  percentage: number;
}

interface QualityMetric {
  metric: string;
  value: string;
  percentage: string;
}

interface FileInfo {
  original_filename: string;
  output_filename: string;
  output_file_path: string;
  total_rows: number;
  processed_rows: number;
}

interface SummaryData {
  root_cause_categories: CategoryData[];
  root_cause_subcategories: CategoryData[];
  resolution_categories: CategoryData[];
  resolution_subcategories: CategoryData[];
  root_cause_combinations: any[];
  resolution_combinations: any[];
  full_combinations: any[];
  quality_metrics: QualityMetric[];
  assignment_groups: any;
  priority_distribution: any;
}

interface DownloadInfo {
  excel_file_size_bytes: number;
  excel_file_size_mb: number;
  sheets_created: string[];
  file_saved_to: string;
  backup_available: boolean;
}

interface ProcessingStats {
  batch_size_used: number;
  async_mode: boolean;
  average_confidence: number;
  batches_processed: number;
  throughput_per_minute: number;
}

interface ExcelFile {
  filename: string;
  content_base64: string;
  mime_type: string;
}

interface AnalysisResponse {
  success: boolean;
  total_processed: number;
  processing_time_seconds: number;
  file_info: FileInfo;
  summary_data: SummaryData;
  download_info: DownloadInfo;
  processing_stats: ProcessingStats;
  excel_file: ExcelFile;
  async_mode?: boolean;
  task_id?: string;
  message?: string;
}

interface AsyncResponse {
  success: boolean;
  async_mode: boolean;
  task_id: string;
  message: string;
  websocket_url: string;
  estimated_completion_minutes: number;
  file_info: {
    original_filename: string;
    total_rows: number;
  };
  processing_stats: {
    batch_size: number;
    total_batches: number;
    async_mode: boolean;
  };
}

interface BatchProgress {
  type: 'progress';
  task_id: string;
  data: {
    status: 'processing' | 'batch_complete';
    current_batch: number;
    total_batches: number;
    batch_size?: number;
    tickets_range?: string;
    processed?: number;
    total?: number;
    progress_percentage?: number;
    elapsed_time_seconds?: number;
    estimated_remaining_seconds?: number;
    throughput_per_minute?: number;
    batch_time_seconds?: number;
    message: string;
  };
}

const AnalyseIncidents = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [asyncTaskData, setAsyncTaskData] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isAsyncMode, setIsAsyncMode] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  
  // Async processing states
  const [asyncResponse, setAsyncResponse] = useState<AsyncResponse | null>(null);
  const [showBatchTracker, setShowBatchTracker] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress['data'] | null>(null);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [completedBatches, setCompletedBatches] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup WebSocket on component unmount
  useEffect(() => {
    return () => {
      if (webSocket) {
        webSocket.close();
      }
    };
  }, [webSocket]);

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
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel')) {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please upload an Excel file (.xlsx or .xls)');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel') {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please upload an Excel file (.xlsx or .xls)');
      }
    }
  };

  const connectWebSocketBackground = (taskId: string, websocketUrl: string) => {
    // Close existing connection if any
    if (webSocket) {
      webSocket.close();
    }

    const wsUrl = `${INCIDENT_API_ENDPOINTS.CATEGORIZATION_WS}/${taskId}`;
    const ws = new WebSocket(wsUrl);
    setWebSocket(ws);

    ws.onopen = () => {
      console.log('Background WebSocket connected successfully');
      setIsConnected(true);
      setConnectionStatus('Connected - Processing in background...');
    };

    ws.onmessage = (event) => {
      console.log('Background WebSocket message received:', event.data);
      try {
        const data = JSON.parse(event.data);
        console.log('Background WebSocket message:', data);

        if (data.type === 'progress') {
          setBatchProgress(data.data);
          
          // Track completed batches
          if (data.data.status === 'batch_complete') {
            setCompletedBatches(prev => [...prev, data.data.current_batch]);
          }
        } else if (data.type === 'completion') {
          console.log('Async batch completed:', data);
          // Load analysis data when batch processing is complete
          setAnalysisResult(data.data);
          setSuccess(`Analysis completed! Processed ${data.data.total_processed} incidents in ${data.data.processing_time_seconds.toFixed(2)} seconds`);
          
          // Clean up async state
          setTaskId(null);
          setAsyncTaskData(null);
          setBatchProgress(null);
          setCompletedBatches([]);
          setShowBatchTracker(false);
          
          // Auto-hide success message after 5 seconds
          setTimeout(() => setSuccess(null), 5000);
        }
      } catch (error) {
        console.error('Error parsing background WebSocket message:', error, event.data);
      }
    };

    ws.onerror = (error) => {
      console.error('Background WebSocket error:', error);
      setConnectionStatus('Background connection error');
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      console.log('Background WebSocket closed:', event.code, event.reason);
      setWebSocket(null);
      setIsConnected(false);
      setConnectionStatus('Background connection closed');
    };
  };

  const connectWebSocket = () => {
    // If already connected in background, just show the tracker
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
      setShowBatchTracker(true);
      return;
    }

    if (!asyncTaskData) return;

    const wsUrl = `${INCIDENT_API_ENDPOINTS.CATEGORIZATION_WS}/${asyncTaskData.task_id}`;
    const ws = new WebSocket(wsUrl);
    setWebSocket(ws);
    setConnectionStatus('Connecting...');

    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      setConnectionStatus('Connected - Waiting for updates...');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
          setBatchProgress(data.data);
          
          if (data.data.status === 'batch_complete') {
            setCompletedBatches(prev => [...prev, data.data.current_batch]);
          }
        } else if (data.type === 'completion') {
          console.log('Batch completed:', data);
          // Load analysis data from the completion message data
          console.log('Loading async completion data:', data.data);
          setAnalysisResult(data.data);
          setSuccess(`Successfully processed ${data.data.total_processed} incidents in ${data.data.processing_time_seconds.toFixed(2)} seconds`);
          
          // Close the batch tracker modal
          setShowBatchTracker(false);
          setIsAnalyzing(false);
          setTaskId(null);
          setAsyncTaskData(null);
          setTimeout(() => setSuccess(null), 3000);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('Connection error');
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setConnectionStatus('Connection closed');
      setWebSocket(null);
      setIsConnected(false);
    };
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setError(null);
    setSuccess(null);
    setAsyncResponse(null);
    setBatchProgress(null);
    setCompletedBatches([]);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('batch_size', batchSize.toString());
    
    if (isAsyncMode) {
      formData.append('async_mode', 'true');
    }

    try {
      const response = await fetch(INCIDENT_API_ENDPOINTS.CATEGORIZATION_UPLOAD, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; InvoiceAnalyzer/1.0)',
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to analyze Excel file: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseText = await response.text();
      let result: AnalysisResponse;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response from server`);
      }

      if (result.async_mode && result.task_id) {
        setAsyncTaskData(result);
        setTaskId(result.task_id);
        setSuccess(result.message);
        
        // Automatically connect to WebSocket for background processing
        connectWebSocketBackground(result.task_id, result.websocket_url);
      } else {
        setAnalysisResult(result);
        setSuccess(`Successfully processed ${result.total_processed} incidents in ${result.processing_time_seconds.toFixed(2)} seconds`);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      if (err instanceof Error && err.message.includes('Failed to fetch')) {
        // Use mock data for demonstration
        const mockResult: AnalysisResponse = {
          success: true,
          total_processed: 20,
          processing_time_seconds: 11.69,
          file_info: {
            original_filename: selectedFile.name,
            output_filename: `${selectedFile.name.replace('.xlsx', '')}_categorized_${new Date().toISOString().slice(0, 10)}.xlsx`,
            output_file_path: "/mock/path/output.xlsx",
            total_rows: 20,
            processed_rows: 20
          },
          summary_data: {
            root_cause_categories: [
              { category: "Application Issue", count: 4, percentage: 20.0 },
              { category: "Data Issue", count: 4, percentage: 20.0 },
              { category: "Process Issue", count: 3, percentage: 15.0 },
              { category: "Environment Issue", count: 2, percentage: 10.0 },
              { category: "System Design Issue", count: 2, percentage: 10.0 },
              { category: "System Configuration Issue", count: 1, percentage: 5.0 },
              { category: "System Issue", count: 1, percentage: 5.0 },
              { category: "Data Integrity Issue", count: 1, percentage: 5.0 },
              { category: "User Error", count: 1, percentage: 5.0 },
              { category: "Access & Authentication", count: 1, percentage: 5.0 }
            ],
            root_cause_subcategories: [
              { category: "Incorrect Data Entry", count: 2, percentage: 10.0 },
              { category: "Manual Process", count: 1, percentage: 5.0 },
              { category: "Submission Logic Error", count: 1, percentage: 5.0 },
              { category: "Role Misconfiguration", count: 1, percentage: 5.0 },
              { category: "Data Compliance Error", count: 1, percentage: 5.0 }
            ],
            resolution_categories: [
              { category: "Data Correction", count: 8, percentage: 40.0 },
              { category: "Job Restart", count: 2, percentage: 10.0 },
              { category: "Job Execution", count: 1, percentage: 5.0 },
              { category: "Configuration Change", count: 1, percentage: 5.0 },
              { category: "System Configuration", count: 1, percentage: 5.0 },
              { category: "System Configuration Update", count: 1, percentage: 5.0 },
              { category: "Issue Resolution", count: 1, percentage: 5.0 },
              { category: "Manual Intervention", count: 1, percentage: 5.0 },
              { category: "User Assistance", count: 1, percentage: 5.0 },
              { category: "Access Reprovisioning", count: 1, percentage: 5.0 }
            ],
            resolution_subcategories: [
              { category: "Data Adjustment", count: 3, percentage: 15.0 },
              { category: "Manual Intervention", count: 2, percentage: 10.0 },
              { category: "Data Correction", count: 2, percentage: 10.0 },
              { category: "Job Execution", count: 1, percentage: 5.0 },
              { category: "System Adjustment", count: 1, percentage: 5.0 }
            ],
            root_cause_combinations: [],
            resolution_combinations: [],
            full_combinations: [],
            quality_metrics: [
              { metric: "Total Tickets Processed", value: "20", percentage: "100.00%" },
              { metric: "LLM Provider Used", value: "AZURE_OPENAI", percentage: "" },
              { metric: "Auto-Corrected Results", value: "0", percentage: "0.00%" },
              { metric: "Valid on First Try", value: "20", percentage: "100.00%" },
              { metric: "Average Confidence Score", value: "0.902", percentage: "" },
              { metric: "High Confidence Tickets (≥0.8)", value: "20", percentage: "100.00%" },
              { metric: "Technical Debt Identified", value: "3", percentage: "15.00%" },
              { metric: "Process Debt Identified", value: "13", percentage: "65.00%" }
            ],
            assignment_groups: null,
            priority_distribution: null
          },
          download_info: {
            excel_file_size_bytes: 21009,
            excel_file_size_mb: 0.02,
            sheets_created: ["Categorized_Results", "Root_Cause_Categories", "Resolution_Categories", "Quality_Metrics"],
            file_saved_to: "/mock/path/output.xlsx",
            backup_available: true
          },
          processing_stats: {
            batch_size_used: 5,
            async_mode: false,
            average_confidence: 0.903,
            batches_processed: 4,
            throughput_per_minute: 102.6
          },
          excel_file: {
            filename: `${selectedFile.name.replace('.xlsx', '')}_categorized_demo.xlsx`,
            content_base64: "UEsDBBQAAAAIAE",
            mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          }
        };
        
        setAnalysisResult(mockResult);
        setSuccess(`Demo: Successfully processed ${mockResult.total_processed} incidents in ${mockResult.processing_time_seconds.toFixed(2)} seconds (using mock data)`);
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownload = () => {
    if (!analysisResult?.excel_file) return;

    const byteCharacters = atob(analysisResult.excel_file.content_base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: analysisResult.excel_file.mime_type });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = analysisResult.excel_file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setError(null);
    setSuccess(null);
    setIsAnalyzing(false);
    setTaskId(null);
    setAsyncTaskData(null);
    setBatchProgress(null);
    setCompletedBatches([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (webSocket) {
      webSocket.close();
    }
  };

  // Sync Analysis Results Display
  const renderSyncAnalysisResults = () => {
    if (!analysisResult) return null;
    
    return (
      <div className="space-y-6">
        {/* 1. Analysis Results - Summary Statistics Only */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Processed</p>
                <p className="text-3xl font-bold mt-1">{analysisResult.total_processed}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Success Rate</p>
                <p className="text-3xl font-bold mt-1">
                  {((analysisResult.file_info.processed_rows / analysisResult.file_info.total_rows) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Processing Time</p>
                <p className="text-3xl font-bold mt-1">{analysisResult.processing_time_seconds.toFixed(1)}s</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Categories Found</p>
                <p className="text-3xl font-bold mt-1">
                  {(analysisResult.summary_data?.root_cause_categories?.length || 0) + (analysisResult.summary_data?.resolution_categories?.length || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Modern Root Cause Categories Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">🔍</span>
              </div>
              <span>Root Cause Categories</span>
            </h3>
            <div className="bg-red-50 px-4 py-2 rounded-lg">
              <span className="text-red-600 font-semibold">{analysisResult.summary_data?.root_cause_categories?.length || 0} Categories</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysisResult.summary_data?.root_cause_categories?.map((category: any, index: number) => {
              const isHighImpact = category.percentage >= 15;
              const isMediumImpact = category.percentage >= 10 && category.percentage < 15;
              
              return (
                <div key={index} className={`p-4 rounded-xl border-l-4 transition-all hover:shadow-md ${
                  isHighImpact 
                    ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-500' 
                    : isMediumImpact 
                    ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-400'
                    : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-semibold ${
                      isHighImpact ? 'text-red-800' : isMediumImpact ? 'text-orange-800' : 'text-gray-700'
                    }`}>
                      {category.category}
                    </span>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      isHighImpact 
                        ? 'bg-red-500 text-white' 
                        : isMediumImpact 
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-400 text-white'
                    }`}>
                      {category.count}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHighImpact 
                            ? 'bg-gradient-to-r from-red-500 to-pink-500' 
                            : isMediumImpact 
                            ? 'bg-gradient-to-r from-orange-500 to-yellow-500'
                            : 'bg-gradient-to-r from-gray-400 to-slate-400'
                        }`}
                        style={{ width: `${category.percentage}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-bold min-w-[50px] text-right ${
                      isHighImpact ? 'text-red-600' : isMediumImpact ? 'text-orange-600' : 'text-gray-600'
                    }`}>
                      {category.percentage}%
                    </span>
                  </div>
                  {isHighImpact && (
                    <div className="mt-2 text-xs text-red-600 font-medium">⚠️ High Impact</div>
                  )}
                  {isMediumImpact && (
                    <div className="mt-2 text-xs text-orange-600 font-medium">⚡ Medium Impact</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Modern Resolution Categories Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">✅</span>
              </div>
              <span>Resolution Categories</span>
            </h3>
            <div className="bg-green-50 px-4 py-2 rounded-lg">
              <span className="text-green-600 font-semibold">{analysisResult.summary_data?.resolution_categories?.length || 0} Solutions</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysisResult.summary_data?.resolution_categories?.map((category: any, index: number) => {
              const isTopSolution = category.percentage >= 20;
              const isCommonSolution = category.percentage >= 10 && category.percentage < 20;
              
              return (
                <div key={index} className={`p-4 rounded-xl border-l-4 transition-all hover:shadow-md ${
                  isTopSolution 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500' 
                    : isCommonSolution 
                    ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-400'
                    : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-semibold ${
                      isTopSolution ? 'text-green-800' : isCommonSolution ? 'text-blue-800' : 'text-gray-700'
                    }`}>
                      {category.category}
                    </span>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      isTopSolution 
                        ? 'bg-green-500 text-white' 
                        : isCommonSolution 
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-400 text-white'
                    }`}>
                      {category.count}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isTopSolution 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                            : isCommonSolution 
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                            : 'bg-gradient-to-r from-gray-400 to-slate-400'
                        }`}
                        style={{ width: `${category.percentage}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-bold min-w-[50px] text-right ${
                      isTopSolution ? 'text-green-600' : isCommonSolution ? 'text-blue-600' : 'text-gray-600'
                    }`}>
                      {category.percentage}%
                    </span>
                  </div>
                  {isTopSolution && (
                    <div className="mt-2 text-xs text-green-600 font-medium">🎯 Top Solution</div>
                  )}
                  {isCommonSolution && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">📈 Common Solution</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Graphs Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span>Graphs</span>
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Root Cause Categories Chart */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-800 mb-4">Root Cause Categories</h4>
              <div className="h-64">
                <Bar 
                  data={{
                    labels: analysisResult.summary_data.root_cause_categories.slice(0, 8).map(item => item.category),
                    datasets: [{
                      data: analysisResult.summary_data.root_cause_categories.slice(0, 8).map(item => item.count),
                      backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(245, 101, 101, 0.8)',
                        'rgba(251, 146, 60, 0.8)',
                        'rgba(252, 176, 64, 0.8)',
                        'rgba(234, 179, 8, 0.8)',
                        'rgba(163, 163, 163, 0.8)',
                        'rgba(107, 114, 128, 0.8)',
                        'rgba(75, 85, 99, 0.8)'
                      ],
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { maxRotation: 45, font: { size: 10 } } },
                      y: { beginAtZero: true }
                    }
                  }}
                />
              </div>
            </div>

            {/* Root Cause Distribution */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-800 mb-4">Root Cause Distribution</h4>
              <div className="h-64">
                <Doughnut 
                  data={{
                    labels: analysisResult.summary_data.root_cause_categories.slice(0, 6).map(item => item.category),
                    datasets: [{
                      data: analysisResult.summary_data.root_cause_categories.slice(0, 6).map(item => item.count),
                      backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(245, 101, 101, 0.8)',
                        'rgba(251, 146, 60, 0.8)',
                        'rgba(252, 176, 64, 0.8)',
                        'rgba(234, 179, 8, 0.8)',
                        'rgba(163, 163, 163, 0.8)'
                      ],
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                        labels: { boxWidth: 12, padding: 8, font: { size: 10 } }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Resolution Categories */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-800 mb-4">Resolution Categories</h4>
              <div className="h-64">
                <Bar 
                  data={{
                    labels: analysisResult.summary_data.resolution_categories.slice(0, 8).map(item => item.category),
                    datasets: [{
                      data: analysisResult.summary_data.resolution_categories.slice(0, 8).map(item => item.count),
                      backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(74, 222, 128, 0.8)',
                        'rgba(134, 239, 172, 0.8)',
                        'rgba(187, 247, 208, 0.8)',
                        'rgba(220, 252, 231, 0.8)',
                        'rgba(22, 163, 74, 0.8)',
                        'rgba(21, 128, 61, 0.8)',
                        'rgba(22, 101, 52, 0.8)'
                      ],
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { maxRotation: 45, font: { size: 10 } } },
                      y: { beginAtZero: true }
                    }
                  }}
                />
              </div>
            </div>

            {/* Resolution Distribution */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-800 mb-4">Resolution Distribution</h4>
              <div className="h-64">
                <Pie 
                  data={{
                    labels: analysisResult.summary_data.resolution_categories.slice(0, 6).map(item => item.category),
                    datasets: [{
                      data: analysisResult.summary_data.resolution_categories.slice(0, 6).map(item => item.count),
                      backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(74, 222, 128, 0.8)',
                        'rgba(134, 239, 172, 0.8)',
                        'rgba(187, 247, 208, 0.8)',
                        'rgba(220, 252, 231, 0.8)',
                        'rgba(22, 163, 74, 0.8)'
                      ],
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                        labels: { boxWidth: 12, padding: 8, font: { size: 10 } }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Top Root Cause Subcategories */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-800 mb-4">Top Root Cause Subcategories</h4>
              <div className="h-64">
                <Bar 
                  data={{
                    labels: analysisResult.summary_data.root_cause_subcategories.slice(0, 10).map(item => item.category),
                    datasets: [{
                      data: analysisResult.summary_data.root_cause_subcategories.slice(0, 10).map(item => item.count),
                      backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(245, 101, 101, 0.8)',
                        'rgba(251, 146, 60, 0.8)',
                        'rgba(252, 176, 64, 0.8)',
                        'rgba(234, 179, 8, 0.8)',
                        'rgba(163, 163, 163, 0.8)',
                        'rgba(107, 114, 128, 0.8)',
                        'rgba(75, 85, 99, 0.8)',
                        'rgba(55, 65, 81, 0.8)',
                        'rgba(31, 41, 55, 0.8)'
                      ],
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { maxRotation: 45, font: { size: 10 } } },
                      y: { beginAtZero: true }
                    }
                  }}
                />
              </div>
            </div>

            {/* Top Resolution Subcategories */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-800 mb-4">Top Resolution Subcategories</h4>
              <div className="h-64">
                <Bar 
                  data={{
                    labels: analysisResult.summary_data.resolution_subcategories.slice(0, 10).map(item => item.category),
                    datasets: [{
                      data: analysisResult.summary_data.resolution_subcategories.slice(0, 10).map(item => item.count),
                      backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(74, 222, 128, 0.8)',
                        'rgba(134, 239, 172, 0.8)',
                        'rgba(187, 247, 208, 0.8)',
                        'rgba(220, 252, 231, 0.8)',
                        'rgba(22, 163, 74, 0.8)',
                        'rgba(21, 128, 61, 0.8)',
                        'rgba(22, 101, 52, 0.8)',
                        'rgba(20, 83, 45, 0.8)',
                        'rgba(16, 68, 37, 0.8)'
                      ],
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { maxRotation: 45, font: { size: 10 } } },
                      y: { beginAtZero: true }
                    }
                  }}
                />
              </div>
            </div>

            {/* Technical Debt Analysis */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-800 mb-4">Technical Debt Analysis</h4>
              <div className="h-64">
                <Bar 
                  data={{
                    labels: analysisResult.summary_data.quality_metrics
                      .filter(metric => metric.metric.includes('Debt Identified'))
                      .map(metric => metric.metric.replace(' Debt Identified', '')),
                    datasets: [{
                      data: analysisResult.summary_data.quality_metrics
                        .filter(metric => metric.metric.includes('Debt Identified'))
                        .map(metric => parseInt(metric.value)),
                      backgroundColor: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
                      borderColor: ['#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777'],
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { maxRotation: 45, font: { size: 11 } } },
                      y: { beginAtZero: true }
                    }
                  }}
                />
              </div>
            </div>

            {/* Debt Distribution */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-800 mb-4">Debt Distribution</h4>
              <div className="h-64">
                <Doughnut 
                  data={{
                    labels: analysisResult.summary_data.quality_metrics
                      .filter(metric => metric.metric.includes('Debt Identified') && parseInt(metric.value) > 0)
                      .map(metric => metric.metric.replace(' Debt Identified', '')),
                    datasets: [{
                      data: analysisResult.summary_data.quality_metrics
                        .filter(metric => metric.metric.includes('Debt Identified') && parseInt(metric.value) > 0)
                        .map(metric => parseInt(metric.value)),
                      backgroundColor: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
                      borderColor: ['#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777'],
                      borderWidth: 2
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                        labels: { boxWidth: 12, padding: 8, font: { size: 11 } }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5. Modern Debt Analysis Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">💰</span>
            </div>
            <span>Debt Analysis Summary</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analysisResult.summary_data?.quality_metrics
              ?.filter(metric => metric.metric.includes('Debt Identified'))
              .map((metric, index) => {
                const debtType = metric.metric.replace(' Debt Identified', '');
                const count = parseInt(metric.value);
                const percentage = parseFloat(metric.percentage.replace('%', ''));
                const isHighImpact = percentage >= 15;
                const isMediumImpact = percentage >= 5 && percentage < 15;
                
                return (
                  <div key={index} className={`p-4 rounded-xl border-l-4 transition-all hover:shadow-md ${
                    isHighImpact 
                      ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-500' 
                      : isMediumImpact 
                      ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400'
                      : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`font-semibold text-sm ${
                        isHighImpact ? 'text-red-800' : isMediumImpact ? 'text-yellow-800' : 'text-gray-700'
                      }`}>
                        {debtType}
                      </span>
                      <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                        isHighImpact 
                          ? 'bg-red-500 text-white' 
                          : isMediumImpact 
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-400 text-white'
                      }`}>
                        {count}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${
                        isHighImpact ? 'text-red-600' : isMediumImpact ? 'text-yellow-600' : 'text-gray-600'
                      }`}>
                        {metric.percentage}
                      </div>
                      <div className={`text-xs mt-1 ${
                        isHighImpact ? 'text-red-600' : isMediumImpact ? 'text-yellow-600' : 'text-gray-500'
                      }`}>
                        {isHighImpact ? '🚨 Critical' : isMediumImpact ? '⚠️ Moderate' : '✅ Low'}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* 6. Modern Debt Analysis Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">💡</span>
            </div>
            <span>Debt Analysis Insights</span>
          </h3>
          <div className="space-y-4">
            {/* Key Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center space-x-2">
                  <span className="text-blue-600">📊</span>
                  <span>Processing Quality</span>
                </h4>
                <div className="space-y-2 text-sm">
                  {analysisResult.summary_data?.quality_metrics
                    ?.filter(metric => 
                      metric.metric.includes('Confidence') || 
                      metric.metric.includes('Valid on First Try') ||
                      metric.metric.includes('Auto-Corrected')
                    )
                    .map((metric, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-blue-700">{metric.metric}:</span>
                        <span className="font-medium text-blue-900">
                          {metric.value} {metric.percentage && `(${metric.percentage})`}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center space-x-2">
                  <span className="text-green-600">🎯</span>
                  <span>Debt Impact Analysis</span>
                </h4>
                <div className="space-y-2 text-sm">
                  {(() => {
                    const debtMetrics = analysisResult.summary_data?.quality_metrics
                      ?.filter(metric => metric.metric.includes('Debt Identified')) || [];
                    const totalDebtIncidents = debtMetrics.reduce((sum, metric) => sum + parseInt(metric.value), 0);
                    const highestDebt = debtMetrics.reduce((max, metric) => 
                      parseInt(metric.value) > parseInt(max.value) ? metric : max, debtMetrics[0]);
                    
                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">Total Debt Issues:</span>
                          <span className="font-medium text-green-900">{totalDebtIncidents} incidents</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">Highest Impact:</span>
                          <span className="font-medium text-green-900">
                            {highestDebt?.metric.replace(' Debt Identified', '')} ({highestDebt?.percentage})
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">Debt-Free Rate:</span>
                          <span className="font-medium text-green-900">
                            {(((analysisResult.total_processed - totalDebtIncidents) / analysisResult.total_processed) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            {/* Actionable Recommendations */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6">
              <h4 className="font-semibold text-orange-800 mb-4 flex items-center space-x-2">
                <span className="text-orange-600">🚀</span>
                <span>Actionable Recommendations</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-600 mt-1">•</span>
                    <div>
                      <span className="font-medium text-orange-800">Process Optimization:</span>
                      <p className="text-orange-700 mt-1">
                        {(() => {
                          const processDebt = analysisResult.summary_data?.quality_metrics
                            ?.find(metric => metric.metric.includes('Process Debt'));
                          return processDebt ? 
                            `${processDebt.percentage} of incidents are process-related. Focus on workflow automation and standardization.` :
                            'Review process workflows for optimization opportunities.';
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-600 mt-1">•</span>
                    <div>
                      <span className="font-medium text-orange-800">Technical Infrastructure:</span>
                      <p className="text-orange-700 mt-1">
                        {(() => {
                          const techDebt = analysisResult.summary_data?.quality_metrics
                            ?.find(metric => metric.metric.includes('Technical Debt'));
                          return techDebt ? 
                            `${techDebt.percentage} technical debt detected. Consider system upgrades and code refactoring.` :
                            'Technical infrastructure appears stable.';
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-600 mt-1">•</span>
                    <div>
                      <span className="font-medium text-orange-800">Quality Assurance:</span>
                      <p className="text-orange-700 mt-1">
                        {(() => {
                          const validFirstTry = analysisResult.summary_data?.quality_metrics
                            ?.find(metric => metric.metric.includes('Valid on First Try'));
                          return validFirstTry ? 
                            `${validFirstTry.percentage} success rate indicates ${parseFloat(validFirstTry.percentage.replace('%', '')) >= 95 ? 'excellent' : 'good'} quality processes.` :
                            'Implement quality checkpoints to improve first-time success rates.';
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-600 mt-1">•</span>
                    <div>
                      <span className="font-medium text-orange-800">Confidence Monitoring:</span>
                      <p className="text-orange-700 mt-1">
                        {(() => {
                          const avgConfidence = analysisResult.summary_data?.quality_metrics
                            ?.find(metric => metric.metric.includes('Average Confidence Score'));
                          const confidence = avgConfidence ? parseFloat(avgConfidence.value) : 0;
                          return confidence >= 0.9 ? 
                            `Excellent confidence score (${confidence.toFixed(3)}). System is performing optimally.` :
                            confidence >= 0.8 ?
                            `Good confidence score (${confidence.toFixed(3)}). Monitor for consistency.` :
                            `Low confidence score (${confidence.toFixed(3)}). Review and improve categorization accuracy.`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Quality Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quality Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysisResult.summary_data.quality_metrics.map((metric, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{metric.metric}</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-900">{metric.value}</span>
                    {metric.percentage && (
                      <span className="text-sm text-gray-500 ml-2">{metric.percentage}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 8. Download Results */}
        {analysisResult.excel_file && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                <Download className="w-5 h-5 text-green-500" />
                <span>Download Results</span>
              </h3>
              <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Ready</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-800">{analysisResult.file_info?.output_filename}</p>
                  <p className="text-sm text-green-600">Excel file with categorized incidents</p>
                </div>
              </div>
              <button 
                onClick={handleDownload}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Analyse Incidents</h1>
              <p className="text-red-100 mt-1">Upload Excel files and analyze incident patterns with AI-powered categorization</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">AI Analysis</span>
            </div>
            <div className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div className="text-red-700">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div className="text-green-700">{success}</div>
          </div>
        </div>
      )}

      {/* Async Status Card */}
      {asyncTaskData && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
              </div>
              <div>
                <h4 className="font-medium text-blue-800">Background Processing Active</h4>
                <p className="text-sm text-blue-600">{asyncTaskData.message}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-blue-500">
                  <span>Task ID: {asyncTaskData.task_id}</span>
                  <span>•</span>
                  <span>Estimated: {asyncTaskData.estimated_completion_minutes} min</span>
                  <span>•</span>
                  <span>Batches: {asyncTaskData.processing_stats?.total_batches || 'N/A'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                connectWebSocket();
                setShowBatchTracker(true);
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-medium flex items-center space-x-2 shadow-lg"
            >
              <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
              <span>Track Progress</span>
            </button>
          </div>

          {/* WebSocket Connection Status */}
          {connectionStatus && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-500" />
                <span>Real-time Progress</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className="text-sm font-medium text-blue-600">{connectionStatus}</span>
                </div>
                {batchProgress && batchProgress.total_batches > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Batch Progress:</span>
                      <span className="text-sm font-medium">{batchProgress.current_batch}/{batchProgress.total_batches} completed</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(batchProgress.current_batch / batchProgress.total_batches) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500">{batchProgress.message}</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
            <Upload className="w-5 h-5 text-red-500" />
            <span>Upload Excel File</span>
          </h3>
          {selectedFile && (
            <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-lg">
              <FileText className="w-4 h-4" />
              <span>File Ready</span>
            </div>
          )}
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragging 
              ? 'border-red-500 bg-red-50 scale-98' 
              : 'border-gray-300 hover:border-red-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <FileText size={32} className="text-green-600" />
              </div>
              <div className="flex items-center justify-center space-x-4 bg-green-50 p-4 rounded-lg">
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
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Upload size={32} className="text-red-500" />
              </div>
              <div>
                <p className="text-gray-600 mb-2 text-lg">
                  Drag and drop your Excel file here, or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-red-500 hover:text-red-600 font-medium underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-sm text-gray-500">Supported formats: .xlsx, .xls • Maximum size: 50MB</p>
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

        {/* Processing Configuration */}
        <div className="mt-6 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Processing Configuration</h4>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <div className={`w-2 h-2 rounded-full ${isAsyncMode ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span>{isAsyncMode ? 'Async Mode' : 'Sync Mode'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Processing Mode</label>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsAsyncMode(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    !isAsyncMode
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4" />
                    <span>Sync</span>
                  </div>
                </button>
                <button
                  onClick={() => setIsAsyncMode(true)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isAsyncMode
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4" />
                    <span>Async</span>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Batch Size Selector */}
            <div className={`transition-all duration-500 ${isAsyncMode ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform translate-x-4 pointer-events-none'}`}>
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">Batch Size</label>
                <div className="relative">
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(parseInt(e.target.value))}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value={5}>5 items</option>
                    <option value={10}>10 items</option>
                    <option value={15}>15 items</option>
                    <option value={20}>20 items</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mode Description */}
            <div className="bg-white/60 rounded-lg p-3 border border-white/40">
              <div className="flex items-start space-x-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                  isAsyncMode ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {isAsyncMode ? (
                    <RefreshCw className="w-3 h-3 text-blue-600" />
                  ) : (
                    <Zap className="w-3 h-3 text-green-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {isAsyncMode ? 'Asynchronous Processing' : 'Synchronous Processing'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {isAsyncMode 
                      ? `Process in background with real-time tracking. Batches of ${batchSize} items will be processed with live progress updates.`
                      : 'Process immediately and wait for results. Best for smaller files and quick analysis.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={handleReset}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Reset
          </button>
          <button
            onClick={handleAnalyze}
            disabled={!selectedFile || isAnalyzing}
            className={`px-8 py-2 rounded-lg text-white transition-all font-medium flex items-center space-x-2 ${
              selectedFile && !isAnalyzing
                ? 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-red-100'
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
                <BarChart3 size={18} />
                <span>{isAsyncMode ? 'Async Analyse' : 'Analyse Incidents'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Batch Progress Modal */}
      {showBatchTracker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Batch Processing Tracker</h3>
                  <p className="text-sm text-gray-600">Real-time progress monitoring</p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchTracker(false)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 pb-6 max-h-[80vh] overflow-y-auto">
              {/* Connection Status */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}></div>
                    <span className="font-medium">{connectionStatus}</span>
                  </div>
                  {asyncResponse && (
                    <div className="text-sm text-gray-600">
                      Task: {asyncResponse.task_id}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Overview */}
              {batchProgress && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-800">Overall Progress</h4>
                      <div className="text-2xl font-bold text-blue-600">
                        {batchProgress.progress_percentage?.toFixed(1) || 0}%
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${batchProgress.progress_percentage || 0}%` }}
                      ></div>
                    </div>
                    
                    <div className="text-center text-gray-600 font-medium">
                      {batchProgress.message}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{batchProgress.current_batch}</div>
                      <div className="text-sm text-blue-800">Current Batch</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">{batchProgress.total_batches}</div>
                      <div className="text-sm text-purple-800">Total Batches</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{batchProgress.processed || 0}</div>
                      <div className="text-sm text-green-800">Processed</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">{batchProgress.total || 0}</div>
                      <div className="text-sm text-orange-800">Total Items</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {analysisResult && (
        <div className="mt-8">
          {renderSyncAnalysisResults()}
        </div>
      )}
    </div>
  );
};

export default AnalyseIncidents;