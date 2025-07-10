import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  FileText, 
  CheckSquare, 
  Refrigerator, 
  Clock,
  AlertTriangle,
  User
} from 'lucide-react';
import { bodiesService, storageService, tasksService, notificationsService } from '../../services/database';
import { useAuth } from '../../context/AuthContext';

const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingTasks: 0,
    inProgressTasks: 0,
    occupiedStorage: 0,
    totalStorage: 0,
    unreadNotifications: 0
  });
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [recentBodies, setRecentBodies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Load all data in parallel
        const [
          tasks,
          bodies,
          storage,
          notifications
        ] = await Promise.all([
          tasksService.getAll({ assigned_to: user.id }),
          bodiesService.getAll(),
          storageService.getAll(),
          notificationsService.getUnreadCount(user.id)
        ]);

        // Calculate stats
        const pendingTasks = tasks.filter(t => t.status === 'pending').length;
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
        const occupiedStorage = storage.filter(s => s.status === 'occupied').length;

        setStats({
          pendingTasks,
          inProgressTasks,
          occupiedStorage,
          totalStorage: storage.length,
          unreadNotifications: notifications
        });

        // Set task and body data
        setMyTasks(tasks.slice(0, 5));
        setRecentBodies(bodies.slice(0, 2));

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const handleRequestRelease = () => {
    navigate('/releases');
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here are your assigned tasks and notifications.</p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/bodies/register"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Body</span>
          </Link>
          <button
            onClick={handleRequestRelease}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>Request Release</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingTasks}</p>
              <p className="text-sm text-orange-600 flex items-center mt-1">
                <Clock className="w-3 h-3 mr-1" />
                Tasks awaiting completion
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <CheckSquare className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgressTasks}</p>
              <p className="text-sm text-blue-600 flex items-center mt-1">
                <Clock className="w-3 h-3 mr-1" />
                Tasks currently being worked on
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <CheckSquare className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Storage Status</p>
              <p className="text-2xl font-bold text-gray-900">{stats.occupiedStorage}/{stats.totalStorage}</p>
              <p className="text-sm text-red-600 flex items-center mt-1">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {Math.round((stats.occupiedStorage/stats.totalStorage) * 100)}% occupied
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
                New alerts and updates
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <User className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
            <Link to="/tasks" className="text-blue-600 hover:text-blue-700 text-sm">
              View All Tasks
            </Link>
          </div>
          <div className="space-y-4">
            {myTasks.map((task) => (
              <div key={task.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`p-2 rounded-lg ${
                  task.priority === 'high' ? 'bg-red-100' :
                  task.priority === 'medium' ? 'bg-yellow-100' :
                  'bg-green-100'
                }`}>
                  <CheckSquare className={`w-4 h-4 ${
                    task.priority === 'high' ? 'text-red-600' :
                    task.priority === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{task.title}</p>
                  <p className="text-sm text-gray-500">{task.description}</p>
                  <p className="text-xs text-gray-400">
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    task.priority === 'high' ? 'bg-red-100 text-red-800' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
            {myTasks.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No tasks assigned
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
                <CheckSquare className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">New Task Assigned</p>
                <p className="text-sm text-gray-600">You have been assigned an embalming task for Robert Williams</p>
                <p className="text-xs text-gray-400 mt-1">Today</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
              <div className="p-1 bg-yellow-100 rounded-full">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Storage Alert</p>
                <p className="text-sm text-gray-600">Storage capacity is reaching 75%. Consider scheduling releases.</p>
                <p className="text-xs text-gray-400 mt-1">Yesterday</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recently Registered Bodies */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recently Registered Bodies</h2>
          <Link to="/bodies" className="text-blue-600 hover:text-blue-700 text-sm">
            View All Bodies
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name & Tag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Storage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Registered
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentBodies.map((body) => (
                <tr key={body.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{body.full_name}</div>
                      <div className="text-sm text-gray-500">Tag: {body.tag_id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {body.storage_units?.name || 'Not assigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      body.status === 'registered' ? 'bg-green-100 text-green-800' :
                      body.status === 'autopsy_scheduled' ? 'bg-yellow-100 text-yellow-800' :
                      body.status === 'autopsy_completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {body.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(body.intake_time).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recentBodies.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No bodies registered yet
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;