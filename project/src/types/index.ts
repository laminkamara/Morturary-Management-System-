export interface User {
  id: string;
  name: string;
  role: 'admin' | 'staff' | 'pathologist';
  email: string;
}

export interface Body {
  id: string;
  tagId: string;
  fullName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  dateOfDeath: string;
  intakeTime: string;
  storageId: string;
  nextOfKin: {
    name: string;
    relationship: string;
    phone: string;
    address: string;
  };
  status: 'registered' | 'autopsy_scheduled' | 'autopsy_completed' | 'released';
  registeredBy: string;
  deathCertificate?: string;
}

export interface StorageUnit {
  id: string;
  name: string;
  type: 'fridge' | 'freezer';
  location: string;
  temperature: string;
  status: 'available' | 'occupied' | 'maintenance';
  assignedBodyId?: string;
}

export interface Autopsy {
  id: string;
  bodyId: string;
  pathologistId: string;
  scheduledDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  report?: string;
  causeOfDeath?: string;
  notes?: string;
  assignedBy: string;
  completedDate?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'embalming' | 'burial' | 'viewing' | 'transport' | 'maintenance';
  assignedTo: string;
  assignedBy: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  bodyId?: string;
}

export interface BodyRelease {
  id: string;
  bodyId: string;
  receiverName: string;
  receiverId: string;
  relationship: string;
  requestedBy: string;
  requestedDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvedBy?: string;
  approvedDate?: string;
  documents: string[];
  notes?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  userId: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}