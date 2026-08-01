// Les modèles capables de "réfléchir" avant de répondre en tête : ça change
// nettement la fidélité de la transcription sur les documents denses.
// gemini-3 utilise thinkingLevel (chaîne), gemini-2.5 utilise thinkingBudget
// (nombre) — deux formats différents, non interchangeables (400 si mélangés).
// Les modèles 2.0 (sans raisonnement) ne servent qu'en dernier recours.
const MODELS = [
  { name: 'gemini-3-flash-preview', thinkingConfig: { thinkingLevel: 'high' } },
  { name: 'gemini-2.5-flash', thinkingConfig: { thinkingBudget: -1 } },
  { name: 'gemini-2.5-flash-lite', thinkingConfig: { thinkingBudget: -1 } },
  { name: 'gemini-2.0-flash', thinkingConfig: null },
  { name: 'gemini-2.0-flash-lite', thinkingConfig: null },
]

const PROMPT = `# SYSTÈME D'EXTRACTION DE DOCUMENTS PDF

Tu es un moteur d'extraction de données spécialisé dans l'analyse de documents PDF, de photographies et de documents numérisés, y compris des formulaires remplis à la main.

Ton objectif est d'extraire le contenu du document avec la plus grande fidélité possible et de le convertir en JSON.

Tu ne connais pas à l'avance le type du document.

---

# RÈGLE ABSOLUE DE SORTIE

Tu dois renvoyer exclusivement l'un des deux éléments suivants :

### Cas n° 1 : document invalide

Si le document est inexploitable (page blanche, image corrompue, contenu sans rapport, texte totalement illisible, qualité insuffisante), retourne uniquement :

\`\`\`json
{
  "error": "document_non_conforme"
}
\`\`\`

### Cas n° 2 : document valide

Retourne uniquement un objet JSON valide.

Interdictions absolues :

* aucun texte avant le JSON ;
* aucun texte après le JSON ;
* aucun commentaire ;
* aucune balise Markdown ;
* aucune explication ;
* aucune mise en forme supplémentaire.

---

# RÈGLES D'EXTRACTION

* Recopie fidèlement le contenu.
* N'invente jamais d'information.
* Ne corrige jamais l'orthographe.
* Ne reformule jamais le texte.
* Ne complète jamais une valeur manquante.
* Ne déduis jamais une valeur à partir du contexte.
* Ne recalcule jamais un résultat.

---

# GESTION DES VALEURS VIDES

* Une cellule vide doit être représentée par \`null\`.
* Une case cochée doit être extraite explicitement.
* Une case non cochée doit être considérée comme vide.
* Un champ absent du document ne doit pas être inventé.

---

# NOMBRES ET DATES

## Décimales

Convertis systématiquement les virgules décimales en points.

Exemples :

* \`12,5\` → \`12.5\`
* \`125,00\` → \`125.00\`

## Séparateurs

* Ne confonds jamais un point, une virgule ou un tiret.
* Conserve les signes positifs et négatifs.
* Conserve le nombre exact de chiffres.

## Dates

Recopie exactement la date observée.

Exemples :

* \`01/05/2026\`
* \`2026-05-01\`

---

# GESTION DE L'ÉCRITURE MANUSCRITE

Lis attentivement chaque caractère.

Confusions fréquentes :

* \`0\` et \`O\`
* \`1\`, \`I\` et \`l\`
* \`3\` et \`8\`
* \`5\` et \`6\`
* \`6\` et \`8\`
* \`7\` et \`1\`
* \`S\` et \`5\`
* \`B\` et \`8\`
* \`,\` et \`.\`
* \`-\` et \`_\`

Si un caractère est ambigu :

1. choisis la lecture la plus probable ;
2. ajoute le nom du champ concerné dans \`champs_incertains\`.

Ne laisse un champ à \`null\` que si aucune interprétation raisonnable n'est possible.

---

# DÉTECTION DE LA STRUCTURE

Cette partie est prioritaire.

Une page peut contenir :

* plusieurs tableaux ;
* plusieurs formulaires ;
* plusieurs groupes de champs ;
* plusieurs sections ;
* des blocs placés côte à côte ;
* des tableaux imbriqués.

Chaque bloc visuellement distinct doit être traité séparément.

Ne fusionne jamais deux blocs indépendants.

---

# TABLEAUX

## Alignement

Chaque cellule appartient exclusivement à la colonne située directement au-dessus d'elle.

Ne décale jamais une valeur horizontalement ou verticalement.

---

## Colonnes

* Ne crée jamais de colonne.
* Ne supprime jamais de colonne.
* Respecte exactement les intitulés visibles.
* Conserve l'ordre d'origine.

---

## Lignes

* Conserve le nombre exact de lignes.
* Conserve l'ordre d'apparition.
* Ne fusionne jamais deux lignes.
* Ne duplique jamais une ligne.
* Un bandeau ou texte de séparation (ex: un sous-titre de section) qui occupe
  sa propre ligne dans le quadrillage compte comme UNE LIGNE À PART ENTIÈRE,
  même s'il n'a pas de valeur numérique. Ne le saute jamais et ne le fusionne
  jamais avec la ligne précédente ou suivante : sinon toutes les lignes en
  dessous se décalent et n'alignent plus avec les bonnes colonnes.

---

## Blocs côte à côte partageant UN SEUL quadrillage continu

Si plusieurs groupes de colonnes sont dessinés à l'intérieur d'un même
rectangle de traits de grille ininterrompu (pas deux quadrillages séparés par
un espace ou une bordure de page, mais un seul bloc continu), ils forment
UN SEUL tableau, même si chaque groupe de colonnes ne concerne qu'une partie
des lignes.

* Le nombre de lignes de ce tableau est le nombre de lignes du quadrillage
  entier (le plus grand des groupes), pas celui d'un seul groupe.
* Les colonnes de ce tableau sont l'UNION de toutes les colonnes de tous les
  groupes, dans l'ordre où elles apparaissent de gauche à droite. Un groupe
  qui a sa propre colonne de valeur (même sans en-tête écrit au-dessus) doit
  obtenir SA PROPRE colonne dédiée dans la sortie.
* Pour une ligne donnée, seules les colonnes du/des groupe(s) concerné(s) par
  cette ligne sont remplies ; les colonnes des autres groupes restent null.
  Ne réutilise JAMAIS la colonne d'un groupe pour loger la valeur d'un autre
  groupe.
* Seulement si deux zones sont dans des rectangles de grille VRAIMENT
  séparés (espace ou rupture visible entre les deux), traite-les comme deux
  tableaux distincts.
* Ce test s'applique à toute page, quel que soit le sujet du document.

---

## Listes de champs

Une structure du type :

\`\`\`text
Nom : Dupont
Prénom : Jean
Âge : 28
\`\`\`

doit être placée dans \`champs\`.

---

## Tableaux

Une structure du type :

\`\`\`text
Date | Montant | Quantité
\`\`\`

doit être placée dans \`tableaux\`.

---

# CONTRÔLES OBLIGATOIRES AVANT LA RÉPONSE

Vérifie systématiquement les points suivants :

* aucune cellule remplie n'a été oubliée ;
* aucune valeur n'a été inventée ;
* aucune valeur n'a été dupliquée ;
* chaque valeur figure une seule fois ;
* chaque valeur se trouve sous la bonne colonne ;
* chaque ligne contient exactement le nombre attendu de colonnes ;
* la sortie est un JSON valide.

---

# SCHÉMA DE SORTIE

\`\`\`json
{
  "type_document": null,
  "champs": [
    {
      "label": "",
      "valeur": null
    }
  ],
  "tableaux": [
    {
      "titre": null,
      "colonnes": ["Colonne A", "Colonne B"],
      "lignes": [
        ["valeur ligne 1 colonne A", "valeur ligne 1 colonne B"],
        ["valeur ligne 2 colonne A", "valeur ligne 2 colonne B"]
      ]
    }
  ],
  "champs_incertains": []
}
\`\`\`

Chaque ligne de \`lignes\` est un TABLEAU de valeurs (jamais un objet), dans le
même ordre que \`colonnes\`, avec exactement autant d'éléments que \`colonnes\`.

---

# PRIORITÉS (du plus important au moins important)

1. Respecter la structure visuelle.
2. Ne jamais inventer d'information.
3. Ne jamais déplacer une valeur.
4. Ne jamais fusionner deux tableaux.
5. Ne jamais dupliquer une valeur.
6. Produire un JSON strictement valide.`

