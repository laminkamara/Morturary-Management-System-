import React, { useState, useEffect } from 'react';
import { Calendar, Clock, FileText, Upload, User, Search, Filter, Plus, Eye, X, Edit, Trash2 } from 'lucide-react';
import { autopsiesService, bodiesService, usersService } from '../../services/database';
import { useAuth } from '../../context/AuthContext';
import { useRealTimeData } from '../../hooks/useRealTime';
import { supabase } from '../../lib/supabase';
import NotificationToast from '../Layout/NotificationToast';

const AutopsyManagement: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAutopsy, setSelectedAutopsy] = useState<string | null>(null);
  const [availableBodies, setAvailableBodies] = useState<any[]>([]);
  const [pathologists, setPathologists] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    body_id: '',
    pathologist_id: '',
    scheduled_date: '',
    scheduled_time: '',
    notes: ''
  });
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    isVisible: boolean;
  } | null>(null);
  const [newAutopsy, setNewAutopsy] = useState({
    body_id: '',
    pathologist_id: '',
    scheduled_date: '',
    scheduled_time: '',
    notes: ''
  });
  const [reportData, setReportData] = useState({
    cause_of_death: '',
    notes: '',
    report_file: null as File | null
  });

  const { data: autopsies, setData: setAutopsies, isLoading } = useRealTimeData(
    'autopsies',
    [],
    () => autopsiesService.getAll().then(data =>
      data.filter(a =>
        (user?.role !== 'pathologist' || a.pathologist_id === user.id) &&
        (statusFilter === 'all' || a.status === statusFilter)
      )
    )
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bodiesData, usersData] = await Promise.all([
          bodiesService.getAll(),
          usersService.getAll()
        ]);
        setAvailableBodies(bodiesData.filter(body => 
          body.status === 'registered' || body.status === 'autopsy_scheduled'
        ));
        setPathologists(usersData.filter(user => user.role === 'pathologist'));
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ message, type, isVisible: true });
  };

  const hideNotification = () => {
    setNotification(null);
  };

  const checkAndCreateStorageBucket = async () => {
    try {
      // Try to list files in the bucket to check if it exists
      const { error } = await supabase.storage
        .from('autopsy-reports')
        .list('', { limit: 1 });
      
      if (error && error.message.includes('not found')) {
        console.log('Storage bucket does not exist, creating...');
        // Note: In a real app, you'd need admin privileges to create buckets
        // For now, we'll just log this and continue
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking storage bucket:', error);
      return false;
    }
  };

  const handleFileUpload = async (file: File) => {
    const bucketExists = await checkAndCreateStorageBucket();
    
    if (!bucketExists) {
      showNotification('Storage bucket not available. Report will be submitted without file attachment.', 'warning');
      return null;
    }

    try {
      const { data, error } = await supabase.storage
        .from('autopsy-reports')
        .upload(
          `reports/${Date.now()}_${file.name}`,
          file,
          { 
            cacheControl: '3600', 
            upsert: false 
          }
        );

      if (error) {
        throw error;
      }

      return data.path;
    } catch (error: any) {
      console.error('File upload error:', error);
      throw error;
    }
  };

  const filteredAutopsies = autopsies.filter(autopsy => {
    const body = autopsy.bodies;
    const matchesSearch = body?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         body?.tag_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || autopsy.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleScheduleAutopsy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert('You must be logged in to schedule an autopsy');
      return;
    }

    // Validate required fields
    if (!newAutopsy.body_id || !newAutopsy.pathologist_id || !newAutopsy.scheduled_date || !newAutopsy.scheduled_time) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Generate a unique ID for the autopsy
      const autopsyId = `autopsy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const autopsyData = {
        id: autopsyId,
        body_id: newAutopsy.body_id,
        pathologist_id: newAutopsy.pathologist_id,
        scheduled_date: `${newAutopsy.scheduled_date}T${newAutopsy.scheduled_time}:00Z`,
        notes: newAutopsy.notes || '',
        assigned_by: user.id,
        status: 'pending'
      };

      console.log('Creating autopsy with data:', autopsyData);

      const createdAutopsy = await autopsiesService.create(autopsyData);
      console.log('Autopsy created successfully:', createdAutopsy);
      
      // Update the bodies status to autopsy_scheduled
      await bodiesService.update(newAutopsy.body_id, { status: 'autopsy_scheduled' });
      console.log('Body status updated successfully');
      
      setAutopsies([createdAutopsy, ...autopsies]);
      setShowScheduleModal(false);
      setNewAutopsy({ body_id: '', pathologist_id: '', scheduled_date: '', scheduled_time: '', notes: '' });
      showNotification('Autopsy scheduled successfully!', 'success');
      
      // Auto-refresh the available bodies list
      const updatedBodies = await bodiesService.getAll();
      setAvailableBodies(updatedBodies.filter(body => 
        body.status === 'registered' || body.status === 'autopsy_scheduled'
      ));
      
    } catch (error: any) {
      console.error('Error scheduling autopsy:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to schedule autopsy. Please check your input and try again.';
      
      if (error.message) {
        if (error.message.includes('foreign key')) {
          errorMessage = 'Invalid body or pathologist selected. Please check your selections.';
        } else if (error.message.includes('duplicate')) {
          errorMessage = 'An autopsy for this body already exists.';
        } else if (error.message.includes('not null')) {
          errorMessage = 'Please fill in all required fields.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAutopsy) {
      showNotification('No autopsy selected. Please select an autopsy first.', 'error');
      return;
    }

    // Validate required fields
    if (!reportData.cause_of_death.trim()) {
      showNotification('Cause of death is required.', 'error');
      return;
    }

    // Validate file if provided
    if (reportData.report_file) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (reportData.report_file.size > maxSize) {
        showNotification('File size must be less than 10MB.', 'error');
        return;
      }
      
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(reportData.report_file.type)) {
        showNotification('Only PDF and Word documents are allowed.', 'error');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let filePath = null;

      // 1. Upload file to Supabase Storage if a file is selected
      if (reportData.report_file) {
        console.log('Uploading file:', reportData.report_file.name);
        
        try {
          filePath = await handleFileUpload(reportData.report_file);
          console.log('File uploaded successfully:', filePath);
        } catch (uploadError: any) {
          console.error('File upload failed:', uploadError);
          showNotification('File upload failed, but report will be submitted without file attachment.', 'warning');
        }
      }

      // 2. Prepare the update data
      const updateData = {
        status: 'completed',
        cause_of_death: reportData.cause_of_death.trim(),
        notes: reportData.notes.trim() || null,
        report_file: filePath,
        completed_date: new Date().toISOString()
      };

      console.log('Updating autopsy with data:', updateData);

      // 3. Update the autopsy in the database
      const updatedAutopsy = await autopsiesService.update(selectedAutopsy, updateData);
      console.log('Autopsy updated successfully:', updatedAutopsy);

      // 4. Update the local state
      setAutopsies(prev => prev.map(autopsy =>
        autopsy.id === selectedAutopsy ? { ...autopsy, ...updatedAutopsy } : autopsy
      ));

      // 5. Reset form and close modal
      setShowReportModal(false);
      setReportData({ cause_of_death: '', notes: '', report_file: null });
      setSelectedAutopsy(null);
      
      // 6. Show success message
      showNotification('Autopsy report submitted successfully! Status updated to completed.', 'success');
      
    } catch (error: any) {
      console.error('Error submitting report:', error);
      
      let errorMessage = 'Failed to submit report. Please try again.';
      
      if (error.message) {
        if (error.message.includes('foreign key')) {
          errorMessage = 'Invalid autopsy selected. Please try again.';
        } else if (error.message.includes('not null')) {
          errorMessage = 'Please fill in all required fields.';
        } else if (error.message.includes('storage')) {
          errorMessage = 'File upload failed. Please try again.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'You do not have permission to update this autopsy.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewAutopsyDetails = (autopsyId: string) => {
    const autopsy = autopsies.find(a => a.id === autopsyId);
    const body = autopsy?.bodies;
    
    if (autopsy && body) {
      alert(`Autopsy Details:
Body: ${body.full_name} (${body.tag_id})
Pathologist: ${autopsy.pathologist?.name || 'Not assigned'}
Scheduled: ${new Date(autopsy.scheduled_date).toLocaleString()}
Status: ${autopsy.status}
${autopsy.cause_of_death ? `Cause of Death: ${autopsy.cause_of_death}` : ''}
${autopsy.notes ? `Notes: ${autopsy.notes}` : ''}`);
    }
  };

  const editAutopsy = (autopsyId: string) => {
    const autopsy = autopsies.find(a => a.id === autopsyId);
    if (autopsy) {
      setSelectedAutopsy(autopsyId);
      setEditForm({
        body_id: autopsy.body_id,
        pathologist_id: autopsy.pathologist_id,
        scheduled_date: autopsy.scheduled_date,
        scheduled_time: autopsy.scheduled_date.split('T')[1].substring(0, 5),
        notes: autopsy.notes || ''
      });
      setShowEditModal(true);
    }
  };

  const deleteAutopsy = async (autopsyId: string) => {
    const autopsy = autopsies.find(a => a.id === autopsyId);
    if (!autopsy) return;

    const body = autopsy.bodies;
    const confirmMessage = `Are you sure you want to delete the autopsy for "${body?.full_name}" (${body?.tag_id})?`;
    
    if (confirm(confirmMessage)) {
      try {
        await autopsiesService.delete(autopsyId);
        setAutopsies(autopsies.filter(a => a.id !== autopsyId));
        showNotification('Autopsy deleted successfully!', 'success');
      } catch (error: any) {
        console.error('Error deleting autopsy:', error);
        
        let errorMessage = 'Failed to delete autopsy.';
        
        if (error.message) {
          if (error.message.includes('foreign key')) {
            errorMessage = 'Cannot delete autopsy: It has associated records.';
          } else if (error.message.includes('permission')) {
            errorMessage = 'You do not have permission to delete this autopsy.';
          } else {
            errorMessage = `Error: ${error.message}`;
          }
        }
        
        showNotification(errorMessage, 'error');
      }
    }
  };

  const resetForm = () => {
    setNewAutopsy({ body_id: '', pathologist_id: '', scheduled_date: '', scheduled_time: '', notes: '' });
    setShowScheduleModal(false);
  };

  const handleEditAutopsy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAutopsy) return;

    setIsSubmitting(true);
    try {
      const updatedAutopsy = await autopsiesService.update(selectedAutopsy, {
        body_id: editForm.body_id,
        pathologist_id: editForm.pathologist_id,
        scheduled_date: `${editForm.scheduled_date}T${editForm.scheduled_time}:00Z`,
        notes: editForm.notes
      });

      setAutopsies(autopsies.map(a => a.id === selectedAutopsy ? { ...a, ...updatedAutopsy } : a));
      setShowEditModal(false);
      setSelectedAutopsy(null);
      setEditForm({ body_id: '', pathologist_id: '', scheduled_date: '', scheduled_time: '', notes: '' });
      showNotification('Autopsy updated successfully!', 'success');
    } catch (error: any) {
      console.error('Error updating autopsy:', error);
      
      let errorMessage = 'Failed to update autopsy.';
      
      if (error.message) {
        if (error.message.includes('foreign key')) {
          errorMessage = 'Cannot update autopsy: Invalid reference in the data.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'You do not have permission to update this autopsy.';
        } else if (error.message.includes('not null')) {
          errorMessage = 'Please fill in all required fields.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg">Loading autopsies...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Success Message */}
      {notification && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Autopsy Management</h1>
          <p className="text-gray-600">
            {user?.role === 'pathologist' 
              ? 'Your assigned autopsies and reports' 
              : 'Schedule and manage all autopsies'
            }
          </p>
        </div>
        <div className="flex space-x-3">
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Autopsy</span>
            </button>
          )}
          {user?.role === 'pathologist' && (
            <button
              onClick={() => setShowReportModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Autopsies</p>
              <p className="text-2xl font-bold text-gray-900">{filteredAutopsies.length}</p>
            </div>
            <FileText className="w-8 h-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {filteredAutopsies.filter(a => a.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {filteredAutopsies.filter(a => a.status === 'in_progress').length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredAutopsies.filter(a => a.status === 'completed').length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-green-600" />
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
                placeholder="Search by body name or tag ID..."
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
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Autopsies List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Body Information
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pathologist
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheduled Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAutopsies.map((autopsy) => {
                const body = autopsy.bodies;
                return (
                  <tr key={autopsy.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{body?.full_name}</div>
                        <div className="text-sm text-gray-500">Tag: {body?.tag_id}</div>
                        <div className="text-sm text-gray-500">Age: {body?.age} | {body?.gender}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{autopsy.pathologist?.name || 'Not assigned'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900">
                            {new Date(autopsy.scheduled_date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(autopsy.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(autopsy.status)}`}>
                        {autopsy.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {autopsy.status === 'completed' ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{autopsy.cause_of_death}</div>
                          <div className="text-sm text-gray-500">Report available</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => viewAutopsyDetails(autopsy.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {user?.role === 'pathologist' && autopsy.status !== 'completed' && autopsy.pathologist_id === user.id && (
                          <button 
                            onClick={() => {
                              setSelectedAutopsy(autopsy.id);
                              setShowReportModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="Upload Report"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                        )}
                        {user?.role === 'admin' && (
                          <>
                            <button 
                              onClick={() => editAutopsy(autopsy.id)}
                              className="text-gray-600 hover:text-gray-900"
                              title="Edit Autopsy"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteAutopsy(autopsy.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Autopsy"
                            >
                              <Trash2 className="w-4 h-4" />
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
        
        {filteredAutopsies.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No autopsies found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Autopsy Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Schedule Autopsy</h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <form onSubmit={handleScheduleAutopsy} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Body</label>
                  <select
                    value={newAutopsy.body_id}
                    onChange={(e) => setNewAutopsy({...newAutopsy, body_id: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a body</option>
                    {availableBodies.map(body => (
                      <option key={body.id} value={body.id}>
                        {body.full_name} ({body.tag_id})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pathologist</label>
                  <select
                    value={newAutopsy.pathologist_id}
                    onChange={(e) => setNewAutopsy({...newAutopsy, pathologist_id: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select pathologist</option>
                    {pathologists.map(pathologist => (
                      <option key={pathologist.id} value={pathologist.id}>
                        {pathologist.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newAutopsy.scheduled_date}
                    onChange={(e) => setNewAutopsy({...newAutopsy, scheduled_date: e.target.value})}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={newAutopsy.scheduled_time}
                    onChange={(e) => setNewAutopsy({...newAutopsy, scheduled_time: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={newAutopsy.notes}
                    onChange={(e) => setNewAutopsy({...newAutopsy, notes: e.target.value})}
                    rows={3}
                    placeholder="Additional notes or special instructions..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </form>
            </div>
            
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-lg">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleAutopsy}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <span>Schedule Autopsy</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Upload Autopsy Report</h2>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {selectedAutopsy && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Autopsy:</strong> {autopsies.find(a => a.id === selectedAutopsy)?.bodies?.full_name} 
                    ({autopsies.find(a => a.id === selectedAutopsy)?.bodies?.tag_id})
                  </p>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4">
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cause of Death <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reportData.cause_of_death}
                    onChange={(e) => setReportData({...reportData, cause_of_death: e.target.value})}
                    required
                    placeholder="Enter the cause of death..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={reportData.notes}
                    onChange={(e) => setReportData({...reportData, notes: e.target.value})}
                    rows={4}
                    placeholder="Additional findings and notes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report File (Optional)</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setReportData({...reportData, report_file: e.target.files?.[0] || null})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {reportData.report_file && (
                    <div className="mt-2 p-2 bg-green-50 rounded-md">
                      <p className="text-sm text-green-700">
                        <strong>Selected:</strong> {reportData.report_file.name} 
                        ({(reportData.report_file.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Accepted formats: PDF, DOC, DOCX (max 10MB)
                  </p>
                </div>
              </form>
            </div>
            
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-lg">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReport}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Submit Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Autopsy Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Edit Autopsy</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <form onSubmit={handleEditAutopsy} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Body</label>
                  <select
                    value={editForm.body_id}
                    onChange={(e) => setEditForm({...editForm, body_id: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a body</option>
                    {availableBodies.map(body => (
                      <option key={body.id} value={body.id}>
                        {body.full_name} ({body.tag_id})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pathologist</label>
                  <select
                    value={editForm.pathologist_id}
                    onChange={(e) => setEditForm({...editForm, pathologist_id: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select pathologist</option>
                    {pathologists.map(pathologist => (
                      <option key={pathologist.id} value={pathologist.id}>
                        {pathologist.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editForm.scheduled_date}
                    onChange={(e) => setEditForm({...editForm, scheduled_date: e.target.value})}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={editForm.scheduled_time}
                    onChange={(e) => setEditForm({...editForm, scheduled_time: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    rows={3}
                    placeholder="Additional notes or special instructions..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </form>
            </div>
            
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-lg">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditAutopsy}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4" />
                      <span>Update Autopsy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutopsyManagement;