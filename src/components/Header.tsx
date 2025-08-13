import { AuthUser } from '@/types/auth'
import UserDropdown from './UserDropdown'
import ImageWithFallback from './ImageWithFallback'

interface HeaderProps {
  user: AuthUser
  logoutAction: () => void
}

export default function Header({ user, logoutAction }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Business Logo or Company Name */}
          <div className="flex items-center space-x-4">
            {user.businessData?.avatar_url ? (
              <ImageWithFallback
                src={user.businessData.avatar_url}
                alt={user.businessData.company_name}
                className="h-12 w-auto object-contain"
                fallbackBehavior="placeholder"
                fallbackText={user.businessData?.company_name || 'Logo'}
              />
            ) : (
              <div className="text-xl font-bold text-gray-900">
                {user.businessData?.company_name || 'Dominate Local Leads AI'}
              </div>
            )}
          </div>

          {/* User Dropdown */}
          <UserDropdown user={user} logoutAction={logoutAction} />
        </div>
      </div>
    </header>
  )
}