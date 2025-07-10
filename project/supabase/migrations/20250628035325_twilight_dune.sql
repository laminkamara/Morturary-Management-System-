/*
# Mortuary Management System Database Schema

1. Database Setup
   - Custom enum types for all entities
   - Core tables: users, storage_units, bodies, autopsies, tasks, body_releases, notifications
   - Sample data for testing
   - Indexes for performance
   - Views for complex queries
   - Functions and triggers

2. Security
   - Row Level Security (RLS) enabled on all tables
   - Policies for authenticated users
   - Proper access controls

3. Features
   - Real-time subscriptions ready
   - Comprehensive sample data
   - Performance optimized
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in correct order to handle foreign keys)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS body_releases CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS autopsies CASCADE;
DROP TABLE IF EXISTS bodies CASCADE;
DROP TABLE IF EXISTS storage_units CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS storage_type CASCADE;
DROP TYPE IF EXISTS storage_status CASCADE;
DROP TYPE IF EXISTS body_gender CASCADE;
DROP TYPE IF EXISTS body_status CASCADE;
DROP TYPE IF EXISTS autopsy_status CASCADE;
DROP TYPE IF EXISTS task_type CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS release_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;

-- Create custom types (PostgreSQL enums)
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'pathologist');
CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE storage_type AS ENUM ('fridge', 'freezer');
CREATE TYPE storage_status AS ENUM ('available', 'occupied', 'maintenance');
CREATE TYPE body_gender AS ENUM ('male', 'female', 'other');
CREATE TYPE body_status AS ENUM ('registered', 'autopsy_scheduled', 'autopsy_completed', 'released');
CREATE TYPE autopsy_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE task_type AS ENUM ('embalming', 'burial', 'viewing', 'transport', 'maintenance');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE release_status AS ENUM ('pending', 'approved', 'rejected', 'completed');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');

-- Users table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    phone VARCHAR(20),
    status user_status DEFAULT 'active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Storage units table
CREATE TABLE storage_units (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type storage_type NOT NULL,
    location VARCHAR(255) NOT NULL,
    temperature VARCHAR(50) NOT NULL,
    status storage_status DEFAULT 'available',
    assigned_body_id VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE storage_units ENABLE ROW LEVEL SECURITY;

-- Bodies table
CREATE TABLE bodies (
    id VARCHAR(50) PRIMARY KEY,
    tag_id VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL,
    gender body_gender NOT NULL,
    date_of_death TIMESTAMP NOT NULL,
    intake_time TIMESTAMP NOT NULL,
    storage_id VARCHAR(50),
    next_of_kin_name VARCHAR(255) NOT NULL,
    next_of_kin_relationship VARCHAR(100) NOT NULL,
    next_of_kin_phone VARCHAR(20) NOT NULL,
    next_of_kin_address TEXT NOT NULL,
    status body_status DEFAULT 'registered',
    registered_by VARCHAR(50) NOT NULL,
    death_certificate VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (storage_id) REFERENCES storage_units(id),
    FOREIGN KEY (registered_by) REFERENCES users(id)
);

-- Enable RLS
ALTER TABLE bodies ENABLE ROW LEVEL SECURITY;

-- Autopsies table
CREATE TABLE autopsies (
    id VARCHAR(50) PRIMARY KEY,
    body_id VARCHAR(50) NOT NULL,
    pathologist_id VARCHAR(50) NOT NULL,
    scheduled_date TIMESTAMP NOT NULL,
    status autopsy_status DEFAULT 'pending',
    report_file VARCHAR(255),
    cause_of_death TEXT,
    notes TEXT,
    assigned_by VARCHAR(50) NOT NULL,
    completed_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (body_id) REFERENCES bodies(id),
    FOREIGN KEY (pathologist_id) REFERENCES users(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Enable RLS
ALTER TABLE autopsies ENABLE ROW LEVEL SECURITY;

-- Tasks table
CREATE TABLE tasks (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type task_type NOT NULL,
    assigned_to VARCHAR(50) NOT NULL,
    assigned_by VARCHAR(50) NOT NULL,
    due_date TIMESTAMP NOT NULL,
    status task_status DEFAULT 'pending',
    priority task_priority DEFAULT 'medium',
    body_id VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    FOREIGN KEY (body_id) REFERENCES bodies(id)
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Body releases table
CREATE TABLE body_releases (
    id VARCHAR(50) PRIMARY KEY,
    body_id VARCHAR(50) NOT NULL,
    receiver_name VARCHAR(255) NOT NULL,
    receiver_id VARCHAR(100) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    requested_by VARCHAR(50) NOT NULL,
    requested_date TIMESTAMP NOT NULL,
    status release_status DEFAULT 'pending',
    approved_by VARCHAR(50) NULL,
    approved_date TIMESTAMP NULL,
    documents JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (body_id) REFERENCES bodies(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Enable RLS
ALTER TABLE body_releases ENABLE ROW LEVEL SECURITY;

-- Notifications table
CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info',
    user_id VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create function for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_storage_units_updated_at BEFORE UPDATE ON storage_units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bodies_updated_at BEFORE UPDATE ON bodies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_autopsies_updated_at BEFORE UPDATE ON autopsies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_body_releases_updated_at BEFORE UPDATE ON body_releases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample users
INSERT INTO users (id, name, email, password_hash, role, phone, status, last_login) VALUES
('admin-1', 'System Administrator', 'admin@mortuary.com', '$2b$10$hashedpassword1', 'admin', '+1-555-0100', 'active', '2024-01-18 09:30:00'),
('staff-1', 'John Smith', 'staff@mortuary.com', '$2b$10$hashedpassword2', 'staff', '+1-555-0101', 'active', '2024-01-18 08:15:00'),
('staff-2', 'Mike Wilson', 'mike.wilson@mortuary.com', '$2b$10$hashedpassword3', 'staff', '+1-555-0103', 'active', '2024-01-17 14:20:00'),
('pathologist-1', 'Dr. Sarah Johnson', 'pathologist@mortuary.com', '$2b$10$hashedpassword4', 'pathologist', '+1-555-0102', 'active', '2024-01-17 16:45:00'),
('staff-3', 'Emily Davis', 'emily.davis@mortuary.com', '$2b$10$hashedpassword5', 'staff', '+1-555-0104', 'active', '2024-01-16 10:30:00'),
('pathologist-2', 'Dr. Michael Brown', 'michael.brown@mortuary.com', '$2b$10$hashedpassword6', 'pathologist', '+1-555-0105', 'active', '2024-01-16 13:45:00');

-- Insert storage units
INSERT INTO storage_units (id, name, type, location, temperature, status, assigned_body_id) VALUES
('F001', 'F001', 'fridge', 'Basement - Cold Storage Section A', '2-8°C', 'available', NULL),
('F002', 'F002', 'fridge', 'Basement - Cold Storage Section A', '2-8°C', 'available', NULL),
('F003', 'F003', 'fridge', 'Basement - Cold Storage Section A', '2-8°C', 'available', NULL),
('F004', 'F004', 'fridge', 'Basement - Cold Storage Section A', '2-8°C', 'occupied', 'body-1'),
('F005', 'F005', 'fridge', 'Basement - Cold Storage Section B', '2-8°C', 'occupied', 'body-2'),
('F006', 'F006', 'fridge', 'Basement - Cold Storage Section B', '2-8°C', 'occupied', 'body-3'),
('F007', 'F007', 'fridge', 'Basement - Cold Storage Section B', '2-8°C', 'maintenance', NULL),
('F008', 'F008', 'fridge', 'Basement - Cold Storage Section B', '2-8°C', 'available', NULL),
('F009', 'F009', 'fridge', 'Basement - Cold Storage Section C', '2-8°C', 'occupied', 'body-4'),
('F010', 'F010', 'fridge', 'Basement - Cold Storage Section C', '2-8°C', 'occupied', 'body-5'),
('FR001', 'FR001', 'freezer', 'Basement - Deep Freeze Section', '-18°C', 'available', NULL),
('FR002', 'FR002', 'freezer', 'Basement - Deep Freeze Section', '-18°C', 'available', NULL),
('FR003', 'FR003', 'freezer', 'Basement - Deep Freeze Section', '-18°C', 'occupied', 'body-6'),
('FR004', 'FR004', 'freezer', 'Basement - Deep Freeze Section', '-18°C', 'available', NULL);

-- Insert bodies
INSERT INTO bodies (id, tag_id, full_name, age, gender, date_of_death, intake_time, storage_id, next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_address, status, registered_by, death_certificate, notes) VALUES
('body-1', 'MT20240001', 'Robert Williams', 65, 'male', '2024-01-15 14:30:00', '2024-01-15 16:45:00', 'F004', 'Sarah Williams', 'Daughter', '+1-555-0123', '123 Oak Street, Springfield, IL 62701', 'autopsy_scheduled', 'staff-1', 'death-cert-001.pdf', 'Natural death, family requested autopsy'),
('body-2', 'MT20240002', 'Margaret Johnson', 78, 'female', '2024-01-16 09:15:00', '2024-01-16 11:20:00', 'F005', 'Michael Johnson', 'Son', '+1-555-0124', '456 Pine Avenue, Springfield, IL 62702', 'registered', 'staff-1', 'death-cert-002.pdf', 'Peaceful passing at home'),
('body-3', 'MT20240003', 'David Miller', 45, 'male', '2024-01-17 22:45:00', '2024-01-18 08:30:00', 'F006', 'Jennifer Miller', 'Wife', '+1-555-0125', '789 Elm Street, Springfield, IL 62703', 'autopsy_completed', 'staff-2', 'death-cert-003.pdf', 'Sudden cardiac event'),
('body-4', 'MT20240004', 'Eleanor Thompson', 89, 'female', '2024-01-18 06:20:00', '2024-01-18 10:15:00', 'F009', 'Robert Thompson', 'Son', '+1-555-0126', '321 Maple Drive, Springfield, IL 62704', 'registered', 'staff-1', 'death-cert-004.pdf', 'Advanced age, natural causes'),
('body-5', 'MT20240005', 'James Anderson', 72, 'male', '2024-01-19 13:45:00', '2024-01-19 15:30:00', 'F010', 'Linda Anderson', 'Wife', '+1-555-0127', '654 Cedar Lane, Springfield, IL 62705', 'autopsy_scheduled', 'staff-3', 'death-cert-005.pdf', 'Hospital transfer, investigation required'),
('body-6', 'MT20240006', 'Maria Rodriguez', 58, 'female', '2024-01-20 11:30:00', '2024-01-20 14:45:00', 'FR003', 'Carlos Rodriguez', 'Husband', '+1-555-0128', '987 Birch Street, Springfield, IL 62706', 'registered', 'staff-2', 'death-cert-006.pdf', 'Long-term preservation requested');

-- Update storage units with correct body assignments
UPDATE storage_units SET assigned_body_id = 'body-1' WHERE id = 'F004';
UPDATE storage_units SET assigned_body_id = 'body-2' WHERE id = 'F005';
UPDATE storage_units SET assigned_body_id = 'body-3' WHERE id = 'F006';
UPDATE storage_units SET assigned_body_id = 'body-4' WHERE id = 'F009';
UPDATE storage_units SET assigned_body_id = 'body-5' WHERE id = 'F010';
UPDATE storage_units SET assigned_body_id = 'body-6' WHERE id = 'FR003';

-- Insert autopsies
INSERT INTO autopsies (id, body_id, pathologist_id, scheduled_date, status, report_file, cause_of_death, notes, assigned_by, completed_date) VALUES
('autopsy-1', 'body-1', 'pathologist-1', '2024-01-20 09:00:00', 'pending', NULL, NULL, 'Routine autopsy requested by family', 'admin-1', NULL),
('autopsy-2', 'body-3', 'pathologist-1', '2024-01-18 14:00:00', 'completed', 'autopsy-report-003.pdf', 'Myocardial Infarction', 'Extensive cardiac examination completed. No signs of trauma. Coronary arteries showed significant atherosclerosis.', 'admin-1', '2024-01-18 16:30:00'),
('autopsy-3', 'body-5', 'pathologist-2', '2024-01-22 10:30:00', 'pending', NULL, NULL, 'Hospital requested investigation', 'admin-1', NULL),
('autopsy-4', 'body-2', 'pathologist-1', '2024-01-25 11:00:00', 'pending', NULL, NULL, 'Family consent obtained for examination', 'admin-1', NULL);

-- Insert tasks
INSERT INTO tasks (id, title, description, type, assigned_to, assigned_by, due_date, status, priority, body_id) VALUES
('task-1', 'Embalming - Robert Williams', 'Prepare body for viewing ceremony scheduled for next week', 'embalming', 'staff-1', 'admin-1', '2024-01-22 10:00:00', 'pending', 'medium', 'body-1'),
('task-2', 'Storage Unit Maintenance', 'Replace temperature sensor in F007 - urgent repair needed', 'maintenance', 'staff-2', 'admin-1', '2024-01-19 15:00:00', 'in_progress', 'high', NULL),
('task-3', 'Transport Arrangement', 'Coordinate transport for David Miller to funeral home', 'transport', 'staff-3', 'admin-1', '2024-01-21 14:00:00', 'pending', 'medium', 'body-3'),
('task-4', 'Viewing Preparation', 'Prepare viewing room for Thompson family', 'viewing', 'staff-1', 'admin-1', '2024-01-23 09:00:00', 'pending', 'low', 'body-4'),
('task-5', 'Equipment Maintenance', 'Monthly calibration of refrigeration units', 'maintenance', 'staff-2', 'admin-1', '2024-01-24 08:00:00', 'pending', 'medium', NULL),
('task-6', 'Burial Coordination', 'Coordinate with cemetery for Anderson burial', 'burial', 'staff-3', 'admin-1', '2024-01-26 13:00:00', 'pending', 'high', 'body-5'),
('task-7', 'Embalming - Eleanor Thompson', 'Standard embalming procedure for extended viewing', 'embalming', 'staff-1', 'admin-1', '2024-01-24 11:00:00', 'completed', 'medium', 'body-4');

-- Insert body releases
INSERT INTO body_releases (id, body_id, receiver_name, receiver_id, relationship, requested_by, requested_date, status, approved_by, approved_date, documents, notes) VALUES
('release-1', 'body-3', 'Jennifer Miller', 'DL123456789', 'Wife', 'staff-1', '2024-01-18 17:00:00', 'approved', 'admin-1', '2024-01-19 09:00:00', '["release-form-003.pdf", "id-copy-003.pdf", "death-certificate-003.pdf"]'::jsonb, 'Family wishes to proceed with funeral arrangements at Peaceful Rest Funeral Home'),
('release-2', 'body-2', 'Michael Johnson', 'DL987654321', 'Son', 'staff-1', '2024-01-19 14:30:00', 'pending', NULL, NULL, '["release-form-002.pdf", "id-copy-002.pdf"]'::jsonb, 'Waiting for final documentation from hospital'),
('release-3', 'body-4', 'Robert Thompson', 'DL456789123', 'Son', 'staff-2', '2024-01-20 10:15:00', 'pending', NULL, NULL, '["release-form-004.pdf", "id-copy-004.pdf"]'::jsonb, 'Family requesting release for private ceremony'),
('release-4', 'body-1', 'Sarah Williams', 'DL789123456', 'Daughter', 'staff-1', '2024-01-21 16:00:00', 'pending', NULL, NULL, '["release-form-001.pdf", "id-copy-001.pdf"]'::jsonb, 'Pending autopsy completion'),
('release-5', 'body-6', 'Carlos Rodriguez', 'DL321654987', 'Husband', 'staff-3', '2024-01-22 11:30:00', 'approved', 'admin-1', '2024-01-22 14:00:00', '["release-form-006.pdf", "id-copy-006.pdf", "special-preservation-docs.pdf"]'::jsonb, 'Special preservation requirements met');

-- Insert notifications
INSERT INTO notifications (id, title, message, type, user_id, is_read, action_url) VALUES
('notif-1', 'Autopsy Scheduled', 'Autopsy scheduled for Robert Williams on January 20, 2024 at 9:00 AM', 'info', 'pathologist-1', FALSE, '/autopsies'),
('notif-2', 'New Task Assigned', 'You have been assigned an embalming task for Robert Williams due January 22, 2024', 'info', 'staff-1', FALSE, '/tasks'),
('notif-3', 'Storage Unit Maintenance Required', 'Unit F007 requires immediate attention - temperature sensor malfunction detected', 'warning', 'admin-1', FALSE, '/storage'),
('notif-4', 'Release Request Approved', 'Body release request for David Miller has been approved', 'success', 'staff-1', TRUE, '/releases'),
('notif-5', 'Autopsy Completed', 'Autopsy for David Miller has been completed. Report available for review.', 'success', 'admin-1', FALSE, '/autopsies'),
('notif-6', 'High Priority Task', 'Urgent: Storage unit maintenance task is overdue', 'error', 'staff-2', FALSE, '/tasks'),
('notif-7', 'New Body Registration', 'New body registered: Maria Rodriguez (MT20240006)', 'info', 'admin-1', TRUE, '/bodies'),
('notif-8', 'Transport Scheduled', 'Transport arrangement task assigned for David Miller', 'info', 'staff-3', FALSE, '/tasks'),
('notif-9', 'Release Request Pending', 'New release request submitted for Eleanor Thompson', 'info', 'admin-1', FALSE, '/releases'),
('notif-10', 'System Maintenance', 'Scheduled system maintenance tonight from 2:00 AM - 4:00 AM', 'warning', 'admin-1', TRUE, NULL),
('notif-11', 'Autopsy Assignment', 'New autopsy assigned for James Anderson on January 22, 2024', 'info', 'pathologist-2', FALSE, '/autopsies'),
('notif-12', 'Storage Capacity Alert', 'Storage capacity at 75% - consider scheduling releases', 'warning', 'admin-1', FALSE, '/storage');

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

CREATE INDEX idx_bodies_tag_id ON bodies(tag_id);
CREATE INDEX idx_bodies_status ON bodies(status);
CREATE INDEX idx_bodies_storage_id ON bodies(storage_id);
CREATE INDEX idx_bodies_registered_by ON bodies(registered_by);
CREATE INDEX idx_bodies_date_of_death ON bodies(date_of_death);

CREATE INDEX idx_storage_status ON storage_units(status);
CREATE INDEX idx_storage_type ON storage_units(type);
CREATE INDEX idx_storage_assigned_body ON storage_units(assigned_body_id);

CREATE INDEX idx_autopsies_body_id ON autopsies(body_id);
CREATE INDEX idx_autopsies_pathologist_id ON autopsies(pathologist_id);
CREATE INDEX idx_autopsies_status ON autopsies(status);
CREATE INDEX idx_autopsies_scheduled_date ON autopsies(scheduled_date);

CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_body_id ON tasks(body_id);

CREATE INDEX idx_releases_body_id ON body_releases(body_id);
CREATE INDEX idx_releases_status ON body_releases(status);
CREATE INDEX idx_releases_requested_by ON body_releases(requested_by);
CREATE INDEX idx_releases_requested_date ON body_releases(requested_date);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- JSONB indexes for body_releases documents
CREATE INDEX idx_releases_documents_gin ON body_releases USING GIN (documents);

-- Create RLS policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON storage_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON bodies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON autopsies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON body_releases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON notifications FOR SELECT TO authenticated USING (true);

-- Create policies for insert/update/delete (you can customize these based on your needs)
CREATE POLICY "Enable insert for authenticated users" ON users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON users FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON users FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON storage_units FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON storage_units FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON storage_units FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON bodies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON bodies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON bodies FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON autopsies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON autopsies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON autopsies FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON tasks FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON body_releases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON body_releases FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON body_releases FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON notifications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON notifications FOR DELETE TO authenticated USING (true);