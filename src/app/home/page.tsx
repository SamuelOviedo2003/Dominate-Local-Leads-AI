import { getHeaderData } from '@/lib/auth-helpers'
import UniversalHeader from '@/components/UniversalHeader'
import { logout } from './actions'

export default async function HomePage() {
  const { user, availableBusinesses } = await getHeaderData()

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-orange-50 via-brand-slate-50 to-brand-orange-100">
      <UniversalHeader 
        user={user} 
        logoutAction={logout}
        availableBusinesses={availableBusinesses}
      />
      
      {/* Hero Section */}
      <main className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-orange-500/5 via-transparent to-brand-slate-600/5"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-brand-orange-400/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-slate-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 container mx-auto px-4 py-16">
          {/* Split Layout Hero */}
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            {/* Left Content */}
            <div className="space-y-8 animate-slide-up">
              <div className="space-y-4">
                <div className="inline-flex items-center px-4 py-2 bg-brand-orange-100 text-brand-orange-800 rounded-full text-sm font-medium animate-fade-in">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Roofing Lead Management
                </div>
                
                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Dominate Your
                  <span className="bg-gradient-to-r from-brand-orange-500 via-brand-orange-400 to-brand-orange-300 bg-clip-text text-transparent"> Local Market</span>
                </h1>
                
                <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                  Transform your roofing business with AI-powered lead management. Track, nurture, and convert more prospects than ever before.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-brand-orange-500 to-brand-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 animate-bounce-gentle">
                  <svg className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Get Started Now
                </button>
                
                <button className="inline-flex items-center px-8 py-4 bg-white/80 backdrop-blur-sm text-brand-slate-700 font-semibold rounded-xl border border-brand-slate-200 hover:bg-white hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  View Dashboard
                </button>
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-brand-slate-200">
                <div className="text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
                  <div className="text-3xl font-bold text-brand-orange-600">10K+</div>
                  <div className="text-sm text-brand-slate-600">Leads Managed</div>
                </div>
                <div className="text-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
                  <div className="text-3xl font-bold text-brand-slate-600">95%</div>
                  <div className="text-sm text-brand-slate-600">Success Rate</div>
                </div>
                <div className="text-center animate-fade-in" style={{ animationDelay: '0.9s' }}>
                  <div className="text-3xl font-bold text-teal-600">24/7</div>
                  <div className="text-sm text-brand-slate-600">AI Support</div>
                </div>
              </div>
            </div>

            {/* Right Content - Property Image */}
            <div className="relative animate-scale-in" style={{ animationDelay: '0.2s' }}>
              <div className="relative group">
                {/* Main Property Image */}
                <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 aspect-[4/3]">
                  <img
                    src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1000&auto=format&fit=crop"
                    alt="Modern house with beautiful roofing"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                  
                  {/* Overlay Elements */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                  
                  {/* Floating Stats Card */}
                  <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg animate-float">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <div>
                        <div className="text-sm font-semibold text-brand-slate-900">Lead Status</div>
                        <div className="text-xs text-brand-slate-600">Active: 247 leads</div>
                      </div>
                    </div>
                  </div>

                  {/* Success Badge */}
                  <div className="absolute bottom-6 right-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg animate-float" style={{ animationDelay: '1s' }}>
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-semibold">Job Complete</span>
                    </div>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-r from-brand-orange-400 to-brand-orange-500 rounded-2xl opacity-20 transform rotate-12 animate-float"></div>
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-r from-brand-slate-400 to-brand-orange-400 rounded-2xl opacity-20 transform -rotate-12 animate-float" style={{ animationDelay: '1.5s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative py-20 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold text-brand-slate-900 mb-4">
              Everything You Need to 
              <span className="bg-gradient-to-r from-brand-orange-500 to-brand-orange-600 bg-clip-text text-transparent"> Succeed</span>
            </h2>
            <p className="text-xl text-brand-slate-600 max-w-2xl mx-auto">
              Powerful tools designed specifically for roofing contractors to streamline operations and maximize conversions.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: '📊',
                title: 'Dashboard',
                description: 'Real-time analytics and performance insights',
                color: 'from-brand-orange-500 to-brand-orange-600',
                delay: '0s'
              },
              {
                icon: '🎯',
                title: 'New Leads',
                description: 'Capture and manage incoming prospects',
                color: 'from-teal-500 to-teal-600',
                delay: '0.1s'
              },
              {
                icon: '👥',
                title: 'Salesman',
                description: 'Track sales team performance and activities',
                color: 'from-brand-slate-500 to-brand-slate-600',
                delay: '0.2s'
              },
              {
                icon: '📞',
                title: 'Incoming Calls',
                description: 'Monitor and analyze call quality and outcomes',
                color: 'from-brand-orange-400 to-brand-orange-500',
                delay: '0.3s'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 animate-slide-up border border-brand-slate-100"
                style={{ animationDelay: feature.delay }}
              >
                <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center text-white text-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-brand-slate-900 mb-2">{feature.title}</h3>
                <p className="text-brand-slate-600 text-sm leading-relaxed">{feature.description}</p>
                <div className="mt-4">
                  <button className="text-brand-orange-600 hover:text-brand-orange-800 font-medium text-sm group-hover:underline transition-colors duration-200">
                    Learn More →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}