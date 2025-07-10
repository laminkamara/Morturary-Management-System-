import React, { useState, useEffect } from 'react'
import { Plus, Save, X, AlertCircle } from 'lucide-react'
import { storageService, bodyService, userService } from '../../services/database'
import type { Database } from '../../lib/supabase'

type StorageUnit = Database['public']['Tables']['storage_units']['Row']
type User = Database['public']['Tables']['users']['Row']

interface BodyFormData {
  tagId: string
  fullName: string
  age: string
  gender: 'male' | 'female' | 'other'
  dateOfDeath: string
  intakeTime: string
  storageId: string
  nextOfKinName: string
  nextOfKinRelationship: string
  nextOfKinPhone: string
  nextOfKinAddress: string
  registeredBy: string
  deathCertificate: string
  notes: string
}

const BodyRegistration: React.FC = () => {
  const [formData, setFormData] = useState<BodyFormData>({
    tagId: '',
    fullName: '',
    age: '',
    gender: 'male',
    dateOfDeath: '',
    intakeTime: new Date().toISOString().slice(0, 16),
    storageId: '',
    nextOfKinName: '',
    nextOfKinRelationship: '',
    nextOfKinPhone: '',
    nextOfKinAddress: '',
    registeredBy: '',
    deathCertificate: '',
    notes: ''
  })

  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setError(null)
      await Promise.all([
        loadStorageUnits(),
        loadUsers()
      ])
    } catch (error) {
      console.error('Error loading initial data:', error)
      setError('Failed to load initial data. Please refresh the page.')
    }
  }

  const loadStorageUnits = async () => {
    try {
      console.log('Loading storage units...')
      const units = await storageService.getAvailable()
      console.log('Storage units loaded:', units)
      setStorageUnits(units)
    } catch (error) {
      console.error('Error loading storage units:', error)
      setError(`Error loading storage units: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  const loadUsers = async () => {
    try {
      console.log('Loading users...')
      const allUsers = await userService.getAll()
      console.log('Users loaded:', allUsers)
      setUsers(allUsers)
    } catch (error) {
      console.error('Error loading users:', error)
      setError(`Error loading users: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const generateTagId = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `B${timestamp}${random}`
  }

  const handleGenerateTagId = () => {
    setFormData(prev => ({
      ...prev,
      tagId: generateTagId()
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.tagId.trim()) return 'Tag ID is required'
    if (!formData.fullName.trim()) return 'Full name is required'
    if (!formData.age || parseInt(formData.age) < 0) return 'Valid age is required'
    if (!formData.dateOfDeath) return 'Date of death is required'
    if (!formData.intakeTime) return 'Intake time is required'
    if (!formData.nextOfKinName.trim()) return 'Next of kin name is required'
    if (!formData.nextOfKinRelationship.trim()) return 'Next of kin relationship is required'
    if (!formData.nextOfKinPhone.trim()) return 'Next of kin phone is required'
    if (!formData.nextOfKinAddress.trim()) return 'Next of kin address is required'
    if (!formData.registeredBy) return 'Registered by is required'
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const bodyData: Database['public']['Tables']['bodies']['Insert'] = {
        id: crypto.randomUUID(),
        tag_id: formData.tagId,
        full_name: formData.fullName,
        age: parseInt(formData.age),
        gender: formData.gender,
        date_of_death: formData.dateOfDeath,
        intake_time: formData.intakeTime,
        storage_id: formData.storageId || null,
        next_of_kin_name: formData.nextOfKinName,
        next_of_kin_relationship: formData.nextOfKinRelationship,
        next_of_kin_phone: formData.nextOfKinPhone,
        next_of_kin_address: formData.nextOfKinAddress,
        registered_by: formData.registeredBy,
        death_certificate: formData.deathCertificate || null,
        notes: formData.notes || null,
        status: 'registered'
      }

      await bodyService.create(bodyData)

      // Update storage unit if assigned
      if (formData.storageId) {
        await storageService.update(formData.storageId, {
          status: 'occupied',
          assigned_body_id: bodyData.id
        })
      }

      setSuccess('Body registered successfully!')
      
      // Reset form
      setFormData({
        tagId: '',
        fullName: '',
        age: '',
        gender: 'male',
        dateOfDeath: '',
        intakeTime: new Date().toISOString().slice(0, 16),
        storageId: '',
        nextOfKinName: '',
        nextOfKinRelationship: '',
        nextOfKinPhone: '',
        nextOfKinAddress: '',
        registeredBy: '',
        deathCertificate: '',
        notes: ''
      })

      // Reload storage units to reflect changes
      await loadStorageUnits()

    } catch (error) {
      console.error('Error registering body:', error)
      setError(`Failed to register body: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      tagId: '',
      fullName: '',
      age: '',
      gender: 'male',
      dateOfDeath: '',
      intakeTime: new Date().toISOString().slice(0, 16),
      storageId: '',
      nextOfKinName: '',
      nextOfKinRelationship: '',
      nextOfKinPhone: '',
      nextOfKinAddress: '',
      registeredBy: '',
      deathCertificate: '',
      notes: ''
    })
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Plus className="mr-3 h-6 w-6" />
            Body Registration
          </h2>
          <p className="text-gray-600 mt-1">Register a new body in the morgue system</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-red-700">{error}</div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="text-green-700">{success}</div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag ID *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    name="tagId"
                    value={formData.tagId}
                    onChange={handleInputChange}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter tag ID"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGenerateTagId}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age *
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Age"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Death *
                  </label>
                  <input
                    type="datetime-local"
                    name="dateOfDeath"
                    value={formData.dateOfDeath}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intake Time *
                  </label>
                  <input
                    type="datetime-local"
                    name="intakeTime"
                    value={formData.intakeTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Storage Unit
                </label>
                <select
                  name="storageId"
                  value={formData.storageId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select storage unit (optional)</option>
                  {storageUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} - {unit.type} ({unit.location})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Next of Kin Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Next of Kin Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  name="nextOfKinName"
                  value={formData.nextOfKinName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Next of kin name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship *
                </label>
                <input
                  type="text"
                  name="nextOfKinRelationship"
                  value={formData.nextOfKinRelationship}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Spouse, Child, Parent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="nextOfKinPhone"
                  value={formData.nextOfKinPhone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <textarea
                  name="nextOfKinAddress"
                  value={formData.nextOfKinAddress}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registered By *
                </label>
                <select
                  name="registeredBy"
                  value={formData.registeredBy}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Death Certificate
                </label>
                <input
                  type="text"
                  name="deathCertificate"
                  value={formData.deathCertificate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Death certificate number or reference"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes or observations"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center"
            >
              <X className="mr-2 h-4 w-4" />
              Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Registering...' : 'Register Body'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BodyRegistration