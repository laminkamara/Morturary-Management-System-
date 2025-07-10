import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = 'https://itmocilzcojagjbkrvyx.supabase.co';
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0bW9jaWx6Y29qYWdqYmtydnl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzcyNTMsImV4cCI6MjA2NjY1MzI1M30.ACbbGbvXRnm-gYaTucsBAuPzcE55nmnRgnpr5Jd5k6I';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false
  }
});

// Test database connection
export async function initializeDatabase() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection error:', error);
      throw error;
    }
    
    console.log('✅ Supabase database connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

// Query helper function
export async function query(table, options = {}) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(options.select || '*')
      .order(options.orderBy || 'created_at', { ascending: false });
    
    if (error) {
      console.error('Database query error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Insert helper
export async function insert(table, data) {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();
    
    if (error) {
      console.error('Database insert error:', error);
      throw error;
    }
    
    return result;
  } catch (error) {
    console.error('Database insert error:', error);
    throw error;
  }
}

// Update helper
export async function update(table, id, updates) {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Database update error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Database update error:', error);
    throw error;
  }
}

// Delete helper
export async function remove(table, id) {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Database delete error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Database delete error:', error);
    throw error;
  }
} 