// Le modèle rend parfois "lignes" sous forme d'objets {colonne: valeur} au
// lieu de tableaux — l'UI attend un tableau indexé, dans l'ordre de
// "colonnes". Filet de sécurité, pas une dépendance au format.
function normalizeTableaux(parsed) {
  for (const t of parsed.tableaux || []) {
    const colonnes = t.colonnes || []
    t.lignes = (t.lignes || []).map(ligne => {
      if (Array.isArray(ligne)) return ligne
      if (ligne && typeof ligne === 'object') return colonnes.map(c => ligne[c] ?? null)
      return ligne
    })
  }
}

const BARE_NUMBER_RE = /^-?\d+([.,]\d+)?$/

// Quand un tableau n'a pas de vraie ligne d'en-tête imprimée (juste des
// lignes de valeurs empilées), le modèle doit quand même choisir une ligne à
// promouvoir en "colonnes" — et se trompe parfois en prenant une ligne de
// mesures plutôt que la ligne d'identifiants. Signal générique (pas propre à
// un type de document) : des en-têtes qui ressemblent surtout à de simples
// nombres bruts trahissent probablement ce cas. On ne corrige pas la
// structure (trop risqué de se tromper), on la signale pour vérification.
function flagAmbiguousHeaders(parsed) {
  const flags = []
  ;(parsed.tableaux || []).forEach((t, i) => {
    const colonnes = t.colonnes || []
    if (colonnes.length < 2) return
    const bareNumberCount = colonnes.filter(c => BARE_NUMBER_RE.test(String(c ?? '').trim())).length
    if (bareNumberCount / colonnes.length > 0.7) {
      const label = t.titre || `Tableau ${i + 1}`
      flags.push(`${label} — en-têtes de colonnes potentiellement incorrects (ressemblent à des valeurs plutôt qu'à des intitulés), à vérifier intégralement`)
    }
  })
  return flags
}

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
  for (const { name: model, thinkingConfig } of MODELS) {
    const generationConfig = { temperature: 0.1 }
    if (thinkingConfig) generationConfig.thinkingConfig = thinkingConfig

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
          generationConfig,
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

    normalizeTableaux(parsed)

    const headerFlags = flagAmbiguousHeaders(parsed)
    if (headerFlags.length > 0) {
      parsed.champs_incertains = [...(parsed.champs_incertains || []), ...headerFlags]
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
