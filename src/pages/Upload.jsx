import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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
    if (f?.type === 'application/pdf') setFile(f)
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
      // 1. Upload PDF dans Supabase Storage
      const filePath = `${session.user.id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Créer l'entrée en base
      const { data: report, error: dbError } = await supabase
        .from('reports')
        .insert({
          user_id:  session.user.id,
          filename: file.name,
          pdf_path: filePath,
          status:   'processing',
        })
        .select()
        .single()

      if (dbError) throw dbError

      // 3. Appeler la Vercel Function d'extraction
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: report.id, pdf_path: filePath }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Erreur extraction (HTTP ${res.status})`)
      }

      // 4. Rediriger vers la page de validation
      navigate(`/reports/${report.id}`)
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.')
      setUploading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Nouveau rapport</h1>
        <p className="text-sm text-gray-500 mt-0.5">Uploadez un PDF de procès-verbal Atterberg manuscrit</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current.click()}
        className={`card p-10 text-center cursor-pointer border-2 border-dashed transition-colors ${
          dragging ? 'border-brand-400 bg-brand-50' : file ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50/50'
        }`}
      >
        <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />

        {file ? (
          <div>
            <div className="text-4xl mb-3">✅</div>
            <p className="font-medium text-gray-900">{file.name}</p>
            <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(0)} Ko</p>
            <button
              onClick={e => { e.stopPropagation(); setFile(null) }}
              className="mt-3 text-xs text-red-500 hover:underline"
            >
              Changer de fichier
            </button>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-3">📄</div>
            <p className="font-medium text-gray-700">Glisser-déposer le PDF ici</p>
            <p className="text-sm text-gray-400 mt-1">ou cliquer pour parcourir</p>
            <p className="text-xs text-gray-300 mt-3">PDF uniquement — max 10 Mo</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {/* Info box */}
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
        <strong>Comment ça marche :</strong> Le PDF est envoyé à Claude AI qui extrait toutes les données manuscrites et les structure en JSON. Vous pourrez ensuite corriger les éventuelles erreurs avant d'exporter en Excel.
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="btn-primary flex items-center gap-2"
        >
          {uploading ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Extraction en cours…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Lancer l'extraction
            </>
          )}
        </button>
        <button onClick={() => navigate('/')} className="btn-secondary">Annuler</button>
      </div>
    </div>
  )
}
