import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/theme'
import { getSetting, KEYS } from '../lib/settings'

const navItems = [
  {
    path: '/',
    label: 'Tableau de bord',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
      </svg>
    ),
  },
  {
    path: '/upload',
    label: 'Nouveau rapport',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    path: '/settings',
    label: 'Paramètres',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  )
}

export default function Layout({ children, session }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const displayName = getSetting(KEYS.DISPLAY_NAME)
  const email = session?.user?.email || ''
  const initials = (displayName || email)?.[0]?.toUpperCase() || 'U'
  const label = displayName || email

  return (
    <div className="min-h-screen flex">

      {/* Sidebar — always dark navy */}
      <aside
        className="w-[240px] h-screen sticky top-0 flex flex-col flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, #0f1623 0%, #0c1220 100%)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Logo */}
        <div className="h-[60px] flex items-center px-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mr-3 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f6ef7, #818cf8)', boxShadow: '0 4px 12px rgba(79,110,247,0.35)' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div className="leading-none">
            <span className="text-white font-bold text-[15px] tracking-tight">GeoScan</span>
            <span className="font-bold text-[15px] tracking-tight" style={{ color: '#818cf8' }}> AI</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5">
          <p className="text-[10px] font-semibold px-3 mb-3 tracking-[0.1em]"
            style={{ color: 'rgba(255,255,255,0.18)' }}>
            PRINCIPAL
          </p>
          <div className="space-y-0.5">
            {navItems.map(item => {
              const active = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative"
                  style={active ? {
                    background: 'rgba(79,110,247,0.14)',
                    color: '#ffffff',
                    boxShadow: 'inset 3px 0 0 #4f6ef7',
                  } : { color: '#6b7591' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ color: active ? '#818cf8' : '#4a5568' }}
                    className="transition-colors duration-150 group-hover:brightness-125">
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#4f6ef7' }} />
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-3 flex-shrink-0 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
          >
            <span style={{ color: isDark ? '#fbbf24' : '#818cf8' }}>
              {isDark ? <SunIcon /> : <MoonIcon />}
            </span>
            <span>{isDark ? 'Mode clair' : 'Mode sombre'}</span>
            <span className="ml-auto flex items-center">
              <span className="relative inline-flex w-8 h-4 rounded-full transition-colors duration-200"
                style={{ background: isDark ? 'rgba(251,191,36,0.3)' : 'rgba(129,140,248,0.3)' }}>
                <span className="absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200"
                  style={{
                    background: isDark ? '#fbbf24' : '#818cf8',
                    left: isDark ? '1px' : '17px',
                  }} />
              </span>
            </span>
          </button>

          {/* User */}
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f6ef7, #818cf8)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {label}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Connecté</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-150"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.25)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto" style={{ background: isDark ? '#0c1220' : '#f5f7fb' }}>
        {children}
      </main>
    </div>
  )
}
