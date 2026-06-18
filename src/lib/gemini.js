const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
]

const PROMPT = `Tu es un expert en extraction de données de documents géotechniques manuscrits.
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

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  // Chunked to avoid stack overflow on large PDFs
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export async function extractFromPdf(file) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Clé API Gemini manquante (VITE_GEMINI_API_KEY)')

  const base64 = await fileToBase64(file)

  let lastError = ''
  for (const model of MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: 'application/pdf', data: base64 } },
            { text: PROMPT },
          ]}],
          generationConfig: { temperature: 0.1 },
        }),
      }
    )

    if (res.status === 503 || res.status === 429) {
      lastError = `${model} indisponible (${res.status})`
      continue
    }

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini (${model}): ${err}`)
    }

    const json = await res.json()
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) throw new Error('Réponse Gemini vide')

    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Aucun JSON trouvé dans la réponse Gemini')

    return JSON.parse(match[0])
  }

  throw new Error(`Tous les modèles Gemini sont indisponibles. Dernier: ${lastError}`)
}
