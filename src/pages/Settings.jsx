import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme, T } from '../lib/theme'
import { KEYS, getSetting, setSetting } from '../lib/settings'

function SavedBadge({ show }) {
  if (!show) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
      <svg style={{ width: '12px', height: '12px' }} fill="currentColor" viewBox="0 0 20 20">
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
          value={input} onChange={e => setInput(e.target.value)} placeholder="SUPPRIMER"
          className="w-full rounded-xl px-3.5 py-2.5 text-sm mb-4 focus:outline-none"
          style={{ background: t.hintBg, border: `2px solid ${input === 'SUPPRIMER' ? '#ef4444' : t.divider}`, color: t.text }}
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-all"
            style={t.cancelBtn}
            onMouseEnter={e => Object.assign(e.currentTarget.style, t.cancelBtnHover)}
            onMouseLeave={e => Object.assign(e.currentTarget.style, t.cancelBtn)}>
            Annuler
          </button>
          <button onClick={onConfirm} disabled={input !== 'SUPPRIMER'}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            Supprimer tout
          </button>
        </div>
      </div>
    </div>
  )
}

const TABS = [
  {
    id: 'profil', label: 'Profil', desc: 'Nom et informations de compte',
    icon: (
      <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: 'apparence', label: 'Apparence', desc: 'Thème et affichage',
    icon: (
      <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    id: 'export', label: 'Export Excel', desc: 'En-tête des fichiers exportés',
    icon: (
      <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'securite', label: 'Sécurité', desc: 'Mot de passe de connexion',
    icon: (
      <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    id: 'donnees', label: 'Données', desc: 'Statistiques et gestion',
    icon: (
      <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
  },
]

export default function Settings({ session }) {
  const { isDark, toggle } = useTheme()
  const t = isDark ? T.dark : T.light
  const [active, setActive] = useState('profil')

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

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    const { data } = await supabase.from('reports').select('status, validated').eq('user_id', session.user.id)
    if (data) setStats({ total: data.length, done: data.filter(r => r.status === 'done').length, validated: data.filter(r => r.validated).length })
  }

  function saveProfile() {
    setSetting(KEYS.DISPLAY_NAME, displayName)
    setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2500)
  }

  function saveExport() {
    setSetting(KEYS.LAB_NAME, labName); setSetting(KEYS.NORM_REF, normRef)
    setExportSaved(true); setTimeout(() => setExportSaved(false), 2500)
  }

  async function changePassword() {
    setPassError('')
    if (newPass.length < 6) { setPassError('Le mot de passe doit faire au moins 6 caractères.'); return }
    if (newPass !== confirmPass) { setPassError('Les mots de passe ne correspondent pas.'); return }
    setPassLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setPassLoading(false)
    if (error) { setPassError(error.message); return }
    setNewPass(''); setConfirmPass('')
    setPassSaved(true); setTimeout(() => setPassSaved(false), 2500)
  }

  async function deleteAllReports() {
    setDeleting(true); setDeleteError('')
    const { error } = await supabase.from('reports').delete().eq('user_id', session.user.id)
    setDeleting(false)
    if (error) { setDeleteError(error.message); return }
    setShowDeleteModal(false)
    setStats({ total: 0, done: 0, validated: 0 })
  }

  function inp(extra = {}) {
    return {
      background: t.hintBg, border: `1px solid ${t.divider}`, color: t.text,
      borderRadius: '10px', padding: '10px 14px', fontSize: '14px',
      width: '100%', outline: 'none', transition: 'border-color 0.15s', ...extra,
    }
  }

  function SecHeader({ tabId }) {
    const tab = TABS.find(tb => tb.id === tabId)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '20px', marginBottom: '24px', borderBottom: `1px solid ${t.divider}` }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(79,110,247,0.1)', flexShrink: 0 }}>
          <span style={{ color: '#4f6ef7' }}>{tab.icon}</span>
        </div>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: t.text, margin: 0 }}>{tab.label}</h2>
          <p style={{ fontSize: '13px', color: t.textMuted, margin: '2px 0 0' }}>{tab.desc}</p>
        </div>
      </div>
    )
  }

  function Field({ label, hint, children }) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSub, marginBottom: '7px' }}>{label}</label>
        {children}
        {hint && <p style={{ fontSize: '12px', color: t.textMuted, marginTop: '6px', lineHeight: '1.4' }}>{hint}</p>}
      </div>
    )
  }

  function Divider({ label }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '24px 0' }}>
        {label && <span style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{label}</span>}
        <div style={{ flex: 1, height: '1px', background: t.divider }} />
      </div>
    )
  }

  const sections = {

    profil: (
      <>
        <SecHeader tabId="profil" />
        <Field label="Nom d'affichage" hint="Visible dans la barre latérale à la place de votre email">
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ex : Julie Benali"
            style={inp()} onFocus={e => e.target.style.borderColor = '#4f6ef7'} onBlur={e => e.target.style.borderColor = t.divider} />
        </Field>
        <Field label="Adresse email">
          <div style={{ position: 'relative' }}>
            <input value={session.user.email} readOnly style={inp({ cursor: 'not-allowed', opacity: 0.55, paddingRight: '120px' })} />
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 600, color: t.textMuted, background: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
              Non modifiable
            </span>
          </div>
        </Field>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '4px' }}>
          <button onClick={saveProfile} className="btn-primary">Sauvegarder</button>
          <SavedBadge show={profileSaved} />
        </div>
      </>
    ),

    apparence: (
      <>
        <SecHeader tabId="apparence" />
        <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '16px', marginTop: '-8px' }}>
          Sélectionnez un thème. Votre préférence est sauvegardée localement dans votre navigateur.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            {
              key: false, label: 'Mode clair', desc: 'Fond blanc, texte sombre',
              preview: { bg: '#f5f7fb', card: '#ffffff', accent: '#4f6ef7' },
              icon: <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
            },
            {
              key: true, label: 'Mode sombre', desc: 'Fond noir, texte clair',
              preview: { bg: '#0c1220', card: '#111827', accent: '#818cf8' },
              icon: <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
            },
          ].map(opt => {
            const isOpt = isDark === opt.key
            const p = opt.preview
            return (
              <button key={String(opt.key)} onClick={() => { if (!isOpt) toggle() }}
                style={{
                  padding: '16px', borderRadius: '14px', textAlign: 'left',
                  cursor: isOpt ? 'default' : 'pointer',
                  border: isOpt ? '2px solid #4f6ef7' : `2px solid ${t.divider}`,
                  background: isOpt ? 'rgba(79,110,247,0.07)' : t.hintBg,
                  transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: '12px',
                }}>
                {/* Mini UI preview */}
                <div style={{ width: '100%', height: '52px', borderRadius: '8px', background: p.bg, border: `1px solid ${isOpt ? 'rgba(79,110,247,0.3)' : t.divider}`, overflow: 'hidden', padding: '8px', display: 'flex', gap: '6px' }}>
                  <div style={{ width: '28%', height: '100%', background: p.card, borderRadius: '5px', opacity: 0.9 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ height: '10px', background: p.card, borderRadius: '4px', width: '70%' }} />
                    <div style={{ height: '8px', background: p.card, borderRadius: '4px', width: '90%', opacity: 0.5 }} />
                    <div style={{ height: '12px', background: p.accent, borderRadius: '4px', width: '40%', marginTop: '2px', opacity: 0.8 }} />
                  </div>
                </div>
                {/* Label row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: isOpt ? '#4f6ef7' : t.textMuted }}>{opt.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: isOpt ? '#4f6ef7' : t.text, margin: 0 }}>{opt.label}</p>
                    <p style={{ fontSize: '12px', color: t.textMuted, margin: 0 }}>{opt.desc}</p>
                  </div>
                  {isOpt && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: 'rgba(79,110,247,0.15)', color: '#4f6ef7', flexShrink: 0 }}>
                      <svg style={{ width: '10px', height: '10px' }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Actif
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </>
    ),

    export: (
      <>
        <SecHeader tabId="export" />
        <Field label="Nom du laboratoire / organisme" hint="Affiché sous le titre principal dans le fichier Excel exporté">
          <input value={labName} onChange={e => setLabName(e.target.value)} placeholder="Ex : Laboratoire de Géotechnique du Maroc"
            style={inp()} onFocus={e => e.target.style.borderColor = '#4f6ef7'} onBlur={e => e.target.style.borderColor = t.divider} />
        </Field>
        <Field label="Référence norme" hint={'Intégrée dans le titre : "MINUTES — DÉTERMINATION DES LIMITES D\'ATTERBERG (…)"'}>
          <input value={normRef} onChange={e => setNormRef(e.target.value)} placeholder="ISO 17892-12"
            style={inp()} onFocus={e => e.target.style.borderColor = '#4f6ef7'} onBlur={e => e.target.style.borderColor = t.divider} />
        </Field>
        {/* Live preview */}
        <div style={{ padding: '14px 16px', borderRadius: '10px', marginBottom: '20px', background: isDark ? 'rgba(79,110,247,0.06)' : 'rgba(79,110,247,0.04)', border: `1px solid ${isDark ? 'rgba(79,110,247,0.15)' : 'rgba(79,110,247,0.12)'}` }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#4f6ef7', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Aperçu du titre Excel</p>
          <p style={{ fontSize: '13px', color: t.textSub, margin: 0, fontFamily: 'monospace', lineHeight: '1.5' }}>
            MINUTES — DÉTERMINATION DES LIMITES D'ATTERBERG ({normRef || 'ISO 17892-12'})
          </p>
          {labName && <p style={{ fontSize: '12px', color: t.textMuted, margin: '4px 0 0', fontFamily: 'monospace' }}>{labName}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={saveExport} className="btn-primary">Sauvegarder</button>
          <SavedBadge show={exportSaved} />
        </div>
      </>
    ),

    securite: (
      <>
        <SecHeader tabId="securite" />

        {/* Admin-managed notice */}
        <div style={{ display: 'flex', gap: '16px', padding: '20px', borderRadius: '14px', background: isDark ? 'rgba(79,110,247,0.07)' : 'rgba(79,110,247,0.05)', border: `1px solid ${isDark ? 'rgba(79,110,247,0.18)' : 'rgba(79,110,247,0.15)'}`, marginBottom: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(79,110,247,0.12)', flexShrink: 0 }}>
            <svg style={{ width: '22px', height: '22px', color: '#4f6ef7' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: t.text, margin: '0 0 5px' }}>Compte géré par l'administrateur</p>
            <p style={{ fontSize: '13px', color: t.textMuted, margin: 0, lineHeight: '1.6' }}>
              L'accès à GeoScan AI est géré par votre administrateur. Pour toute demande de modification de votre mot de passe ou de vos identifiants, contactez-le directement.
            </p>
          </div>
        </div>

        {/* Admin contact card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderRadius: '12px', background: t.hintBg, border: `1px solid ${t.divider}` }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #4f6ef7, #818cf8)', flexShrink: 0 }}>
            <svg style={{ width: '18px', height: '18px', color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: t.text, margin: '0 0 2px' }}>Administrateur GeoScan AI</p>
            <p style={{ fontSize: '12px', color: t.textMuted, margin: 0 }}>akeivanjr10@gmail.com</p>
          </div>
          <a href="mailto:akeivanjr10@gmail.com"
            style={{ fontSize: '12px', fontWeight: 600, padding: '7px 14px', borderRadius: '8px', background: 'rgba(79,110,247,0.1)', color: '#4f6ef7', textDecoration: 'none', border: `1px solid rgba(79,110,247,0.2)`, whiteSpace: 'nowrap', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,110,247,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(79,110,247,0.1)'}>
            Contacter
          </a>
        </div>
      </>
    ),

    donnees: (
      <>
        <SecHeader tabId="donnees" />

        <p style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Statistiques d'utilisation</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Rapports total', value: stats.total, color: '#4f6ef7' },
            { label: 'Extractions réussies', value: stats.done, color: '#22c55e' },
            { label: 'Rapports validés', value: stats.validated, color: '#818cf8' },
          ].map(s => (
            <div key={s.label} style={{ padding: '18px 16px', borderRadius: '12px', textAlign: 'center', background: t.hintBg, border: `1px solid ${t.divider}` }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: '6px' }}>{s.value}</div>
              <p style={{ fontSize: '12px', color: t.textMuted, margin: 0, lineHeight: '1.3' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <Divider label="Zone de danger" />

        <div style={{ padding: '18px', borderRadius: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444', margin: '0 0 5px' }}>Supprimer tous les rapports</p>
              <p style={{ fontSize: '13px', color: t.textMuted, margin: 0, lineHeight: '1.5' }}>
                Supprime définitivement vos {stats.total} rapport{stats.total !== 1 ? 's' : ''} et toutes les données associées. Cette action est irréversible.
              </p>
              {deleteError && <p style={{ fontSize: '12px', color: '#f87171', marginTop: '8px' }}>{deleteError}</p>}
            </div>
            <button
              onClick={() => stats.total > 0 && setShowDeleteModal(true)}
              disabled={stats.total === 0 || deleting}
              style={{ flexShrink: 0, fontSize: '13px', fontWeight: 600, padding: '9px 18px', borderRadius: '10px', color: 'white', background: '#ef4444', border: 'none', cursor: stats.total === 0 ? 'not-allowed' : 'pointer', opacity: stats.total === 0 ? 0.4 : 1, transition: 'background 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { if (stats.total > 0) e.currentTarget.style.background = '#dc2626' }}
              onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}>
              {deleting ? 'Suppression…' : 'Supprimer tout'}
            </button>
          </div>
        </div>
      </>
    ),
  }

  return (
    <div style={{ minHeight: '100%', background: t.bg, padding: '32px 24px' }}>
      {showDeleteModal && (
        <DeleteAllModal onConfirm={deleteAllReports} onCancel={() => setShowDeleteModal(false)} count={stats.total} t={t} />
      )}

      {/* Page header */}
      <div style={{ maxWidth: '960px', margin: '0 auto 28px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: t.text, margin: '0 0 4px' }}>Paramètres</h1>
        <p style={{ fontSize: '13px', color: t.textMuted, margin: 0 }}>Personnalisez votre compte et votre expérience GeoScan</p>
      </div>

      {/* Two-column layout */}
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* ── Left nav ──────────────────────────────────────────────── */}
        <div style={{ width: '210px', flexShrink: 0, position: 'sticky', top: '24px' }}>
          <nav style={{ ...t.card, padding: '6px', overflow: 'hidden' }}>
            {TABS.map(tab => {
              const isActive = active === tab.id
              return (
                <button key={tab.id} onClick={() => setActive(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '10px 12px', borderRadius: '10px', marginBottom: '2px',
                    background: isActive ? 'rgba(79,110,247,0.1)' : 'transparent',
                    color: isActive ? '#4f6ef7' : t.textSub,
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontSize: '13px', fontWeight: isActive ? 600 : 500,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ flexShrink: 0, color: isActive ? '#4f6ef7' : t.textMuted }}>{tab.icon}</span>
                  <span style={{ flex: 1 }}>{tab.label}</span>
                  {isActive && <span style={{ width: '5px', height: '5px', borderRadius: '999px', background: '#4f6ef7', flexShrink: 0 }} />}
                </button>
              )
            })}
          </nav>
        </div>

        {/* ── Right content ─────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, ...t.card, padding: '28px' }}>
          {sections[active]}
        </div>

      </div>
    </div>
  )
}
