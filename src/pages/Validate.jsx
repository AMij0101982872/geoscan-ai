import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SectionATable, SectionB1Table, SectionB2Table } from '../components/DataTable'
import ExportBtn from '../components/ExportBtn'

function MetaField({ label, value }) {
  return (
    <div className="p-4">
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{value || <span className="text-slate-300 font-normal">—</span>}</div>
    </div>
  )
}

export default function Validate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [data, setData] = useState(null)
  const [corrections, setCorrections] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { fetchReport() }, [id])

  async function fetchReport() {
    const { data: r } = await supabase.from('reports').select('*').eq('id', id).single()
    if (r) { setReport(r); setData(r.raw_json) }
    setLoading(false)
  }

  function handleCellSave(fieldPath, oldValue, newValue) {
    setData(prev => {
      const updated = JSON.parse(JSON.stringify(prev))
      setNestedValue(updated, fieldPath, newValue)
      return updated
    })
    setCorrections(prev => [...prev, { field_path: fieldPath, old_value: String(oldValue), new_value: String(newValue) }])
  }

  function setNestedValue(obj, path, value) {
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.')
    let cur = obj
    for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]]
    cur[parts[parts.length - 1]] = value
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('reports').update({ raw_json: data, validated: true }).eq('id', id)
    if (corrections.length > 0) {
      await supabase.from('corrections').insert(corrections.map(c => ({ ...c, report_id: id })))
    }
    setCorrections([])
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return (
    <div className="min-h-full flex items-center justify-center">
      <span className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
    </div>
  )
  if (!report || !data) return (
    <div className="p-8 text-red-500 text-sm">Rapport introuvable.</div>
  )

  const meta = data.meta || {}

  return (
    <div className="min-h-full bg-slate-50">

      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <div>
              <div className="text-sm font-semibold text-gray-900 leading-tight">{report.filename}</div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>{new Date(report.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                {report.validated && corrections.length === 0 && (
                  <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Validé
                  </span>
                )}
                {corrections.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {corrections.length} correction(s) non sauvegardée(s)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportBtn report={{ ...report, raw_json: data }} />
            <button
              onClick={handleSave}
              disabled={saving}
              className={`btn-primary flex items-center gap-2 transition-all ${saved ? 'bg-green-500 hover:bg-green-600' : ''}`}
            >
              {saving ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Sauvegarde…
                </>
              ) : saved ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Sauvegardé !
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Valider et sauvegarder
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-7 space-y-5">

        {/* Meta card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"
            style={{ background: 'linear-gradient(135deg, #1e2d5c 0%, #2f5496 100%)' }}>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Informations générales</h2>
            <p className="text-xs text-blue-200 mt-0.5">Métadonnées du procès-verbal</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
            <MetaField label="Date de l'essai" value={meta.date_essai} />
            <MetaField label="Opérateur" value={meta.operateur} />
            <MetaField label="Code balances" value={meta.code_balances} />
            <MetaField label="Code étuve" value={meta.code_etuve} />
            <MetaField label="Code Casagrande" value={meta.code_casagrande} />
            <MetaField label="Code échantillon" value={meta.code_echantillon} />
            <MetaField label="Référence" value={meta.ref} />
            <MetaField label="Version" value={meta.version} />
          </div>
        </div>

        {/* Hint */}
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
          <svg className="w-4 h-4 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Cliquez sur n'importe quelle cellule de donnée pour la modifier. Sauvegardez quand vous avez terminé.
        </div>

        {/* Section A */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionATable data={data.section_a} onSave={handleCellSave} />
        </div>

        {/* Section B1 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionB1Table data={data.section_b1} onSave={handleCellSave} />
        </div>

        {/* Section B2 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionB2Table data={data.section_b2} onSave={handleCellSave} />
        </div>

        {/* Correction log */}
        {corrections.length > 0 && (
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-sm font-semibold text-gray-700">Corrections en attente ({corrections.length})</h3>
            </div>
            <div className="space-y-2">
              {corrections.map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-xs bg-amber-50 px-3 py-2 rounded-lg">
                  <code className="bg-white border border-amber-100 px-2 py-0.5 rounded text-slate-500 font-mono">{c.field_path}</code>
                  <span className="text-red-400 line-through font-medium">{c.old_value}</span>
                  <svg className="w-3 h-3 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-green-600 font-semibold">{c.new_value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
