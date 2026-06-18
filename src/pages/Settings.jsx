import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme, T } from '../lib/theme'
import { KEYS, getSetting, setSetting } from '../lib/settings'

function Section({ title, desc, icon, children, t }) {
  return (
    <div style={{ ...t.card, overflow: 'visible' }}>
      <div className="px-6 py-5 flex items-start gap-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(79,110,247,0.12)' }}>
          <span style={{ color: '#818cf8' }}>{icon}</span>
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: t.text }}>{title}</h2>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{desc}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="mb-5 last:mb-0">
      <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'inherit' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function SavedBadge({ show }) {
  if (!show) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
      Sauvegardé
    </span>
  )
}

function DeleteAllModal({ onConfirm, onCancel, count, t }) {
  const [input, setInput] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm bg-black/40" onClick={onCancel} />
      <div className="relative rounded-2xl p-7 w-full max-w-sm"
        style={{ background: t.deleteCardBg, border: `1px solid ${t.deleteCardBorder}`, boxShadow: t.deleteCardShadow }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(239,68,68,0.12)' }}>
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-center mb-1.5" style={{ color: t.text }}>
          Supprimer {count} rapport{count > 1 ? 's' : ''} ?
        </h3>
        <p className="text-sm text-center mb-5" style={{ color: t.textMuted }}>
          Cette action est irréversible. Tapez <strong style={{ color: t.text }}>SUPPRIMER</strong> pour confirmer.
        </p>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="SUPPRIMER"
          className="w-full rounded-xl px-3.5 py-2.5 text-sm mb-4 focus:outline-none"
          style={{ background: t.hintBg, border: `2px solid ${input === 'SUPPRIMER' ? '#ef4444' : t.divider}`, color: t.text }}
        />
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-all"
            style={t.cancelBtn}
            onMouseEnter={e => Object.assign(e.currentTarget.style, t.cancelBtnHover)}
            onMouseLeave={e => Object.assign(e.currentTarget.style, t.cancelBtn)}>
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={input !== 'SUPPRIMER'}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            Supprimer tout
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Settings({ session }) {
  const { isDark, toggle } = useTheme()
  const t = isDark ? T.dark : T.light

  // Profil
  const [displayName, setDisplayName] = useState(() => getSetting(KEYS.DISPLAY_NAME))
  const [profileSaved, setProfileSaved] = useState(false)

  // Export
  const [labName, setLabName] = useState(() => getSetting(KEYS.LAB_NAME))
  const [normRef, setNormRef] = useState(() => getSetting(KEYS.NORM_REF))
  const [exportSaved, setExportSaved] = useState(false)

  // Mot de passe
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passError, setPassError] = useState('')
  const [passSaved, setPassSaved] = useState(false)

  // Données
  const [stats, setStats] = useState({ total: 0, done: 0, validated: 0 })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    const { data } = await supabase.from('reports').select('status, validated').eq('user_id', session.user.id)
    if (data) {
      setStats({
        total: data.length,
        done: data.filter(r => r.status === 'done').length,
        validated: data.filter(r => r.validated).length,
      })
    }
  }

  function saveProfile() {
    setSetting(KEYS.DISPLAY_NAME, displayName)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2500)
  }

  function saveExport() {
    setSetting(KEYS.LAB_NAME, labName)
    setSetting(KEYS.NORM_REF, normRef)
    setExportSaved(true)
    setTimeout(() => setExportSaved(false), 2500)
  }

  async function changePassword() {
    setPassError('')
    if (newPass.length < 6) { setPassError('Le mot de passe doit faire au moins 6 caractères.'); return }
    if (newPass !== confirmPass) { setPassError('Les mots de passe ne correspondent pas.'); return }
    setPassLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setPassLoading(false)
    if (error) { setPassError(error.message); return }
    setNewPass('')
    setConfirmPass('')
    setPassSaved(true)
    setTimeout(() => setPassSaved(false), 2500)
  }

  async function deleteAllReports() {
    setDeleting(true)
    setDeleteError('')
    const { error } = await supabase.from('reports').delete().eq('user_id', session.user.id)
    setDeleting(false)
    if (error) { setDeleteError(error.message); return }
    setShowDeleteModal(false)
    setStats({ total: 0, done: 0, validated: 0 })
  }

  const inputStyle = {
    background: t.hintBg,
    border: `1px solid ${t.divider}`,
    color: t.text,
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.15s',
  }

  return (
    <div className="min-h-full p-6" style={{ background: t.bg }}>
      {showDeleteModal && (
        <DeleteAllModal
          onConfirm={deleteAllReports}
          onCancel={() => setShowDeleteModal(false)}
          count={stats.total}
          t={t}
        />
      )}

      {/* Header */}
      <div className="max-w-2xl mx-auto mb-7">
        <h1 className="text-lg font-bold tracking-tight" style={{ color: t.text }}>Paramètres</h1>
        <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>Personnalisez votre compte et votre expérience</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">

        {/* ── Profil ─────────────────────────────────────────────────────── */}
        <Section t={t} title="Profil" desc="Votre nom d'affichage visible dans la sidebar"
          icon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }>
          <div style={{ color: t.textMuted }}>
            <Field label="Nom d'affichage">
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Ex : Julie Benali"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#4f6ef7'}
                onBlur={e => e.target.style.borderColor = t.divider}
              />
            </Field>
            <Field label="Adresse email">
              <input
                value={session.user.email}
                readOnly
                style={{ ...inputStyle, cursor: 'not-allowed', opacity: 0.5 }}
              />
            </Field>
            <div className="flex items-center gap-3 mt-6">
              <button onClick={saveProfile} className="btn-primary">
                Sauvegarder
              </button>
              <SavedBadge show={profileSaved} />
            </div>
          </div>
        </Section>

        {/* ── Apparence ──────────────────────────────────────────────────── */}
        <Section t={t} title="Apparence" desc="Choisissez entre le mode clair et le mode sombre"
          icon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          }>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                key: false,
                label: 'Mode clair',
                desc: 'Fond blanc, texte sombre',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ),
              },
              {
                key: true,
                label: 'Mode sombre',
                desc: 'Fond noir, texte clair',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ),
              },
            ].map(opt => {
              const active = isDark === opt.key
              return (
                <button
                  key={String(opt.key)}
                  onClick={() => { if (!active) toggle() }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all"
                  style={{
                    border: active ? '2px solid #4f6ef7' : `2px solid ${t.divider}`,
                    background: active ? 'rgba(79,110,247,0.08)' : t.hintBg,
                    cursor: active ? 'default' : 'pointer',
                  }}>
                  <span style={{ color: active ? '#4f6ef7' : t.textMuted }}>{opt.icon}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: active ? '#4f6ef7' : t.text }}>{opt.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{opt.desc}</p>
                  </div>
                  {active && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(79,110,247,0.15)', color: '#4f6ef7' }}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Actif
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </Section>

        {/* ── Export Excel ───────────────────────────────────────────────── */}
        <Section t={t} title="Export Excel" desc="Ces informations apparaîtront dans l'en-tête de vos fichiers Excel"
          icon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }>
          <div style={{ color: t.textMuted }}>
            <Field label="Nom du laboratoire / organisme">
              <input
                value={labName}
                onChange={e => setLabName(e.target.value)}
                placeholder="Ex : Laboratoire de Géotechnique du Maroc"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#4f6ef7'}
                onBlur={e => e.target.style.borderColor = t.divider}
              />
            </Field>
            <Field label="Référence norme">
              <input
                value={normRef}
                onChange={e => setNormRef(e.target.value)}
                placeholder="ISO 17892-12"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#4f6ef7'}
                onBlur={e => e.target.style.borderColor = t.divider}
              />
            </Field>
            <div className="flex items-center gap-3 mt-6">
              <button onClick={saveExport} className="btn-primary">Sauvegarder</button>
              <SavedBadge show={exportSaved} />
            </div>
          </div>
        </Section>

        {/* ── Sécurité ───────────────────────────────────────────────────── */}
        <Section t={t} title="Sécurité" desc="Modifiez votre mot de passe de connexion"
          icon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }>
          <div style={{ color: t.textMuted }}>
            <Field label="Nouveau mot de passe">
              <input
                type="password"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="••••••••••"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#4f6ef7'}
                onBlur={e => e.target.style.borderColor = t.divider}
              />
            </Field>
            <Field label="Confirmer le mot de passe">
              <input
                type="password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="••••••••••"
                style={{
                  ...inputStyle,
                  borderColor: confirmPass && newPass && confirmPass !== newPass ? '#f87171' : t.divider,
                }}
                onFocus={e => e.target.style.borderColor = '#4f6ef7'}
                onBlur={e => e.target.style.borderColor = confirmPass && newPass && confirmPass !== newPass ? '#f87171' : t.divider}
              />
              {confirmPass && newPass && confirmPass !== newPass && (
                <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>Les mots de passe ne correspondent pas.</p>
              )}
            </Field>
            {passError && (
              <div className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl mb-4"
                style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {passError}
              </div>
            )}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={changePassword}
                disabled={passLoading || !newPass || !confirmPass}
                className="btn-primary">
                {passLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Modification…
                  </>
                ) : 'Modifier le mot de passe'}
              </button>
              <SavedBadge show={passSaved} />
            </div>
          </div>
        </Section>

        {/* ── Données & Compte ───────────────────────────────────────────── */}
        <Section t={t} title="Données & Compte" desc="Statistiques d'utilisation et gestion des données"
          icon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          }>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-7">
            {[
              { label: 'Rapports total', value: stats.total, color: '#4f6ef7' },
              { label: 'Extractions réussies', value: stats.done, color: '#22c55e' },
              { label: 'Rapports validés', value: stats.validated, color: '#818cf8' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 text-center"
                style={{ background: t.hintBg, border: `1px solid ${t.divider}` }}>
                <div className="text-3xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                <p className="text-xs font-medium" style={{ color: t.textMuted }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Danger zone */}
          <div className="rounded-xl p-5" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>Zone de danger</p>
                <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                  Supprime définitivement tous vos rapports ({stats.total} rapport{stats.total !== 1 ? 's' : ''}).
                  Cette action est irréversible.
                </p>
                {deleteError && (
                  <p className="text-xs mt-2" style={{ color: '#f87171' }}>{deleteError}</p>
                )}
              </div>
              <button
                onClick={() => stats.total > 0 && setShowDeleteModal(true)}
                disabled={stats.total === 0 || deleting}
                className="flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#ef4444' }}
                onMouseEnter={e => { if (stats.total > 0) e.currentTarget.style.background = '#dc2626' }}
                onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}>
                {deleting ? 'Suppression…' : 'Supprimer tout'}
              </button>
            </div>
          </div>
        </Section>

      </div>
    </div>
  )
}
