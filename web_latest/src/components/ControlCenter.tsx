import React, { useState, useEffect } from 'react';
import { Shield, Settings, Activity, AlertTriangle, ToggleLeft, ToggleRight, ChevronDown, Zap, RefreshCw, Edit3, FileText } from 'lucide-react';
import { API_ENDPOINTS } from '../constants/api';

interface AgentControl {
  id: number;
  control: string;
  isActive: boolean;
  value: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string | null;
}

interface AgentControlsResponse {
  controls: AgentControl[];
  totalCount: number;
}

const ControlCenter = () => {
  const [agentMonitoringEnabled, setAgentMonitoringEnabled] = useState(false);
  const [invoiceProcessingEnabled, setInvoiceProcessingEnabled] = useState(false);
  const [loggingLevel, setLoggingLevel] = useState('INFO');
  const [showWarning, setShowWarning] = useState(false);
  const [showInvoiceProcessingWarning, setShowInvoiceProcessingWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<AgentControl | null>(null);
  const [currentInvoiceProcessingConfig, setCurrentInvoiceProcessingConfig] = useState<AgentControl | null>(null);

  // Fetch current control settings on component mount
  useEffect(() => {
    fetchControlSettings();
  }, []);

  const fetchControlSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_ENDPOINTS.AGENT_CONTROLS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch control settings');
      }

      const data: AgentControlsResponse = await response.json();
      
      // Find logging control
      const loggingControl = data.controls.find(control => control.control === 'logging');
      
      if (loggingControl) {
        setAgentMonitoringEnabled(loggingControl.isActive);
        setLoggingLevel(loggingControl.value);
        setCurrentConfig(loggingControl);
      } else {
        setAgentMonitoringEnabled(false);
        setLoggingLevel('INFO');
        setCurrentConfig(null);
      }

      // Find invoice processing control
      const invoiceProcessingControl = data.controls.find(control => control.control === 'invoice_processing');
      
      if (invoiceProcessingControl) {
        setInvoiceProcessingEnabled(invoiceProcessingControl.isActive);
        setCurrentInvoiceProcessingConfig(invoiceProcessingControl);
      } else {
        setInvoiceProcessingEnabled(false);
        setCurrentInvoiceProcessingConfig(null);
      }
    } catch (err) {
      console.error('Error fetching control settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch control settings');
    } finally {
      setIsLoading(false);
    }
  };

  const enableLogging = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const username = localStorage.getItem('username') || 'unknown_user';
      
      const response = await fetch(API_ENDPOINTS.AGENT_CONTROLS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          control: 'logging',
          isActive: 1,
          value: loggingLevel,
          createdBy: username
        })
      });

      if (!response.ok) {
        throw new Error('Failed to enable logging');
      }

      const data = await response.json();
      setAgentMonitoringEnabled(true);
      setShowWarning(false);
      setSuccess('Agent monitoring and logging enabled successfully');
      
      // Refresh the current config
      await fetchControlSettings();
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error enabling logging:', err);
      setError(err instanceof Error ? err.message : 'Failed to enable logging');
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const disableLogging = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(API_ENDPOINTS.AGENT_CONTROLS_DEBUG, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to disable logging');
      }

      setAgentMonitoringEnabled(false);
      setCurrentConfig(null);
      setSuccess('Agent monitoring and logging disabled successfully');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error disabling logging:', err);
      setError(err instanceof Error ? err.message : 'Failed to disable logging');
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const enableInvoiceProcessing = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const username = localStorage.getItem('username') || 'unknown_user';
      
      const response = await fetch(API_ENDPOINTS.AGENT_CONTROLS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          control: 'invoice_processing',
          isActive: 1,
          value: 'enabled',
          createdBy: username
        })
      });

      if (!response.ok) {
        throw new Error('Failed to enable invoice processing edits');
      }

      const data = await response.json();
      setInvoiceProcessingEnabled(true);
      setShowInvoiceProcessingWarning(false);
      setSuccess('Invoice processing edits enabled successfully');
      
      // Refresh the current config
      await fetchControlSettings();
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error enabling invoice processing:', err);
      setError(err instanceof Error ? err.message : 'Failed to enable invoice processing edits');
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const disableInvoiceProcessing = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(API_ENDPOINTS.AGENT_CONTROLS_INVOICE_PROCESSING, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to disable invoice processing edits');
      }

      setInvoiceProcessingEnabled(false);
      setCurrentInvoiceProcessingConfig(null);
      setSuccess('Invoice processing edits disabled successfully');
      
      // Refresh the current config
      await fetchControlSettings();
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error disabling invoice processing:', err);
      setError(err instanceof Error ? err.message : 'Failed to disable invoice processing edits');
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAgentMonitoring = () => {
    if (!agentMonitoringEnabled) {
      setShowWarning(true);
    } else {
      disableLogging();
    }
  };

  const handleToggleInvoiceProcessing = () => {
    if (!invoiceProcessingEnabled) {
      setShowInvoiceProcessingWarning(true);
    } else {
      disableInvoiceProcessing();
    }
  };

  const handleApplySettings = () => {
    enableLogging();
  };

  const handleApplyInvoiceProcessingSettings = () => {
    enableInvoiceProcessing();
  };

  const handleCancelSettings = () => {
    setShowWarning(false);
    setLoggingLevel(currentConfig?.value || 'INFO');
  };

  const handleCancelInvoiceProcessingSettings = () => {
    setShowInvoiceProcessingWarning(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Control Center</h1>
              <p className="text-orange-100 mt-1">Manage system settings, monitoring, and administrative controls</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">System Control</span>
            </div>
            <button 
              onClick={fetchControlSettings}
              disabled={isLoading}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh Settings"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
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
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <div className="text-green-700">{success}</div>
          </div>
        </div>
      )}

      {/* Invoice Processing Edits Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Enable Edits on Invoices Before Processing</h3>
              <p className="text-gray-600 mt-1">Allow users to edit invoice data before final processing and submission</p>
            </div>
          </div>
          
          {/* Toggle Switch */}
          <button
            onClick={handleToggleInvoiceProcessing}
            disabled={isLoading}
            className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              invoiceProcessingEnabled ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform duration-200 ${
                invoiceProcessingEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2 mb-6">
          <div className={`w-3 h-3 rounded-full ${invoiceProcessingEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <span className={`text-sm font-medium ${invoiceProcessingEnabled ? 'text-green-600' : 'text-gray-500'}`}>
            {invoiceProcessingEnabled ? 'Invoice Edits Enabled' : 'Invoice Edits Disabled'}
          </span>
          {isLoading && (
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          )}
        </div>

        {/* Configuration Details (shown when enabled) */}
        {invoiceProcessingEnabled && currentInvoiceProcessingConfig && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-800">Active Configuration</span>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Status:</strong> Invoice editing is enabled</p>
              <p><strong>Feature:</strong> Users can modify invoice data before processing</p>
              <p><strong>Created By:</strong> {currentInvoiceProcessingConfig.createdBy}</p>
              <p><strong>Last Updated:</strong> {new Date(currentInvoiceProcessingConfig.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Feature Description */}
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h4 className="text-lg font-medium text-gray-800 mb-3">About Invoice Processing Edits</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• <strong>Pre-Processing Edits:</strong> Allow users to modify invoice data before final processing</p>
            <p>• <strong>Data Validation:</strong> Ensure accuracy by enabling manual corrections and adjustments</p>
            <p>• <strong>Quality Control:</strong> Improve processing accuracy through human oversight</p>
            <p>• <strong>Workflow Control:</strong> Manage when invoices can be edited vs. locked for processing</p>
          </div>
        </div>
      </div>

      {/* Invoice Processing Warning Modal */}
      {showInvoiceProcessingWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Enable Invoice Edits</h3>
                <p className="text-sm text-gray-600">Allow editing of invoice data before processing</p>
              </div>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Enabling this feature will allow users to edit invoice data before final processing. 
                    This can improve accuracy but may slow down the processing workflow.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelInvoiceProcessingSettings}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyInvoiceProcessingSettings}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Enabling...' : 'Enable Edits'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Monitoring Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Agent Monitoring and Logging</h3>
              <p className="text-gray-600 mt-1">Enable comprehensive monitoring and logging for AI agents</p>
            </div>
          </div>
          
          {/* Toggle Switch */}
          <button
            onClick={handleToggleAgentMonitoring}
            disabled={isLoading}
            className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              agentMonitoringEnabled ? 'bg-orange-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform duration-200 ${
                agentMonitoringEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2 mb-6">
          <div className={`w-3 h-3 rounded-full ${agentMonitoringEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <span className={`text-sm font-medium ${agentMonitoringEnabled ? 'text-green-600' : 'text-gray-500'}`}>
            {agentMonitoringEnabled ? 'Monitoring Active' : 'Monitoring Disabled'}
          </span>
          {isLoading && (
            <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
          )}
        </div>

        {/* Performance Warning Modal */}
        {showWarning && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Performance Warning</h3>
                  <p className="text-sm text-gray-600">Enabling monitoring may impact system performance</p>
                </div>
              </div>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Important:</strong> Agent monitoring and logging can significantly impact system performance. 
                      This feature should only be enabled for debugging purposes or when detailed monitoring is required.
                    </p>
                  </div>
                </div>
              </div>

              {/* Logging Level Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Logging Level
                </label>
                <div className="relative">
                  <select
                    value={loggingLevel}
                    onChange={(e) => setLoggingLevel(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                    disabled={isLoading}
                  >
                    <option value="DEBUG">DEBUG - Detailed diagnostic information</option>
                    <option value="INFO">INFO - General information messages</option>
                    <option value="WARNING">WARNING - Warning messages only</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Higher levels provide more detail but may impact performance more significantly
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelSettings}
                  disabled={isLoading}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplySettings}
                  disabled={isLoading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>{isLoading ? 'Applying...' : 'Apply Settings'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Details (shown when enabled) */}
        {agentMonitoringEnabled && currentConfig && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">Active Configuration</span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>Logging Level:</strong> {currentConfig.value}</p>
              <p><strong>Status:</strong> Monitoring and logging are active</p>
              <p><strong>Performance Impact:</strong> {currentConfig.value === 'DEBUG' ? 'High' : currentConfig.value === 'INFO' ? 'Medium' : 'Low'}</p>
              <p><strong>Created By:</strong> {currentConfig.createdBy}</p>
              <p><strong>Last Updated:</strong> {new Date(currentConfig.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Feature Description */}
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h4 className="text-lg font-medium text-gray-800 mb-3">About Agent Monitoring</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• <strong>Real-time Monitoring:</strong> Track AI agent performance and behavior in real-time</p>
            <p>• <strong>Detailed Logging:</strong> Capture comprehensive logs for debugging and analysis</p>
            <p>• <strong>Performance Metrics:</strong> Monitor response times, success rates, and error patterns</p>
            <p>• <strong>Security Auditing:</strong> Track agent interactions for security compliance</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlCenter;