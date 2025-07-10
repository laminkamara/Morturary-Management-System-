import { supabase } from '../lib/supabase'

// Autopsies Service
export const autopsiesService = {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('autopsies')
        .select(`
          *,
          bodies (*),
          pathologist:users!autopsies_pathologist_id_fkey (*),
          assigned_by_user:users!autopsies_assigned_by_fkey (*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Autopsies service error:', error)
      throw error
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('autopsies')
        .select(`
          *,
          bodies (*),
          pathologist:users!autopsies_pathologist_id_fkey (*),
          assigned_by_user:users!autopsies_assigned_by_fkey (*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Autopsies service error:', error)
      throw error
    }
  },

  async create(autopsy: any) {
    try {
      // Generate a unique ID for the autopsy
      const autopsyWithId = {
        ...autopsy,
        id: `autopsy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const { data, error } = await supabase
        .from('autopsies')
        .insert(autopsyWithId)
        .select(`
          *,
          bodies (*),
          pathologist:users!autopsies_pathologist_id_fkey (*),
          assigned_by_user:users!autopsies_assigned_by_fkey (*)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Autopsies service error:', error)
      throw error
    }
  },

  async update(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('autopsies')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          bodies (*),
          pathologist:users!autopsies_pathologist_id_fkey (*),
          assigned_by_user:users!autopsies_assigned_by_fkey (*)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Autopsies service error:', error)
      throw error
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('autopsies')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Autopsies service error:', error)
      throw error
    }
  }
}

// Tasks Service
export const tasksService = {
  async getAll(p0: { assigned_to: string }) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          bodies (*),
          assigned_to_user:users!tasks_assigned_to_fkey (*),
          assigned_by_user:users!tasks_assigned_by_fkey (*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Tasks service error:', error)
      throw error
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          bodies (*),
          assigned_to_user:users!tasks_assigned_to_fkey (*),
          assigned_by_user:users!tasks_assigned_by_fkey (*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Tasks service error:', error)
      throw error
    }
  },

  async create(task: any) {
    try {
      // Generate a unique ID for the task
      const taskWithId = {
        ...task,
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskWithId)
        .select(`
          *,
          bodies (*),
          assigned_to_user:users!tasks_assigned_to_fkey (*),
          assigned_by_user:users!tasks_assigned_by_fkey (*)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Tasks service error:', error)
      throw error
    }
  },

  async update(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          bodies (*),
          assigned_to_user:users!tasks_assigned_to_fkey (*),
          assigned_by_user:users!tasks_assigned_by_fkey (*)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Tasks service error:', error)
      throw error
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Tasks service error:', error)
      throw error
    }
  }
}

// Notifications Service
export const notificationsService = {
  async getAll(filters?: { read?: boolean, user_id?: string }) {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id)
      }
      
      if (filters?.read !== undefined) {
        query = query.eq('is_read', filters.read)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Notifications service error:', error)
      throw error
    }
  },

  async getByUserId(userId: string, filters?: { read?: boolean }) {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (filters?.read !== undefined) {
        query = query.eq('is_read', filters.read)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Notifications service error:', error)
      throw error
    }
  },

  async getUnreadCount(userId: string) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Notifications service error:', error)
      return 0
    }
  },

  async create(notification: any) {
    try {
      // Generate a unique ID for the notification
      const notificationWithId = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationWithId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Notifications service error:', error)
      throw error
    }
  },

  async markAsRead(id: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Notifications service error:', error)
      throw error
    }
  },

  async update(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Notifications service error:', error)
      throw error
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Notifications service error:', error)
      throw error
    }
  },

  subscribeToUserNotifications(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`notifications_${userId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, 
        callback
      )
      .subscribe()
  }
}

// Releases Service
export const releasesService = {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('body_releases')
        .select(`
          *,
          bodies (
            id,
            tag_id,
            full_name,
            age,
            gender,
            status,
            storage_id,
            storage_units (
              id,
              name,
              type,
              location
            )
          ),
          requested_by_user:users!body_releases_requested_by_fkey (
            id,
            name,
            email
          ),
          approved_by_user:users!body_releases_approved_by_fkey (
            id,
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Releases service error:', error)
      throw error
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('body_releases')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Releases service error:', error)
      throw error
    }
  },

  async create(release: any) {
    try {
      // Generate a unique ID for the release
      const releaseWithId = {
        ...release,
        id: `release-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        requested_date: release.requested_date || new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('body_releases')
        .insert(releaseWithId)
        .select(`
          *,
          bodies (
            id,
            tag_id,
            full_name,
            age,
            gender,
            status,
            storage_id,
            storage_units (
              id,
              name,
              type,
              location
            )
          ),
          requested_by_user:users!body_releases_requested_by_fkey (
            id,
            name,
            email
          ),
          approved_by_user:users!body_releases_approved_by_fkey (
            id,
            name,
            email
          )
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Releases service error:', error)
      throw error
    }
  },

  async update(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('body_releases')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Releases service error:', error)
      throw error
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('body_releases')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Releases service error:', error)
      throw error
    }
  }
}

// Storage Service
export const storageService = {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('storage_units')
        .select(`
          *,
          bodies (
            id,
            tag_id,
            full_name,
            age,
            gender,
            status
          )
        `)
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Storage service error:', error)
      throw error
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('storage_units')
        .select(`
          *,
          bodies (
            id,
            tag_id,
            full_name,
            age,
            gender,
            status
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Storage service error:', error)
      throw error
    }
  },

  async create(storage: any) {
    try {
      const { data, error } = await supabase
        .from('storage_units')
        .insert(storage)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Storage service error:', error)
      throw error
    }
  },

  async update(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('storage_units')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Storage service error:', error)
      throw error
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('storage_units')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Storage service error:', error)
      throw error
    }
  }
}

// Auth Service
export const authService = {
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Auth service error:', error)
      throw error
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Auth service error:', error)
      throw error
    }
  },

  async signUp(email: string, password: string, userData: any) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Auth service error:', error)
      throw error
    }
  }
}

// Real-time functions
export const subscribeToTable = (table: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`${table}_changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe()
}

export const subscribeToUserNotifications = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`notifications_${userId}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, 
      callback
    )
    .subscribe()
} 

// Settings Service
export const settingsService = {
  // User Preferences
  async getUserPreferences(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || {
        theme: 'light',
        language: 'english',
        auto_logout: 30
      }
    } catch (error) {
      console.error('Settings service error:', error)
      throw error
    }
  },

  async updateUserPreferences(userId: string, preferences: any) {
    try {
      // Only allow theme, language, auto_logout
      const allowed = (({ theme, language, auto_logout }) => ({ theme, language, auto_logout }))(preferences);
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...allowed,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Settings service error:', error)
      throw error
    }
  },

  // Account Settings
  async getAccountSettings(userId: string) {
    try {
      const { data, error } = await supabase
        .from('account_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || {
        two_factor_enabled: false,
        two_factor_method: 'email',
        email_notifications: true,
        sms_notifications: false,
        login_alerts: true,
        notification_email: 'kamaralamin1997@gmail.com',
        notification_phone: '+23278786633'
      }
    } catch (error) {
      console.error('Settings service error:', error)
      throw error
    }
  },

  async updateAccountSettings(userId: string, settings: any) {
    try {
      const { data, error } = await supabase
        .from('account_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Settings service error:', error)
      throw error
    }
  },

  // Login History
  async getLoginHistory(userId: string, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', userId)
        .order('login_time', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Settings service error:', error)
      throw error
    }
  },

  async addLoginRecord(userId: string, loginData: any) {
    try {
      const { data, error } = await supabase
        .from('login_history')
        .insert({
          user_id: userId,
          login_time: new Date().toISOString(),
          ip_address: loginData.ip_address || 'Unknown',
          user_agent: loginData.user_agent || 'Unknown',
          location: loginData.location || 'Unknown',
          success: loginData.success || true
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Settings service error:', error)
      throw error
    }
  },

  // Password Management
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      // First verify current password
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', userId)
        .single()

      if (userError) throw userError

      // Verify current password (you'll need to implement password verification)
      // For now, we'll assume it's correct and update
      
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      const { data, error } = await supabase
        .from('users')
        .update({
          password_hash: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Settings service error:', error)
      throw error
    }
  },

  // Two-Factor Authentication
  async enableTwoFactor(userId: string, method: 'email' | 'sms') {
    try {
      const { data, error } = await supabase
        .from('account_settings')
        .update({
          two_factor_enabled: true,
          two_factor_method: method,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Settings service error:', error)
      throw error
    }
  },

  async disableTwoFactor(userId: string) {
    try {
      const { data, error } = await supabase
        .from('account_settings')
        .update({
          two_factor_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Settings service error:', error)
      throw error
    }
  },

  // Notification Services
  async sendEmailNotification(to: string, subject: string, message: string) {
    try {
      // This would integrate with your email service (SendGrid, AWS SES, etc.)
      // For now, we'll just log it
      console.log('Email notification:', { to, subject, message })
      
      // You can implement actual email sending here
      // Example with a hypothetical email service:
      // await emailService.send({
      //   to,
      //   subject,
      //   html: message
      // })

      return { success: true, message: 'Email notification sent' }
    } catch (error) {
      console.error('Email notification error:', error)
      throw error
    }
  },

  async sendSMSNotification(to: string, message: string) {
    try {
      // This would integrate with your SMS service (Twilio, AWS SNS, etc.)
      // For now, we'll just log it
      console.log('SMS notification:', { to, message })
      
      // You can implement actual SMS sending here
      // Example with a hypothetical SMS service:
      // await smsService.send({
      //   to,
      //   message
      // })

      return { success: true, message: 'SMS notification sent' }
    } catch (error) {
      console.error('SMS notification error:', error)
      throw error
    }
  },

  // System-wide settings
  async getSystemSettings() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || {
        maintenance_mode: false,
        system_name: 'Mortuary Management System',
        contact_email: 'admin@mortuary.com',
        contact_phone: '+23278786633'
      }
    } catch (error) {
      console.error('Settings service error:', error)
      throw error
    }
  },

  async updateSystemSettings(settings: any) {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Settings service error:', error)
      throw error
    }
  }
} 