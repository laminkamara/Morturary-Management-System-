import React, { useState, useEffect } from 'react';
import { Refrigerator, Thermometer, MapPin, Settings, AlertTriangle, Wrench, Eye } from 'lucide-react';
import { storageService } from '../../services/database';
import { useRealTimeData } from '../../hooks/useRealTime';

const StorageManagement: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const { data: storageUnits, setData: setStorageUnits, isLoading } = useRealTimeData(
    'storage_units',
    [],
    () => storageService.getAll({ status: filterStatus === 'all' ? undefined : filterStatus })
  );

  const filteredUnits = storageUnits.filter(unit => 
    filterStatus === 'all' || unit.status === filterStatus
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'occupied':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return '✓';
      case 'occupied':
        return '⚫';
      case 'maintenance':
        return '⚠';
      default:
        return '?';
    }
  };

  const handleUnitSettings = (unitId: string) => {
    setSelectedUnit(unitId);
    setShowSettingsModal(true);
  };

  const handleStatusChange = async (unitId: string, newStatus: 'available' | 'occupied' | 'maintenance') => {
    try {
      const updatedUnit = await storageService.updateStatus(unitId, newStatus);
      setStorageUnits(units => 
        units.map(unit => 
          unit.id === unitId ? { ...unit, ...updatedUnit } : unit
        )
      );
      if (newStatus === 'available') {
        alert('Storage unit is now available!');
      } else if (newStatus === 'maintenance') {
        alert('Storage unit is now under maintenance.');
      } else if (newStatus === 'occupied') {
        alert('Storage unit is now marked as occupied.');
      }
    } catch (error: any) {
      if (error.message.includes('occupied')) {
        alert('Cannot make available: unit is currently occupied.');
      } else {
        alert(error.message || 'Failed to update storage unit status');
      }
    }
  };

  const viewUnitDetails = (unitId: string) => {
    const unit = storageUnits.find(u => u.id === unitId);
    const body = unit?.bodies?.[0];
    
    if (unit) {
      alert(`Storage Unit Details:
Unit: ${unit.name}
Type: ${unit.type}
Location: ${unit.location}
Temperature: ${unit.temperature}
Status: ${unit.status}
${body ? `Assigned Body: ${body.full_name} (${body.tag_id})` : 'No body assigned'}`);
    }
  };

  const availableUnits = storageUnits.filter(u => u.status === 'available').length;
  const occupiedUnits = storageUnits.filter(u => u.status === 'occupied').length;
  const maintenanceUnits = storageUnits.filter(u => u.status === 'maintenance').length;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg">Loading storage units...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Storage Management</h1>
          <p className="text-gray-600">Monitor and manage all storage units in the facility</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-white border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm font-medium ${
                viewMode === 'grid' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium ${
                viewMode === 'list' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Units</p>
              <p className="text-2xl font-bold text-gray-900">{storageUnits.length}</p>
              <p className="text-sm text-gray-500">Storage units available</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <Refrigerator className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available</p>
              <p className="text-2xl font-bold text-green-600">{availableUnits}</p>
              <p className="text-sm text-green-600">Units ready for use</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                ✓
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Occupied</p>
              <p className="text-2xl font-bold text-red-600">{occupiedUnits}</p>
              <p className="text-sm text-red-600">Units currently in use</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                ⚫
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Maintenance</p>
              <p className="text-2xl font-bold text-yellow-600">{maintenanceUnits}</p>
              <p className="text-sm text-yellow-600">Units under maintenance</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filter by status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Units</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Occupied</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Maintenance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Units */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Storage Units</h2>
          <p className="text-sm text-gray-600 mb-6">Visual overview of all storage units and their current status</p>
          
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredUnits.map((unit) => {
                const body = unit.bodies?.[0];
                return (
                  <div
                    key={unit.id}
                    className={`p-4 rounded-lg border-2 transition-colors hover:shadow-md ${getStatusColor(unit.status)}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Refrigerator className="w-5 h-5" />
                        <span className="font-semibold text-lg">{unit.name}</span>
                      </div>
                      <span className="text-lg">{getStatusIcon(unit.status)}</span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">Type:</span>
                        <span className="capitalize">{unit.type}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">{unit.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Thermometer className="w-3 h-3" />
                        <span className="text-xs">Temperature: {unit.temperature}</span>
                      </div>
                      
                      {body && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs">
                            <div className="font-medium text-gray-900">{body.full_name}</div>
                            <div className="text-gray-500">Tag: {body.tag_id}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 flex justify-between">
                      <button 
                        onClick={() => viewUnitDetails(unit.id)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleUnitSettings(unit.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type & Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Temperature
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned Body
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUnits.map((unit) => {
                    const body = unit.bodies?.[0];
                    return (
                      <tr key={unit.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Refrigerator className="w-5 h-5 text-gray-400 mr-3" />
                            <span className="text-sm font-medium text-gray-900">{unit.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 capitalize">{unit.type}</div>
                          <div className="text-sm text-gray-500">{unit.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.temperature}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(unit.status)}`}>
                            {unit.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {body ? (
                            <div className="text-sm">
                              <div className="text-gray-900">{body.full_name}</div>
                              <div className="text-gray-500">Tag: {body.tag_id}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => viewUnitDetails(unit.id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleUnitSettings(unit.id)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && selectedUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Storage Unit Settings - {selectedUnit}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Change Status
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      handleStatusChange(selectedUnit, 'available');
                      setShowSettingsModal(false);
                    }}
                    className="w-full text-left px-3 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100"
                  >
                    Mark as Available
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedUnit, 'maintenance');
                      setShowSettingsModal(false);
                    }}
                    className="w-full text-left px-3 py-2 bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100"
                  >
                    Mark for Maintenance
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageManagement;