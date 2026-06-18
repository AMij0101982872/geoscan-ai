import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

// ── Helpers ─────────────────────────────────────────────────────────────────

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
    { name: 'En cours', value: processing, color: '#3b82f6' },
  ].filter(s => s.value > 0)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, total, icon, bg, iconColor, suffix }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        {total != null && (
          <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-full">
            {pct}%
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}{suffix}</div>
      <div className="text-sm text-slate-500">{label}</div>
      {total != null && value > 0 && (
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #4f6ef7, #818cf8)' }}
          />
        </div>
      )}
    </div>
  )
}

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl">
      <p className="font-semibold mb-0.5">{label}</p>
      <p>{payload[0].value} rapport{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl">
      <p className="font-semibold">{payload[0].name}</p>
      <p>{payload[0].value}</p>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

function DeleteModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-sm">
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-1">Supprimer ce rapport ?</h3>
        <p className="text-sm text-slate-400 text-center mb-6">Cette action est irréversible.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-secondary py-2.5">Annuler</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors">
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
    <div className="p-8 max-w-7xl mx-auto">
      {confirmDelete && (
        <DeleteModal
          onConfirm={() => deleteReport(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-slate-500 mt-0.5">Vue d'ensemble de vos extractions géotechniques</p>
        </div>
        <Link to="/upload" className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau rapport
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total rapports importés"
          value={total}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          bg="bg-slate-100" iconColor="text-slate-600"
        />
        <StatCard
          label="Extractions réussies"
          value={done} total={total}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          bg="bg-green-50" iconColor="text-green-600"
        />
        <StatCard
          label="Rapports validés"
          value={validated} total={done}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
          bg="bg-brand-50" iconColor="text-brand-600"
        />
      </div>

      {/* Charts row */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">

          {/* Activity bar chart */}
          <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Activité — 7 derniers jours</h2>
                <p className="text-xs text-slate-400 mt-0.5">Nombre de rapports importés par jour</p>
              </div>
              <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-3 py-1 rounded-full">
                {total} total
              </span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={activityData} barSize={28} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f1f5f9', radius: 6 }} />
                <Bar dataKey="rapports" radius={[6, 6, 0, 0]}>
                  {activityData.map((_, i) => (
                    <Cell key={i} fill={activityData[i].rapports > 0 ? '#4f6ef7' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Donut chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-800">Statuts</h2>
              <p className="text-xs text-slate-400 mt-0.5">Répartition des extractions</p>
            </div>

            {statusDist.length > 0 ? (
              <>
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <ResponsiveContainer width={150} height={150}>
                      <PieChart>
                        <Pie
                          data={statusDist}
                          cx="50%" cy="50%"
                          innerRadius={45} outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusDist.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-gray-900">{successRate}%</span>
                      <span className="text-xs text-slate-400">succès</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {statusDist.map(s => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-slate-600">{s.name}</span>
                      </div>
                      <span className="font-semibold text-gray-700">{s.value}</span>
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex items-center justify-center">
          <span className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-800 font-semibold text-lg">Aucun rapport</p>
          <p className="text-sm text-slate-400 mt-1 mb-6">Importez votre premier PDF géotechnique pour commencer</p>
          <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Commencer
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Historique des rapports</h2>
            <span className="text-xs text-slate-400">{reports.length} rapport{reports.length > 1 ? 's' : ''}</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Fichier</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Validation</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reports.map(r => (
                <tr key={r.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-xs">{r.filename || 'Sans nom'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-400">
                    {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-5 py-4">
                    {r.validated ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Validé
                      </span>
                    ) : (
                      <span className="text-slate-200 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {r.status === 'done' && (
                        <Link to={`/reports/${r.id}`} className="btn-secondary text-xs py-1.5 px-3">
                          Voir / Valider
                        </Link>
                      )}
                      <button
                        onClick={() => setConfirmDelete(r.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
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
  )
}
