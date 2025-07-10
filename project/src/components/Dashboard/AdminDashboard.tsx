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
  Clock
} from 'lucide-react';
import { bodiesService, storageService, autopsiesService, tasksService, notificationsService } from '../../services/database';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../Layout/LoadingSpinner';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalBodies: 0,
    pendingAutopsies: 0,
    occupiedStorage: 0,
    totalStorage: 0,
    pendingTasks: 0,
    unreadNotifications: 0
  });
  const [recentBodies, setRecentBodies] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load all data in parallel
        const [
          bodies,
          storage,
          autopsies,
          tasks,
          notifications
        ] = await Promise.all([
          bodiesService.getAll(),
          storageService.getAll(),
          autopsiesService.getAll(),
          tasksService.getAll(),
          user ? notificationsService.getUnreadCount(user.id) : Promise.resolve(0)
        ]);

        // Calculate stats
        setStats({
          totalBodies: bodies.length,
          pendingAutopsies: autopsies.filter(a => a.status === 'pending').length,
          occupiedStorage: storage.filter(s => s.status === 'occupied').length,
          totalStorage: storage.length,
          pendingTasks: tasks.filter(t => t.status === 'pending').length,
          unreadNotifications: notifications
        });

        // Set recent data
        setRecentBodies(bodies.slice(0, 3));
        setUpcomingTasks(tasks.filter(t => t.status === 'pending').slice(0, 3));

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  if (isLoading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening in your facility.</p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/bodies/register"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Register Body</span>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bodies</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBodies}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                Active records
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Archive className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Autopsies</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingAutopsies}</p>
              <p className="text-sm text-orange-600 flex items-center mt-1">
                <Clock className="w-3 h-3 mr-1" />
                {stats.pendingAutopsies} awaiting
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
              <p className="text-sm font-medium text-gray-600">Storage Occupied</p>
              <p className="text-2xl font-bold text-gray-900">{stats.occupiedStorage}/{stats.totalStorage}</p>
              <p className="text-sm text-red-600 flex items-center mt-1">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {stats.totalStorage > 0 ? Math.round((stats.occupiedStorage/stats.totalStorage) * 100) : 0}% capacity
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <Refrigerator className="w-6 h-6 text-red-600" />
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
                Requires attention
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Registered Bodies */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recently Registered Bodies</h2>
            <Link to="/bodies" className="text-blue-600 hover:text-blue-700 text-sm">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {recentBodies.map((body) => (
              <div key={body.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{body.full_name}</p>
                  <p className="text-sm text-gray-500">Tag: {body.tag_id}</p>
                  <p className="text-sm text-gray-500">Storage: {body.storage_units?.name || 'Not assigned'}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    body.status === 'registered' ? 'bg-green-100 text-green-800' :
                    body.status === 'autopsy_scheduled' ? 'bg-yellow-100 text-yellow-800' :
                    body.status === 'autopsy_completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {body.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
            {recentBodies.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Archive className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2">No bodies registered yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h2>
            <Link to="/tasks" className="text-blue-600 hover:text-blue-700 text-sm">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{task.title}</p>
                  <p className="text-sm text-gray-500">{task.description}</p>
                  <p className="text-sm text-gray-500">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    task.priority === 'high' ? 'bg-red-100 text-red-800' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
            {upcomingTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckSquare className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2">No pending tasks</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/bodies/register"
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Archive className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-700">Register Body</span>
          </Link>
          <Link
            to="/autopsies"
            className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <Microscope className="w-8 h-8 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-orange-700">Manage Autopsies</span>
          </Link>
          <Link
            to="/storage"
            className="flex flex-col items-center p-4 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
          >
            <Refrigerator className="w-8 h-8 text-teal-600 mb-2" />
            <span className="text-sm font-medium text-teal-700">Manage Storage</span>
          </Link>
          <Link
            to="/reports"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Calendar className="w-8 h-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-700">View Reports</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;