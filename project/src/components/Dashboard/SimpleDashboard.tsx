import React from 'react';
import { useAuth } from '../../context/AuthContext';

const SimpleDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Welcome, {user?.name}!
      </h1>
      <p className="text-gray-600 mb-4">
        You are logged in as: <span className="font-semibold">{user?.role}</span>
      </p>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Content</h2>
        <p className="text-gray-600">
          This is a simple dashboard to test if the routing is working correctly.
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-800">
            ✅ Login successful! The dashboard is loading correctly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimpleDashboard; 