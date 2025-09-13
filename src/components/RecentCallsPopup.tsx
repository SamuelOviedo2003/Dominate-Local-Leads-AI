'use client'

import { useState, useEffect, useCallback, memo, useRef } from 'react'
import { X, Mic } from 'lucide-react'
import { IncomingCall } from '@/types/leads'
import { authGet, authPatch } from '@/lib/auth-fetch'

interface RecentCallsPopupProps {
  callId: string
  isOpen: boolean
  onClose: () => void
}

interface CallDetails extends IncomingCall {
  recording_url?: string | null
  call_summary?: string | null
}

interface CustomAudioPlayerProps {
  src: string
  className?: string
}

const CustomAudioPlayer = ({ src, className = '' }: CustomAudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const updateTime = useCallback(() => {
    const audio = audioRef.current
    if (audio) setCurrentTime(audio.currentTime)
  }, [])

  const updateDuration = useCallback(() => {
    const audio = audioRef.current
    if (audio && !isNaN(audio.duration)) {
      setDuration(audio.duration)
      setIsLoading(false)
      setError(null)
    }
  }, [])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  const handleLoadStart = useCallback(() => {
    setIsLoading(true)
    setError(null)
  }, [])

  const handleError = useCallback(() => {
    setIsLoading(false)
    setIsPlaying(false)
    setError('Failed to load audio')
  }, [])

  const handleLoadedData = useCallback(() => {
    setIsLoading(false)
    setError(null)
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('loadeddata', handleLoadedData)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('error', handleError)

    return () => {
      if (audio) {
        audio.removeEventListener('timeupdate', updateTime)
        audio.removeEventListener('loadedmetadata', updateDuration)
        audio.removeEventListener('loadeddata', handleLoadedData)
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('loadstart', handleLoadStart)
        audio.removeEventListener('error', handleError)
        
        if (!audio.paused) {
          audio.pause()
        }
      }
    }
  }, [updateTime, updateDuration, handleLoadedData, handleEnded, handleLoadStart, handleError])

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || error) return

    try {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        const playPromise = audio.play()
        if (playPromise !== undefined) {
          await playPromise
          setIsPlaying(true)
        }
      }
    } catch (err) {
      // Audio playback error
      setError('Playback failed')
      setIsPlaying(false)
    }
  }, [isPlaying, error])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio || error) return

    const seekTime = parseFloat(e.target.value)
    if (!isNaN(seekTime) && seekTime >= 0 && seekTime <= duration) {
      audio.currentTime = seekTime
      setCurrentTime(seekTime)
    }
  }, [duration, error])

  const formatTime = useCallback((seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00'
    
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  if (error) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        {error}
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <audio 
        ref={audioRef} 
        src={src} 
        preload="metadata"
        crossOrigin="anonymous"
      />
      
      <div className="flex items-center space-x-3">
        <button
          onClick={togglePlay}
          disabled={isLoading || !!error}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="flex-1 flex items-center space-x-3">
          <span className="text-sm text-gray-600 w-10 text-right">
            {formatTime(currentTime)}
          </span>
          
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            disabled={isLoading || !duration || !!error}
            className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #4F46E5 0%, #4F46E5 ${duration > 0 ? (currentTime / duration) * 100 : 0}%, #E5E7EB ${duration > 0 ? (currentTime / duration) * 100 : 0}%, #E5E7EB 100%)`
            }}
          />
          
          <span className="text-sm text-gray-600 w-10">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}

const RecentCallsPopup = memo(function RecentCallsPopup({
  callId,
  isOpen,
  onClose
}: RecentCallsPopupProps) {
  const [callData, setCallData] = useState<CallDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdatingCallerType, setIsUpdatingCallerType] = useState(false)

  const fetchCallDetails = useCallback(async () => {
    if (!callId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await authGet(`/api/incoming-calls/${callId}`)

      if (!data.success) {
        throw new Error(data.error || 'Failed to load call details')
      }

      setCallData(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load call details')
    } finally {
      setIsLoading(false)
    }
  }, [callId])

  const handleCallerTypeChange = async (newCallerType: string) => {
    if (!callData || isUpdatingCallerType) return

    setIsUpdatingCallerType(true)
    
    try {
      const data = await authPatch(`/api/incoming-calls/${callId}`, {
        caller_type: newCallerType || null
      })

      if (!data.success) {
        throw new Error(data.error || 'Failed to update caller type')
      }

      // Update local state optimistically
      setCallData(prev => prev ? { ...prev, caller_type: newCallerType || null } : null)
      
    } catch (err) {
      // Failed to update caller type
      // Could add a toast notification here
    } finally {
      setIsUpdatingCallerType(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      fetchCallDetails()
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, fetchCallDetails, handleKeyDown])

  if (!isOpen) return null

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatHeaderDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }


  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
      style={{
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        margin: 0,
        padding: '16px'
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden relative transform transition-all duration-200 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Call Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin-smooth" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">{error}</div>
              <button
                onClick={fetchCallDetails}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Retry
              </button>
            </div>
          ) : callData ? (
            <div className="space-y-6">
              {/* Integrated Header */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Incoming call</h3>
                <p className="text-sm text-gray-500">{formatHeaderDateTime(callData.created_at)}</p>
              </div>

              {/* Call Summary */}
              {callData.call_summary && (
                <div className="mb-6">
                  <p className="text-gray-700 leading-relaxed">
                    {callData.call_summary}
                  </p>
                </div>
              )}

              {/* Recording Section */}
              {callData.recording_url ? (
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Mic className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Recording</span>
                  </div>
                  <CustomAudioPlayer src={callData.recording_url} />
                </div>
              ) : (
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Mic className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-400">Recording</span>
                  </div>
                  <p className="text-sm text-gray-500">No recording available for this call</p>
                </div>
              )}

              {/* Caller Type Dropdown */}
              <div className="space-y-3 border-t pt-6">
                <h3 className="font-semibold text-gray-900">Caller Type</h3>
                <div className="relative">
                  <select
                    value={callData.caller_type || ''}
                    onChange={(e) => handleCallerTypeChange(e.target.value)}
                    disabled={isUpdatingCallerType}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isUpdatingCallerType ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="">Select caller type...</option>
                    <option value="Client">Client</option>
                    <option value="Sales person">Sales person</option>
                    <option value="Other">Other</option>
                    <option value="Looking for job">Looking for job</option>
                  </select>
                  {isUpdatingCallerType && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
})

export default RecentCallsPopup