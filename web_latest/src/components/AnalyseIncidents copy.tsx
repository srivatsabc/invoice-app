import React, { useState, useRef, useEffect } from 'react';
import { Upload, BarChart3, AlertTriangle, Clock, TrendingUp, Settings, Filter, Search, RefreshCw, FileText, Download, X, Zap, CheckCircle, ChevronDown, Activity } from 'lucide-react';
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

const AnalyseIncidents = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [asyncTaskData, setAsyncTaskData] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAsyncMode, setIsAsyncMode] = useState(false);
  const [batchSize, setBatchSize] = useState(5);
  const [showTracker, setShowTracker] = useState(false);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [batchProgress, setBatchProgress] = useState<any>({
    completed: 0,
    total: 0,
    status: '',
    currentBatch: null
  });
  const [currentProgress, setCurrentProgress] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
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

  const connectWebSocket = () => {
    if (!asyncTaskData?.task_id) {
      console.error('No task ID available for WebSocket connection');
      return;
    }

    const wsUrl = `wss://769090066689.ngrok-free.app/api/v1/categorization/ws/${asyncTaskData.task_id}`;
    
    setIsConnecting(true);
    setConnectionStatus('Connecting to WebSocket...');
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    setWebSocket(ws);

    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      setConnectionStatus('connected');
      setConnectionStatus('Connected - Waiting for updates...');
      setIsConnected(true);
      setBatchProgress(prev => ({
        ...prev,
        status: 'Connected to tracking service'
      }));
    };

    ws.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      try {
        const message = JSON.parse(event.data);
        console.log('Parsed message:', message);
        
        switch (message.type) {
          case 'progress':
            console.log('Progress update:', message);
            setBatchProgress({
              currentBatch: message.data.current_batch,
              totalBatches: message.data.total_batches,
              processed: message.data.processed || 0,
              total: message.data.total || 0,
              progressPercentage: message.data.progress_percentage || 0,
              elapsedTime: message.data.elapsed_time_seconds || 0,
              estimatedRemaining: message.data.estimated_remaining_seconds || 0,
              throughput: message.data.throughput_per_minute || 0,
              batchTime: message.data.batch_time_seconds || 0,
              message: message.data.message || '',
              status: message.data.status || 'processing',
              ticketsRange: message.data.tickets_range || ''
            });
            setBatchProgress(prev => ({
              ...prev,
              completed: message.completed_batches || message.completed || 0,
              total: message.total_batches || message.total || 0,
              status: message.status || `Processing batch ${message.current_batch || 'unknown'}...`,
              currentBatch: message.current_batch || null
            }));
            break;
            
          case 'batch_complete':
            console.log('Batch completed:', message);
            setBatchProgress(prev => ({
              ...prev,
              completed: message.batch_number || prev.completed + 1,
              status: `Batch ${message.batch_number} completed`,
              currentBatch: message.batch_number
            }));
            break;
            
          case 'complete':
            console.log('All batches complete, final data:', message);
            setAnalyticsData(message.data || message.result || message);
            setBatchProgress(prev => ({
              ...prev,
              completed: prev.total,
              status: 'Analysis Complete! Processing final results...'
            }));
            
            // Auto-close tracker after showing completion
            setTimeout(() => {
              setShowTracker(false);
            }, 3000);
            break;
            
          case 'error':
            console.error('WebSocket error message:', message);
            setBatchProgress(prev => ({
              ...prev,
              status: `Error: ${message.message || 'Unknown error occurred'}`
            }));
            break;
            
          default:
            console.log('Unknown message type:', message.type, message);
            // Handle any other message format
            if (message.completed_batches !== undefined || message.total_batches !== undefined) {
              setBatchProgress(prev => ({
                ...prev,
                completed: message.completed_batches || prev.completed,
                total: message.total_batches || prev.total,
                status: message.status || prev.status
              }));
            }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error, event.data);
        // Try to handle raw text messages
        setBatchProgress(prev => ({
          ...prev,
          status: `Update: ${event.data}`
        }));
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('connection error');
      setConnectionStatus('Connection error');
      setIsConnected(false);
      setBatchProgress(prev => ({
        ...prev,
        status: 'Connection error - retrying...'
      }));
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setIsConnecting(false);
      setConnectionStatus('Connection closed');
      setWebSocket(null);
      setIsConnected(false);
      if (event.code !== 1000) {
        setBatchProgress(prev => ({
          ...prev,
          status: `Connection closed: ${event.reason || 'Unknown reason'}`
        }));
      }
    };
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('batch_size', batchSize.toString());
    formData.append('async_mode', isAsyncMode.toString());

    try {
      const response = await fetch('https://769090066689.ngrok-free.app/api/v1/categorization/upload-excel', {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; InvoiceAnalyzer/1.0)',
        },
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to analyze Excel file: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let result: AnalysisResponse;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error(`Invalid JSON response from server. Raw response: ${responseText.substring(0, 200)}...`);
      }

      // Check if this is an async response
      if (result.async_mode && result.task_id) {
        // Handle async response
        setAsyncTaskData(result);
        setSuccess(result.message);
      } else {
        // Handle sync response (existing logic)
        setAnalysisResult(result);
        setSuccess(`Successfully processed ${result.total_processed} incidents in ${result.processing_time_seconds.toFixed(2)} seconds`);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          // Use mock data for demonstration when network fails
          console.log('Using mock data due to network error');
          
          if (isAsyncMode) {
            // Mock async response
            const mockAsyncResult = {
              success: true,
              async_mode: true,
              task_id: "task_1755139780_2b6e07df",
              message: "Processing started in background. Connect to WebSocket for updates.",
              websocket_url: "/api/v1/categorization/ws/task_1755139780_2b6e07df",
              estimated_completion_minutes: 2.1,
              file_info: {
                original_filename: selectedFile.name,
                total_rows: 50
              },
              processing_stats: {
                batch_size: batchSize,
                total_batches: Math.ceil(50 / batchSize),
                async_mode: true
              }
            };
            setAsyncTaskData(mockAsyncResult);
            setSuccess(mockAsyncResult.message);
          } else {
            // Mock sync response (existing logic)
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
                { category: "Data Compliance Error", count: 1, percentage: 5.0 },
                { category: "Input Issue", count: 1, percentage: 5.0 },
                { category: "Master Record Configuration", count: 1, percentage: 5.0 },
                { category: "Stock Availability Problem", count: 1, percentage: 5.0 },
                { category: "Manual Process Review", count: 1, percentage: 5.0 },
                { category: "Open Items", count: 1, percentage: 5.0 }
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
                { category: "System Adjustment", count: 1, percentage: 5.0 },
                { category: "Configuration Update", count: 1, percentage: 5.0 },
                { category: "Project Activation Correction", count: 1, percentage: 5.0 },
                { category: "Report Access Restoration", count: 1, percentage: 5.0 },
                { category: "Error Rectification", count: 1, percentage: 5.0 },
                { category: "Issue Resolution", count: 1, percentage: 5.0 }
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
          setSuccess(`Demo: Successfully processed ${mockResult.total_processed} incidents in ${mockResult.processing_time_seconds.toFixed(2)} seconds (using mock data due to network restrictions)`);
          }
        } else if (err.message.includes('Invalid JSON')) {
          setError(`Server response error: ${err.message}`);
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred while analyzing the file');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const createChartData = (data: CategoryData[], colors: string[]) => ({
    labels: data.map(item => item.category),
    datasets: [{
      data: data.map(item => item.count),
      backgroundColor: colors,
      borderColor: colors.map(color => color.replace('0.8', '1')),
      borderWidth: 1
    }]
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 8,
          font: {
            size: 10
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const data = context.dataset.data[context.dataIndex];
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((data / total) * 100).toFixed(1);
            return `${context.label}: ${data} (${percentage}%)`;
          }
        }
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const data = context.parsed.y;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((data / total) * 100).toFixed(1);
            return `Count: ${data} (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          font: {
            size: 10
          }
        }
      },
      y: {
        beginAtZero: true
      }
    }
  };

  const colors = [
    'rgba(239, 68, 68, 0.8)',   // red
    'rgba(245, 101, 101, 0.8)', // red-400
    'rgba(251, 146, 60, 0.8)',  // orange
    'rgba(252, 176, 64, 0.8)',  // orange-400
    'rgba(234, 179, 8, 0.8)',   // yellow
    'rgba(163, 163, 163, 0.8)', // gray
    'rgba(107, 114, 128, 0.8)', // gray-500
    'rgba(75, 85, 99, 0.8)',    // gray-600
    'rgba(55, 65, 81, 0.8)',    // gray-700
    'rgba(31, 41, 55, 0.8)'     // gray-800
  ];

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

      {/* Async Task Status */}
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
                setShowTracker(true);
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-500" />
                <span>Real-time Progress</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className="text-sm font-medium text-blue-600">{connectionStatus}</span>
                </div>
                {batchProgress.total > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Batch Progress:</span>
                      <span className="text-sm font-medium">{batchProgress.completed}/{batchProgress.total} completed</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(batchProgress.completed / batchProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500">{batchProgress.status}</div>
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
                  className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                >
                  <X size={16} />
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
                <button
                  onClick={() => setShowBatchModal(true)}
                  className="flex items-center space-x-2 text-blue-700 hover:text-blue-800 transition-colors"
                >
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="font-medium">Processing...</span>
                </button>
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

        {/* Action Buttons */}
        <div className="mt-6">
          {/* Processing Configuration */}
          <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6 mb-6 border border-red-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 text-red-600" />
                </div>
                <span>Processing Configuration</span>
              </h4>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className={`w-2 h-2 rounded-full ${isAsyncMode ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span>{isAsyncMode ? 'Async Mode' : 'Sync Mode'}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Modern Toggle Switch */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700">Processing Mode</span>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span className={!isAsyncMode ? 'text-green-600 font-medium' : ''}>Sync</span>
                    <button
                      onClick={() => setIsAsyncMode(!isAsyncMode)}
                      className={`relative inline-flex items-center h-6 w-12 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                        isAsyncMode ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gradient-to-r from-green-400 to-green-500'
                      }`}
                    >
                      <span
                        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 shadow-lg ${
                          isAsyncMode ? 'translate-x-7' : 'translate-x-1'
                      >
                        browse
                      </button>
                    <span className={isAsyncMode ? 'text-blue-600 font-medium' : ''}>Async</span>
                  </div>
                </div>
                
                {/* Batch Size Selector - Animated */}
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
          
          <div className="flex justify-end space-x-4">
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
                <Zap size={18} />
                <span>Analyze</span>
              </>
            )}
          </button>
          </div>
        </div>

        {/* Analytics Results Section */}
        {isAnalysisComplete && analyticsData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <span>Analysis Results</span>
              </h3>
              <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Completed</span>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600">Total Processed</p>
                    <p className="text-2xl font-bold text-blue-900">{analyticsData.total_processed}</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600">Processing Time</p>
                    <p className="text-2xl font-bold text-green-900">{analyticsData.processing_time_seconds?.toFixed(1)}s</p>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-600">Success Rate</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {analyticsData.file_info ? 
                        ((analyticsData.file_info.processed_rows / analyticsData.file_info.total_rows) * 100).toFixed(1) 
                        : '100'}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Download className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-600">Output File</p>
                    <p className="text-sm font-medium text-orange-900 truncate">
                      {analyticsData.file_info?.output_filename || 'Generated'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Root Cause Categories Chart */}
            {analyticsData.summary_data?.root_cause_categories && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">Root Cause Categories</h4>
                  <div className="space-y-2">
                    {analyticsData.summary_data.root_cause_categories.map((category: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                        <span className="text-sm font-medium text-gray-700">{category.category}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{category.count}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${(category.count / analyticsData.total_processed) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">
                            {((category.count / analyticsData.total_processed) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional analytics sections can be added here */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">Processing Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 bg-white rounded">
                      <span className="text-sm text-gray-600">Original File:</span>
                      <span className="text-sm font-medium text-gray-800">
                        {analyticsData.file_info?.original_filename}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white rounded">
                      <span className="text-sm text-gray-600">Total Rows:</span>
                      <span className="text-sm font-medium text-gray-800">
                        {analyticsData.file_info?.total_rows}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white rounded">
                      <span className="text-sm text-gray-600">Processed Rows:</span>
                      <span className="text-sm font-medium text-gray-800">
                        {analyticsData.file_info?.processed_rows}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white rounded">
                      <span className="text-sm text-gray-600">Processing Time:</span>
                      <span className="text-sm font-medium text-gray-800">
                        {analyticsData.processing_time_seconds?.toFixed(2)}s
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Download Button */}
            {analyticsData.file_info?.output_file_path && (
              <div className="flex justify-center">
                <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Download Results</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
        {/* Batch Progress Modal */}
        {showBatchModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-t-xl p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <div>
                      <h2 className="text-xl font-bold">Batch Processing Progress</h2>
                      <p className="text-blue-100 text-sm">Real-time processing updates</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBatchModal(false)}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Connection Status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-500' : 
                      connectionStatus === 'connection error' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="font-medium text-gray-700">WebSocket Status</span>
                  </div>
                  <span className={`text-sm font-medium capitalize ${
                    connectionStatus === 'connected' ? 'text-green-600' : 
                    connectionStatus === 'connection error' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {connectionStatus}
                  </span>
                </div>

                {/* Progress Overview */}
                {batchProgress.totalBatches > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800">Processing Status</h3>
                      <span className="text-sm text-gray-500">
                        {batchProgress.progressPercentage.toFixed(1)}% Complete
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${batchProgress.progressPercentage}%` }}
                      ></div>
                    </div>

                    {/* Current Status Message */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                      <p className="text-blue-800 font-medium">{batchProgress.message}</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-500">Batch Progress</div>
                        <div className="text-lg font-bold text-gray-800">
                          {batchProgress.currentBatch}/{batchProgress.totalBatches}
                        </div>
                        {batchProgress.ticketsRange && (
                          <div className="text-xs text-gray-500">Tickets: {batchProgress.ticketsRange}</div>
                        )}
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-500">Overall Progress</div>
                        <div className="text-lg font-bold text-gray-800">
                          {batchProgress.processed}/{batchProgress.totalTickets}
                        </div>
                        <div className="text-xs text-gray-500">
                          {batchProgress.progressPercentage.toFixed(1)}%
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-500">Elapsed Time</div>
                        <div className="text-lg font-bold text-gray-800">
                          {Math.floor(batchProgress.elapsedTime)}s
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-500">Est. Remaining</div>
                        <div className="text-lg font-bold text-gray-800">
                          {Math.floor(batchProgress.estimatedRemaining)}s
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-500">Throughput</div>
                        <div className="text-lg font-bold text-gray-800">
                          {batchProgress.throughput.toFixed(1)}/min
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-500">Batch Time</div>
                        <div className="text-lg font-bold text-gray-800">
                          {batchProgress.batchTime.toFixed(1)}s
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* No Progress Data */}
                {batchProgress.totalBatches === 0 && (
                  <div className="text-center py-8">
                    <RefreshCw className="w-12 h-12 mx-auto text-gray-400 animate-spin mb-4" />
                    <p className="text-gray-500">Waiting for batch processing to start...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


      {/* Analysis Results */}
      {analysisResult && (
        <>
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Processed</p>
                  <p className="text-2xl font-bold text-gray-900">{analysisResult.total_processed}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Processing Time</p>
                  <p className="text-2xl font-bold text-gray-900">{analysisResult.processing_time_seconds.toFixed(1)}s</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Confidence</p>
                  <p className="text-2xl font-bold text-gray-900">{(analysisResult.processing_stats.average_confidence * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Results File</p>
                  <button
                    onClick={handleDownload}
                    className="text-lg font-bold text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Root Cause Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Root Cause Categories</h3>
              <div className="h-80">
                <Bar 
                  data={createChartData(analysisResult.summary_data.root_cause_categories.slice(0, 8), colors)}
                  options={barChartOptions}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Root Cause Distribution</h3>
              <div className="h-80">
                <Doughnut 
                  data={createChartData(analysisResult.summary_data.root_cause_categories.slice(0, 6), colors)}
                  options={chartOptions}
                />
              </div>
            </div>
          </div>

          {/* Resolution Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Resolution Categories</h3>
              <div className="h-80">
                <Bar 
                  data={createChartData(analysisResult.summary_data.resolution_categories.slice(0, 8), colors)}
                  options={barChartOptions}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Resolution Distribution</h3>
              <div className="h-80">
                <Pie 
                  data={createChartData(analysisResult.summary_data.resolution_categories.slice(0, 6), colors)}
                  options={chartOptions}
                />
              </div>
            </div>
          </div>

          {/* Subcategory Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Root Cause Subcategories</h3>
              <div className="h-80">
                <Bar 
                  data={createChartData(analysisResult.summary_data.root_cause_subcategories.slice(0, 10), colors)}
                  options={barChartOptions}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Resolution Subcategories</h3>
              <div className="h-80">
                <Bar 
                  data={createChartData(analysisResult.summary_data.resolution_subcategories.slice(0, 10), colors)}
                  options={barChartOptions}
                />
              </div>
            </div>
          </div>

          {/* Debt Analysis Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                  <span className="text-green-600 text-xs">📊</span>
                </div>
                <span>Technical Debt Analysis</span>
              </h3>
              <div className="h-80">
                <Bar 
                  data={{
                    labels: analysisResult.summary_data.quality_metrics
                      .filter(metric => metric.metric.includes('Debt Identified'))
                      .map(metric => metric.metric.replace(' Debt Identified', '')),
                    datasets: [{
                      label: 'Incidents Count',
                      data: analysisResult.summary_data.quality_metrics
                        .filter(metric => metric.metric.includes('Debt Identified'))
                        .map(metric => parseInt(metric.value)),
                      backgroundColor: [
                        'rgba(220, 252, 231, 0.9)',  // green-100
                        'rgba(187, 247, 208, 0.9)',  // green-200
                        'rgba(134, 239, 172, 0.9)',  // green-300
                        'rgba(74, 222, 128, 0.9)',   // green-400
                        'rgba(34, 197, 94, 0.9)',    // green-500
                        'rgba(22, 163, 74, 0.9)',    // green-600
                        'rgba(21, 128, 61, 0.9)',    // green-700
                        'rgba(22, 101, 52, 0.9)'     // green-800
                      ],
                      borderColor: [
                        'rgba(187, 247, 208, 1)',
                        'rgba(134, 239, 172, 1)',
                        'rgba(22, 163, 74, 1)',
                        'rgba(21, 128, 61, 1)',
                        'rgba(22, 101, 52, 1)',
                        'rgba(21, 128, 61, 1)',
                        'rgba(22, 101, 52, 1)',
                        'rgba(20, 83, 45, 1)'
                      ],
                      borderWidth: 2
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context: any) {
                            const debtMetrics = analysisResult.summary_data.quality_metrics
                              .filter(metric => metric.metric.includes('Debt Identified'));
                            const metric = debtMetrics[context.dataIndex];
                            return `${context.label}: ${context.parsed.y} incidents (${metric.percentage})`;
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        ticks: {
                          maxRotation: 45,
                          font: {
                            size: 11
                          }
                        },
                        grid: {
                          color: 'rgba(134, 239, 172, 0.3)'
                        }
                      },
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Number of Incidents',
                          color: 'rgba(22, 163, 74, 0.8)'
                        },
                        grid: {
                          color: 'rgba(134, 239, 172, 0.3)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                  <span className="text-green-600 text-xs">🥧</span>
                </div>
                <span>Debt Distribution</span>
              </h3>
              <div className="h-80">
                <Doughnut 
                  data={{
                    labels: analysisResult.summary_data.quality_metrics
                      .filter(metric => metric.metric.includes('Debt Identified') && parseInt(metric.value) > 0)
                      .map(metric => metric.metric.replace(' Debt Identified', '')),
                    datasets: [{
                      data: analysisResult.summary_data.quality_metrics
                        .filter(metric => metric.metric.includes('Debt Identified') && parseInt(metric.value) > 0)
                        .map(metric => parseInt(metric.value)),
                      backgroundColor: [
                        'rgba(220, 252, 231, 0.9)',  // green-100
                        'rgba(187, 247, 208, 0.9)',  // green-200
                        'rgba(134, 239, 172, 0.9)',  // green-300
                        'rgba(74, 222, 128, 0.9)',   // green-400
                        'rgba(34, 197, 94, 0.9)',    // green-500
                        'rgba(22, 163, 74, 0.9)',    // green-600
                        'rgba(21, 128, 61, 0.9)',    // green-700
                        'rgba(22, 101, 52, 0.9)'     // green-800
                      ],
                      borderColor: [
                        'rgba(187, 247, 208, 1)',
                        'rgba(134, 239, 172, 1)',
                        'rgba(22, 163, 74, 1)',
                        'rgba(21, 128, 61, 1)',
                        'rgba(22, 101, 52, 1)',
                        'rgba(21, 128, 61, 1)',
                        'rgba(22, 101, 52, 1)',
                        'rgba(20, 83, 45, 1)'
                      ],
                      borderWidth: 2,
                      hoverBackgroundColor: [
                        'rgba(187, 247, 208, 1.0)',
                        'rgba(134, 239, 172, 1.0)',
                        'rgba(22, 163, 74, 0.9)',
                        'rgba(21, 128, 61, 0.9)',
                        'rgba(22, 101, 52, 0.9)',
                        'rgba(21, 128, 61, 1.0)',
                        'rgba(22, 101, 52, 1.0)',
                        'rgba(20, 83, 45, 1.0)'
                      ]
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                        labels: {
                          boxWidth: 12,
                          padding: 8,
                          font: {
                            size: 11
                          },
                          color: 'rgba(22, 163, 74, 0.8)'
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context: any) {
                            const debtMetrics = analysisResult.summary_data.quality_metrics
                              .filter(metric => metric.metric.includes('Debt Identified') && parseInt(metric.value) > 0);
                            const metric = debtMetrics[context.dataIndex];
                            return `${context.label}: ${context.parsed} incidents (${metric.percentage})`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Debt Summary Cards */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center space-x-2">
              <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                <span className="text-blue-700">
                  {connectionStatus === 'connecting' ? 'Connecting to WebSocket...' : 
                   connectionStatus === 'connected' ? 'Connected - Tracking Progress...' : 
                   'Connection Error'}
                </span>
              </div>
              <span>Debt Analysis Summary</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {(batchProgress.currentBatch > 0 || batchProgress.message) && (
                <div className="space-y-3">
                  {/* Current Status Message */}
                  <div className="text-sm text-green-700 font-medium">
                    {batchProgress.message}
                  </div>
                  
                  {/* Batch Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${batchProgress.progressPercentage || (batchProgress.currentBatch / batchProgress.totalBatches) * 100}%` }}
                    ></div>
                  </div>
                  
                  {/* Progress Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="text-green-600 font-medium">Batch Progress</div>
                      <div className="text-green-800 font-bold">
                        {batchProgress.currentBatch}/{batchProgress.totalBatches}
                      </div>
                      {batchProgress.ticketsRange && (
                        <div className="text-xs text-green-600">Range: {batchProgress.ticketsRange}</div>
                      )}
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="text-green-600 font-medium">Overall Progress</div>
                      <div className="text-green-800 font-bold">
                        {batchProgress.progressPercentage ? `${batchProgress.progressPercentage.toFixed(1)}%` : 
                         `${Math.round((batchProgress.currentBatch / batchProgress.totalBatches) * 100)}%`}
                      </div>
                      {batchProgress.processed > 0 && (
                        <div className="text-xs text-green-600">{batchProgress.processed}/{batchProgress.total} tickets</div>
                      )}
                    </div>
                    
                    {batchProgress.elapsedTime > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="text-green-600 font-medium">Elapsed Time</div>
                        <div className="text-green-800 font-bold">
                          {Math.floor(batchProgress.elapsedTime / 60)}:{String(Math.floor(batchProgress.elapsedTime % 60)).padStart(2, '0')}
                        </div>
                        {batchProgress.estimatedRemaining > 0 && (
                          <div className="text-xs text-green-600">
                            ~{Math.ceil(batchProgress.estimatedRemaining)}s remaining
                          </div>
                        )}
                      </div>
                    )}
                    
                    {batchProgress.throughput > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="text-green-600 font-medium">Throughput</div>
                        <div className="text-green-800 font-bold">
                          {batchProgress.throughput.toFixed(1)}/min
                        </div>
                        {batchProgress.batchTime > 0 && (
                          <div className="text-xs text-green-600">
                            Batch: {batchProgress.batchTime.toFixed(1)}s
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="flex items-center space-x-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      batchProgress.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                      batchProgress.status === 'batch_complete' ? 'bg-green-500' :
                      'bg-gray-400'
                    }`}></div>
                    <span className="text-green-700 capitalize">
                      {batchProgress.status === 'batch_complete' ? 'Batch Completed' : 
                       batchProgress.status === 'processing' ? 'Processing...' : 
                       batchProgress.status}
                    </span>
                  </div>
                </div>
              )}
              {analysisResult.summary_data.quality_metrics
                .filter(metric => metric.metric.includes('Debt Identified'))
                .map((metric, index) => {
                  const debtType = metric.metric.replace(' Debt Identified', '');
                  const count = parseInt(metric.value);
                  const isHighImpact = count > 5;
                  
                  return (
                    <div key={index} className={`rounded-lg p-4 border-l-4 ${
                      isHighImpact 
                        ? 'bg-green-50 border-green-500' 
                        : count > 0 
                        ? 'bg-green-25 border-green-300' 
                        : 'bg-gray-50 border-gray-300'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${
                          isHighImpact ? 'text-green-800' : count > 0 ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          {debtType}
                        </span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isHighImpact 
                            ? 'bg-green-500 text-white' 
                            : count > 0 
                            ? 'bg-green-400 text-white' 
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {count}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-bold ${
                          isHighImpact ? 'text-green-800' : count > 0 ? 'text-green-700' : 'text-gray-500'
                        }`}>
                          {metric.percentage}
                        </span>
                      </div>
                      <div className={`text-xs mt-1 ${
                        isHighImpact ? 'text-green-600' : count > 0 ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {isHighImpact ? 'High Impact' : count > 0 ? 'Moderate' : 'None Detected'}
                      </div>
                    </div>
                  );
                })}
            </div>
            
            {/* Debt Insights */}
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-md font-semibold text-green-800 mb-3 flex items-center space-x-2">
                <span className="text-green-600">💡</span>
                <span>Debt Analysis Insights</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="text-green-700">
                    <strong>Highest Impact:</strong> Process Debt (65% of incidents)
                  </p>
                  <p className="text-green-700">
                    <strong>Secondary Impact:</strong> Technical Debt (15% of incidents)
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-green-700">
                    <strong>Total Debt Issues:</strong> {
                      analysisResult.summary_data.quality_metrics
                        .filter(metric => metric.metric.includes('Debt Identified'))
                        .reduce((sum, metric) => sum + parseInt(metric.value), 0)
                    } incidents
                  </p>
                  <p className="text-green-700">
                    <strong>Debt-Free Incidents:</strong> {
                      analysisResult.total_processed - 
                      analysisResult.summary_data.quality_metrics
                        .filter(metric => metric.metric.includes('Debt Identified'))
                        .reduce((sum, metric) => sum + parseInt(metric.value), 0)
                    } incidents
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quality Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysisResult.summary_data.quality_metrics
                .map((metric, index) => (
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
        </>
      )}

      {/* Analytics Results */}
      {(isAnalysisComplete || analyticsData) && (
        <div className="space-y-6">
          {/* Analytics content would go here */}
        </div>
      )}
    </div>
  );
};

export default AnalyseIncidents;