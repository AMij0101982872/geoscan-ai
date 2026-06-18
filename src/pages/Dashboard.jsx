import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'

const CARD = {
  background: '#111827',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '16px',
}

function getLast7Days(reports) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const label = d.toLocaleDateString('fr-FR', { weekday: 'short' })
    const dateStr = d.toISOString().slice(0, 10)
    const count = reports.filter(r => r.created_at?.slice(0, 10) === dateStr).length
    days.push({ day: label, rapports: count })
  }
  return days
}

function getStatusDist(reports) {
  const done = reports.filter(r => r.status === 'done').length
  const error = reports.filter(r => r.status === 'error').length
  const processing = reports.filter(r => r.status === 'processing' || r.status === 'pending').length
  return [
    { name: 'Réussis', value: done, color: '#4f6ef7' },
    { name: 'Erreurs', value: error, color: '#ef4444' },
    { name: 'En cours', value: processing, color: '#818cf8' },
  ].filter(s => s.value > 0)
}

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="text-white text-xs px-3 py-2 rounded-xl"
      style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
      {label && <p className="font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>}
      <p className="font-bold text-white">{payload[0].value} rapport{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

const PieTooltipDark = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="text-white text-xs px-3 py-2 rounded-xl"
      style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="font-bold">{payload[0].name} — {payload[0].value}</p>
    </div>
  )
}

function DeleteModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onCancel} />
      <div className="relative rounded-2xl p-7 w-full max-w-sm"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(239,68,68,0.15)' }}>
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-white text-center mb-1.5">Supprimer ce rapport ?</h3>
        <p className="text-sm text-center mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>Cette action est irréversible.</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
            Annuler
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors text-white"
            style={{ background: '#ef4444' }}
            onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
            onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ session }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    fetchReports()
    const interval = setInterval(fetchReports, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchReports() {
    const { data, error } = await supabase
      .from('reports').select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    if (!error) setReports(data || [])
    setLoading(false)
  }

  async function deleteReport(id) {
    await supabase.from('reports').delete().eq('id', id)
    setReports(r => r.filter(x => x.id !== id))
    setConfirmDelete(null)
  }

  const total = reports.length
  const done = reports.filter(r => r.status === 'done').length
  const validated = reports.filter(r => r.validated).length
  const activityData = getLast7Days(reports)
  const statusDist = getStatusDist(reports)
  const successRate = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="min-h-full p-6" style={{ background: '#0c1220' }}>
      {confirmDelete && (
        <DeleteModal onConfirm={() => deleteReport(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
      )}

      {/* Header */}
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Tableau de bord</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link to="/upload" className="btn-primary gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau rapport
        </Link>
      </div>

      <div className="max-w-6xl mx-auto space-y-4">

        {/* Row 1 — 3 cols */}
        <div className="grid grid-cols-3 gap-4">

          {/* Hero card */}
          <div className="relative overflow-hidden p-6 flex flex-col justify-between"
            style={{ ...CARD, background: 'linear-gradient(145deg, #1a2545 0%, #0f1e3d 100%)', border: '1px solid rgba(79,110,247,0.2)', minHeight: '220px' }}>
            {/* Grid dots */}
            <div className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
            {/* Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(79,110,247,0.15) 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full mb-5"
                style={{ background: 'rgba(79,110,247,0.18)', color: '#818cf8' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                GeoScan AI
              </div>
              <h2 className="text-2xl font-bold text-white leading-tight mb-2">
                {total === 0
                  ? 'Importez votre\npremier rapport'
                  : `${total} rapport${total > 1 ? 's' : ''}\nimporté${total > 1 ? 's' : ''}`}
              </h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {done} extraction{done > 1 ? 's' : ''} réussie{done > 1 ? 's' : ''}
              </p>
            </div>
            <Link to="/upload"
              className="relative inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl self-start mt-4 transition-all"
              style={{ background: 'rgba(79,110,247,0.25)', border: '1px solid rgba(79,110,247,0.35)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,110,247,0.4)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(79,110,247,0.25)'}>
              Nouveau rapport
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </Link>
          </div>

          {/* Extractions overview */}
          <div className="p-6" style={CARD}>
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Extractions</p>
              {total > 0 && done === total && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                  100%
                </span>
              )}
            </div>
            <div className="text-4xl font-black text-white tracking-tight leading-none mb-0.5">{done}</div>
            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>sur {total} rapport{total !== 1 ? 's' : ''}</p>
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={activityData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f6ef7" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4f6ef7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip content={<DarkTooltip />} />
                <Area type="monotone" dataKey="rapports" stroke="#4f6ef7" strokeWidth={2}
                  fill="url(#areaG)" dot={false} activeDot={{ r: 4, fill: '#4f6ef7', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Success rate */}
          <div className="p-6" style={CARD}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Taux de réussite</p>
            <div className="text-4xl font-black text-white tracking-tight leading-none mb-5">{successRate}%</div>
            {statusDist.length > 0 ? (
              <>
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie data={statusDist} cx="50%" cy="50%" innerRadius={36} outerRadius={54}
                          paddingAngle={3} dataKey="value" strokeWidth={0}>
                          {statusDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip content={<PieTooltipDark />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-lg font-black text-white leading-none">{successRate}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {statusDist.map(s => (
                    <div key={s.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.name}</span>
                      </div>
                      <span className="text-xs font-bold text-white">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 text-center">
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Aucune donnée</p>
              </div>
            )}
          </div>
        </div>

        {/* Row 2 — 2/3 + 1/3 */}
        <div className="grid grid-cols-3 gap-4">

          {/* Reports list */}
          <div className="col-span-2" style={CARD}>
            <div className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <h2 className="text-sm font-semibold text-white">Historique des rapports</h2>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {reports.length} rapport{reports.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-12 flex items-center justify-center">
                <span className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : reports.length === 0 ? (
              <div className="p-12 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <svg className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-white mb-1">Aucun rapport</p>
                <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Importez votre premier PDF pour démarrer
                </p>
                <Link to="/upload" className="btn-primary gap-2 text-xs">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Importer
                </Link>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Fichier', 'Date', 'Statut', 'Validation', ''].map((h, i) => (
                      <th key={i} className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider ${i < 4 ? 'text-left' : ''}`}
                        style={{ color: 'rgba(255,255,255,0.25)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, idx) => (
                    <tr key={r.id} className="group transition-colors duration-100"
                      style={{ borderBottom: idx < reports.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-white truncate max-w-[180px]">{r.filename || 'Sans nom'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-6 py-3.5"><StatusBadge status={r.status} dark /></td>
                      <td className="px-6 py-3.5">
                        {r.validated ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Validé
                          </span>
                        ) : <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {r.status === 'done' && (
                            <Link to={`/reports/${r.id}`}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                              style={{ background: 'rgba(79,110,247,0.18)', color: '#818cf8', border: '1px solid rgba(79,110,247,0.25)' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,110,247,0.3)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(79,110,247,0.18)'}>
                              Ouvrir
                            </Link>
                          )}
                          <button onClick={() => setConfirmDelete(r.id)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'rgba(255,255,255,0.2)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#ef4444' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Activity bar chart */}
          <div className="p-6" style={CARD}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Activité</p>
            <div className="text-4xl font-black text-white tracking-tight leading-none mb-0.5">{total}</div>
            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>7 derniers jours</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={activityData} barSize={16} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="barDark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f6ef7" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 6 }} />
                <Bar dataKey="rapports" radius={[5, 5, 0, 0]}>
                  {activityData.map((e, i) => (
                    <Cell key={i} fill={e.rapports > 0 ? 'url(#barDark)' : 'rgba(255,255,255,0.05)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
