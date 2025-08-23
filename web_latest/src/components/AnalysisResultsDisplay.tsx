import React from 'react';
import { FileText, BarChart3, CheckCircle, Clock, Download } from 'lucide-react';

interface AnalysisData {
  success: boolean;
  total_processed: number;
  processing_time_seconds: number;
  file_info: {
    original_filename: string;
    total_rows: number;
    output_filename: string;
    output_file_path: string;
    processed_rows: number;
  };
  summary_data: {
    root_cause_categories: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
    resolution_categories: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
  };
  excel_file?: string;
}

interface AnalysisResultsDisplayProps {
  analysisData: AnalysisData;
  onDownload?: () => void;
}

const AnalysisResultsDisplay: React.FC<AnalysisResultsDisplayProps> = ({ 
  analysisData, 
  onDownload 
}) => {
  // 1. Summary Statistics Cards
  const renderAnalysisResults = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">Total Processed</p>
            <p className="text-3xl font-bold mt-1">{analysisData.total_processed}</p>
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
              {((analysisData.file_info.processed_rows / analysisData.file_info.total_rows) * 100).toFixed(1)}%
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
            <p className="text-3xl font-bold mt-1">{analysisData.processing_time_seconds.toFixed(1)}s</p>
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
              {analysisData.summary_data.root_cause_categories.length + analysisData.summary_data.resolution_categories.length}
            </p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );

  // 2. Modern Root Cause Categories Table
  const renderRootCauseCategories = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">🔍</span>
          </div>
          <span>Root Cause Categories</span>
        </h3>
        <div className="bg-red-50 px-4 py-2 rounded-lg">
          <span className="text-red-600 font-semibold">{analysisData.summary_data.root_cause_categories.length} Categories</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analysisData.summary_data.root_cause_categories.map((category, index) => {
          const isHighImpact = category.percentage >= 15;
          const isMediumImpact = category.percentage >= 10 && category.percentage < 15;
          
          return (
            <div key={index} className={`p-4 rounded-xl border-l-4 transition-all hover:shadow-md ${
              isHighImpact 
                ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-500' 
                : isMediumImpact 
                ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-400'
                : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`font-semibold ${
                  isHighImpact ? 'text-purple-800' : isMediumImpact ? 'text-blue-800' : 'text-emerald-700'
                }`}>
                  {category.category}
                </span>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isHighImpact 
                    ? 'bg-purple-500 text-white' 
                    : isMediumImpact 
                    ? 'bg-blue-500 text-white'
                    : 'bg-emerald-400 text-white'
                }`}>
                  {category.count}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isHighImpact 
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500' 
                        : isMediumImpact 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                        : 'bg-gradient-to-r from-emerald-400 to-teal-400'
                    }`}
                    style={{ width: `${category.percentage}%` }}
                  ></div>
                </div>
                <span className={`text-sm font-bold min-w-[50px] text-right ${
                  isHighImpact ? 'text-purple-600' : isMediumImpact ? 'text-blue-600' : 'text-emerald-600'
                }`}>
                  {category.percentage}%
                </span>
              </div>
              {isHighImpact && (
                <div className="mt-2 text-xs text-purple-600 font-medium">⚠️ High Impact</div>
              )}
              {isMediumImpact && (
                <div className="mt-2 text-xs text-blue-600 font-medium">⚡ Medium Impact</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // 3. Modern Resolution Categories Table
  const renderResolutionCategories = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">✅</span>
          </div>
          <span>Resolution Categories</span>
        </h3>
        <div className="bg-green-50 px-4 py-2 rounded-lg">
          <span className="text-green-600 font-semibold">{analysisData.summary_data.resolution_categories.length} Solutions</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analysisData.summary_data.resolution_categories.map((category, index) => {
          const isTopSolution = category.percentage >= 20;
          const isCommonSolution = category.percentage >= 10 && category.percentage < 20;
          
          return (
            <div key={index} className={`p-4 rounded-xl border-l-4 transition-all hover:shadow-md ${
              isTopSolution 
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-500' 
                : isCommonSolution 
                ? 'bg-gradient-to-r from-rose-50 to-pink-50 border-rose-400'
                : 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-300'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`font-semibold ${
                  isTopSolution ? 'text-amber-800' : isCommonSolution ? 'text-rose-800' : 'text-slate-700'
                }`}>
                  {category.category}
                </span>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isTopSolution 
                    ? 'bg-amber-500 text-white' 
                    : isCommonSolution 
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-400 text-white'
                }`}>
                  {category.count}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isTopSolution 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                        : isCommonSolution 
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500'
                        : 'bg-gradient-to-r from-slate-400 to-gray-400'
                    }`}
                    style={{ width: `${category.percentage}%` }}
                  ></div>
                </div>
                <span className={`text-sm font-bold min-w-[50px] text-right ${
                  isTopSolution ? 'text-amber-600' : isCommonSolution ? 'text-rose-600' : 'text-slate-600'
                }`}>
                  {category.percentage}%
                </span>
              </div>
              {isTopSolution && (
                <div className="mt-2 text-xs text-amber-600 font-medium">🎯 Top Solution</div>
              )}
              {isCommonSolution && (
                <div className="mt-2 text-xs text-rose-600 font-medium">📈 Common Solution</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // 4. Graphs Section
  const renderCharts = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <span>Analysis Charts</span>
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Root Cause Distribution Chart</p>
        </div>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Resolution Trends Chart</p>
        </div>
      </div>
    </div>
  );

  // 5. Quality Metrics Section
  const renderQualityMetrics = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">📊</span>
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
            <span className="text-indigo-900 font-bold">{analysisData.file_info?.original_filename}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <span className="font-semibold text-green-800">Total Rows:</span>
            </div>
            <span className="text-green-900 font-bold text-xl">{analysisData.file_info?.total_rows}</span>
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
            <span className="text-purple-900 font-bold text-xl">{analysisData.file_info?.processed_rows}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <span className="font-semibold text-orange-800">Processing Time:</span>
            </div>
            <span className="text-orange-900 font-bold text-xl">{analysisData.processing_time_seconds.toFixed(1)}s</span>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800 font-medium">Technical debt analysis and insights will be displayed here based on the incident categorization results.</p>
      </div>
    </div>
  );

  // 6. Modern Debt Analysis Insights
  const renderDebtInsights = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm">💡</span>
        </div>
        <span>Debt Analysis Insights</span>
      </h3>
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6">
        <p className="text-orange-800 font-medium">Actionable insights and recommendations based on technical debt analysis will be provided here.</p>
      </div>
    </div>
  );

  // 8. Download Results Section
  const renderDownloadSection = () => (
    analysisData.excel_file && (
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
              <p className="font-medium text-green-800">{analysisData.file_info.output_filename}</p>
              <p className="text-sm text-green-600">Excel file with categorized incidents</p>
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
    )
  );

  return (
    <div className="space-y-6">
      {renderAnalysisResults()}
      {renderRootCauseCategories()}
      {renderResolutionCategories()}
      {renderCharts()}
      {renderQualityMetrics()}
      {renderDebtInsights()}
      {renderDownloadSection()}
    </div>
  );
};

export default AnalysisResultsDisplay;