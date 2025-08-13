import { getHeaderData } from '@/lib/auth-helpers'
import UniversalHeader from '@/components/UniversalHeader'
import { logout } from './actions'

export default async function DashboardPage() {
  const { user, availableBusinesses } = await getHeaderData()

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-slate-800 via-brand-slate-700 to-brand-orange-900">
      <UniversalHeader 
        user={user} 
        logoutAction={logout}
        availableBusinesses={availableBusinesses}
      />
      
      {/* Main Dashboard Content - Blank for now */}
      <main className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-float"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-orange-300/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-slate-300/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-16">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
            <p className="text-lg text-white/80">Your main dashboard content will be added here.</p>
          </div>
        </div>
      </main>
    </div>
  )
}