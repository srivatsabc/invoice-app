import React, { useState } from 'react';
import { Mountain as Mountains, User, Shield, BarChart3 } from 'lucide-react';
import { LOGIN_CREDENTIALS } from '../constants/api';

interface LoginProps {
  onLogin: (username: string, role: 'business_user' | 'admin' | 'itsm_admin') => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'business_user' | 'admin' | 'itsm_admin'>('admin');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate a brief loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    // Validate password against the constant
    if (password !== LOGIN_CREDENTIALS.VALID_PASSWORD) {
      setError('Invalid password. Please check your credentials and try again.');
      setIsLoading(false);
      return;
    }

    // If password is correct, proceed with login
    onLogin(username, role);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center">
          <Mountains size={48} className="text-[#1e88e5]" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Invoice Processing System
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Secure access to your invoice management platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 text-red-500">⚠️</div>
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 placeholder-gray-400 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="block w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 placeholder-gray-400 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="relative">
                  <input
                    type="radio"
                    value="business_user"
                    checked={role === 'business_user'}
                    onChange={(e) => setRole(e.target.value as 'business_user' | 'admin' | 'itsm_admin')}
                    disabled={isLoading}
                    className="sr-only"
                  />
                  <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    role === 'business_user'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <User className={`w-5 h-5 ${
                        role === 'business_user' ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <span className={`font-medium ${
                        role === 'business_user' ? 'text-blue-900' : 'text-gray-700'
                      }`}>
                        Business User
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Access to search, analyze, and manage invoices
                    </p>
                  </div>
                </label>

                <label className="relative">
                  <input
                    type="radio"
                    value="admin"
                    checked={role === 'admin'}
                    onChange={(e) => setRole(e.target.value as 'business_user' | 'admin' | 'itsm_admin')}
                    disabled={isLoading}
                    className="sr-only"
                  />
                  <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    role === 'admin'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-200'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className={`w-5 h-5 ${
                        role === 'admin' ? 'text-orange-600' : 'text-gray-400'
                      }`} />
                      <span className={`font-medium ${
                        role === 'admin' ? 'text-orange-900' : 'text-gray-700'
                      }`}>
                        Admin
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Full system access and administrative controls
                    </p>
                  </div>
                </label>
              </div>
              
              <div className="mt-3">
                <label className="relative">
                  <input
                    type="radio"
                    value="itsm_admin"
                    checked={role === 'itsm_admin'}
                    onChange={(e) => setRole(e.target.value as 'business_user' | 'admin' | 'itsm_admin')}
                    disabled={isLoading}
                    className="sr-only"
                  />
                  <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    role === 'itsm_admin'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-red-200'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <BarChart3 className={`w-5 h-5 ${
                        role === 'itsm_admin' ? 'text-red-600' : 'text-gray-400'
                      }`} />
                      <span className={`font-medium ${
                        role === 'itsm_admin' ? 'text-red-900' : 'text-gray-700'
                      }`}>
                        ITSM Admin
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Access to incident analysis and ITSM tools
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-md border border-transparent bg-[#1e88e5] py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Secure Login</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;