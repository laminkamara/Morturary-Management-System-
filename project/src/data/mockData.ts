import { Body, StorageUnit, Autopsy, Task, BodyRelease, Notification } from '../types';

export const mockBodies: Body[] = [
  {
    id: '1',
    tagId: 'MT20240001',
    fullName: 'Robert Williams',
    age: 65,
    gender: 'male',
    dateOfDeath: '2024-01-15T14:30:00Z',
    intakeTime: '2024-01-15T16:45:00Z',
    storageId: 'F004',
    nextOfKin: {
      name: 'Sarah Williams',
      relationship: 'Daughter',
      phone: '+1-555-0123',
      address: '123 Oak Street, Springfield, IL 62701'
    },
    status: 'autopsy_scheduled',
    registeredBy: 'staff-1',
    deathCertificate: 'death-cert-001.pdf'
  },
  {
    id: '2',
    tagId: 'MT20240002',
    fullName: 'Margaret Johnson',
    age: 78,
    gender: 'female',
    dateOfDeath: '2024-01-16T09:15:00Z',
    intakeTime: '2024-01-16T11:20:00Z',
    storageId: 'F005',
    nextOfKin: {
      name: 'Michael Johnson',
      relationship: 'Son',
      phone: '+1-555-0124',
      address: '456 Pine Avenue, Springfield, IL 62702'
    },
    status: 'registered',
    registeredBy: 'staff-1'
  },
  {
    id: '3',
    tagId: 'MT20240003',
    fullName: 'David Miller',
    age: 45,
    gender: 'male',
    dateOfDeath: '2024-01-17T22:45:00Z',
    intakeTime: '2024-01-18T08:30:00Z',
    storageId: 'F006',
    nextOfKin: {
      name: 'Jennifer Miller',
      relationship: 'Wife',
      phone: '+1-555-0125',
      address: '789 Elm Street, Springfield, IL 62703'
    },
    status: 'autopsy_completed',
    registeredBy: 'staff-2'
  }
];

export const mockStorageUnits: StorageUnit[] = [
  { id: 'F001', name: 'F001', type: 'fridge', location: 'Basement - Cold Storage', temperature: '2-8°C', status: 'available' },
  { id: 'F002', name: 'F002', type: 'fridge', location: 'Basement - Cold Storage', temperature: '2-8°C', status: 'available' },
  { id: 'F003', name: 'F003', type: 'fridge', location: 'Basement - Cold Storage', temperature: '2-8°C', status: 'available' },
  { id: 'F004', name: 'F004', type: 'fridge', location: 'Basement - Cold Storage', temperature: '2-8°C', status: 'occupied', assignedBodyId: '1' },
  { id: 'F005', name: 'F005', type: 'fridge', location: 'Basement - Cold Storage', temperature: '2-8°C', status: 'occupied', assignedBodyId: '2' },
  { id: 'F006', name: 'F006', type: 'fridge', location: 'Basement - Cold Storage', temperature: '2-8°C', status: 'occupied', assignedBodyId: '3' },
  { id: 'F007', name: 'F007', type: 'fridge', location: 'Basement - Cold Storage', temperature: '2-8°C', status: 'maintenance' },
  { id: 'F008', name: 'F008', type: 'fridge', location: 'Basement - Cold Storage', temperature: '2-8°C', status: 'available' },
  { id: 'FR001', name: 'FR001', type: 'freezer', location: 'Basement - Deep Freeze', temperature: '-18°C', status: 'available' },
  { id: 'FR002', name: 'FR002', type: 'freezer', location: 'Basement - Deep Freeze', temperature: '-18°C', status: 'available' }
];

export const mockAutopsies: Autopsy[] = [
  {
    id: '1',
    bodyId: '1',
    pathologistId: 'pathologist-1',
    scheduledDate: '2024-01-20T09:00:00Z',
    status: 'pending',
    assignedBy: 'admin-1'
  },
  {
    id: '2',
    bodyId: '3',
    pathologistId: 'pathologist-1',
    scheduledDate: '2024-01-18T14:00:00Z',
    status: 'completed',
    report: 'autopsy-report-003.pdf',
    causeOfDeath: 'Myocardial Infarction',
    notes: 'Extensive cardiac examination completed. No signs of trauma.',
    assignedBy: 'admin-1',
    completedDate: '2024-01-18T16:30:00Z'
  }
];

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Embalming - Robert Williams',
    description: 'Prepare body for viewing',
    type: 'embalming',
    assignedTo: 'staff-1',
    assignedBy: 'admin-1',
    dueDate: '2024-01-22T10:00:00Z',
    status: 'pending',
    priority: 'medium',
    bodyId: '1'
  },
  {
    id: '2',
    title: 'Storage Unit Maintenance',
    description: 'Replace temperature sensor in F007',
    type: 'maintenance',
    assignedTo: 'staff-2',
    assignedBy: 'admin-1',
    dueDate: '2024-01-19T15:00:00Z',
    status: 'in_progress',
    priority: 'high'
  }
];

export const mockReleases: BodyRelease[] = [
  {
    id: '1',
    bodyId: '3',
    receiverName: 'Jennifer Miller',
    receiverId: 'DL123456789',
    relationship: 'Wife',
    requestedBy: 'staff-1',
    requestedDate: '2024-01-18T17:00:00Z',
    status: 'pending',
    documents: ['release-form-003.pdf', 'id-copy-003.pdf'],
    notes: 'Family wishes to proceed with funeral arrangements'
  }
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Autopsy Scheduled',
    message: 'Autopsy scheduled for Robert Williams on Jan 20, 2024',
    type: 'info',
    userId: 'pathologist-1',
    read: false,
    createdAt: '2024-01-16T10:00:00Z',
    actionUrl: '/autopsies'
  },
  {
    id: '2',
    title: 'New Task Assigned',
    message: 'You have been assigned an embalming task for Robert Williams',
    type: 'info',
    userId: 'staff-1',
    read: false,
    createdAt: '2024-01-16T10:30:00Z',
    actionUrl: '/tasks'
  },
  {
    id: '3',
    title: 'Storage Unit Maintenance',
    message: 'Unit F007 requires immediate attention - temperature sensor malfunction',
    type: 'warning',
    userId: 'admin-1',
    read: false,
    createdAt: '2024-01-16T08:15:00Z',
    actionUrl: '/storage'
  }
];