import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, FileText, Calendar, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { releasesService, bodiesService, storageService } from '../../services/database';
import { useAuth } from '../../context/AuthContext';
import { useRealTimeData } from '../../hooks/useRealTime';
import NotificationToast from '../Layout/NotificationToast';

const ReleaseManagement: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [availableBodies, setAvailableBodies] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({ show: false, message: '', type: 'info' });
  
  const [newRelease, setNewRelease] = useState({
    body_id: '',
    receiver_name: '',
    receiver_id: '',
    relationship: '',
    notes: ''
  });

  const { data: releases, setData: setReleases, isLoading } = useRealTimeData(
    'body_releases',
    [],
    () => releasesService.getAll()
  );

  useEffect(() => {
    const loadBodies = async () => {
      try {
        const bodiesData = await bodiesService.getAll();
        setAvailableBodies(bodiesData.filter(body => 
          body.status === 'autopsy_completed' || body.status === 'registered'
        ));
      } catch (error) {
        console.error('Error loading bodies:', error);
        showToast('Failed to load available bodies', 'error');
      }
    };

    loadBodies();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ show: true, message, type });
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!newRelease.body_id) {
      newErrors.body_id = 'Please select a body';
    }
    if (!newRelease.receiver_name.trim()) {
      newErrors.receiver_name = 'Receiver name is required';
    }
    if (!newRelease.receiver_id.trim()) {
      newErrors.receiver_id = 'Receiver ID is required';
    }
    if (!newRelease.relationship.trim()) {
      newErrors.relationship = 'Relationship is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const filteredReleases = releases.filter(release => {
    const body = release.bodies;
    const matchesSearch = body?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         release.receiver_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || release.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRequestRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      showToast('You must be logged in to request a release', 'error');
      return;
    }

    if (!validateForm()) {
      showToast('Please fix the form errors', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const releaseData = {
        body_id: newRelease.body_id,
        receiver_name: newRelease.receiver_name,
        receiver_id: newRelease.receiver_id,
        relationship: newRelease.relationship,
        requested_by: user.id,
        requested_date: new Date().toISOString(),
        notes: newRelease.notes,
        documents: ['release-form.pdf', 'id-copy.pdf']
      };

      const createdRelease = await releasesService.create(releaseData);
      setReleases([createdRelease, ...releases]);
      setShowRequestModal(false);
      setNewRelease({
        body_id: '',
        receiver_name: '',
        receiver_id: '',
        relationship: '',
        notes: ''
      });
      setErrors({});
      showToast('Release request submitted successfully!', 'success');
    } catch (error: any) {
      console.error('Error requesting release:', error);
      const errorMessage = error?.message || 'Failed to submit release request';
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproval = async (releaseId: string, approved: boolean, notes?: string) => {
    if (!user) return;

    try {
      const status = approved ? 'approved' : 'rejected';
      const updatedRelease = await releasesService.update(releaseId, { 
        status, 
        approved_by: user.id, 
        approval_notes: notes,
        approved_date: new Date().toISOString()
      });
      
      setReleases(releases.map(release => 
        release.id === releaseId ? { ...release, ...updatedRelease } : release
      ));

      // If approved, automatically free up the storage unit
      if (approved) {
        try {
          const release = releases.find(r => r.id === releaseId);
          if (release?.bodies?.storage_id) {
            // Update the body status to released
            await bodiesService.update(release.body_id, { 
              status: 'released',
              storage_id: null 
            });
            
            // Free up the storage unit
            await storageService.update(release.bodies.storage_id, {
              status: 'available',
              assigned_body_id: null
            });
            
            showToast(`Release approved and storage unit freed successfully!`, 'success');
          } else {
            showToast(`Release ${approved ? 'approved' : 'rejected'} successfully!`, 'success');
          }
        } catch (storageError) {
          console.error('Error freeing storage unit:', storageError);
          showToast('Release approved but failed to free storage unit', 'warning');
        }
      } else {
        showToast(`Release ${approved ? 'approved' : 'rejected'} successfully!`, 'success');
      }
    } catch (error: any) {
      console.error('Error updating release status:', error);
      const errorMessage = error?.message || 'Failed to update release status';
      showToast(errorMessage, 'error');
    }
  };

  const viewReleaseDetails = (releaseId: string) => {
    const release = releases.find(r => r.id === releaseId);
    const body = release?.bodies;
    
    if (release && body) {
      const details = `Release Details:
Body: ${body.full_name} (${body.tag_id})
Receiver: ${release.receiver_name}
ID: ${release.receiver_id}
Relationship: ${release.relationship}
Status: ${release.status}
Requested: ${new Date(release.requested_date).toLocaleDateString()}
Requested By: ${release.requested_by_user?.name || 'Unknown'}
${release.notes ? `Notes: ${release.notes}` : ''}`;
      
      showToast(details, 'info');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg">Loading releases...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Body Release Management</h1>
          <p className="text-gray-600">Manage body release requests and approvals</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'staff') && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Request Release</span>
          </button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{filteredReleases.length}</p>
            </div>
            <FileText className="w-8 h-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {filteredReleases.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-blue-600">
                {filteredReleases.filter(r => r.status === 'approved').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredReleases.filter(r => r.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by body name or receiver..."
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
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Releases Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Body Information
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receiver Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReleases.map((release) => {
                const body = release.bodies;
                return (
                  <tr key={release.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{body?.full_name}</div>
                        <div className="text-sm text-gray-500">Tag: {body?.tag_id}</div>
                        <div className="text-sm text-gray-500">Age: {body?.age} | {body?.gender}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{release.receiver_name}</div>
                        <div className="text-sm text-gray-500">ID: {release.receiver_id}</div>
                        <div className="text-sm text-gray-500">Relationship: {release.relationship}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {new Date(release.requested_date).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(release.status)}`}>
                        {release.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {Array.isArray(release.documents) ? release.documents.length : 0} document(s)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => viewReleaseDetails(release.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {user?.role === 'admin' && release.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleApproval(release.id, true)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleApproval(release.id, false)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredReleases.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No release requests found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          </div>
        )}
      </div>

      {/* Request Release Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg">
              <h2 className="text-lg font-semibold text-gray-900">Request Body Release</h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleRequestRelease} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Body <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRelease.body_id}
                    onChange={(e) => {
                      setNewRelease({...newRelease, body_id: e.target.value});
                      if (errors.body_id) setErrors({...errors, body_id: ''});
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.body_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a body</option>
                    {availableBodies.map(body => (
                      <option key={body.id} value={body.id}>
                        {body.full_name} ({body.tag_id})
                      </option>
                    ))}
                  </select>
                  {errors.body_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.body_id}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receiver Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRelease.receiver_name}
                    onChange={(e) => {
                      setNewRelease({...newRelease, receiver_name: e.target.value});
                      if (errors.receiver_name) setErrors({...errors, receiver_name: ''});
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.receiver_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.receiver_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.receiver_name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receiver ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRelease.receiver_id}
                    onChange={(e) => {
                      setNewRelease({...newRelease, receiver_id: e.target.value});
                      if (errors.receiver_id) setErrors({...errors, receiver_id: ''});
                    }}
                    placeholder="Driver's License or ID Number"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.receiver_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.receiver_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.receiver_id}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRelease.relationship}
                    onChange={(e) => {
                      setNewRelease({...newRelease, relationship: e.target.value});
                      if (errors.relationship) setErrors({...errors, relationship: ''});
                    }}
                    placeholder="e.g., Spouse, Child, Parent"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.relationship ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.relationship && (
                    <p className="mt-1 text-sm text-red-600">{errors.relationship}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={newRelease.notes}
                    onChange={(e) => setNewRelease({...newRelease, notes: e.target.value})}
                    rows={3}
                    placeholder="Additional notes or special instructions..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-lg">
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleRequestRelease}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Request</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <NotificationToast
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
};

export default ReleaseManagement;