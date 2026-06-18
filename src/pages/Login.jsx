import { useState } from 'react'
import { supabase } from '../lib/supabase'

const FEATURES = [
  {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    label: 'Import de PDF manuscrit',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    label: 'Extraction IA automatique',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Validation et correction manuelle',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    label: 'Export Excel formaté',
  },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSuccess('Compte créé ! Vérifiez votre email.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[52%] flex-col justify-between p-14 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e2d5c 60%, #0f172a 100%)' }}>

        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Glow */}
        <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #4f6ef7 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #4f6ef7, #818cf8)' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">GeoScan AI</span>
        </div>

        {/* Main copy */}
        <div className="relative">
          <h2 className="text-4xl font-bold text-white leading-tight mb-5">
            Digitalisez vos<br />
            rapports<br />
            <span style={{ background: 'linear-gradient(90deg, #818cf8, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              géotechniques
            </span>
          </h2>

          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-10">
            Importez vos procès-verbaux Atterberg en PDF. L'IA extrait les données manuscrites et les structure en Excel en quelques secondes.
          </p>

          {/* Features */}
          <div className="space-y-3">
            {FEATURES.map(f => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-blue-300">
                  {f.icon}
                </div>
                <span className="text-slate-300 text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-center justify-between">
          <span className="text-slate-600 text-xs">© 2026 GeoScan AI</span>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8"
        style={{ background: 'linear-gradient(145deg, #f8faff 0%, #f1f4fd 100%)' }}>
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4f6ef7, #818cf8)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="font-bold text-xl text-gray-900">GeoScan AI</span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8">

            {/* Heading */}
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {mode === 'login' ? 'Connexion' : 'Créer un compte'}
              </h1>
              <p className="text-sm text-slate-400 mt-1.5">
                {mode === 'login'
                  ? 'Accédez à votre espace de travail'
                  : 'Rejoignez GeoScan AI dès maintenant'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input
                    type="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-gray-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    type="password"
                    placeholder="••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-gray-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                  />
                </div>
              </div>

              {/* Error / Success */}
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2.5 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl border border-green-100">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {success}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 mt-1"
                style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #4f6ef7, #6366f1)', boxShadow: '0 4px 14px rgba(79,110,247,0.35)' }}
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Chargement…
                  </>
                ) : (
                  mode === 'login' ? 'Se connecter' : 'Créer le compte'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-300">ou</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Toggle mode */}
            <button
              onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}
              className="w-full py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-all"
            >
              {mode === 'login' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
            </button>

          </div>

          {/* Below card */}
          <p className="text-center text-xs text-slate-400 mt-5">
            Vos données sont sécurisées et chiffrées.
          </p>

        </div>
      </div>
    </div>
  )
}
