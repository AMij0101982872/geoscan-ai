import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

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
    { name: 'Réussis', value: done, color: '#22c55e' },
    { name: 'Erreurs', value: error, color: '#ef4444' },
    { name: 'En cours', value: processing, color: '#818cf8' },
  ].filter(s => s.value > 0)
}

function StatCard({ label, value, total, icon, color, bg }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : null
  return (
    <div className="bg-white rounded-2xl p-5 flex items-center gap-4"
      style={{ border: '1px solid #eef0f5', borderLeft: `3px solid ${color}`, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: bg }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-3xl font-black text-gray-900 leading-none tracking-tight">{value}</span>
          {pct !== null && (
            <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
          )}
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5 truncate">{label}</p>
        {pct !== null && (
          <div className="mt-2.5 h-1 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
          </div>
        )}
      </div>
    </div>
  )
}

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="text-white text-xs px-3 py-2 rounded-xl"
      style={{ background: '#0f172a', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
      <p className="font-semibold mb-0.5">{label}</p>
      <p style={{ color: '#94a3b8' }}>{payload[0].value} rapport{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="text-white text-xs px-3 py-2 rounded-xl"
      style={{ background: '#0f172a', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
      <p className="font-semibold">{payload[0].name} — {payload[0].value}</p>
    </div>
  )
}

function DeleteModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(15,23,42,0.4)' }} onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-7 w-full max-w-sm"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#fef2f2' }}>
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-1.5">Supprimer ce rapport ?</h3>
        <p className="text-sm text-slate-400 text-center mb-6">Cette action est irréversible.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-secondary py-2.5">Annuler</button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 px-4 text-white text-sm font-semibold rounded-xl transition-colors"
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

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-full" style={{ background: '#f5f7fb' }}>
      {confirmDelete && (
        <DeleteModal onConfirm={() => deleteReport(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
      )}

      {/* Header */}
      <div className="bg-white px-8 py-5" style={{ borderBottom: '1px solid #f0f2f7', boxShadow: '0 1px 0 rgba(0,0,0,0.03)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">Tableau de bord</h1>
              <p className="text-xs text-slate-400 mt-0.5 capitalize">{today}</p>
            </div>
            {total > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                {successRate}% de succès
              </span>
            )}
          </div>
          <Link to="/upload" className="btn-primary gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau rapport
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-7 space-y-6">

        {/* KPI */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Rapports importés" value={total}
            color="#6366f1" bg="#eef2ff"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          <StatCard label="Extractions réussies" value={done} total={total}
            color="#22c55e" bg="#f0fdf4"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard label="Rapports validés" value={validated} total={done}
            color="#f59e0b" bg="#fffbeb"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
          />
        </div>

        {/* Charts */}
        {total > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-white rounded-2xl p-6"
              style={{ border: '1px solid #eef0f5', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">Activité — 7 derniers jours</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Rapports importés par jour</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#eef2ff', color: '#6366f1' }}>7j</span>
              </div>
              <ResponsiveContainer width="100%" height={165}>
                <BarChart data={activityData} barSize={20} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a5b4fc" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(99,102,241,0.04)', radius: 6 }} />
                  <Bar dataKey="rapports" radius={[5, 5, 0, 0]}>
                    {activityData.map((e, i) => <Cell key={i} fill={e.rapports > 0 ? 'url(#barG)' : '#f1f5f9'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-6"
              style={{ border: '1px solid #eef0f5', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <h2 className="text-sm font-semibold text-gray-800 mb-0.5">Statuts</h2>
              <p className="text-xs text-slate-400 mb-4">Répartition</p>
              {statusDist.length > 0 ? (
                <>
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <ResponsiveContainer width={130} height={130}>
                        <PieChart>
                          <Pie data={statusDist} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value" strokeWidth={0}>
                            {statusDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <Tooltip content={<PieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xl font-black text-gray-900 leading-none">{successRate}%</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">succès</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {statusDist.map(s => (
                      <div key={s.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                          <span className="text-xs text-slate-500">{s.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-700">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-28 text-slate-300 text-xs">Aucune donnée</div>
              )}
            </div>
          </div>
        )}

        {/* Table / Empty state */}
        {loading ? (
          <div className="bg-white rounded-2xl p-16 flex items-center justify-center"
            style={{ border: '1px solid #eef0f5' }}>
            <span className="animate-spin rounded-full h-7 w-7 border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 flex flex-col items-center text-center"
            style={{ border: '1px solid #eef0f5', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-semibold text-gray-800 mb-1">Aucun rapport pour le moment</p>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">Importez votre premier procès-verbal PDF pour démarrer l'extraction IA</p>
            <Link to="/upload" className="btn-primary gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Importer un rapport
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden"
            style={{ border: '1px solid #eef0f5', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f8fafc' }}>
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Historique</h2>
                <p className="text-xs text-slate-400 mt-0.5">{reports.length} rapport{reports.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f0f2f7' }}>
                  {['Fichier', 'Date', 'Statut', 'Validation', ''].map((h, i) => (
                    <th key={i} className={`px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider ${i < 4 ? 'text-left' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((r, idx) => (
                  <tr key={r.id} className="group transition-colors duration-100"
                    style={{ borderBottom: idx < reports.length - 1 ? '1px solid #f8fafc' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: '#fff1f2', border: '1px solid #fee2e2' }}>
                          <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{r.filename || 'Sans nom'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-slate-400">
                      {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-3.5">
                      {r.validated ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: '#f0fdf4', color: '#16a34a' }}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Validé
                        </span>
                      ) : <span className="text-slate-200 text-sm">—</span>}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {r.status === 'done' && (
                          <Link to={`/reports/${r.id}`}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                            style={{ background: '#eef2ff', color: '#4f6ef7', border: '1px solid #e0e7ff' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#e0e7ff'}
                            onMouseLeave={e => e.currentTarget.style.background = '#eef2ff'}>
                            Ouvrir
                          </Link>
                        )}
                        <button onClick={() => setConfirmDelete(r.id)}
                          className="p-1.5 rounded-lg transition-colors" style={{ color: '#cbd5e1' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#cbd5e1' }}>
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
          </div>
        )}
      </div>
    </div>
  )
}
