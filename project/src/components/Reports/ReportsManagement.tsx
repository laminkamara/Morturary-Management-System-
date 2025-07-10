import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, FileText, Users, Archive, Microscope } from 'lucide-react';
import { bodiesService, autopsiesService, tasksService, releasesService, storageService } from '../../services/database';

const ReportsManagement: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: '2024-01-01',
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState<any>({
    overview: null,
    bodies: null,
    autopsies: null,
    tasks: null,
    releases: null,
    storage: null
  });
  const [isLoading, setIsLoading] = useState(false);

  const reportTypes = [
    { id: 'overview', name: 'System Overview', icon: BarChart3 },
    { id: 'bodies', name: 'Bodies Report', icon: Archive },
    { id: 'autopsies', name: 'Autopsies Report', icon: Microscope },
    { id: 'tasks', name: 'Tasks Report', icon: FileText },
    { id: 'releases', name: 'Releases Report', icon: Users }
  ];

  useEffect(() => {
    loadReportData(selectedReport);
  }, [selectedReport, dateRange]);

  const loadReportData = async (reportType: string) => {
    setIsLoading(true);
    try {
      let data;
      switch (reportType) {
        case 'overview':
          const [bodies, storage, autopsies, tasks, releases] = await Promise.all([
            bodiesService.getAll(),
            storageService.getAll(),
            autopsiesService.getAll(),
            tasksService.getAll({ assigned_to: '' }),
            releasesService.getAll()
          ]);
          
          data = {
            totalBodies: bodies.length,
            bodiesThisMonth: bodies.filter(b => 
              b.created_at && new Date(b.created_at).getMonth() === new Date().getMonth()
            ).length,
            completedAutopsies: autopsies.filter(a => a.status === 'completed').length,
            pendingTasks: tasks.filter(t => t.status === 'pending').length,
            completedReleases: releases.filter(r => r.status === 'completed').length,
            storageCapacity: {
              total: storage.length,
              occupied: storage.filter(s => s.status === 'occupied').length,
              available: storage.filter(s => s.status === 'available').length,
              maintenance: storage.filter(s => s.status === 'maintenance').length
            }
          };
          break;
        case 'bodies':
          const bodiesData = await bodiesService.getAll();
          
          // Calculate status counts
          const statusCounts = bodiesData.reduce((acc, body) => {
            acc[body.status] = (acc[body.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          // Calculate gender counts
          const genderCounts = bodiesData.reduce((acc, body) => {
            acc[body.gender] = (acc[body.gender] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          data = { 
            bodies: bodiesData,
            statusCounts, 
            genderCounts 
          };
          break;
        case 'autopsies':
          const autopsiesData = await autopsiesService.getAll();
          
          // Calculate status counts
          const autopsyStatusCounts = autopsiesData.reduce((acc, autopsy) => {
            acc[autopsy.status] = (acc[autopsy.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          data = { 
            autopsies: autopsiesData,
            statusCounts: autopsyStatusCounts 
          };
          break;
        case 'tasks':
          const tasksData = await tasksService.getAll({ assigned_to: '' });
          data = tasksData;
          break;
        case 'releases':
          const releasesData = await releasesService.getAll();
          data = releasesData;
          break;
        case 'storage':
          const storageData = await storageService.getAll();
          data = storageData;
          break;
        default:
          data = null;
      }
      
      setReportData((prev: typeof reportData) => ({ ...prev, [reportType]: data }));
    } catch (error) {
      console.error(`Error loading ${reportType} report:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    const data = reportData[selectedReport];
    if (!data) return;
    
    try {
      switch (format) {
        case 'pdf':
          exportToPdf(data, selectedReport);
          break;
        case 'excel':
          exportToExcel(data, selectedReport);
          break;
        case 'csv':
          exportToCsv(data, selectedReport);
          break;
      }
    } catch (error) {
      console.error(`Error exporting ${format}:`, error);
      alert(`Failed to export as ${format.toUpperCase()}`);
    }
  };

  const exportToPdf = (data: any, reportType: string) => {
    const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;
    const date = new Date().toLocaleDateString();
    
    // Generate formatted HTML content based on report type
    let tableContent = '';
    let summaryContent = '';
    
    switch (reportType) {
      case 'bodies':
        summaryContent = `
          <div style="margin-bottom: 20px;">
            <h3>Summary</h3>
            <p><strong>Total Bodies:</strong> ${data.bodies.length}</p>
            <p><strong>Status Distribution:</strong></p>
            <ul>
              ${Object.entries(data.statusCounts).map(([status, count]) => 
                `<li>${status.replace('_', ' ')}: ${count}</li>`
              ).join('')}
            </ul>
            <p><strong>Gender Distribution:</strong></p>
            <ul>
              ${Object.entries(data.genderCounts).map(([gender, count]) => 
                `<li>${gender}: ${count}</li>`
              ).join('')}
            </ul>
          </div>
        `;
        
        tableContent = `
          <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Name</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Tag ID</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Age</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Gender</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date of Death</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Storage</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Next of Kin</th>
              </tr>
            </thead>
            <tbody>
              ${data.bodies.map((body: any) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${body.full_name}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${body.tag_id}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${body.age}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${body.gender}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${body.status.replace('_', ' ')}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${new Date(body.date_of_death).toLocaleDateString()}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${body.storage_units?.name || 'Not assigned'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${body.next_of_kin_name}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
        break;
        
      case 'autopsies':
        summaryContent = `
          <div style="margin-bottom: 20px;">
            <h3>Summary</h3>
            <p><strong>Total Autopsies:</strong> ${data.autopsies.length}</p>
            <p><strong>Status Distribution:</strong></p>
            <ul>
              ${Object.entries(data.statusCounts).map(([status, count]) => 
                `<li>${status.replace('_', ' ')}: ${count}</li>`
              ).join('')}
            </ul>
          </div>
        `;
        
        tableContent = `
          <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Body</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Tag ID</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Pathologist</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Scheduled Date</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Cause of Death</th>
              </tr>
            </thead>
            <tbody>
              ${data.autopsies.map((autopsy: any) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${autopsy.bodies?.full_name || 'Unknown'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${autopsy.bodies?.tag_id || 'Unknown'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${autopsy.pathologist?.name || 'Not assigned'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${new Date(autopsy.scheduled_date).toLocaleDateString()}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${autopsy.status.replace('_', ' ')}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${autopsy.cause_of_death || 'Not determined'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
        break;
        
      case 'tasks':
        const pendingTasks = data.filter((t: any) => t.status === 'pending').length;
        const inProgressTasks = data.filter((t: any) => t.status === 'in_progress').length;
        const completedTasks = data.filter((t: any) => t.status === 'completed').length;
        
        summaryContent = `
          <div style="margin-bottom: 20px;">
            <h3>Summary</h3>
            <p><strong>Total Tasks:</strong> ${data.length}</p>
            <p><strong>Pending:</strong> ${pendingTasks}</p>
            <p><strong>In Progress:</strong> ${inProgressTasks}</p>
            <p><strong>Completed:</strong> ${completedTasks}</p>
          </div>
        `;
        
        tableContent = `
          <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Title</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Type</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Assigned To</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Due Date</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Priority</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((task: any) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${task.title}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${task.type}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${task.assigned_to_user?.name || 'Unknown'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${new Date(task.due_date).toLocaleDateString()}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${task.priority}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${task.status.replace('_', ' ')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
        break;
        
      case 'releases':
        const pendingReleases = data.filter((r: any) => r.status === 'pending').length;
        const approvedReleases = data.filter((r: any) => r.status === 'approved').length;
        const completedReleases = data.filter((r: any) => r.status === 'completed').length;
        
        summaryContent = `
          <div style="margin-bottom: 20px;">
            <h3>Summary</h3>
            <p><strong>Total Requests:</strong> ${data.length}</p>
            <p><strong>Pending:</strong> ${pendingReleases}</p>
            <p><strong>Approved:</strong> ${approvedReleases}</p>
            <p><strong>Completed:</strong> ${completedReleases}</p>
          </div>
        `;
        
        tableContent = `
          <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Body</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Tag ID</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Receiver</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Relationship</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Request Date</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((release: any) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${release.bodies?.full_name || 'Unknown'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${release.bodies?.tag_id || 'Unknown'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${release.receiver_name}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${release.relationship}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${new Date(release.requested_date).toLocaleDateString()}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${release.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
        break;
        
      default:
        tableContent = `<p>Report data: ${JSON.stringify(data, null, 2)}</p>`;
    }
    
    // Create formatted HTML content
    const htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; line-height: 1.6; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h3 { color: #555; margin-top: 20px; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .header { margin-bottom: 30px; }
            .summary { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            @media print {
              body { margin: 15px; }
              .header { margin-bottom: 20px; }
              table { font-size: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <p><strong>Generated on:</strong> ${date}</p>
            <p><strong>Date Range:</strong> ${dateRange.startDate} to ${dateRange.endDate}</p>
          </div>
          
          <div class="summary">
            ${summaryContent}
          </div>
          
          <div class="content">
            ${tableContent}
          </div>
        </body>
      </html>
    `;
    
    // Create blob and download the HTML file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
        document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = (data: any, reportType: string) => {
    // Format data for Excel
    let formattedData: any[] = [];
    let headers: string[] = [];
    
    switch (reportType) {
      case 'overview':
        formattedData = [
          { Metric: 'Total Bodies', Value: data.totalBodies },
          { Metric: 'Bodies This Month', Value: data.bodiesThisMonth },
          { Metric: 'Completed Autopsies', Value: data.completedAutopsies },
          { Metric: 'Pending Tasks', Value: data.pendingTasks },
          { Metric: 'Completed Releases', Value: data.completedReleases },
          { Metric: 'Storage Capacity (Total)', Value: data.storageCapacity.total },
          { Metric: 'Storage Capacity (Occupied)', Value: data.storageCapacity.occupied },
          { Metric: 'Storage Capacity (Available)', Value: data.storageCapacity.available },
          { Metric: 'Storage Capacity (Maintenance)', Value: data.storageCapacity.maintenance }
        ];
        headers = ['Metric', 'Value'];
        break;
      case 'bodies':
        formattedData = data.bodies.map((body: any) => ({
          'Tag ID': body.tag_id,
          'Name': body.full_name,
          'Age': body.age,
          'Gender': body.gender,
          'Status': body.status,
          'Date of Death': new Date(body.date_of_death).toLocaleDateString(),
          'Intake Date': new Date(body.intake_time).toLocaleDateString(),
          'Storage': body.storage_units?.name || 'Not assigned',
          'Next of Kin': body.next_of_kin_name,
          'Next of Kin Phone': body.next_of_kin_phone,
          'Next of Kin Address': body.next_of_kin_address,
          'Notes': body.notes || ''
        }));
        headers = ['Tag ID', 'Name', 'Age', 'Gender', 'Status', 'Date of Death', 'Intake Date', 'Storage', 'Next of Kin', 'Next of Kin Phone', 'Next of Kin Address', 'Notes'];
        break;
      case 'autopsies':
        formattedData = data.autopsies.map((autopsy: any) => ({
          'Body': autopsy.bodies?.full_name || 'Unknown',
          'Tag ID': autopsy.bodies?.tag_id || 'Unknown',
          'Pathologist': autopsy.pathologist?.name || 'Unknown',
          'Scheduled Date': new Date(autopsy.scheduled_date).toLocaleDateString(),
          'Status': autopsy.status,
          'Cause of Death': autopsy.cause_of_death || 'Not determined',
          'Completed Date': autopsy.completed_date ? new Date(autopsy.completed_date).toLocaleDateString() : 'Not completed',
          'Notes': autopsy.notes || ''
        }));
        headers = ['Body', 'Tag ID', 'Pathologist', 'Scheduled Date', 'Status', 'Cause of Death', 'Completed Date', 'Notes'];
        break;
      case 'tasks':
        formattedData = data.map((task: any) => ({
          'Title': task.title,
          'Description': task.description || '',
          'Type': task.type,
          'Assigned To': task.assigned_to_user?.name || 'Unknown',
          'Due Date': new Date(task.due_date).toLocaleDateString(),
          'Status': task.status,
          'Priority': task.priority,
          'Related Body': task.bodies?.full_name || 'None'
        }));
        headers = ['Title', 'Description', 'Type', 'Assigned To', 'Due Date', 'Status', 'Priority', 'Related Body'];
        break;
      case 'releases':
        formattedData = data.map((release: any) => ({
          'Body': release.bodies?.full_name || 'Unknown',
          'Tag ID': release.bodies?.tag_id || 'Unknown',
          'Receiver': release.receiver_name,
          'Receiver ID': release.receiver_id,
          'Relationship': release.relationship,
          'Requested Date': new Date(release.requested_date).toLocaleDateString(),
          'Status': release.status,
          'Approved Date': release.approved_date ? new Date(release.approved_date).toLocaleDateString() : 'Not approved',
          'Notes': release.notes || ''
        }));
        headers = ['Body', 'Tag ID', 'Receiver', 'Receiver ID', 'Relationship', 'Requested Date', 'Status', 'Approved Date', 'Notes'];
        break;
    }
    
    // Create CSV content with proper Excel formatting
    let csvContent = '\ufeff'; // BOM for Excel UTF-8 support
    csvContent += headers.join(',') + '\n';
    formattedData.forEach((row) => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        return typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n')) 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      });
      csvContent += values.join(',') + '\n';
    });
    
    // Create Excel file (CSV with .xlsx extension for Excel compatibility)
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToCsv = (data: any, reportType: string) => {
    // Format data for CSV (similar to Excel but with .csv extension)
    let formattedData: any[] = [];
    let headers: string[] = [];
    
    switch (reportType) {
      case 'overview':
        formattedData = [
          { Metric: 'Total Bodies', Value: data.totalBodies },
          { Metric: 'Bodies This Month', Value: data.bodiesThisMonth },
          { Metric: 'Completed Autopsies', Value: data.completedAutopsies },
          { Metric: 'Pending Tasks', Value: data.pendingTasks },
          { Metric: 'Completed Releases', Value: data.completedReleases },
          { Metric: 'Storage Capacity (Total)', Value: data.storageCapacity.total },
          { Metric: 'Storage Capacity (Occupied)', Value: data.storageCapacity.occupied },
          { Metric: 'Storage Capacity (Available)', Value: data.storageCapacity.available },
          { Metric: 'Storage Capacity (Maintenance)', Value: data.storageCapacity.maintenance }
        ];
        headers = ['Metric', 'Value'];
        break;
      case 'bodies':
        formattedData = data.bodies.map((body: any) => ({
          'Tag ID': body.tag_id,
          'Name': body.full_name,
          'Age': body.age,
          'Gender': body.gender,
          'Status': body.status,
          'Date of Death': new Date(body.date_of_death).toLocaleDateString(),
          'Intake Date': new Date(body.intake_time).toLocaleDateString(),
          'Storage': body.storage_units?.name || 'Not assigned',
          'Next of Kin': body.next_of_kin_name,
          'Next of Kin Phone': body.next_of_kin_phone,
          'Next of Kin Address': body.next_of_kin_address,
          'Notes': body.notes || ''
        }));
        headers = ['Tag ID', 'Name', 'Age', 'Gender', 'Status', 'Date of Death', 'Intake Date', 'Storage', 'Next of Kin', 'Next of Kin Phone', 'Next of Kin Address', 'Notes'];
        break;
      case 'autopsies':
        formattedData = data.autopsies.map((autopsy: any) => ({
          'Body': autopsy.bodies?.full_name || 'Unknown',
          'Tag ID': autopsy.bodies?.tag_id || 'Unknown',
          'Pathologist': autopsy.pathologist?.name || 'Unknown',
          'Scheduled Date': new Date(autopsy.scheduled_date).toLocaleDateString(),
          'Status': autopsy.status,
          'Cause of Death': autopsy.cause_of_death || 'Not determined',
          'Completed Date': autopsy.completed_date ? new Date(autopsy.completed_date).toLocaleDateString() : 'Not completed',
          'Notes': autopsy.notes || ''
        }));
        headers = ['Body', 'Tag ID', 'Pathologist', 'Scheduled Date', 'Status', 'Cause of Death', 'Completed Date', 'Notes'];
        break;
      case 'tasks':
        formattedData = data.map((task: any) => ({
          'Title': task.title,
          'Description': task.description || '',
          'Type': task.type,
          'Assigned To': task.assigned_to_user?.name || 'Unknown',
          'Due Date': new Date(task.due_date).toLocaleDateString(),
          'Status': task.status,
          'Priority': task.priority,
          'Related Body': task.bodies?.full_name || 'None'
        }));
        headers = ['Title', 'Description', 'Type', 'Assigned To', 'Due Date', 'Status', 'Priority', 'Related Body'];
        break;
      case 'releases':
        formattedData = data.map((release: any) => ({
          'Body': release.bodies?.full_name || 'Unknown',
          'Tag ID': release.bodies?.tag_id || 'Unknown',
          'Receiver': release.receiver_name,
          'Receiver ID': release.receiver_id,
          'Relationship': release.relationship,
          'Requested Date': new Date(release.requested_date).toLocaleDateString(),
          'Status': release.status,
          'Approved Date': release.approved_date ? new Date(release.approved_date).toLocaleDateString() : 'Not approved',
          'Notes': release.notes || ''
        }));
        headers = ['Body', 'Tag ID', 'Receiver', 'Receiver ID', 'Relationship', 'Requested Date', 'Status', 'Approved Date', 'Notes'];
        break;
    }
    
    // Create CSV content with proper formatting
    let csvContent = '\ufeff'; // BOM for UTF-8 support
    csvContent += headers.join(',') + '\n';
    formattedData.forEach((row) => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        return typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n')) 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      });
      csvContent += values.join(',') + '\n';
    });
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const viewDetails = (type: string, id?: string) => {
    switch (type) {
      case 'body':
        const body = reportData.bodies?.bodies.find((b: any) => b.id === id);
        if (body) {
          alert(`Body Details:
Name: ${body.full_name}
Tag: ${body.tag_id}
Age: ${body.age}
Gender: ${body.gender}
Status: ${body.status}
Intake: ${new Date(body.intake_time).toLocaleDateString()}`);
        }
        break;
      case 'autopsy':
        const autopsy = reportData.autopsies?.autopsies.find((a: any) => a.id === id);
        const autopsyBody = autopsy?.bodies;
        if (autopsy && autopsyBody) {
          alert(`Autopsy Details:
Body: ${autopsyBody.full_name}
Status: ${autopsy.status}
Scheduled: ${new Date(autopsy.scheduled_date).toLocaleDateString()}
${autopsy.cause_of_death ? `Cause: ${autopsy.cause_of_death}` : ''}`);
        }
        break;
      default:
        alert('Details view not implemented for this item type.');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Generate and export system reports</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExport('pdf')}
              className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors text-sm flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Types Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Types</h2>
            <div className="space-y-2">
              {reportTypes.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                    selectedReport === report.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <report.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{report.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-lg text-gray-600">Loading report data...</div>
              </div>
            ) : (
              <>
                {selectedReport === 'overview' && reportData.overview && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">System Overview</h2>
                    
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-600">Total Bodies</p>
                            <p className="text-3xl font-bold text-blue-900">{reportData.overview.totalBodies}</p>
                            <p className="text-sm text-blue-600">+{reportData.overview.bodiesThisMonth} this month</p>
                          </div>
                          <Archive className="w-12 h-12 text-blue-600" />
                        </div>
                      </div>
                      
                      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-600">Completed Autopsies</p>
                            <p className="text-3xl font-bold text-green-900">{reportData.overview.completedAutopsies}</p>
                            <p className="text-sm text-green-600">Reports submitted</p>
                          </div>
                          <Microscope className="w-12 h-12 text-green-600" />
                        </div>
                      </div>
                      
                      <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-orange-600">Pending Tasks</p>
                            <p className="text-3xl font-bold text-orange-900">{reportData.overview.pendingTasks}</p>
                            <p className="text-sm text-orange-600">Awaiting completion</p>
                          </div>
                          <FileText className="w-12 h-12 text-orange-600" />
                        </div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity Summary</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600">Bodies registered this month</span>
                          <span className="font-semibold text-gray-900">{String(reportData.overview.bodiesThisMonth)}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600">Completed releases</span>
                          <span className="font-semibold text-gray-900">{String(reportData.overview.completedReleases)}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600">Pending tasks</span>
                          <span className="font-semibold text-gray-900">{String(reportData.overview.pendingTasks)}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600">Storage utilization</span>
                          <span className="font-semibold text-gray-900">
                            {Math.round((reportData.overview.storageCapacity.occupied / reportData.overview.storageCapacity.total) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedReport === 'bodies' && reportData.bodies && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Bodies Report</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Status Distribution */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
                        <div className="space-y-3">
                          {Object.entries(reportData.bodies.statusCounts).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-700 capitalize">
                                {status.replace('_', ' ')}
                              </span>
                              <span className="font-semibold text-gray-900">{String(count)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Gender Distribution */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h3>
                        <div className="space-y-3">
                          {Object.entries(reportData.bodies.genderCounts).map(([gender, count]) => (
                            <div key={gender} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-700 capitalize">{gender}</span>
                              <span className="font-semibold text-gray-900">{String(count)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bodies Table */}
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">All Bodies</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tag ID</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Intake Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.bodies.bodies.map((body: any) => (
                              <tr key={body.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {body.full_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {body.tag_id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {body.age}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                  {body.gender}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                  {body.status.replace('_', ' ')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(body.intake_time).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <button 
                                    onClick={() => viewDetails('body', body.id)}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {selectedReport === 'autopsies' && reportData.autopsies && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Autopsies Report</h2>
                    
                    {/* Status Distribution */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Autopsy Status Distribution</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(reportData.autopsies.statusCounts).map(([status, count]) => (
                          <div key={status} className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900">{String(count)}</div>
                            <div className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Autopsies Table */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">All Autopsies</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Body</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pathologist</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cause of Death</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.autopsies.autopsies.map((autopsy: any) => (
                              <tr key={autopsy.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {autopsy.bodies?.full_name} ({autopsy.bodies?.tag_id})
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {autopsy.pathologist?.name || 'Not assigned'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(autopsy.scheduled_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                  {autopsy.status.replace('_', ' ')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {autopsy.cause_of_death || 'Pending'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <button 
                                    onClick={() => viewDetails('autopsy', autopsy.id)}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {selectedReport === 'tasks' && reportData.tasks && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Tasks Report</h2>
                    
                    {/* Task Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="text-2xl font-bold text-yellow-900">
                          {reportData.tasks.filter((t: any) => t.status === 'pending').length}
                        </div>
                        <div className="text-sm text-yellow-600">Pending Tasks</div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-900">
                          {reportData.tasks.filter((t: any) => t.status === 'in_progress').length}
                        </div>
                        <div className="text-sm text-blue-600">In Progress</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-900">
                          {reportData.tasks.filter((t: any) => t.status === 'completed').length}
                        </div>
                        <div className="text-sm text-green-600">Completed</div>
                      </div>
                    </div>

                    {/* Tasks Table */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">All Tasks</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.tasks.map((task: any) => (
                              <tr key={task.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {task.title}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                  {task.type}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {task.assigned_to_user?.name || 'Unknown'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(task.due_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                  {task.priority}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                  {task.status.replace('_', ' ')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {selectedReport === 'releases' && reportData.releases && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Releases Report</h2>
                    
                    {/* Release Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">{reportData.releases.length}</div>
                        <div className="text-sm text-gray-600">Total Requests</div>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="text-2xl font-bold text-yellow-900">
                          {reportData.releases.filter((r: any) => r.status === 'pending').length}
                        </div>
                        <div className="text-sm text-yellow-600">Pending</div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-900">
                          {reportData.releases.filter((r: any) => r.status === 'approved').length}
                        </div>
                        <div className="text-sm text-blue-600">Approved</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-900">
                          {reportData.releases.filter((r: any) => r.status === 'completed').length}
                        </div>
                        <div className="text-sm text-green-600">Completed</div>
                      </div>
                    </div>

                    {/* Releases Table */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">All Release Requests</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Body</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receiver</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relationship</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.releases.map((release: any) => (
                              <tr key={release.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {release.bodies?.full_name} ({release.bodies?.tag_id})
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {release.receiver_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {release.relationship}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(release.requested_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                  {release.status}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsManagement;