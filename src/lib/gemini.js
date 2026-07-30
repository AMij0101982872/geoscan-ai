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
      "row_group": 0,
      "column_groups": [ { "label": "Nom d'en-tête groupé au-dessus de plusieurs colonnes (ex: TAMIS)", "span": 2 } ],
      "columns": ["Nom colonne 1", "Nom colonne 2", "Nom colonne 3"],
      "rows": [
        { "values": ["valeur col 1", "valeur col 2", "valeur col 3"], "highlight": false }
      ]
    }
  ]
}

Règles :
- "meta" contient les informations d'en-tête générales du document (dates, opérateur, codes d'appareils, références, versions...), jamais les données de mesure.
- "sections" contient un objet par tableau de données/mesures présent dans le document, dans l'ordre où ils apparaissent.
- N'inclus JAMAIS le bandeau de titre général du document (le nom du document, son type, sa référence — déjà capturés dans "document_type"/"reference_norme"/"meta") comme une section. Ce n'est pas un tableau de données.
- N'inclus JAMAIS les zones de signature, cachet, nom et date du responsable/opérateur en bas de page comme une section — ce n'est pas un tableau de données, ignore complètement ce texte.
- Chaque section a SES PROPRES colonnes, déterminées uniquement par ce qui est imprimé pour CE tableau précis. Ne réutilise ni ne copie JAMAIS les colonnes d'un autre tableau voisin, même s'ils se ressemblent ou sont proches sur la page.
- "row_group" : entier indiquant la position verticale du tableau sur la page. Deux tableaux placés CÔTE À CÔTE sur la même page (comme une liste à gauche et un tableau à droite) doivent avoir le MÊME "row_group". Un tableau placé plus bas sur la page a un "row_group" supérieur. Numérote à partir de 0, dans l'ordre d'apparition de haut en bas.
- Ne crée JAMAIS de section pour un simple titre/intitulé général qui chapeaute plusieurs tableaux en dessous de lui (ex: un titre "B - Détermination de la limite de liquidité et de plasticité" au-dessus de deux tableaux "B-1" et "B-2") : intègre ce texte dans le "title" du premier tableau qui suit, ne crée pas d'entrée "sections" séparée pour lui. Une section ne doit exister que si elle contient réellement des "rows" de données.
- "column_groups" est optionnel : uniquement si le tableau a un double niveau d'en-têtes (une colonne-titre qui chapeaute plusieurs sous-colonnes, ex: "TAMIS" au-dessus de "Code tamis" et "Diamètre"). "span" = nombre de sous-colonnes couvertes. Omets ce champ ou laisse un tableau vide s'il n'y a qu'un seul niveau d'en-têtes.
- "columns" est la liste COMPLÈTE et RÉELLE des colonnes du tableau, dans l'ordre, avec le texte exact imprimé dans le document — y COMPRIS la toute première colonne, même si c'est une colonne d'identification comme "Code de tamis utilisé" ou "N° Tare". Ne saute JAMAIS de colonne réelle. N'invente JAMAIS de colonne "Paramètre" — si la première colonne n'a pas d'intitulé imprimé mais sert clairement à nommer chaque ligne (ex: les tableaux avec "Masse de la Tare vide (g)", "Sol humide + tare (g)"... en première colonne), utilise "Paramètre" comme texte de cet en-tête, car c'est bien une vraie colonne du tableau — mais s'il y a déjà une vraie colonne de données en première position (comme "Code de tamis utilisé"), c'est CETTE colonne-là, pas "Paramètre".
- Chaque "values" doit avoir EXACTEMENT autant d'éléments que "columns", dans le même ordre. Ne décale jamais une valeur vers la mauvaise colonne.
- Cas des tableaux "Paramètre + plusieurs instances" (ex: plusieurs tares côte à côte, sans en-tête imprimé au-dessus de chaque instance) : utilise "Paramètre" pour la première colonne, puis des numéros séquentiels simples ("1", "2", "3"...) pour les colonnes suivantes — jamais une valeur issue d'une ligne de données (comme un numéro de tare ou un nombre de rotations). La ligne qui identifie chaque instance (ex: "N° Tare") reste une ligne normale dans "rows", jamais transformée en en-tête.
- Mets "highlight": true uniquement sur les lignes de résultat final mises en évidence dans le document (ex: teneur en eau retenue, résultat surligné ou encadré).
- Utilise des chaînes vides "" pour les valeurs illisibles ou absentes, jamais null ni de texte explicatif.

ATTENTION — erreur fréquente à éviter absolument :
Quand plusieurs tableaux distincts sont placés côte à côte ou l'un au-dessus de l'autre sur la même page, ce sont des sections INDÉPENDANTES, même s'ils sont alignés visuellement à la même hauteur. Ne prends JAMAIS une valeur d'un tableau parce qu'elle se trouve sur la même ligne horizontale qu'une ligne d'un autre tableau — regarde uniquement la ligne et la colonne réelles À L'INTÉRIEUR de chaque tableau pris séparément. Avant de finaliser ta réponse, vérifie pour chaque valeur qu'elle appartient bien au bon tableau, à la bonne ligne et à la bonne colonne de CE tableau précis.`

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
