import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  Archive, 
  Refrigerator, 
  Microscope, 
  CheckSquare,
  Plus,
  TrendingUp,
  AlertTriangle,
  Clock,
  Upload,
  CheckCircle,
  FileText
} from 'lucide-react';
import { bodiesService, storageService, autopsiesService, tasksService, notificationsService } from '../../services/database';
import { useAuth } from '../../context/AuthContext';

const PathologistDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingAutopsies: 0,
    inProgressAutopsies: 0,
    completedAutopsies: 0,
    unreadNotifications: 0
  });
  const [myAutopsies, setMyAutopsies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Load all data in parallel
        const [
          allAutopsies,
          notifications
        ] = await Promise.all([
          autopsiesService.getAll(),
          notificationsService.getUnreadCount(user.id)
        ]);

        // Filter autopsies assigned to this pathologist
        const autopsies = allAutopsies.filter(a => a.pathologist_id === user.id);

        // Calculate stats
        const pendingAutopsies = autopsies.filter(a => a.status === 'pending').length;
        const inProgressAutopsies = autopsies.filter(a => a.status === 'in_progress').length;
        const completedAutopsies = autopsies.filter(a => a.status === 'completed').length;

        setStats({
          pendingAutopsies,
          inProgressAutopsies,
          completedAutopsies,
          unreadNotifications: notifications
        });

        // Set autopsy data
        setMyAutopsies(autopsies);

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pathologist Dashboard</h1>
          <p className="text-gray-600">Welcome back, Dr. Johnson! Here are your assigned autopsies.</p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/autopsies"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Manage Autopsies</span>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Autopsies</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingAutopsies}</p>
              <p className="text-sm text-orange-600 flex items-center mt-1">
                <Clock className="w-3 h-3 mr-1" />
                Awaiting examination
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Microscope className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgressAutopsies}</p>
              <p className="text-sm text-blue-600 flex items-center mt-1">
                <Clock className="w-3 h-3 mr-1" />
                Currently examining
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedAutopsies}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <CheckCircle className="w-3 h-3 mr-1" />
                Reports submitted
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unread Notifications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unreadNotifications}</p>
              <p className="text-sm text-purple-600 flex items-center mt-1">
                <AlertTriangle className="w-3 h-3 mr-1" />
                New alerts
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Autopsies */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Assigned Autopsies</h2>
            <Link to="/autopsies" className="text-blue-600 hover:text-blue-700 text-sm">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {myAutopsies.map((autopsy) => {
              const body = autopsy.bodies;
              return (
                <div key={autopsy.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{body?.full_name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      autopsy.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      autopsy.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {autopsy.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Tag: {body?.tag_id}</p>
                    <p>Scheduled: {new Date(autopsy.scheduled_date).toLocaleDateString()}</p>
                    <p>Assigned by: {autopsy.users?.name || 'System Administrator'}</p>
                  </div>
                  {autopsy.status === 'completed' && autopsy.completed_date && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-sm text-green-600">
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                        Report completed on {new Date(autopsy.completed_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
            {myAutopsies.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No autopsies assigned
              </div>
            )}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Notifications</h2>
            <Link to="/notifications" className="text-blue-600 hover:text-blue-700 text-sm">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div className="p-1 bg-blue-100 rounded-full">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Autopsy Scheduled</p>
                <p className="text-sm text-gray-600">
                  Autopsy scheduled for Robert Williams on Jan 20, 2024
                </p>
                <p className="text-xs text-gray-400 mt-1">Today</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
              <div className="p-1 bg-green-100 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Report Submitted</p>
                <p className="text-sm text-gray-600">
                  Autopsy report for David Miller has been successfully submitted
                </p>
                <p className="text-xs text-gray-400 mt-1">Yesterday</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar of Scheduled Autopsies */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Schedule</h2>
          <Link to="/autopsies" className="text-blue-600 hover:text-blue-700 text-sm">
            View Calendar
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myAutopsies.filter(a => a.status === 'pending').map((autopsy) => {
            const body = autopsy.bodies;
            return (
              <div key={autopsy.id} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">
                      {new Date(autopsy.scheduled_date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {new Date(autopsy.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">{body?.full_name}</h3>
                <p className="text-sm text-gray-600">Tag: {body?.tag_id}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Age: {body?.age} | {body?.gender}
                  </span>
                  <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
          {myAutopsies.filter(a => a.status === 'pending').length === 0 && (
            <div className="col-span-full text-center py-4 text-gray-500">
              No pending autopsies scheduled
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PathologistDashboard;