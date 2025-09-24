'use client'

import React, { useState, useEffect, useCallback, memo } from 'react'
import { CheckSquare, Square, Clock, AlertCircle, Edit3, X, Trash2 } from 'lucide-react'
import { LoadingSystem } from '@/components/LoadingSystem'
import { AIRecapAction } from '@/types/leads'
import { authGet, authPatch, authDelete } from '@/lib/auth-fetch'

interface ActionsChecklistProps {
  leadId: string
  businessId: string
}

const ActionsChecklistComponent = ({ leadId, businessId }: ActionsChecklistProps) => {
  const [actions, setActions] = useState<AIRecapAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingActions, setUpdatingActions] = useState<Set<number>>(new Set())
  const [editingAction, setEditingAction] = useState<AIRecapAction | null>(null)
  const [editText, setEditText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const fetchActions = useCallback(async () => {
    if (!leadId || !businessId) return

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        leadId,
        businessId
      })

      const response = await authGet(`/api/actions?${params}`)

      if (response.success) {
        setActions(response.data || [])
      } else {
        throw new Error(response.error || 'Failed to fetch actions')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch actions'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [leadId, businessId])

  const toggleAction = useCallback(async (actionId: number, currentStatus: boolean) => {
    setUpdatingActions(prev => new Set(prev).add(actionId))

    try {
      const response = await authPatch(`/api/actions/${actionId}`, {
        action_done: !currentStatus
      })

      if (response.success) {
        setActions(prevActions =>
          prevActions.map(action =>
            action.ai_recap_action_id === actionId
              ? { ...action, action_done: !currentStatus, updated_at: new Date().toISOString() }
              : action
          )
        )
      } else {
        throw new Error(response.error || 'Failed to update action')
      }
    } catch (err) {
      console.error('Error updating action:', err)
      // You could add a toast notification here
    } finally {
      setUpdatingActions(prev => {
        const newSet = new Set(prev)
        newSet.delete(actionId)
        return newSet
      })
    }
  }, [])

  const handleEditAction = useCallback((action: AIRecapAction) => {
    setEditingAction(action)
    setEditText(action.recap_action)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingAction(null)
    setEditText('')
    setShowDeleteConfirm(false)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingAction || !editText.trim()) return

    setIsSaving(true)

    try {
      const response = await authPatch(`/api/actions/${editingAction.ai_recap_action_id}`, {
        recap_action: editText.trim()
      })

      if (response.success) {
        setActions(prevActions =>
          prevActions.map(action =>
            action.ai_recap_action_id === editingAction.ai_recap_action_id
              ? { ...action, recap_action: editText.trim(), updated_at: new Date().toISOString() }
              : action
          )
        )
        setEditingAction(null)
        setEditText('')
      } else {
        throw new Error(response.error || 'Failed to update action text')
      }
    } catch (err) {
      console.error('Error updating action text:', err)
      // You could add a toast notification here
    } finally {
      setIsSaving(false)
    }
  }, [editingAction, editText])

  const handleDeleteAction = useCallback(async () => {
    if (!editingAction) return

    setIsDeleting(true)

    try {
      const response = await authDelete(`/api/actions/${editingAction.ai_recap_action_id}`)

      if (response.success) {
        // Remove the action from the local state
        setActions(prevActions =>
          prevActions.filter(action => action.ai_recap_action_id !== editingAction.ai_recap_action_id)
        )
        setEditingAction(null)
        setEditText('')
        setShowDeleteConfirm(false)
      } else {
        throw new Error(response.error || 'Failed to delete action')
      }
    } catch (err) {
      console.error('Error deleting action:', err)
      // You could add a toast notification here
    } finally {
      setIsDeleting(false)
    }
  }, [editingAction])

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true)
  }, [])

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false)
  }, [])

  useEffect(() => {
    fetchActions()
  }, [fetchActions])

  // Separate incomplete and complete actions
  const incompleteActions = actions.filter(action => !action.action_done)
  const completedActions = actions.filter(action => action.action_done)

  // Handle loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <CheckSquare className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
        </div>
        <div className="flex items-center justify-center flex-1">
          <LoadingSystem size="md" message="Loading actions..." />
        </div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-sm mb-2">Error loading actions</div>
            <button
              onClick={fetchActions}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <CheckSquare className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
      </div>

      {actions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <div className="text-gray-500 text-sm">No actions available</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Incomplete Actions Section */}
          {incompleteActions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-orange-500" />
                <h4 className="text-sm font-medium text-gray-700">Pending Actions</h4>
              </div>
              <div className="space-y-2">
                {incompleteActions.map((action) => (
                  <div
                    key={action.ai_recap_action_id}
                    className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200"
                  >
                    <button
                      onClick={() => toggleAction(action.ai_recap_action_id, action.action_done)}
                      disabled={updatingActions.has(action.ai_recap_action_id)}
                      className="flex-shrink-0 mt-0.5 transition-colors"
                    >
                      {updatingActions.has(action.ai_recap_action_id) ? (
                        <div className="w-5 h-5 border-2 border-orange-300 border-t-orange-600 rounded animate-spin" />
                      ) : (
                        <Square className="w-5 h-5 text-orange-600 hover:text-orange-700" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-gray-800 leading-relaxed flex-1">
                          {action.recap_action}
                        </p>
                        <button
                          onClick={() => handleEditAction(action)}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Edit action"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                      {action.action_response && (
                        <p className="text-xs text-gray-600 mt-1 italic">
                          Response: {action.action_response}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Actions Section */}
          {completedActions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckSquare className="w-4 h-4 text-green-500" />
                <h4 className="text-sm font-medium text-gray-700">Completed Actions</h4>
              </div>
              <div className="space-y-2">
                {completedActions.map((action) => (
                  <div
                    key={action.ai_recap_action_id}
                    className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <button
                      onClick={() => toggleAction(action.ai_recap_action_id, action.action_done)}
                      disabled={updatingActions.has(action.ai_recap_action_id)}
                      className="flex-shrink-0 mt-0.5 transition-colors"
                    >
                      {updatingActions.has(action.ai_recap_action_id) ? (
                        <div className="w-5 h-5 border-2 border-green-300 border-t-green-600 rounded animate-spin" />
                      ) : (
                        <CheckSquare className="w-5 h-5 text-green-600 hover:text-green-700" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-gray-600 leading-relaxed line-through flex-1">
                          {action.recap_action}
                        </p>
                        <button
                          onClick={() => handleEditAction(action)}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Edit action"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                      {action.action_response && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          Response: {action.action_response}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Action Modal */}
      {editingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Action</h3>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label htmlFor="edit-action-text" className="block text-sm font-medium text-gray-700 mb-2">
                Action Text
              </label>
              <textarea
                id="edit-action-text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                placeholder="Enter action text..."
              />
            </div>

            <div className="flex gap-3 justify-between">
              <div>
                <button
                  onClick={handleDeleteClick}
                  disabled={isSaving || isDeleting}
                  className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving || isDeleting}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editText.trim() || isDeleting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && editingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Action</h3>
              <button
                onClick={handleCancelDelete}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">
                Are you sure you want to delete this action? This action cannot be undone.
              </p>
              <div className="bg-gray-50 p-3 rounded border">
                <p className="text-sm text-gray-800 font-medium">
                  {editingAction.recap_action}
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAction}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Export memoized component for performance optimization
export const ActionsChecklist = memo(ActionsChecklistComponent)