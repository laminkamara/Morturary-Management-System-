import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Edit, Trash2 } from 'lucide-react';
import { bodiesService } from '../../services/database';
import { useRealTimeData } from '../../hooks/useRealTime';
import { supabase } from '../../lib/supabase';

const BodiesList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBody, setSelectedBody] = useState<any>(null);

  const { data: bodies, setData: setBodies, isLoading } = useRealTimeData(
    'bodies',
    [],
    () => bodiesService.getAll({ search: searchTerm, status: statusFilter === 'all' ? undefined : statusFilter })
  );

  // Filter bodies based on search and status
  const filteredBodies = bodies.filter(body => {
    const matchesSearch = body.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         body.tag_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || body.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registered':
        return 'bg-green-100 text-green-800';
      case 'autopsy_scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'autopsy_completed':
        return 'bg-blue-100 text-blue-800';
      case 'released':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const viewBodyDetails = (bodyId: string) => {
    const body = bodies.find(b => b.id === bodyId);
    if (body) {
      alert(`Body Details:
Name: ${body.full_name}
Tag ID: ${body.tag_id}
Age: ${body.age}
Gender: ${body.gender}
Date of Death: ${new Date(body.date_of_death).toLocaleDateString()}
Storage: ${body.storage_units?.name || 'Not assigned'}
Status: ${body.status}
Next of Kin: ${body.next_of_kin_name} (${body.next_of_kin_relationship})
Phone: ${body.next_of_kin_phone}`);
    }
  };

  const editBody = (bodyId: string) => {
    const body = bodies.find(b => b.id === bodyId);
    if (body) {
      setSelectedBody(body);
      setShowEditModal(true);
    }
  };

  const deleteBody = async (bodyId: string) => {
    const body = bodies.find(b => b.id === bodyId);
    if (!body) return;

    const confirmMessage = `Are you sure you want to delete the body record for "${body.full_name}" (${body.tag_id})?`;
    
    if (confirm(confirmMessage)) {
      try {
        await bodiesService.delete(bodyId);
        setBodies(bodies.filter(b => b.id !== bodyId));
        alert('Body record deleted successfully!');
      } catch (error: any) {
        console.error('Error deleting body:', error);
        
        let errorMessage = 'Failed to delete body record.';
        
        if (error.message) {
          if (error.message.includes('autopsies') || error.message.includes('tasks') || error.message.includes('releases')) {
            // Show detailed information about related records
            await showRelatedRecords(bodyId);
            return;
          } else if (error.message.includes('foreign key')) {
            errorMessage = 'Cannot delete body: It is referenced by other records. Please remove all associated records first.';
          } else if (error.message.includes('permission')) {
            errorMessage = 'You do not have permission to delete this body record.';
          } else {
            errorMessage = `Error: ${error.message}`;
          }
        }
        
        alert(errorMessage);
      }
    }
  };

  const showRelatedRecords = async (bodyId: string) => {
    try {
      const [autopsies, tasks, releases] = await Promise.all([
        supabase.from('autopsies').select('id, scheduled_date').eq('body_id', bodyId),
        supabase.from('tasks').select('id, title').eq('body_id', bodyId),
        supabase.from('body_releases').select('id, requested_date').eq('body_id', bodyId)
      ]);

      let message = 'This body has the following related records that must be deleted first:\n\n';
      let hasRecords = false;

      if (autopsies.data && autopsies.data.length > 0) {
        message += `• ${autopsies.data.length} autopsy record(s)\n`;
        hasRecords = true;
      }

      if (tasks.data && tasks.data.length > 0) {
        message += `• ${tasks.data.length} task record(s)\n`;
        hasRecords = true;
      }

      if (releases.data && releases.data.length > 0) {
        message += `• ${releases.data.length} release record(s)\n`;
        hasRecords = true;
      }

      if (hasRecords) {
        message += '\nPlease delete these records first, then try deleting the body again.';
        alert(message);
      }
    } catch (error) {
      console.error('Error fetching related records:', error);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBody) {
      try {
        const updatedBody = await bodiesService.update(selectedBody.id, {
          full_name: selectedBody.full_name,
          age: selectedBody.age,
          gender: selectedBody.gender,
          status: selectedBody.status
        });
        
        setBodies(bodies.map(b => b.id === selectedBody.id ? { ...b, ...updatedBody } : b));
        setShowEditModal(false);
        setSelectedBody(null);
        alert('Body record updated successfully!');
      } catch (error: any) {
        console.error('Error updating body:', error);
        
        let errorMessage = 'Failed to update body record.';
        
        if (error.message) {
          if (error.message.includes('foreign key')) {
            errorMessage = 'Cannot update body: Invalid reference in the data.';
          } else if (error.message.includes('permission')) {
            errorMessage = 'You do not have permission to update this body record.';
          } else if (error.message.includes('not null')) {
            errorMessage = 'Please fill in all required fields.';
          } else {
            errorMessage = `Error: ${error.message}`;
          }
        }
        
        alert(errorMessage);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg">Loading bodies...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bodies Management</h1>
          <p className="text-gray-600">Manage all registered bodies in the facility</p>
        </div>
        <Link
          to="/bodies/register"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Body</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name or tag ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="registered">Registered</option>
                <option value="autopsy_scheduled">Autopsy Scheduled</option>
                <option value="autopsy_completed">Autopsy Completed</option>
                <option value="released">Released</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bodies Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Body Information
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Personal Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Storage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBodies.map((body) => (
                <tr key={body.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{body.full_name}</div>
                      <div className="text-sm text-gray-500">Tag: {body.tag_id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Age: {body.age} | {body.gender}
                    </div>
                    <div className="text-sm text-gray-500">
                      Died: {new Date(body.date_of_death).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-medium">{body.storage_units?.name || 'Not assigned'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(body.status)}`}>
                      {body.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(body.intake_time).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => viewBodyDetails(body.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => editBody(body.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit Body"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteBody(body.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Body"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredBodies.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No bodies found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <div className="text-2xl font-bold text-blue-600">{bodies.length}</div>
          <div className="text-sm text-gray-500">Total Bodies</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <div className="text-2xl font-bold text-green-600">
            {bodies.filter(b => b.status === 'registered').length}
          </div>
          <div className="text-sm text-gray-500">Registered</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {bodies.filter(b => b.status === 'autopsy_scheduled').length}
          </div>
          <div className="text-sm text-gray-500">Autopsy Scheduled</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <div className="text-2xl font-bold text-gray-600">
            {bodies.filter(b => b.status === 'released').length}
          </div>
          <div className="text-sm text-gray-500">Released</div>
        </div>
      </div>

      {/* Edit Body Modal */}
      {showEditModal && selectedBody && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Body Record</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={selectedBody.full_name}
                    onChange={(e) => setSelectedBody({...selectedBody, full_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={selectedBody.age}
                    onChange={(e) => setSelectedBody({...selectedBody, age: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={selectedBody.gender}
                    onChange={(e) => setSelectedBody({...selectedBody, gender: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={selectedBody.status}
                    onChange={(e) => setSelectedBody({...selectedBody, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="registered">Registered</option>
                    <option value="autopsy_scheduled">Autopsy Scheduled</option>
                    <option value="autopsy_completed">Autopsy Completed</option>
                    <option value="released">Released</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Body
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BodiesList;