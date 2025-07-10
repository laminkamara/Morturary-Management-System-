import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://itmocilzcojagjbkrvyx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0bW9jaWx6Y29qYWdqYmtydnl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzcyNTMsImV4cCI6MjA2NjY1MzI1M30.ACbbGbvXRnm-gYaTucsBAuPzcE55nmnRgnpr5Jd5k6I'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types based on your schema
export type Database = {
  public: {
    Tables: {
      storage_units: {
        Row: {
          id: string
          name: string
          type: 'fridge' | 'freezer'
          location: string
          temperature: string
          status: 'available' | 'occupied' | 'maintenance'
          assigned_body_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          name: string
          type: 'fridge' | 'freezer'
          location: string
          temperature: string
          status?: 'available' | 'occupied' | 'maintenance'
          assigned_body_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: 'fridge' | 'freezer'
          location?: string
          temperature?: string
          status?: 'available' | 'occupied' | 'maintenance'
          assigned_body_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bodies: {
        Row: {
          id: string
          tag_id: string
          full_name: string
          age: number
          gender: 'male' | 'female' | 'other'
          date_of_death: string
          intake_time: string
          storage_id: string | null
          next_of_kin_name: string
          next_of_kin_relationship: string
          next_of_kin_phone: string
          next_of_kin_address: string
          status: 'registered' | 'autopsy_scheduled' | 'autopsy_completed' | 'released'
          registered_by: string
          death_certificate: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          tag_id: string
          full_name: string
          age: number
          gender: 'male' | 'female' | 'other'
          date_of_death: string
          intake_time: string
          storage_id?: string | null
          next_of_kin_name: string
          next_of_kin_relationship: string
          next_of_kin_phone: string
          next_of_kin_address: string
          status?: 'registered' | 'autopsy_scheduled' | 'autopsy_completed' | 'released'
          registered_by: string
          death_certificate?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tag_id?: string
          full_name?: string
          age?: number
          gender?: 'male' | 'female' | 'other'
          date_of_death?: string
          intake_time?: string
          storage_id?: string | null
          next_of_kin_name?: string
          next_of_kin_relationship?: string
          next_of_kin_phone?: string
          next_of_kin_address?: string
          status?: 'registered' | 'autopsy_scheduled' | 'autopsy_completed' | 'released'
          registered_by?: string
          death_certificate?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      users: {
        Row: {
          id: string
          name: string
          email: string
          password_hash: string
          role: 'admin' | 'staff' | 'pathologist'
          phone: string | null
          status: 'active' | 'inactive'
          last_login: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          name: string
          email: string
          password_hash: string
          role: 'admin' | 'staff' | 'pathologist'
          phone?: string | null
          status?: 'active' | 'inactive'
          last_login?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          password_hash?: string
          role?: 'admin' | 'staff' | 'pathologist'
          phone?: string | null
          status?: 'active' | 'inactive'
          last_login?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
  }
}