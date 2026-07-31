const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
]

const PROMPT = `Tu extrais les données d'un document PDF de laboratoire (procès-verbal d'essai géotechnique). Tu ne sais PAS à l'avance de quel type de document il s'agit.

Si le document n'est manifestement pas exploitable (mauvais fichier, contenu sans rapport, page blanche, totalement illisible), retourne UNIQUEMENT :
{"error": "document_non_conforme"}

Sinon, retourne UNIQUEMENT du JSON valide, sans texte ni Markdown, respectant EXACTEMENT ce schéma :

{
  "type_document": string|null,
  "champs": [ { "label": string, "valeur": string|number|null } ],
  "tableaux": [
    { "titre": string|null, "colonnes": [string], "lignes": [[...]] }
  ],
  "champs_incertains": [string]
}

RÈGLES
- Case vide = null. N'invente jamais de valeur.
- Décimales françaises : virgule -> point (ex: "22,18" devient 22.18).
- Recopie ce qui est écrit, sans interpréter ni recalculer.
- Chiffre manuscrit ambigu : meilleure lecture + ajout dans "champs_incertains" (décris le champ concerné, ex: "Tare 2 - masse de la tare vide").
- "champs" contient les informations d'en-tête générales (dates, opérateur, codes, références...), jamais les données de mesure.
- "tableaux" contient un objet par tableau de mesures présent dans le document, dans l'ordre où ils apparaissent. N'inclus jamais le bandeau de titre général du document ni les zones de signature/cachet comme un tableau.
- Chaque ligne de "lignes" doit avoir EXACTEMENT autant d'éléments que "colonnes", dans le même ordre, avec null pour les cases vides — ne décale jamais une valeur vers une autre colonne.
- Si un même quadrillage (mêmes lignes/bordures continues) a des colonnes qui ne sont remplies que sur une partie de ses lignes, c'est TOUJOURS UN SEUL tableau — ne le découpe jamais en plusieurs tableaux à cause de ça.

Extrais tout ce que tu vois. Retourne le JSON.`

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
      throw new Error("Ce document ne semble pas être un procès-verbal d'essai de laboratoire. Vérifiez le fichier et réessayez.")
    }

    const hasData = (parsed.tableaux || []).some(
      t => (t.lignes || []).some(ligne => (ligne || []).some(v => v !== '' && v != null))
    )
    if (!hasData) {
      throw new Error("Aucune donnée exploitable trouvée dans ce document. Vérifiez qu'il s'agit bien d'un procès-verbal d'essai de laboratoire.")
    }

    return parsed
  }

  throw new Error(`Tous les modèles Gemini sont indisponibles. Dernier: ${lastError}`)
}
