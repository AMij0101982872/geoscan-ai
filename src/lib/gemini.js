const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
]

const PROMPT = `Tu es un expert en extraction de données de procès-verbaux d'essais géotechniques et de laboratoire manuscrits (Atterberg, granulométrie, extraction de bitume, compactage, etc. — tout type de PV d'essai).

Identifie d'abord le type de document et sa référence normative si elle est visible (ex: ISO 17892-12, NF EN 12697-1).

Si le document fourni n'est manifestement PAS un procès-verbal d'essai de laboratoire exploitable (mauvais type de fichier, contenu sans rapport, page blanche, totalement illisible), réponds UNIQUEMENT avec cet objet JSON, sans rien d'autre :
{"error": "document_non_conforme"}

Sinon, extrait TOUTES les valeurs visibles dans le document, même si l'écriture est difficile à lire.
Pour les valeurs ambiguës, indique ton meilleur choix (ex: 4,455 et non 4,457 si le chiffre ressemble plus à un 5).

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans explication, respectant EXACTEMENT cette structure :

{
  "document_type": "Nom du type de document identifié (ex: Limites d'Atterberg, Extraction de Bitume, Analyse granulométrique par tamisage)",
  "reference_norme": "Référence normative si visible, sinon chaîne vide",
  "meta": [
    { "label": "Nom du champ d'en-tête tel qu'il apparaît (ex: Date de l'essai, Opérateur, Code échantillon...)", "value": "valeur lue" }
  ],
  "sections": [
    {
      "title": "Titre du tableau/section tel qu'il apparaît dans le document",
      "columns": ["Nom colonne 1", "Nom colonne 2"],
      "rows": [
        { "label": "Nom du paramètre/ligne", "values": ["valeur col 1", "valeur col 2"], "highlight": false }
      ]
    }
  ]
}

Règles :
- "meta" contient les informations d'en-tête générales du document (dates, opérateur, codes d'appareils, références, versions...), jamais les données de mesure.
- "sections" contient un objet par tableau de données/mesures présent dans le document, dans l'ordre où ils apparaissent.
- "columns" correspond aux colonnes du tableau (ex: numéros de tare, numéros d'essai). Si le tableau n'a qu'une seule colonne de valeurs (pas de répétition), mets un tableau vide [].
- Chaque "values" doit avoir autant d'éléments que "columns" (ou un seul élément si "columns" est vide).
- Mets "highlight": true uniquement sur les lignes de résultat final mises en évidence dans le document (ex: teneur en eau retenue, résultat surligné ou encadré).
- Utilise des chaînes vides "" pour les valeurs illisibles ou absentes, jamais null ni de texte explicatif.`

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

    const parsed = JSON.parse(match[0])
    if (parsed.error === 'document_non_conforme') {
      throw new Error("Ce document ne semble pas être un procès-verbal de Limites d'Atterberg. Vérifiez le fichier et réessayez.")
    }

    const hasData = (parsed.sections || []).some(
      s => (s.rows || []).some(row => (row.values || []).some(v => v !== '' && v != null))
    )
    if (!hasData) {
      throw new Error("Aucune donnée exploitable trouvée dans ce document. Vérifiez qu'il s'agit bien d'un procès-verbal d'essai de laboratoire.")
    }

    return parsed
  }

  throw new Error(`Tous les modèles Gemini sont indisponibles. Dernier: ${lastError}`)
}
