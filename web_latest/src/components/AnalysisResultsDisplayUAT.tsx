import React from 'react';
import { Bar, Doughnut, Pie } from 'react-chartjs-2';
import { FileText, BarChart3, CheckCircle, Clock, Download, Target, Shield, Zap, TrendingUp, Activity } from 'lucide-react';

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
  message: string;
}

interface AnalysisResultsDisplayUATProps {
  analysisData: UATAnalysisData;
  onDownload?: () => void;
}

const AnalysisResultsDisplayUAT: React.FC<AnalysisResultsDisplayUATProps> = ({ 
  analysisData, 
  onDownload 
}) => {
  // Helper function to safely get a number value
  const safeNumber = (value: any, defaultValue: number = 0): number => {
    return typeof value === 'number' ? value : defaultValue;
  };

  // Helper function to safely get an array
  const safeArray = (value: any): any[] => {
    return Array.isArray(value) ? value : [];
  };

  // 1. Summary Statistics Cards
  const renderAnalysisResults = () => {
    const totalProcessed = safeNumber(analysisData?.total_processed);
    const processingTime = safeNumber(analysisData?.processing_time_seconds);
    const totalRows = safeNumber(analysisData?.file_info?.total_rows);
    const processedRows = safeNumber(analysisData?.file_info?.processed_rows);
    const successRate = totalRows > 0 ? ((processedRows / totalRows) * 100) : 0;
    
    const sdlcCount = safeArray(analysisData?.summary_data?.sdlc_step_distribution).length;
    const debtCount = safeArray(analysisData?.summary_data?.debt_type_distribution).length;
    const activityCount = safeArray(analysisData?.summary_data?.activity_match_distribution).length;
    const totalCategories = sdlcCount + debtCount + activityCount;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Processed</p>
              <p className="text-3xl font-bold mt-1">{totalProcessed}</p>
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
              <p className="text-3xl font-bold mt-1">{successRate.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Processing Time</p>
              <p className="text-3xl font-bold mt-1">{processingTime.toFixed(1)}s</p>
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
              <p className="text-3xl font-bold mt-1">{totalCategories}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 2. SDLC Step Distribution
  const renderSDLCStepDistribution = () => {
    const sdlcData = safeArray(analysisData?.summary_data?.sdlc_step_distribution);
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🔄</span>
            </div>
            <span>SDLC Step Distribution</span>
          </h3>
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <span className="text-blue-600 font-semibold">{sdlcData.length} Steps</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sdlcData.map((step, index) => {
            const isHighImpact = step.percentage >= 30;
            const isMediumImpact = step.percentage >= 15 && step.percentage < 30;
            
            return (
              <div key={index} className={`p-4 rounded-xl border-l-4 transition-all hover:shadow-md ${
                isHighImpact 
                  ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-500' 
                  : isMediumImpact 
                  ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-400'
                  : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-semibold ${
                    isHighImpact ? 'text-red-800' : isMediumImpact ? 'text-orange-800' : 'text-blue-700'
                  }`}>
                    {step.category}
                  </span>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isHighImpact 
                      ? 'bg-red-500 text-white' 
                      : isMediumImpact 
                      ? 'bg-orange-500 text-white'
                      : 'bg-blue-400 text-white'
                  }`}>
                    {step.count}
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
                          : 'bg-gradient-to-r from-blue-400 to-cyan-400'
                      }`}
                      style={{ width: `${step.percentage}%` }}
                    ></div>
                  </div>
                  <span className={`text-sm font-bold min-w-[50px] text-right ${
                    isHighImpact ? 'text-red-600' : isMediumImpact ? 'text-orange-600' : 'text-blue-600'
                  }`}>
                    {step.percentage}%
                  </span>
                </div>
                {isHighImpact && (
                  <div className="mt-2 text-xs text-red-600 font-medium">🚨 High Impact</div>
                )}
                {isMediumImpact && (
                  <div className="mt-2 text-xs text-orange-600 font-medium">⚠️ Medium Impact</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 3. Debt Type Distribution
  const renderDebtTypeDistribution = () => {
    const debtData = safeArray(analysisData?.summary_data?.debt_type_distribution);
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">💳</span>
            </div>
            <span>Technical Debt Type Distribution</span>
          </h3>
          <div className="bg-red-50 px-4 py-2 rounded-lg">
            <span className="text-red-600 font-semibold">{debtData.length} Debt Types</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {debtData.map((debt, index) => {
            const isHighDebt = debt.percentage >= 25;
            const isMediumDebt = debt.percentage >= 10 && debt.percentage < 25;
            
            return (
              <div key={index} className={`p-4 rounded-xl border-l-4 transition-all hover:shadow-md ${
                isHighDebt 
                  ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-500' 
                  : isMediumDebt 
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400'
                  : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-semibold ${
                    isHighDebt ? 'text-red-800' : isMediumDebt ? 'text-yellow-800' : 'text-gray-700'
                  }`}>
                    {debt.category}
                  </span>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isHighDebt 
                      ? 'bg-red-500 text-white' 
                      : isMediumDebt 
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-400 text-white'
                  }`}>
                    {debt.count}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHighDebt 
                          ? 'bg-gradient-to-r from-red-500 to-rose-500' 
                          : isMediumDebt 
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          : 'bg-gradient-to-r from-gray-400 to-slate-400'
                      }`}
                      style={{ width: `${debt.percentage}%` }}
                    ></div>
                  </div>
                  <span className={`text-sm font-bold min-w-[50px] text-right ${
                    isHighDebt ? 'text-red-600' : isMediumDebt ? 'text-yellow-600' : 'text-gray-600'
                  }`}>
                    {debt.percentage}%
                  </span>
                </div>
                {isHighDebt && (
                  <div className="mt-2 text-xs text-red-600 font-medium">🚨 Critical Debt</div>
                )}
                {isMediumDebt && (
                  <div className="mt-2 text-xs text-yellow-600 font-medium">⚠️ Moderate Debt</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 4. Activity Match Distribution
  const renderActivityMatchDistribution = () => {
    const activityData = safeArray(analysisData?.summary_data?.activity_match_distribution);
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🎯</span>
            </div>
            <span>Activity Match Distribution</span>
          </h3>
          <div className="bg-green-50 px-4 py-2 rounded-lg">
            <span className="text-green-600 font-semibold">{activityData.length} Activities</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activityData.map((activity, index) => {
            const isTopActivity = activity.percentage >= 20;
            const isCommonActivity = activity.percentage >= 10 && activity.percentage < 20;
            
            return (
              <div key={index} className={`p-4 rounded-xl border-l-4 transition-all hover:shadow-md ${
                isTopActivity 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500' 
                  : isCommonActivity 
                  ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-400'
                  : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-semibold text-sm ${
                    isTopActivity ? 'text-green-800' : isCommonActivity ? 'text-blue-800' : 'text-gray-700'
                  }`}>
                    {activity.category.length > 50 ? `${activity.category.substring(0, 50)}...` : activity.category}
                  </span>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isTopActivity 
                      ? 'bg-green-500 text-white' 
                      : isCommonActivity 
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-400 text-white'
                  }`}>
                    {activity.count}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isTopActivity 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                          : isCommonActivity 
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                          : 'bg-gradient-to-r from-gray-400 to-slate-400'
                      }`}
                      style={{ width: `${activity.percentage}%` }}
                    ></div>
                  </div>
                  <span className={`text-sm font-bold min-w-[50px] text-right ${
                    isTopActivity ? 'text-green-600' : isCommonActivity ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {activity.percentage}%
                  </span>
                </div>
                {isTopActivity && (
                  <div className="mt-2 text-xs text-green-600 font-medium">🎯 Top Activity</div>
                )}
                {isCommonActivity && (
                  <div className="mt-2 text-xs text-blue-600 font-medium">📈 Common Activity</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 5. Quality Metrics Section
  const renderQualityMetrics = () => {
    const qualityMetrics = safeArray(analysisData?.summary_data?.quality_metrics);
    const processingStats = analysisData?.processing_stats;
    
    if (qualityMetrics.length === 0 && !processingStats) {
      return null;
    }
    
    const averageConfidence = safeNumber(processingStats?.average_confidence) * 100;
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">📊</span>
            </div>
            <span>Quality Metrics & Processing Stats</span>
          </h3>
          <div className="bg-purple-50 px-4 py-2 rounded-lg">
            <span className="text-purple-600 font-semibold">Confidence: {averageConfidence.toFixed(1)}%</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {qualityMetrics.map((metric, index) => (
            <div key={index} className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-indigo-800 mb-1">{metric.metric}</p>
                  <p className="text-lg font-bold text-indigo-900">{metric.value}</p>
                  {metric.percentage && (
                    <p className="text-xs text-indigo-600">{metric.percentage}</p>
                  )}
                </div>
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 6. Processing Summary Section
  const renderProcessingSummary = () => {
    const fileInfo = analysisData?.file_info;
    const processingTime = safeNumber(analysisData?.processing_time_seconds);
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">⚡</span>
            </div>
            <span>Processing Summary</span>
          </h3>
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <span className="text-blue-600 font-semibold">100% Success Rate</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="font-semibold text-indigo-800">Original File:</span>
              </div>
              <span className="text-indigo-900 font-bold">{fileInfo?.original_filename || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <span className="font-semibold text-green-800">Total Rows:</span>
              </div>
              <span className="text-green-900 font-bold text-xl">{safeNumber(fileInfo?.total_rows)}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-semibold text-purple-800">Processed Rows:</span>
              </div>
              <span className="text-purple-900 font-bold text-xl">{safeNumber(fileInfo?.processed_rows)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <span className="font-semibold text-orange-800">Processing Time:</span>
              </div>
              <span className="text-orange-900 font-bold text-xl">{processingTime.toFixed(1)}s</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 7. Charts Section
  const renderCharts = () => {
    const sdlcData = safeArray(analysisData?.summary_data?.sdlc_step_distribution);
    const debtData = safeArray(analysisData?.summary_data?.debt_type_distribution);
    const activityData = safeArray(analysisData?.summary_data?.activity_match_distribution);
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">📈</span>
            </div>
            <span>Visual Analytics</span>
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <h4 className="text-lg font-semibold text-blue-700 mb-4">SDLC Distribution</h4>
            {sdlcData.length > 0 ? (
              <div className="h-64">
                <Doughnut 
                  data={{
                    labels: sdlcData.map(item => item.category),
                    datasets: [{
                      data: sdlcData.map(item => item.count),
                      backgroundColor: [
                        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
                        '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
                      ],
                      borderWidth: 2,
                      borderColor: '#ffffff'
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 20,
                          usePointStyle: true
                        }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-64 bg-white rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <span className="text-gray-500">No SDLC data available</span>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg">
            <h4 className="text-lg font-semibold text-red-700 mb-4">Technical Debt Types</h4>
            {debtData.length > 0 ? (
              <div className="h-64">
                <Pie 
                  data={{
                    labels: debtData.map(item => item.category),
                    datasets: [{
                      data: debtData.map(item => item.count),
                      backgroundColor: [
                        '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D',
                        '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2', '#FEF2F2'
                      ],
                      borderWidth: 2,
                      borderColor: '#ffffff'
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 20,
                          usePointStyle: true
                        }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-64 bg-white rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <span className="text-gray-500">No debt type data available</span>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
            <h4 className="text-lg font-semibold text-green-700 mb-4">Activity Matches</h4>
            {activityData.length > 0 ? (
              <div className="h-64">
                <Bar 
                  data={{
                    labels: activityData.map(item => 
                      item.category.length > 30 ? `${item.category.substring(0, 30)}...` : item.category
                    ),
                    datasets: [{
                      label: 'Activity Count',
                      data: activityData.map(item => item.count),
                      backgroundColor: 'rgba(34, 197, 94, 0.8)',
                      borderColor: 'rgba(34, 197, 94, 1)',
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1
                        }
                      },
                      x: {
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45
                        }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-64 bg-white rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <span className="text-gray-500">No activity data available</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 8. Download Results Section
  const renderDownloadSection = () => {
    const excelFile = analysisData?.excel_file;
    const downloadInfo = analysisData?.download_info;
    
    if (!excelFile) {
      return null;
    }
    
    const fileSizeMB = safeNumber(downloadInfo?.excel_file_size_mb);
    const sheetsCreated = safeArray(downloadInfo?.sheets_created);
    const outputFilename = analysisData?.file_info?.output_filename || excelFile.filename || 'analysis_results.xlsx';
    
    return (
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
              <p className="font-medium text-green-800">{outputFilename}</p>
              <p className="text-sm text-green-600">Excel file with classified UAT defects</p>
              <p className="text-xs text-green-500 mt-1">
                Size: {fileSizeMB.toFixed(2)} MB • 
                Sheets: {sheetsCreated.join(', ')}
              </p>
            </div>
          </div>
          <button 
            onClick={onDownload}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderAnalysisResults()}
      {renderSDLCStepDistribution()}
      {renderDebtTypeDistribution()}
      {renderActivityMatchDistribution()}
      {renderCharts()}
      {renderQualityMetrics()}
      {renderProcessingSummary()}
      {renderDownloadSection()}
    </div>
  );
};

export default AnalysisResultsDisplayUAT;