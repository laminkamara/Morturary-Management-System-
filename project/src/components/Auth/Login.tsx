import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Building2, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const demoCredentials = {
    admin: {
      email: 'admin@mortuary.com',
      password: 'admin123',
      user: { id: 'admin-1', name: 'System Administrator', email: 'admin@mortuary.com' }
    },
    staff: {
      email: 'staff@mortuary.com',
      password: 'staff123',
      user: { id: 'staff-1', name: 'John Smith', email: 'staff@mortuary.com' }
    },
    pathologist: {
      email: 'pathologist@mortuary.com',
      password: 'pathologist123',
      user: { id: 'pathologist-1', name: 'Dr. Sarah Johnson', email: 'pathologist@mortuary.com' }
    }
  };

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await login(credentials.email, credentials.password);
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-60 h-60 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-10 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          ></div>
        ))}
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-6 text-4xl font-bold text-white">
            Mortuary Management
          </h2>
          <p className="mt-2 text-lg text-blue-200">
            Professional Healthcare System
          </p>
        </div>

        {/* Login Form */}
        <form className="space-y-6" onSubmit={handleCredentialLogin}>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
            {error && (
              <div className="mb-4 p-3 bg-red-50/90 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-blue-300" />
                  </div>
                  <input
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                    required
                    disabled={isLoading}
                    className="block w-full pl-10 pr-3 py-3 border border-white/30 rounded-xl bg-white/10 backdrop-blur-sm text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-blue-300" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                    required
                    disabled={isLoading}
                    className="block w-full pl-10 pr-12 py-3 border border-white/30 rounded-xl bg-white/10 backdrop-blur-sm text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-300 hover:text-white transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-blue-300 group-hover:text-blue-200 transition-colors" />
                </span>
                {isLoading ? 'Signing In...' : 'Sign In to System'}
              </button>
            </div>
          </div>
        </form>

        {/* Demo Credentials Info */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <h4 className="text-lg font-medium text-white mb-4 text-center">Demo Credentials</h4>
          <div className="space-y-4">
            {Object.entries(demoCredentials).map(([role, creds]) => (
              <div key={role} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-semibold text-white capitalize">
                    {role === 'pathologist' ? 'Pathologist' : role}
                  </h5>
                  <span className="text-xs text-blue-300 bg-blue-900/30 px-2 py-1 rounded-full">
                    {role}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-200">Email:</span>
                    <span className="text-white font-mono text-xs">{creds.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">Password:</span>
                    <span className="text-white font-mono text-xs">{creds.password}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-blue-300">
              Copy and paste the credentials above to login
            </p>
          </div>
        </div>

        {/* Database Connection Status */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
          <div className="text-center">
            <p className="text-xs text-blue-300">
              🔗 Connected to Supabase Database
            </p>
            <p className="text-xs text-blue-400 mt-1">
              Real-time data synchronization enabled
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-blue-300">
            Professional Mortuary Management System v2.0
          </p>
          <p className="text-xs text-blue-400 mt-1">
            Secure • Reliable • Compliant
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;