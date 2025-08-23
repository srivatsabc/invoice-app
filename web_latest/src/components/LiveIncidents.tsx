import React, { useState, useEffect } from 'react';
import { Activity, Calendar, Filter, RefreshCw, Search, TrendingUp, AlertTriangle, Clock, Users, DollarSign, Target, BarChart3, PieChart, Zap, Database, Shield, CheckCircle, XCircle, Eye, Settings, FileText, Download } from 'lucide-react';
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
  ArcElement
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

interface LiveIncidentFilters {
  days_back: number;
  date_from: string;
  date_to: string;
  business_line: string;
  application_name: string;
  major_incident_only: boolean;
  root_cause_category: string;
  resolution_category: string;
  limit: number;
}

interface CategoryData {
  category: string;
  count: number;
  percentage: number;
}

interface CombinationData {
  root_cause_category: string;
  root_cause_subcategory: string;
  resolution_category: string;
  resolution_subcategory: string;
  count: number;
  percentage: number;
}

interface QualityMetric {
  metric: string;
  value: string;
  percentage: string;
}

interface LiveIncidentData {
  success: boolean;
  total_incidents: number;
  processing_time_seconds: number;
  data_source: string;
  filters_applied: LiveIncidentFilters;
  date_range: {
    requested_from: string | null;
    requested_to: string | null;
    actual_from: string;
    actual_to: string;
    days_back_used: number;
  };
  summary_data: {
    root_cause_categories: CategoryData[];
    root_cause_subcategories: CategoryData[];
    resolution_categories: CategoryData[];
    resolution_subcategories: CategoryData[];
    root_cause_combinations: Array<{
      root_cause_category: string;
      root_cause_subcategory: string;
      count: number;
      percentage: number;
    }>;
    resolution_combinations: Array<{
      resolution_category: string;
      resolution_subcategory: string;
      count: number;
      percentage: number;
    }>;
    full_combinations: CombinationData[];
    quality_metrics: QualityMetric[];
    assignment_groups: any;
    priority_distribution: any;
  };
  message: string;
}

