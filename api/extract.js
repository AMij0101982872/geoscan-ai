import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const CLAUDE_PROMPT = `Tu es un expert en extraction de données de documents géotechniques manuscrits.
Analyse ce procès-verbal de détermination des Limites d'Atterberg (ISO 17892-12).

Extrait TOUTES les valeurs visibles dans le document, même si l'écriture est difficile à lire.
Pour les valeurs ambiguës, indique ton meilleur choix (ex: 4,455 et non 4,457 si le chiffre ressemble plus à un 5).

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans explication.

Structure exacte attendue :
{
  "meta": {
    "date_essai": "",
    "operateur": "",
    "code_balances": "",
    "code_etuve": "",
    "code_casagrande": "",
    "code_echantillon": "",
    "ref": "",
    "version": ""
  },
  "section_a": {
    "tares": [
      {
        "id": "",
        "masse_tare": 0,
        "sol_humide_tare": 0,
        "sol_sec_1": 0,
        "sol_sec_2": 0,
        "teneur_eau": null
      }
    ],
    "masse_eprouvette": 0,
    "masse_retenue_tamis": 0
  },
  "section_b1": {
    "mesures": [
      {
        "nb_rotations": 0,
        "tare": "",
        "masse_tare": 0,
        "sol_humide_tare": 0,
        "sol_sec_1": 0,
        "sol_sec_2": 0,
        "teneur_eau": 0
      }
    ]
  },
  "section_b2": {
    "mesures": [
      {
        "tare": "",
        "masse_tare": 0,
        "sol_humide_tare": 0,
        "sol_sec_1": 0,
        "sol_sec_2": 0,
        "teneur_eau": 0
      }
    ],
    "teneur_eau_moyenne": 0
  }
}`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { report_id, pdf_path } = req.body

  if (!report_id || !pdf_path) {
    return res.status(400).json({ error: 'report_id et pdf_path requis' })
  }

  try {
    // 1. Mettre le statut en processing
    await supabase.from('reports').update({ status: 'processing' }).eq('id', report_id)

    // 2. Télécharger le PDF depuis Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('pdfs')
      .download(pdf_path)

    if (downloadError) throw new Error(`Download error: ${downloadError.message}`)

    const buffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    // 3. Appeler Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: 'application/pdf', data: base64 } },
              { text: CLAUDE_PROMPT },
            ],
          }],
          generationConfig: { temperature: 0.1 },
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      throw new Error(`Gemini API error: ${err}`)
    }

    const gemini = await geminiRes.json()
    const rawText = gemini.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim()
    const raw_json = JSON.parse(rawText)

    // 4. Sauvegarder les données extraites
    await supabase.from('reports').update({
      raw_json,
      status: 'done',
      updated_at: new Date().toISOString(),
    }).eq('id', report_id)

    return res.status(200).json({ success: true, data: raw_json })

  } catch (err) {
    console.error('Extraction error:', err)
    await supabase.from('reports').update({
      status: 'error',
      error_msg: err.message,
      updated_at: new Date().toISOString(),
    }).eq('id', report_id)

    return res.status(500).json({ error: err.message })
  }
}
