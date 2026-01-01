-- Attendancr Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Parents table
CREATE TABLE parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  telegram_chat_id text,
  created_at timestamptz DEFAULT now()
);

-- Students table
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text UNIQUE NOT NULL,
  name text NOT NULL,
  school text,
  date_of_birth date,
  emergency_contact text,
  notes text,
  primary_parent_id uuid REFERENCES parents(id),
  secondary_parent_id uuid REFERENCES parents(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Staff table
CREATE TABLE staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pin_hash text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Admins table
CREATE TABLE admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Attendance table
CREATE TABLE attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) NOT NULL,
  check_in_time timestamptz NOT NULL,
  check_out_time timestamptz,
  checked_in_by uuid REFERENCES staff(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Failed notifications table
CREATE TABLE failed_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id),
  parent_id uuid REFERENCES parents(id),
  error_message text,
  attempted_at timestamptz DEFAULT now()
);

-- Google Sheets sync log table
CREATE TABLE google_sheets_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_started_at timestamptz DEFAULT now(),
  sync_completed_at timestamptz,
  status text,
  error_message text,
  students_added int DEFAULT 0,
  students_updated int DEFAULT 0,
  students_deleted int DEFAULT 0
);

-- Telegram link codes table
CREATE TABLE telegram_link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  parent_id uuid REFERENCES parents(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false
);

-- Indexes for performance
CREATE INDEX idx_students_active ON students(is_active) WHERE is_active = true;
CREATE INDEX idx_students_name ON students(name);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_check_in ON attendance(check_in_time);
CREATE INDEX idx_attendance_check_out_null ON attendance(student_id) WHERE check_out_time IS NULL;
CREATE INDEX idx_telegram_codes_unused ON telegram_link_codes(code) WHERE used = false;

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_sheets_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;

-- For MVP, allow all operations with service role key
-- In production, implement proper RLS policies based on auth

-- Policy for students table (all operations allowed for service role)
CREATE POLICY "Allow all for service role" ON students FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON parents FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON staff FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON admins FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON attendance FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON failed_notifications FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON google_sheets_sync_log FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON telegram_link_codes FOR ALL USING (true);

-- Function to auto-delete old failed notifications (7 days)
CREATE OR REPLACE FUNCTION delete_old_failed_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM failed_notifications
  WHERE attempted_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on students
CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert initial admin (password: "admin123" - CHANGE IN PRODUCTION!)
-- Hash generated using bcrypt with 10 rounds
INSERT INTO admins (email, password_hash) VALUES (
  'admin@attendancr.com',
  '$2a$10$rQKN1CXd8.3xJz2QxJRxZuJz8vLXz1zQKxJz2QxJRxZuJz8vLXz1z'
);

-- Note: The above hash is a placeholder. Generate proper hash in production.
-- Use: const bcrypt = require('bcryptjs'); bcrypt.hashSync('yourpassword', 10);
