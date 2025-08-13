'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, LogOut, Settings } from 'lucide-react'
import { AuthUser } from '@/types/auth'

interface UserDropdownProps {
  user: AuthUser
  logoutAction: () => void
}

export default function UserDropdown({ user, logoutAction }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Get user initials for avatar
  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-300"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User menu"
      >        
        {/* User Email */}
        <span className="text-sm text-white font-medium max-w-32 truncate">
          {user.email}
        </span>
        
        {/* Chevron Icon */}
        <ChevronDown 
          className={`w-4 h-4 text-white/80 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 dark:bg-gray-800 dark:border-gray-600">
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                {getInitials(user.email)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.profile?.full_name || user.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
                {user.profile?.role === 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Super Admin
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Menu Options */}
          <div className="py-1">
            {/* Settings Link */}
            <Link
              href="/settings"
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>

            {/* Logout Option */}
            <button
              onClick={() => {
                setIsOpen(false)
                logoutAction()
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}