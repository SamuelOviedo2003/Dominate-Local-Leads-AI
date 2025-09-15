'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { CheckSquare, Square, Clock, AlertCircle } from 'lucide-react'
import { LoadingSystem } from '@/components/LoadingSystem'
import { AIRecapAction } from '@/types/leads'
import { authGet, authPatch } from '@/lib/auth-fetch'

interface ActionsChecklistProps {
  leadId: string
  businessId: string
}

const ActionsChecklistComponent = ({ leadId, businessId }: ActionsChecklistProps) => {
  const [actions, setActions] = useState<AIRecapAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingActions, setUpdatingActions] = useState<Set<number>>(new Set())

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
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {action.recap_action}
                      </p>
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
                      <p className="text-sm text-gray-600 leading-relaxed line-through">
                        {action.recap_action}
                      </p>
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
    </div>
  )
}

// Export memoized component for performance optimization
export const ActionsChecklist = memo(ActionsChecklistComponent)