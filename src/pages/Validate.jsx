import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme, T } from '../lib/theme'
import { SectionATable, SectionB1Table, SectionB2Table } from '../components/DataTable'
import ExportBtn from '../components/ExportBtn'

function MetaField({ label, value, t }) {
  return (
    <div className="p-4" style={{ borderBottom: `1px solid ${t.divider}`, borderRight: `1px solid ${t.divider}` }}>
      <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>{label}</div>
      <div className="text-sm font-semibold" style={{ color: t.text }}>
        {value || <span style={{ color: t.textMuted, fontWeight: 400 }}>—</span>}
      </div>
    </div>
  )
}

export default function Validate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const t = isDark ? T.dark : T.light

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

  const CARD = { ...t.card, overflow: 'hidden' }

  if (loading) return (
    <div className="min-h-full flex items-center justify-center" style={{ background: t.bg }}>
      <span className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
    </div>
  )
  if (!report || !data) return (
    <div className="p-8 text-sm" style={{ color: '#f87171', background: t.bg }}>Rapport introuvable.</div>
  )

  const meta = data.meta || {}

  return (
    <div className="min-h-full" style={{ background: t.bg }}>

      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 backdrop-blur-md"
        style={{ background: t.topbar, borderBottom: `1px solid ${t.topbarBorder}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm transition-all"
              style={{ color: t.textMuted }}
              onMouseEnter={e => e.currentTarget.style.color = t.text}
              onMouseLeave={e => e.currentTarget.style.color = t.textMuted}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>
            <div className="w-px h-5" style={{ background: t.divider }} />
            <div>
              <div className="text-sm font-semibold leading-tight" style={{ color: t.text }}>{report.filename}</div>
              <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: t.textMuted }}>
                <span>{new Date(report.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                {report.validated && corrections.length === 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold" style={{ color: '#22c55e' }}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Validé
                  </span>
                )}
                {corrections.length > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold" style={{ color: '#fbbf24' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    {corrections.length} correction(s) non sauvegardée(s)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportBtn report={{ ...report, raw_json: data }} />
            <button onClick={handleSave} disabled={saving} className="btn-primary gap-2"
              style={saved ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
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
      <div className="max-w-5xl mx-auto px-8 py-7 space-y-4">

        {/* Meta card */}
        <div style={CARD}>
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1e2d5c 0%, #2f5496 100%)', borderBottom: `1px solid ${t.divider}` }}>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Informations générales</h2>
            <p className="text-xs text-blue-200 mt-0.5">Métadonnées du procès-verbal</p>
          </div>
          <div className="grid grid-cols-2" style={{ background: t.card.background }}>
            <MetaField label="Date de l'essai" value={meta.date_essai} t={t} />
            <MetaField label="Opérateur" value={meta.operateur} t={t} />
            <MetaField label="Code balances" value={meta.code_balances} t={t} />
            <MetaField label="Code étuve" value={meta.code_etuve} t={t} />
            <MetaField label="Code Casagrande" value={meta.code_casagrande} t={t} />
            <MetaField label="Code échantillon" value={meta.code_echantillon} t={t} />
            <MetaField label="Référence" value={meta.ref} t={t} />
            <MetaField label="Version" value={meta.version} t={t} />
          </div>
        </div>

        {/* Hint */}
        <div className="flex items-center gap-2.5 text-xs px-4 py-3 rounded-xl"
          style={{ color: t.textSub, background: t.hintBg, border: `1px solid ${t.hintBorder}` }}>
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#818cf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Cliquez sur n'importe quelle cellule de donnée pour la modifier. Sauvegardez quand vous avez terminé.
        </div>

        {/* Sections */}
        <div style={CARD}><SectionATable data={data.section_a} onSave={handleCellSave} /></div>
        <div style={CARD}><SectionB1Table data={data.section_b1} onSave={handleCellSave} /></div>
        <div style={CARD}><SectionB2Table data={data.section_b2} onSave={handleCellSave} /></div>

        {/* Correction log */}
        {corrections.length > 0 && (
          <div className="p-5 rounded-2xl"
            style={{ background: t.corrBg, border: `1px solid ${t.corrBorder}` }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-sm font-semibold" style={{ color: t.text }}>Corrections en attente ({corrections.length})</h3>
            </div>
            <div className="space-y-2">
              {corrections.map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-xs px-3 py-2.5 rounded-lg"
                  style={{ background: t.corrItem, border: `1px solid ${t.corrItemBorder}` }}>
                  <code className="px-2 py-0.5 rounded font-mono" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'white', color: t.textSub, border: `1px solid ${t.divider}` }}>
                    {c.field_path}
                  </code>
                  <span className="line-through font-medium" style={{ color: '#f87171' }}>{c.old_value}</span>
                  <svg className="w-3 h-3 flex-shrink-0" style={{ color: t.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-semibold" style={{ color: '#22c55e' }}>{c.new_value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
