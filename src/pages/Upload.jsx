import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme, T } from '../lib/theme'

const STEPS = [
  {
    n: '01',
    title: 'Upload PDF',
    desc: 'Importez votre procès-verbal manuscrit',
    color: '#4f6ef7',
    bgLight: 'rgba(79,110,247,0.08)',
    bgDark: 'rgba(79,110,247,0.15)',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    n: '02',
    title: 'Extraction IA',
    desc: "L'IA lit et structure les données automatiquement",
    color: '#818cf8',
    bgLight: 'rgba(129,140,248,0.08)',
    bgDark: 'rgba(129,140,248,0.15)',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    n: '03',
    title: 'Validation',
    desc: 'Corrigez et exportez en Excel',
    color: '#22c55e',
    bgLight: 'rgba(34,197,94,0.08)',
    bgDark: 'rgba(34,197,94,0.15)',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export default function Upload({ session }) {
  const { isDark } = useTheme()
  const t = isDark ? T.dark : T.light

  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()
  const navigate = useNavigate()

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type === 'application/pdf') { setFile(f); setError('') }
    else setError('Seuls les fichiers PDF sont acceptés.')
  }

  function handleFile(e) {
    const f = e.target.files[0]
    if (f) { setFile(f); setError('') }
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const filePath = `${session.user.id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage.from('pdfs').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: report, error: dbError } = await supabase
        .from('reports')
        .insert({ user_id: session.user.id, filename: file.name, pdf_path: filePath, status: 'processing' })
        .select().single()
      if (dbError) throw dbError

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: report.id, pdf_path: filePath }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Erreur extraction (HTTP ${res.status})`)
      }
      navigate(`/reports/${report.id}`)
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.')
      setUploading(false)
    }
  }

  const dropzoneBorder = dragging ? '#4f6ef7' : file ? '#22c55e' : isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'
  const dropzoneBg = dragging
    ? 'rgba(79,110,247,0.07)'
    : file
    ? isDark ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.03)'
    : isDark ? 'rgba(255,255,255,0.02)' : '#fafbff'

  return (
    <div className="min-h-full p-6" style={{ background: t.bg }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: t.text }}>Nouveau rapport</h1>
            <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>Importez un procès-verbal Atterberg manuscrit au format PDF</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-all"
            style={t.cancelBtn}
            onMouseEnter={e => Object.assign(e.currentTarget.style, t.cancelBtnHover)}
            onMouseLeave={e => Object.assign(e.currentTarget.style, t.cancelBtn)}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
        </div>

        {/* Main card */}
        <div className="mb-4" style={t.card}>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && !file && inputRef.current.click()}
            className="m-5 rounded-xl border-2 border-dashed transition-all duration-200"
            style={{ borderColor: dropzoneBorder, background: dropzoneBg, cursor: file || uploading ? 'default' : 'pointer' }}
          >
            <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
            <div className="py-14 px-8 flex flex-col items-center text-center">
              {file ? (
                <>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)' }}>
                    <svg className="w-8 h-8" style={{ color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-base mb-1" style={{ color: t.text }}>{file.name}</p>
                  <p className="text-sm mb-4" style={{ color: t.textMuted }}>{(file.size / 1024).toFixed(0)} Ko · PDF</p>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null) }}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                    style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.18)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}>
                    Changer de fichier
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-colors"
                    style={{ background: dragging ? 'rgba(79,110,247,0.15)' : isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }}>
                    <svg className="w-8 h-8 transition-colors"
                      style={{ color: dragging ? '#818cf8' : t.textMuted }}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="font-semibold text-base" style={{ color: t.text }}>
                    {dragging ? 'Relâchez pour importer' : 'Glisser-déposer votre PDF'}
                  </p>
                  <p className="text-sm mt-1.5" style={{ color: t.textMuted }}>
                    ou <span style={{ color: '#818cf8', fontWeight: 600 }}>cliquez pour parcourir</span>
                  </p>
                  <div className="mt-5 flex items-center gap-2">
                    {['PDF uniquement', 'Max 10 Mo'].map(label => (
                      <span key={label} className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full"
                        style={{ color: t.textMuted, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}` }}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                        </svg>
                        {label}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-5 mb-5 flex items-start gap-2.5 text-sm px-4 py-3 rounded-xl"
              style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="px-5 pb-5 flex items-center gap-3">
            <button onClick={handleUpload} disabled={!file || uploading} className="flex-1 btn-primary py-3 text-base">
              {uploading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Extraction en cours…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Lancer l'extraction
                </>
              )}
            </button>
            <button onClick={() => navigate('/')}
              className="py-3 px-5 rounded-xl text-sm font-medium transition-all"
              style={t.cancelBtn}
              onMouseEnter={e => Object.assign(e.currentTarget.style, t.cancelBtnHover)}
              onMouseLeave={e => Object.assign(e.currentTarget.style, t.cancelBtn)}>
              Annuler
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-3 gap-3">
          {STEPS.map(step => (
            <div key={step.n} className="p-4" style={t.card}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: isDark ? step.bgDark : step.bgLight, color: step.color }}>
                  {step.icon}
                </div>
                <span className="text-xs font-bold" style={{ color: t.textMuted }}>{step.n}</span>
              </div>
              <p className="text-sm font-semibold" style={{ color: t.text }}>{step.title}</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: t.textSub }}>{step.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