const LiveIncidents: React.FC = () => {
  const [filters, setFilters] = useState<LiveIncidentFilters>({
    days_back: 30,
    date_from: '',
    date_to: '',
    business_line: '',
    application_name: '',
    major_incident_only: false,
    root_cause_category: '',
    resolution_category: '',
    limit: 1000
  });

  const [liveData, setLiveData] = useState<LiveIncidentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [dateMode, setDateMode] = useState<'days_back' | 'date_range'>('days_back');

  const handleFilterChange = (key: keyof LiveIncidentFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (dateMode === 'days_back') {
        params.append('days_back', filters.days_back.toString());
      } else {
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
      }
      
      if (filters.business_line) params.append('business_line', filters.business_line);
      if (filters.application_name) params.append('application_name', filters.application_name);
      if (filters.major_incident_only) params.append('major_incident_only', 'true');
      if (filters.root_cause_category) params.append('root_cause_category', filters.root_cause_category);
      if (filters.resolution_category) params.append('resolution_category', filters.resolution_category);
      if (filters.limit !== 1000) params.append('limit', filters.limit.toString());

      const response = await fetch(`https://26fb3c7d5d24.ngrok-free.app/api/v1/live-incidents/analytics?${params.toString()}`, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; InvoiceAnalyzer/1.0)',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch live incidents data');
      }
      
      const data = await response.json();
      setLiveData(data);
      setSuccess(`Successfully analyzed ${data.total_incidents} live incidents in ${data.processing_time_seconds.toFixed(2)} seconds`);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch live incidents data');
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      days_back: 30,
      date_from: '',
      date_to: '',
      business_line: '',
      application_name: '',
      major_incident_only: false,
      root_cause_category: '',
      resolution_category: '',
      limit: 1000
    });
    setDateMode('days_back');
    setError(null);
    setSuccess(null);
    setLiveData(null);
  };

  // Render analysis results with same structure as Analyse Incidents
  const renderAnalysisResults = () => {
    if (!liveData) return null;
    
    return (
      <div className="space-y-6">
        {/* 1. Analysis Results - Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Processed</p>
                <p className="text-3xl font-bold mt-1">{liveData.total_incidents}</p>
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
                <p className="text-3xl font-bold mt-1">100%</p>
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
                <p className="text-3xl font-bold mt-1">{liveData.processing_time_seconds.toFixed(1)}s</p>
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
                  {(liveData.summary_data?.root_cause_categories?.length || 0) + (liveData.summary_data?.resolution_categories?.length || 0)}
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
              <span className="text-red-600 font-semibold">{liveData.summary_data?.root_cause_categories?.length || 0} Categories</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveData.summary_data?.root_cause_categories?.map((category: any, index: number) => {
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
              <span className="text-green-600 font-semibold">{liveData.summary_data?.resolution_categories?.length || 0} Solutions</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveData.summary_data?.resolution_categories?.map((category: any, index: number) => {
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

        {/* 4. Graphs Section - Exact same as Analyse Incidents */}
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
                    labels: liveData.summary_data.root_cause_categories.slice(0, 8).map(item => item.category),
                    datasets: [{
                      data: liveData.summary_data.root_cause_categories.slice(0, 8).map(item => item.count),
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
                    labels: liveData.summary_data.root_cause_categories.slice(0, 6).map(item => item.category),
                    datasets: [{
                      data: liveData.summary_data.root_cause_categories.slice(0, 6).map(item => item.count),
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
                    labels: liveData.summary_data.resolution_categories.slice(0, 8).map(item => item.category),
                    datasets: [{
                      data: liveData.summary_data.resolution_categories.slice(0, 8).map(item => item.count),
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
                    labels: liveData.summary_data.resolution_categories.slice(0, 6).map(item => item.category),
                    datasets: [{
                      data: liveData.summary_data.resolution_categories.slice(0, 6).map(item => item.count),
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
                    labels: liveData.summary_data.root_cause_subcategories.slice(0, 10).map(item => item.category),
                    datasets: [{
                      data: liveData.summary_data.root_cause_subcategories.slice(0, 10).map(item => item.count),
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
                    labels: liveData.summary_data.resolution_subcategories.slice(0, 10).map(item => item.category),
                    datasets: [{
                      data: liveData.summary_data.resolution_subcategories.slice(0, 10).map(item => item.count),
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
                    labels: liveData.summary_data.quality_metrics
                      .filter(metric => metric.metric.includes('Debt Identified'))
                      .map(metric => metric.metric.replace(' Debt Identified', '')),
                    datasets: [{
                      data: liveData.summary_data.quality_metrics
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
                    labels: liveData.summary_data.quality_metrics
                      .filter(metric => metric.metric.includes('Debt Identified') && parseInt(metric.value) > 0)
                      .map(metric => metric.metric.replace(' Debt Identified', '')),
                    datasets: [{
                      data: liveData.summary_data.quality_metrics
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
            {liveData.summary_data?.quality_metrics
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
                  {liveData.summary_data?.quality_metrics
                    ?.filter(metric => 
                      metric.metric.includes('Confidence') || 
                      metric.metric.includes('High Confidence') ||
                      metric.metric.includes('Low Confidence')
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
                    const debtMetrics = liveData.summary_data?.quality_metrics
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
                        {highestDebt && (
                          <div className="flex justify-between items-center">
                            <span className="text-green-700">Highest Impact:</span>
                            <span className="font-medium text-green-900">
                              {highestDebt.metric.replace(' Debt Identified', '')} ({highestDebt.percentage})
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">Debt-Free Rate:</span>
                          <span className="font-medium text-green-900">
                            {totalDebtIncidents > 0 ? (((liveData.total_incidents - totalDebtIncidents) / liveData.total_incidents) * 100).toFixed(1) : '100.0'}%
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
                          const processDebt = liveData.summary_data?.quality_metrics
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
                          const techDebt = liveData.summary_data?.quality_metrics
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
                          const highConfidence = liveData.summary_data?.quality_metrics
                            ?.find(metric => metric.metric.includes('High Confidence'));
                          return highConfidence ? 
                            `${highConfidence.percentage} high confidence rate indicates ${parseFloat(highConfidence.percentage.replace('%', '')) >= 80 ? 'excellent' : 'good'} quality processes.` :
                            'Implement quality checkpoints to improve confidence scores.';
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
                          const avgConfidence = liveData.summary_data?.quality_metrics
                            ?.find(metric => metric.metric.includes('Average Confidence Score'));
                          const confidence = avgConfidence ? parseFloat(avgConfidence.value) : 0;
                          return confidence >= 0.8 ? 
                            `Excellent confidence score (${confidence.toFixed(3)}). System is performing optimally.` :
                            confidence >= 0.7 ?
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
            {liveData.summary_data.quality_metrics.map((metric, index) => (
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
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-500 via-orange-500 to-pink-500 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Live Incidents Analytics</h1>
              <p className="text-red-100 mt-1">Real-time analysis of live incident data with advanced filtering and insights</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Live Data</span>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
              <Database className="w-4 h-4" />
              <span className="text-sm font-medium">{liveData?.total_incidents || 0} Incidents</span>
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <Filter className="w-5 h-5" />
            </button>
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

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <Filter className="w-5 h-5 text-red-500" />
              <span>Live Incident Filters</span>
            </h3>
            <button
              onClick={handleReset}
              className="text-gray-500 hover:text-gray-700 text-sm flex items-center space-x-1"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset All</span>
            </button>
          </div>

          {/* Date Filter Mode Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Date Filter Mode</label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={dateMode === 'days_back'}
                  onChange={() => setDateMode('days_back')}
                  className="text-red-600 focus:ring-red-500"
                />
                <span>Days Back</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={dateMode === 'date_range'}
                  onChange={() => setDateMode('date_range')}
                  className="text-red-600 focus:ring-red-500"
                />
                <span>Date Range</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Date Filters */}
            {dateMode === 'days_back' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Days Back (1-365)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  value={filters.days_back}
                  onChange={(e) => handleFilterChange('days_back', parseInt(e.target.value) || 30)}
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      value={filters.date_from}
                      onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    />
                    <Calendar className="absolute right-3 top-2.5 text-gray-400" size={20} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      value={filters.date_to}
                      onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    />
                    <Calendar className="absolute right-3 top-2.5 text-gray-400" size={20} />
                  </div>
                </div>
              </>
            )}

            {/* Business Line */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Line</label>
              <input
                type="text"
                placeholder="Enter business line"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={filters.business_line}
                onChange={(e) => handleFilterChange('business_line', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Application Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Application Name</label>
              <input
                type="text"
                placeholder="Enter application name (partial match)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={filters.application_name}
                onChange={(e) => handleFilterChange('application_name', e.target.value)}
              />
            </div>

            {/* Root Cause Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Root Cause Category</label>
              <input
                type="text"
                placeholder="Enter root cause category"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={filters.root_cause_category}
                onChange={(e) => handleFilterChange('root_cause_category', e.target.value)}
              />
            </div>

            {/* Resolution Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Category</label>
              <input
                type="text"
                placeholder="Enter resolution category"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={filters.resolution_category}
                onChange={(e) => handleFilterChange('resolution_category', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Major Incident Only */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="major_incident_only"
                checked={filters.major_incident_only}
                onChange={(e) => handleFilterChange('major_incident_only', e.target.checked)}
                className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="major_incident_only" className="text-sm font-medium text-gray-700">
                Major Incidents Only
              </label>
            </div>

            {/* Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Limit (1-10000)</label>
              <input
                type="number"
                min="1"
                max="10000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value) || 1000)}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className={`bg-red-600 text-white px-8 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{isLoading ? 'Analyzing...' : 'Analyze'}</span>
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-500 text-white px-8 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Results Section - Exact same structure as Analyse Incidents */}
      {liveData && (
        <div className="mt-8">
          {renderAnalysisResults()}
        </div>
      )}
    </div>
  );
};

export default LiveIncidents;