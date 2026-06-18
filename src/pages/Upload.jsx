import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STEPS = [
  {
    n: '01',
    title: 'Upload PDF',
    desc: 'Importez votre procès-verbal manuscrit',
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
    desc: 'Gemini lit et structure les données',
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
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export default function Upload({ session }) {
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

  return (
    <div className="min-h-full bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">

        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-6 transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour au tableau de bord
        </button>

        {/* Title */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-gray-900">Nouveau rapport</h1>
          <p className="text-sm text-slate-500 mt-1">Importez un procès-verbal Atterberg manuscrit au format PDF</p>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && !file && inputRef.current.click()}
            className={`relative m-5 rounded-xl border-2 border-dashed transition-all duration-200 ${
              dragging
                ? 'border-brand-400 bg-brand-50'
                : file
                ? 'border-green-300 bg-green-50/50 cursor-default'
                : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50 cursor-pointer'
            }`}
          >
            <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />

            <div className="py-14 px-8 flex flex-col items-center text-center">
              {file ? (
                <>
                  {/* File selected */}
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-gray-900 text-base mb-1">{file.name}</p>
                  <p className="text-sm text-slate-400 mb-4">
                    {(file.size / 1024).toFixed(0)} Ko · PDF
                  </p>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null) }}
                    className="text-xs text-red-400 hover:text-red-600 font-medium border border-red-100 hover:border-red-300 px-3 py-1.5 rounded-lg transition-all"
                  >
                    Changer de fichier
                  </button>
                </>
              ) : (
                <>
                  {/* Empty state */}
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-colors ${
                    dragging ? 'bg-brand-100' : 'bg-slate-100'
                  }`}>
                    <svg className={`w-8 h-8 transition-colors ${dragging ? 'text-brand-500' : 'text-slate-400'}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="font-semibold text-gray-800 text-base">
                    {dragging ? 'Relâchez pour importer' : 'Glisser-déposer votre PDF'}
                  </p>
                  <p className="text-sm text-slate-400 mt-1.5">
                    ou{' '}
                    <span className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
                      cliquez pour parcourir
                    </span>
                  </p>
                  <div className="mt-5 flex items-center gap-2 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1 border border-slate-100 rounded-full px-3 py-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                      PDF uniquement
                    </span>
                    <span className="inline-flex items-center gap-1 border border-slate-100 rounded-full px-3 py-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                      Max 10 Mo
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-5 mb-5 flex items-start gap-2.5 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="px-5 pb-5 flex items-center gap-3">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 text-base"
            >
              {uploading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Extraction en cours…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Lancer l'extraction
                </>
              )}
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary py-3 px-5">
              Annuler
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-3 gap-3">
          {STEPS.map((step, i) => (
            <div key={step.n} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  i === 0 ? 'bg-brand-50 text-brand-600'
                  : i === 1 ? 'bg-violet-50 text-violet-600'
                  : 'bg-green-50 text-green-600'
                }`}>
                  {step.icon}
                </div>
                <span className="text-xs font-bold text-slate-300">{step.n}</span>
              </div>
              <p className="text-sm font-semibold text-gray-800">{step.title}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
