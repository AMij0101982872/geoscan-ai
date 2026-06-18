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
    { name: 'En cours', value: processing, color: '#6366f1' },
  ].filter(s => s.value > 0)
}

function StatCard({ label, value, total, icon, gradient, badge }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="bg-white rounded-2xl border border-gray-100/80 p-6 flex flex-col gap-4"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}>
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
          style={{ background: gradient }}>
          {icon}
        </div>
        {total != null && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: '#f1f5f9', color: '#64748b' }}>
            {pct}%
          </span>
        )}
        {badge && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: '#f0fdf4', color: '#16a34a' }}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <div className="text-3xl font-bold text-gray-900 tracking-tight leading-none mb-1.5">{value}</div>
        <div className="text-sm text-slate-400 font-medium">{label}</div>
      </div>
      {total != null && (
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: gradient }} />
        </div>
      )}
    </div>
  )
}

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="text-white text-xs px-3 py-2 rounded-xl shadow-xl"
      style={{ background: '#0f172a' }}>
      <p className="font-semibold mb-0.5">{label}</p>
      <p className="text-slate-300">{payload[0].value} rapport{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="text-white text-xs px-3 py-2 rounded-xl shadow-xl"
      style={{ background: '#0f172a' }}>
      <p className="font-semibold">{payload[0].name} — {payload[0].value}</p>
    </div>
  )
}

function DeleteModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(15,23,42,0.4)' }} onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-7 w-full max-w-sm"
        style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: '#fef2f2' }}>
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-1.5">Supprimer ce rapport ?</h3>
        <p className="text-sm text-slate-400 text-center mb-6">Cette action est irréversible et définitive.</p>
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

  return (
    <div className="min-h-full">
      {confirmDelete && (
        <DeleteModal
          onConfirm={() => deleteReport(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-8 py-5"
        style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.04)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Tableau de bord</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {total === 0 ? 'Aucun rapport pour le moment' : `${total} rapport${total > 1 ? 's' : ''} importé${total > 1 ? 's' : ''}`}
            </p>
          </div>
          <Link to="/upload" className="btn-primary gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau rapport
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-7 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Rapports importés"
            value={total}
            gradient="linear-gradient(135deg, #6366f1, #818cf8)"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatCard
            label="Extractions réussies"
            value={done}
            total={total}
            gradient="linear-gradient(135deg, #22c55e, #4ade80)"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Rapports validés"
            value={validated}
            total={done}
            gradient="linear-gradient(135deg, #f59e0b, #fbbf24)"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          />
        </div>

        {/* Charts */}
        {total > 0 && (
          <div className="grid grid-cols-3 gap-4">

            {/* Bar chart */}
            <div className="col-span-2 bg-white rounded-2xl border border-gray-100/80 p-6"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">Activité — 7 derniers jours</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Rapports importés par jour</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: '#eff6ff', color: '#3b82f6' }}>
                  7 jours
                </span>
              </div>
              <ResponsiveContainer width="100%" height={175}>
                <BarChart data={activityData} barSize={24} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
                  <Bar dataKey="rapports" radius={[6, 6, 0, 0]}>
                    {activityData.map((entry, i) => (
                      <Cell key={i} fill={entry.rapports > 0 ? 'url(#barGrad)' : '#e2e8f0'} />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Donut */}
            <div className="bg-white rounded-2xl border border-gray-100/80 p-6"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}>
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-gray-800">Statuts</h2>
                <p className="text-xs text-slate-400 mt-0.5">Répartition des extractions</p>
              </div>
              {statusDist.length > 0 ? (
                <>
                  <div className="flex justify-center">
                    <div className="relative">
                      <ResponsiveContainer width={144} height={144}>
                        <PieChart>
                          <Pie data={statusDist} cx="50%" cy="50%"
                            innerRadius={42} outerRadius={62}
                            paddingAngle={3} dataKey="value" strokeWidth={0}>
                            {statusDist.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-gray-900 leading-none">{successRate}%</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 font-medium">succès</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {statusDist.map(s => (
                      <div key={s.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                          <span className="text-xs text-slate-500">{s.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-32 text-slate-300 text-sm">
                  Aucune donnée
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100/80 p-16 flex items-center justify-center"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <span className="animate-spin rounded-full h-7 w-7 border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100/80 p-16 text-center"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' }}>
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-800 font-semibold text-base">Aucun rapport</p>
            <p className="text-sm text-slate-400 mt-1.5 mb-6 max-w-xs mx-auto">
              Importez votre premier procès-verbal PDF pour commencer l'extraction IA
            </p>
            <Link to="/upload" className="btn-primary inline-flex gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Importer un rapport
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}>
            <div className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Historique des rapports</h2>
                <p className="text-xs text-slate-400 mt-0.5">{reports.length} rapport{reports.length > 1 ? 's' : ''} au total</p>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Fichier</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Validation</th>
                  <th className="px-6 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {reports.map((r, idx) => (
                  <tr key={r.id}
                    className="group transition-colors"
                    style={{ borderBottom: idx < reports.length - 1 ? '1px solid #f8fafc' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: '#fff1f2', border: '1px solid #fee2e2' }}>
                          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[220px]">
                          {r.filename || 'Sans nom'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-6 py-4">
                      {r.validated ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: '#f0fdf4', color: '#16a34a' }}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Validé
                        </span>
                      ) : (
                        <span className="text-slate-200 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        {r.status === 'done' && (
                          <Link to={`/reports/${r.id}`}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                            style={{ background: '#f5f7fb', color: '#4f6ef7', border: '1px solid #e0e7ff' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                            onMouseLeave={e => e.currentTarget.style.background = '#f5f7fb'}>
                            Voir
                          </Link>
                        )}
                        <button
                          onClick={() => setConfirmDelete(r.id)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#cbd5e1' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#cbd5e1' }}
                          title="Supprimer">
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
