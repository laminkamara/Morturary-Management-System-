import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

// Re-export services from missingServices.ts
export { 
  autopsiesService, 
  tasksService, 
  notificationsService, 
  releasesService, 
  authService,
  subscribeToTable,
  subscribeToUserNotifications,
  settingsService
} from './missingServices'

type StorageUnit = Database['public']['Tables']['storage_units']['Row']
type Body = Database['public']['Tables']['bodies']['Row']
type User = Database['public']['Tables']['users']['Row']

// Storage Units
export const storageService = {
  async getAll(): Promise<StorageUnit[]> {
    try {
      const { data, error } = await supabase
        .from('storage_units')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching storage units:', error)
        throw new Error(`Failed to fetch storage units: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Storage service error:', error)
      throw error
    }
  },

  async getAvailable(): Promise<StorageUnit[]> {
    try {
      const { data, error } = await supabase
        .from('storage_units')
        .select('*')
        .eq('status', 'available')
        .order('name')

      if (error) {
        console.error('Error fetching available storage units:', error)
        throw new Error(`Failed to fetch available storage units: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Storage service error:', error)
      throw error
    }
  },

  async getById(id: string): Promise<StorageUnit | null> {
    try {
      const { data, error } = await supabase
        .from('storage_units')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No rows found
        }
        console.error('Error fetching storage unit:', error)
        throw new Error(`Failed to fetch storage unit: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Storage service error:', error)
      throw error
    }
  },

  async create(storageUnit: Database['public']['Tables']['storage_units']['Insert']): Promise<StorageUnit> {
    try {
      const { data, error } = await supabase
        .from('storage_units')
        .insert(storageUnit)
        .select()
        .single()

      if (error) {
        console.error('Error creating storage unit:', error)
        throw new Error(`Failed to create storage unit: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Storage service error:', error)
      throw error
    }
  },

  async update(id: string, updates: Database['public']['Tables']['storage_units']['Update']): Promise<StorageUnit> {
    try {
      const { data, error } = await supabase
        .from('storage_units')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating storage unit:', error)
        throw new Error(`Failed to update storage unit: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Storage service error:', error)
      throw error
    }
  },

  async updateStatus(id: string, newStatus: 'available' | 'occupied' | 'maintenance'): Promise<StorageUnit> {
    // Fetch the current unit
    const unit = await this.getById(id);
    if (!unit) throw new Error('Storage unit not found');
    if (unit.status === 'occupied' && newStatus === 'available') {
      throw new Error('Cannot make available: unit is currently occupied.');
    }
    if (unit.status === 'maintenance' && newStatus === 'available') {
      // Allow making available from maintenance
      const updated = await this.update(id, { status: 'available' });
      return updated;
    }
    if (newStatus === 'maintenance') {
      const updated = await this.update(id, { status: 'maintenance' });
      return updated;
    }
    if (newStatus === 'occupied') {
      const updated = await this.update(id, { status: 'occupied' });
      return updated;
    }
    if (newStatus === 'available') {
      const updated = await this.update(id, { status: 'available' });
      return updated;
    }
    throw new Error('Invalid status change');
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('storage_units')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting storage unit:', error)
        throw new Error(`Failed to delete storage unit: ${error.message}`)
      }
    } catch (error) {
      console.error('Storage service error:', error)
      throw error
    }
  }
}

// Bodies
export const bodiesService = {
  async getAll(): Promise<Body[]> {
    try {
      const { data, error } = await supabase
        .from('bodies')
        .select(`
          *,
          storage_units (*),
          registered_by_user:users!bodies_registered_by_fkey (*)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching bodies:', error)
        throw new Error(`Failed to fetch bodies: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Body service error:', error)
      throw error
    }
  },

  async getById(id: string): Promise<Body | null> {
    try {
      const { data, error } = await supabase
        .from('bodies')
        .select(`
          *,
          storage_units (*),
          registered_by_user:users!bodies_registered_by_fkey (*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No rows found
        }
        console.error('Error fetching body:', error)
        throw new Error(`Failed to fetch body: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Body service error:', error)
      throw error
    }
  },

  async create(body: Database['public']['Tables']['bodies']['Insert']): Promise<Body> {
    try {
      const { data, error } = await supabase
        .from('bodies')
        .insert(body)
        .select()
        .single()

      if (error) {
        console.error('Error creating body:', error)
        throw new Error(`Failed to create body: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Body service error:', error)
      throw error
    }
  },

  async update(id: string, updates: Database['public']['Tables']['bodies']['Update']): Promise<Body> {
    try {
      const { data, error } = await supabase
        .from('bodies')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating body:', error)
        throw new Error(`Failed to update body: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Body service error:', error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    try {
      // First check if the body has any related records
      const { data: autopsies } = await supabase
        .from('autopsies')
        .select('id')
        .eq('body_id', id);
      
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('body_id', id);
      
      const { data: releases } = await supabase
        .from('body_releases')
        .select('id')
        .eq('body_id', id);

      if (autopsies && autopsies.length > 0) {
        throw new Error('Cannot delete body: It has associated autopsies. Please delete the autopsies first.');
      }
      
      if (tasks && tasks.length > 0) {
        throw new Error('Cannot delete body: It has associated tasks. Please delete the tasks first.');
      }
      
      if (releases && releases.length > 0) {
        throw new Error('Cannot delete body: It has associated releases. Please delete the releases first.');
      }

      const { error } = await supabase
        .from('bodies')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting body:', error)
        throw new Error(`Failed to delete body: ${error.message}`)
      }
    } catch (error) {
      console.error('Body service error:', error)
      throw error
    }
  }
}

// Users
export const usersService = {
  async getAll(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching users:', error)
        throw new Error(`Failed to fetch users: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('User service error:', error)
      throw error
    }
  },

  async getById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No rows found
        }
        console.error('Error fetching user:', error)
        throw new Error(`Failed to fetch user: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('User service error:', error)
      throw error
    }
  },

  async getByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No rows found
        }
        console.error('Error fetching user by email:', error)
        throw new Error(`Failed to fetch user by email: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('User service error:', error)
      throw error
    }
  },

  async create(user: Database['public']['Tables']['users']['Insert']): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert(user)
        .select()
        .single()

      if (error) {
        console.error('Error creating user:', error)
        throw new Error(`Failed to create user: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('User service error:', error)
      throw error
    }
  },

  async update(id: string, updates: Database['public']['Tables']['users']['Update']): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating user:', error)
        throw new Error(`Failed to update user: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('User service error:', error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    try {
      // First check if the user has any related records
      const { data: bodies } = await supabase
        .from('bodies')
        .select('id')
        .eq('registered_by', id);
      
      const { data: autopsies } = await supabase
        .from('autopsies')
        .select('id')
        .or(`pathologist_id.eq.${id},assigned_by.eq.${id}`);
      
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .or(`assigned_to.eq.${id},assigned_by.eq.${id}`);
      
      const { data: releases } = await supabase
        .from('body_releases')
        .select('id')
        .or(`requested_by.eq.${id},approved_by.eq.${id}`);
      
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', id);

      if (bodies && bodies.length > 0) {
        throw new Error('Cannot delete user: They have registered bodies. Please reassign or delete the bodies first.');
      }
      
      if (autopsies && autopsies.length > 0) {
        throw new Error('Cannot delete user: They have associated autopsies. Please reassign or delete the autopsies first.');
      }
      
      if (tasks && tasks.length > 0) {
        throw new Error('Cannot delete user: They have associated tasks. Please reassign or delete the tasks first.');
      }
      
      if (releases && releases.length > 0) {
        throw new Error('Cannot delete user: They have associated releases. Please reassign or delete the releases first.');
      }
      
      if (notifications && notifications.length > 0) {
        // Delete notifications for this user
        await supabase
          .from('notifications')
          .delete()
          .eq('user_id', id);
      }

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting user:', error)
        throw new Error(`Failed to delete user: ${error.message}`)
      }
    } catch (error) {
      console.error('User service error:', error)
      throw error
    }
  }
}

// Add aliases for the services that components expect
export const bodyService = bodiesService
export const userService = usersService

// Test connection function
export const testConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('storage_units')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Connection test failed:', error)
      return false
    }

    console.log('Supabase connection successful')
    return true
  } catch (error) {
    console.error('Connection test error:', error)
    return false
  }
} 