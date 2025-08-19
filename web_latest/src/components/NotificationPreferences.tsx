import React from 'react';
import { Bell, Settings, Clock, Zap } from 'lucide-react';

const NotificationPreferences = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-500 via-slate-600 to-slate-700 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Notification Preferences</h1>
              <p className="text-slate-200 mt-1">Configure your notification settings and alert preferences</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Smart Alerts</span>
            </div>
            <div className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <Bell className="w-12 h-12 text-slate-500" />
          </div>
          <h2 className="text-3xl font-bold text-slate-700 mb-4">Coming Soon</h2>
          <p className="text-slate-500 text-lg mb-6 max-w-md mx-auto">
            We're working on an advanced notification system that will keep you informed about important invoice processing events.
          </p>
          <div className="flex items-center justify-center space-x-2 text-slate-400">
            <Clock className="w-5 h-5" />
            <span className="text-sm">Expected release: Q2 2025</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;