import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Users,
  Archive,
  Refrigerator,
  Microscope,
  CheckSquare,
  FileText,
  BarChart3,
  Bell,
  UserCheck,
  Settings
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const getNavItems = () => {
    const commonItems = [
      { path: '/dashboard', icon: Home, label: 'Dashboard' }
    ];

    switch (user.role) {
      case 'admin':
        return [
          ...commonItems,
          { path: '/users', icon: Users, label: 'Users' },
          { path: '/bodies', icon: Archive, label: 'Bodies' },
          { path: '/storage', icon: Refrigerator, label: 'Storage' },
          { path: '/autopsies', icon: Microscope, label: 'Autopsies' },
          { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
          { path: '/releases', icon: UserCheck, label: 'Releases' },
          { path: '/reports', icon: BarChart3, label: 'Reports' },
          { path: '/notifications', icon: Bell, label: 'Notifications' },
          { path: '/settings', icon: Settings, label: 'Settings' }
        ];

      case 'staff':
        return [
          ...commonItems,
          { path: '/bodies', icon: Archive, label: 'Bodies' },
          { path: '/storage', icon: Refrigerator, label: 'Storage' },
          { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
          { path: '/releases', icon: UserCheck, label: 'Releases' },
          { path: '/notifications', icon: Bell, label: 'Notifications' },
          { path: '/settings', icon: Settings, label: 'Settings' }
        ];

      case 'pathologist':
        return [
          ...commonItems,
          { path: '/autopsies', icon: Microscope, label: 'Autopsies' },
          { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
          { path: '/notifications', icon: Bell, label: 'Notifications' },
          { path: '/settings', icon: Settings, label: 'Settings' }
        ];

      default:
        return commonItems;
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-gray-50 min-h-screen border-r border-gray-200">
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;