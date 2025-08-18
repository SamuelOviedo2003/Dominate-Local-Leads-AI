'use client'

import { useState, useRef, useEffect, useCallback, memo } from 'react'

interface AudioPlayerProps {
  src: string
  className?: string
}

const AudioPlayerComponent = ({ src, className = '' }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoized event handlers to prevent recreation on every render
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

    // Add all event listeners
    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('loadeddata', handleLoadedData)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('error', handleError)

    // Cleanup function to prevent memory leaks
    return () => {
      if (audio) {
        audio.removeEventListener('timeupdate', updateTime)
        audio.removeEventListener('loadedmetadata', updateDuration)
        audio.removeEventListener('loadeddata', handleLoadedData)
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('loadstart', handleLoadStart)
        audio.removeEventListener('error', handleError)
        
        // Stop audio if playing during cleanup
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
      console.error('Audio playback error:', err)
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
      <div className={`flex items-center space-x-3 text-gray-500 ${className}`}>
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
        <span className="text-sm text-gray-500">{error}</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <audio 
        ref={audioRef} 
        src={src} 
        preload="metadata"
        crossOrigin="anonymous"
      />
      
      <button
        onClick={togglePlay}
        disabled={isLoading || !!error}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        title={isPlaying ? 'Pause audio' : 'Play audio'}
      >
        {isLoading ? (
          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 flex items-center space-x-2">
        <span className="text-xs text-gray-500 w-10 text-right" aria-label="Current time">
          {formatTime(currentTime)}
        </span>
        
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          disabled={isLoading || !duration || !!error}
          className="flex-1 audio-slider"
          aria-label="Audio progress"
          style={{
            background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${duration > 0 ? (currentTime / duration) * 100 : 0}%, #E5E7EB ${duration > 0 ? (currentTime / duration) * 100 : 0}%, #E5E7EB 100%)`
          }}
        />
        
        <span className="text-xs text-gray-500 w-10" aria-label="Total duration">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const AudioPlayer = memo(AudioPlayerComponent)