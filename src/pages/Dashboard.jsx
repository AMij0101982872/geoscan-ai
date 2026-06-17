import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'

export default function Dashboard({ session }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
    // Polling pour rafraîchir les statuts "processing"
    const interval = setInterval(fetchReports, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchReports() {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!error) setReports(data || [])
    setLoading(false)
  }

  async function deleteReport(id) {
    if (!confirm('Supprimer ce rapport ?')) return
    await supabase.from('reports').delete().eq('id', id)
    setReports(r => r.filter(x => x.id !== id))
  }

  const stats = {
    total: reports.length,
    done: reports.filter(r => r.status === 'done').length,
    validated: reports.filter(r => r.validated).length,
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tous vos rapports géotechniques</p>
        </div>
        <Link to="/upload" className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau rapport
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total rapports', value: stats.total, color: 'text-gray-900' },
          { label: 'Extractions réussies', value: stats.done, color: 'text-green-600' },
          { label: 'Validés', value: stats.validated, color: 'text-brand-600' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`text-3xl font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Chargement…</div>
      ) : reports.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">📄</div>
          <p className="text-gray-600 font-medium">Aucun rapport pour l'instant</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Uploadez votre premier PDF géotechnique</p>
          <Link to="/upload" className="btn-primary inline-flex">Commencer</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fichier</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Validé</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reports.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 text-xs font-bold flex-shrink-0">PDF</div>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-xs">{r.filename || 'Sans nom'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">
                    {new Date(r.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    {r.validated
                      ? <span className="text-green-600 text-sm">✓ Oui</span>
                      : <span className="text-gray-400 text-sm">—</span>
                    }
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {r.status === 'done' && (
                        <Link to={`/reports/${r.id}`} className="btn-secondary text-xs py-1.5 px-3">
                          Voir / Valider
                        </Link>
                      )}
                      <button
                        onClick={() => deleteReport(r.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1.5"
                        title="Supprimer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
