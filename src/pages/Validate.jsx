import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SectionATable, SectionB1Table, SectionB2Table } from '../components/DataTable'
import ExportBtn from '../components/ExportBtn'

function Section({ title, subtitle, children }) {
  return (
    <div className="card overflow-hidden mb-5">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div>
          <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
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

  useEffect(() => {
    fetchReport()
  }, [id])

  async function fetchReport() {
    const { data: r } = await supabase.from('reports').select('*').eq('id', id).single()
    if (r) {
      setReport(r)
      setData(r.raw_json)
    }
    setLoading(false)
  }

  // Met à jour localement + enregistre la correction
  function handleCellSave(fieldPath, oldValue, newValue) {
    // Mise à jour profonde du state local
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
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = value
  }

  async function handleSave() {
    setSaving(true)
    // Sauvegarder les données corrigées
    await supabase.from('reports').update({ raw_json: data, validated: true }).eq('id', id)
    // Enregistrer les corrections
    if (corrections.length > 0) {
      await supabase.from('corrections').insert(corrections.map(c => ({ ...c, report_id: id })))
    }
    setCorrections([])
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="p-8 text-gray-400">Chargement…</div>
  if (!report || !data) return <div className="p-8 text-red-500">Rapport introuvable.</div>

  const meta = data.meta || {}

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1">
            ← Retour
          </button>
          <h1 className="text-xl font-semibold text-gray-900">{report.filename}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Importé le {new Date(report.created_at).toLocaleDateString('fr-FR')} ·
            {corrections.length > 0 && <span className="text-orange-500 ml-1">{corrections.length} correction(s) non sauvegardée(s)</span>}
            {report.validated && corrections.length === 0 && <span className="text-green-600 ml-1">✓ Validé</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <ExportBtn report={{ ...report, raw_json: data }} />
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : 'Valider et sauvegarder'}
          </button>
        </div>
      </div>

      {/* Infos générales */}
      <Section title="Informations générales" subtitle="Métadonnées du procès-verbal">
        <div className="grid grid-cols-2 gap-0 divide-x divide-gray-50">
          {[
            ['Date de l\'essai', meta.date_essai],
            ['Opérateur', meta.operateur],
            ['Code échantillon', meta.code_echantillon],
            ['Référence', meta.ref],
          ].map(([label, val]) => (
            <div key={label} className="px-5 py-3.5 even:pl-6">
              <div className="text-xs text-gray-400 mb-0.5">{label}</div>
              <div className="text-sm font-medium text-gray-900">{val || '—'}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Section A */}
      <Section
        title="Section A — Proportion < 0,4 mm"
        subtitle="Cliquer sur une cellule pour la modifier"
      >
        <SectionATable data={data.section_a} onSave={handleCellSave} />
      </Section>

      {/* Section B1 */}
      <Section
        title="B-1 — Limite de Liquidité"
        subtitle="Teneur en eau surlignée en vert"
      >
        <SectionB1Table data={data.section_b1} onSave={handleCellSave} />
      </Section>

      {/* Section B2 */}
      <Section
        title="B-2 — Limite de Plasticité"
        subtitle="Teneur en eau moyenne en bas de tableau"
      >
        <SectionB2Table data={data.section_b2} onSave={handleCellSave} />
      </Section>

      {/* Journal des corrections */}
      {corrections.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Corrections en attente ({corrections.length})</h3>
          <div className="space-y-1.5">
            {corrections.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{c.field_path}</code>
                <span className="text-red-400 line-through">{c.old_value}</span>
                <span>→</span>
                <span className="text-green-600 font-medium">{c.new_value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
