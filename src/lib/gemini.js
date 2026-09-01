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

Retourne uniquement UN SEUL objet JSON valide — JAMAIS un tableau JSON (\`[...]\`),
même si le document PDF a plusieurs pages. Si le document a plusieurs pages,
fusionne TOUJOURS leur contenu dans ce même objet unique : ajoute les tableaux
supplémentaires dans le même "tableaux" (avec une "rangee" différente si besoin
pour refléter leur position), et si un même tableau continue sur la page
suivante avec les mêmes colonnes (ex: "Page 2 sur 3"), mets bout à bout toutes
ses lignes dans UN SEUL tableau au lieu d'en créer un par page. Ne renvoie
jamais plusieurs objets \`{type_document, champs, tableaux, ...}\` séparés.

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
* Base-toi UNIQUEMENT sur ce qui est visuellement rendu sur la page (l'image
  du document tel qu'un humain le verrait à l'écran ou imprimé). Certains PDF
  contiennent du texte numérique invisible à l'affichage (reliquat d'un
  export depuis un tableur, case masquée, texte blanc, etc.) — si une case
  apparaît visuellement vide sur la page mais qu'une valeur "existe" ailleurs
  dans le contenu du fichier pour cette position, IGNORE cette valeur cachée
  et traite la case comme vide (null). N'utilise jamais une donnée que
  l'utilisateur ne pourrait pas lui-même voir en regardant le document.
* N'invente jamais d'information.
* Ne corrige jamais l'orthographe.
* Ne reformule jamais le texte.
* Ne complète jamais une valeur manquante.
* Ne déduis jamais une valeur à partir du contexte.
* Ne recalcule jamais un résultat.
* Si un document répète plusieurs fois la même structure de tableau (même
  colonnes, mêmes lignes), et qu'une des répétitions est vide sur le
  document, ne recopie JAMAIS les en-têtes ou valeurs d'une répétition
  remplie vers celle qui est vide — chaque répétition est indépendante,
  laisse ses cases vides à null même si une autre répétition du même
  tableau est remplie ailleurs sur la page.

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
* \`2\` et \`8\`
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

Ne transpose JAMAIS un tableau : l'axe qui est imprimé verticalement (une
information par ligne, de haut en bas) doit rester "lignes" dans ta sortie,
et l'axe qui est imprimé horizontalement (une information par colonne, de
gauche à droite) doit rester "colonnes" — même si permuter les deux te
semblerait plus compact ou plus naturel.

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

SANS trait de grille imprimé (juste du texte libre, une info par ligne) doit
être placée dans \`champs\`.

---

## Tableaux

Dès qu'un ensemble de lignes est entouré ou séparé par des traits de grille
imprimés (un cadre, des cellules), même s'il ne contient que 2 ou 3 lignes,
c'est un TABLEAU — même s'il ressemble à une liste "libellé : valeur". Ne le
mets JAMAIS dans \`champs\` sous prétexte qu'il est petit ou qu'il n'a que 2
colonnes : la présence d'un quadrillage imprimé prime toujours sur la forme
du contenu.

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
* AUCUN texte de titre de tableau, de titre de sous-section, ou de libellé de
  groupe de colonnes (ce qui est déjà placé dans "titre", "entetes_groupes" ou
  "lignes_bandeau") n'a été RECOPIÉ EN PLUS comme une ligne de données à part
  dans "lignes" — chaque texte d'en-tête ou de titre n'apparaît QU'UNE SEULE
  FOIS dans tout le JSON, jamais à la fois comme en-tête ET comme ligne ;
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
      "rangee": 1,
      "entetes_groupes": [[{ "label": "Groupe", "colonnes": ["Colonne A", "Colonne B"] }]],
      "lignes_bandeau": [{ "ligne": 0, "colonnes": 2, "colonne_debut": 1 }],
      "fusions_verticales": [{ "colonne": "Colonne A", "ligne_debut": 0, "lignes": 2 }],
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

"rangee" (entier, à partir de 1) indique la position verticale du tableau sur
la page : deux tableaux avec la même "rangee" sont placés côte à côte sur le
document (même bande horizontale) ; un tableau avec une "rangee" plus grande
est placé plus bas sur la page, sous les précédents. Regarde la disposition
réelle du document pour déterminer cette valeur — ne mets jamais deux
tableaux dans la même rangée s'ils sont l'un au-dessus de l'autre sur la
page, et inversement.

Chaque ligne de \`lignes\` est un TABLEAU de valeurs (jamais un objet), dans le
même ordre que \`colonnes\`, avec exactement autant d'éléments que \`colonnes\`.

"entetes_groupes" est un champ PUREMENT COSMÉTIQUE, optionnel, indépendant de
"colonnes"/"lignes". C'est une LISTE DE BANDEAUX empilés, un tableau par
bandeau, affichés dans l'ordre au-dessus de l'en-tête de colonnes — utilise
plusieurs bandeaux si le document a plusieurs lignes de regroupement
imprimées les unes au-dessus des autres (ex: une ligne "CODE ECHANTILLON" au-
dessus d'une ligne "N° DE LA TARE", elles-mêmes au-dessus des vraies colonnes).
Chaque bandeau est un tableau de \`{ "label": string, "colonnes": [noms
exacts pris dans "colonnes"] }\`, un objet par groupe visible sur CETTE ligne,
dans l'ordre, COUVRANT TOUTES les colonnes de "colonnes" (y compris les
colonnes "génériques" comme "N°"/"Libellé" : si le texte du bandeau s'étend
visuellement au-dessus d'elles sur le document, inclus-les dans le groupe).
N'INVENTE JAMAIS de groupe pour "combler" une colonne qui n'a vraiment aucun
texte au-dessus d'elle sur le document. Ignore ce champ pour tout le reste :
il ne change JAMAIS combien de lignes ou quelles valeurs vont dans
"lignes"/"colonnes". Laisse-le à [] s'il n'y a qu'un seul niveau d'en-tête
(cas le plus courant, largement majoritaire).

"lignes_bandeau" est aussi PUREMENT COSMÉTIQUE et optionnel : décrit les
lignes qui sont un bandeau de séparation visuel sur le document — une ligne
où le texte d'une case s'étend visuellement sur plusieurs colonnes voisines
(fusion), comme un sous-titre de section au milieu d'un tableau (ex: "AVANT
EXTRACTION", "APRES EXTRACTION", "MOYENNE"). Chaque entrée est
\`{ "ligne": index (0 = première ligne de "lignes"), "colonnes": nombre de
colonnes fusionnées, "colonne_debut": index 1-indexé de la colonne où
commence la fusion }\`. "colonne_debut" vaut 1 par défaut (la fusion part de
la première colonne) — mets une valeur plus grande UNIQUEMENT quand une ou
plusieurs colonnes de gauche (ex. une colonne "Référence"/"Code"/identifiant)
NE FONT VISUELLEMENT PAS partie du bandeau et doivent rester des cases à part
sur cette ligne (regarde bien le document : si le bandeau ne touche pas le
bord gauche du tableau, "colonne_debut" doit refléter où il commence
réellement — ne fusionne JAMAIS une colonne d'identifiant/référence dans un
bandeau "MOYENNE" si elle reste visuellement séparée sur le document).
Donne le vrai nombre de colonnes que couvre visuellement ce bandeau — ne
devine jamais ce nombre en comptant les cases vides qui suivent, une colonne
d'un AUTRE bloc peut aussi être vide sur cette ligne sans faire partie du
bandeau. Remplis "lignes" pour cette ligne de façon strictement POSITIONNELLE
comme n'importe quelle autre ligne (même nombre de valeurs que "colonnes",
une valeur par colonne réelle) : place le texte du bandeau (ex. "MOYENNE") à
l'index correspondant à "colonne_debut" (index = colonne_debut - 1), et
laisse null les colonnes avant lui qui restent séparées. Ne fusionne jamais
deux bandeaux différents (ex: "AVANT EXTRACTION" et "APRES EXTRACTION") en un
seul texte — chacun reste sur sa propre ligne, avec son propre texte. Laisse
à [] s'il n'y a aucun bandeau de ce type.

Si une colonne n'a aucun en-tête imprimé au-dessus d'elle sur le document,
choisis un nom de colonne simple et neutre (ex: "Description") — ne
concatène JAMAIS plusieurs bandeaux de lignes différents pour en fabriquer un.

"fusions_verticales" est aussi PUREMENT COSMÉTIQUE et optionnel : décrit une
case qui s'étend visuellement sur PLUSIEURS LIGNES d'une même colonne (fusion
verticale), par exemple une colonne "Référence / Code" où une seule valeur
couvre visuellement tout un groupe de mesures + sa ligne "MOYENNE". Chaque
entrée est \`{ "colonne": nom exact pris dans "colonnes", "ligne_debut": index
(0 = première ligne de "lignes"), "lignes": nombre de lignes fusionnées
verticalement à partir de "ligne_debut" }\`. Remplis quand même "lignes"
normalement pour toutes ces lignes (la valeur de la case fusionnée peut être
répétée ou laissée à null sur les lignes suivantes, peu importe — seul
"ligne_debut" compte pour l'affichage). Laisse à [] s'il n'y a aucune fusion
verticale de ce type sur le document.

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
    if (!Number.isInteger(t.rangee) || t.rangee < 1) t.rangee = 1

    // "entetes_groupes" est cosmétique et facultatif : une liste de bandeaux
    // empilés (tableau de tableaux de { label, colonnes }). Filet de
    // sécurité — si mal formé ou colonnes inexistantes, on l'ignore plutôt
    // que de planter l'affichage ; accepte aussi l'ancien format à plat
    // (un seul bandeau) au cas où le modèle l'utilise encore.
    const isValidGroup = g => g && typeof g.label === 'string' && Array.isArray(g.colonnes) &&
      g.colonnes.length > 0 && g.colonnes.every(c => colonnes.includes(c))
    let bands = Array.isArray(t.entetes_groupes) ? t.entetes_groupes : []
    if (bands.length > 0 && !Array.isArray(bands[0])) bands = [bands] // ancien format à plat
    bands = bands.filter(band => Array.isArray(band) && band.length > 0 && band.every(isValidGroup))
    t.entetes_groupes = bands

    // "lignes_bandeau" — même filet de sécurité : { ligne, colonnes,
    // colonne_debut } valides seulement, colonne_debut par défaut 1, span
    // borné pour ne jamais dépasser la largeur réelle du tableau.
    if (Array.isArray(t.lignes_bandeau)) {
      t.lignes_bandeau = t.lignes_bandeau
        .filter(b => b && Number.isInteger(b.ligne) && b.ligne >= 0 && b.ligne < t.lignes.length && Number.isInteger(b.colonnes) && b.colonnes > 0)
        .map(b => {
          const width = colonnes.length || b.colonnes
          const debut = Number.isInteger(b.colonne_debut) && b.colonne_debut >= 1 ? b.colonne_debut : 1
          return { ligne: b.ligne, colonne_debut: Math.min(debut, width), colonnes: Math.min(b.colonnes, width - Math.min(debut, width) + 1) }
        })
    } else {
      t.lignes_bandeau = []
    }

    // "fusions_verticales" — même filet de sécurité : colonne existante,
    // plage de lignes valide et bornée à la hauteur réelle du tableau.
    if (Array.isArray(t.fusions_verticales)) {
      t.fusions_verticales = t.fusions_verticales
        .filter(f => f && colonnes.includes(f.colonne) && Number.isInteger(f.ligne_debut) && f.ligne_debut >= 0 &&
          f.ligne_debut < t.lignes.length && Number.isInteger(f.lignes) && f.lignes > 1)
        .map(f => ({ colonne: f.colonne, ligne_debut: f.ligne_debut, lignes: Math.min(f.lignes, t.lignes.length - f.ligne_debut) }))
    } else {
      t.fusions_verticales = []
    }
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
    const label = t.titre || `Tableau ${i + 1}`

    const bareNumberCount = colonnes.filter(c => BARE_NUMBER_RE.test(String(c ?? '').trim())).length
    if (bareNumberCount / colonnes.length > 0.7) {
      flags.push(`${label} — en-têtes de colonnes potentiellement incorrects (ressemblent à des valeurs plutôt qu'à des intitulés), à vérifier intégralement`)
      return
    }

    // Un tableau presque sans vrais en-têtes (cellules d'en-tête vides ou
    // fusionnées sur le document source) est tout aussi ambigu à reconstruire
    // qu'un tableau aux en-têtes numériques — même signal, cause différente.
    const emptyCount = colonnes.filter(c => c === null || String(c ?? '').trim() === '').length
    if (emptyCount / colonnes.length > 0.5) {
      flags.push(`${label} — en-têtes de colonnes majoritairement vides (cellules probablement fusionnées sur le document), à vérifier intégralement`)
    }

    // Bandeau d'en-tête groupé présent mais incomplet, pour chaque bandeau
    // empilé : au moins une colonne n'appartient à aucun groupe alors que
    // d'autres en ont un — signe probable d'un groupe oublié plutôt qu'une
    // absence réelle sur le document (où soit toutes les colonnes seraient
    // groupées, soit aucune).
    ;(t.entetes_groupes || []).forEach((band, bi) => {
      const grouped = new Set(band.flatMap(g => g.colonnes))
      const ungrouped = colonnes.filter(c => !grouped.has(c))
      if (ungrouped.length > 0 && ungrouped.length < colonnes.length) {
        flags.push(`${label} — bandeau d'en-têtes groupés n°${bi + 1} incomplet (colonne(s) ${ungrouped.join(', ')} sans groupe), à vérifier intégralement`)
      }
    })
  })
  return flags
}

// Détecte deux séquences mises bout à bout au lieu d'être entrelacées ligne
// par ligne sur une même grille partagée : une colonne remplie seulement en
// début de tableau, une autre remplie seulement en fin, sans chevaucher.
// Signal générique (colonnes quelconques), pas propre à un document. Les
// colonnes peuvent avoir des trous (cases vides ponctuelles) — seule la
// zone occupée (premier/dernier index rempli) compte.
function flagConcatenatedBlocks(parsed) {
  const flags = []
  ;(parsed.tableaux || []).forEach((t, i) => {
    const lignes = t.lignes || []
    const ncols = (t.colonnes || []).length
    const n = lignes.length
    if (n < 6 || ncols < 3) return
    const label = t.titre || `Tableau ${i + 1}`

    const filledRows = c => lignes
      .map((l, r) => ((l || [])[c] !== null && (l || [])[c] !== undefined && (l || [])[c] !== '') ? r : -1)
      .filter(r => r !== -1)

    const cols = []
    for (let c = 1; c < ncols; c++) {
      const rows = filledRows(c)
      if (rows.length < 3) continue
      cols.push({ c, min: rows[0], max: rows[rows.length - 1] })
    }
    const early = cols.find(x => x.min <= 1 && x.max < n * 0.7)
    const late = cols.find(x => x.max >= n - 2 && x.min > n * 0.3 && (!early || x.c !== early.c))
    if (early && late && early.max < late.min) {
      flags.push(`${label} — structure suspecte : deux séquences semblent mises bout à bout au lieu d'être entrelacées ligne par ligne, à vérifier intégralement`)
    }
  })
  return flags
}

// Indices structurels optionnels pour les types de fiche connus et calibrés
// (choisis dans le menu déroulant d'upload) — décrivent un piège structurel
// répété observé en test, pas une règle rigide. Clé = exactement la valeur
// du menu déroulant (src/pages/Upload.jsx, DOC_TYPES).
const TYPE_STRUCTURE_HINTS = {
  'Fiche de paillasse — Détermination de la teneur en eau par étuvage (ISO 17892-1)': `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Le document a DEUX lignes de regroupement imprimées l'une au-dessus de l'autre,
  au-dessus des vraies colonnes de tare : "CODE ECHANTILLON" (en haut) puis
  "N° DE LA TARE" (en dessous). Utilise "entetes_groupes" avec DEUX bandeaux
  empilés (un tableau de deux bandeaux, pas un seul) — ne mets NI L'UN NI
  L'AUTRE dans "lignes" comme une donnée normale.
  * 1er bandeau ("CODE ECHANTILLON") : le numéro écrit juste à côté du libellé
    "CODE ECHANTILLON" (ex: "0869") appartient au MÊME groupe que le libellé
    lui-même — ne le sépare JAMAIS dans son propre groupe ni sur une colonne
    de tare. Un groupe \`{"label":"CODE ECHANTILLON 0869","colonnes":["N°",
    "Libellé"]}\` (colle le numéro à la suite du libellé dans le même
    "label", toujours sur les 2 colonnes génériques). Puis un groupe séparé
    par CODE D'ÉCHANTILLON qui suit réellement (ex: "SO-01" pour une ou
    plusieurs colonnes de tare, "SO-02" pour les suivantes) — ce sont ceux-là
    qui couvrent les vraies colonnes de tare, pas le numéro initial. Compte
    bien combien de codes de ce type sont écrits et n'en oublie aucun ;
    chaque colonne de tare doit appartenir à l'un de ces groupes.
  * 2e bandeau ("N° DE LA TARE") : un groupe \`{"label":"N° DE LA TARE",
    "colonnes":["N°","Libellé"]}\` (même chose, couvre les 2 colonnes
    génériques) ; les vrais identifiants de tare (K30, AM, SB...) restent
    dans "colonnes" comme colonnes normales du tableau (n'invente jamais de
    colonne séparée pour eux), donc PAS besoin d'un groupe par tare dans ce
    2e bandeau, seulement le groupe "N° DE LA TARE" pour les colonnes
    génériques.
  Applique ce même traitement (les deux bandeaux) pour CHAQUE exemplaire du
  tableau présent sur le document (même celui vide), pas seulement le premier.
- Chaque ligne de mesure (Masse totale humide, Masse totale sèche, Écart relatif, Masse
  de la tare vide, Masse de l'eau, Masse du matériau sec, Teneur en eau) est numérotée
  sur le document (1, 2, 3...) dans SA PROPRE cellule, séparée du libellé — ajoute une
  colonne "N°" au tout début de "colonnes" avec ce numéro comme valeur, ne le colle
  jamais dans le même texte que le libellé (ex: PAS "1 MASSE TOTALE HUMIDE m1 (g)",
  mais colonne "N°"="1" et colonne "Libellé"="MASSE TOTALE HUMIDE m1 (g)" séparément).
- Chaque ligne de mesure a UNE valeur par colonne de tare.
- La ligne finale "TENEUR EN EAU MOYENNE" ne donne souvent qu'UNE valeur pour une PAIRE
  de colonnes (résultat d'une moyenne). Ne duplique jamais cette valeur sur les deux
  colonnes et ne l'invente jamais séparément pour chacune : place-la dans une seule des
  deux colonnes concernées, laisse l'autre à null.
- Le document contient souvent DEUX exemplaires de ce tableau empilés verticalement (un
  rempli, un vide pour d'autres échantillons) — n'omets pas le second même s'il est vide.`,

  "Détermination des limites d'Atterberg (ISO 17892-12)": `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Juste après le tableau "A" (proportion d'échantillon), il y a un PETIT TABLEAU ENCADRÉ
  de 2 lignes : "Masse éprouvette non séchée (g)" et "Masse retenue sur le tamis 0,400 (g)".
  Ce bloc est entouré de traits de grille imprimés sur le document — il doit donc aller
  dans "tableaux" (pas dans "champs"), comme sa propre entrée juste après le tableau A,
  jamais éclaté au milieu de la liste des champs d'en-tête.
- Le tableau A a "N°Tare" en en-tête de colonnes (les identifiants d'échantillon en
  colonnes), jamais en ligne — ne transpose pas ce tableau.`,

  "Minute d'essai — Extraction de bitume / analyse granulométrique (NF EN 12697)": `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Ce document a UN SEUL quadrillage continu avec deux zones : à gauche une liste
  "AVANT EXTRACTION" / "APRES EXTRACTION" (items numérotés 1 à 13), à droite un tableau
  tamis (CODE TAMIS, DIAMETRE, REFUS CUMULE g, REFUS CUMULE %). Les deux zones partagent
  les MÊMES lignes physiques du quadrillage.
- ERREUR À NE PAS FAIRE : ne mets JAMAIS toutes les lignes de la liste de gauche d'abord,
  puis toutes les lignes du tamis ensuite (deux blocs concaténés l'un après l'autre). Il
  faut UNE ligne de sortie par ligne physique du quadrillage (environ 20 lignes, pas plus),
  chaque ligne combinant ce qui est écrit à gauche ET à droite à cette même hauteur.
- Repère typiquement : l'item "7) Minéral (5+6) (g)" est sur la MÊME ligne physique que le
  diamètre 10mm ; l'item "8) Eau (g)" est sur la même ligne que le diamètre 8mm. Les lignes
  après l'item 13 n'ont plus que les colonnes tamis remplies (la liste de gauche s'arrête
  avant la fin du tamis, qui continue seul jusqu'à 0,063mm).
- "AVANT EXTRACTION" et "APRES EXTRACTION" sont des lignes de séparation à part entière,
  chacune alignée avec son propre diamètre — ne les saute jamais.
- La 1ère colonne (les items "1) Tare (g)"..."13) Liant Interne(10/11) (%)") N'A AUCUN
  EN-TÊTE IMPRIMÉ au-dessus d'elle sur le document — "AVANT EXTRACTION" et "APRES
  EXTRACTION" sont des lignes de séparation DANS le tableau, pas le nom de cette
  colonne. N'utilise JAMAIS "AVANT EXTRACTION" comme nom de la 1ère colonne (ça le
  duplique en l'affichant à la fois comme en-tête ET comme ligne de séparation) —
  utilise un nom neutre à la place (ex: "Désignation").
- À droite de cette colonne d'items, il n'y a qu'UNE SEULE colonne de valeurs (celle
  qui contient les "-" pour les items 3, 5, 7, 9, 10, 11) avant le tableau tamis —
  n'invente jamais de colonne vide supplémentaire entre les deux.`,

  'Fiche de paillasse — Distribution granulométrique / tamisage par voie humide (ISO 17892-4)': `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Le tableau a 4 colonnes de poids : "tamisage manuel 2 min", "agitateur mécanique à
  10 min", "tamisage manuel 1 min supplémentaire", "agitateur mécanique 1 min
  supplémentaire". Sur la plupart des lignes, SEULES 2 de ces 4 colonnes sont
  remplies à la main (tamisage manuel 2 min, et tamisage manuel 1 min
  supplémentaire) — les 2 colonnes "agitateur mécanique" restent VIDES (null).
- ERREUR À NE PAS FAIRE : ne saute JAMAIS une colonne vide en décalant les valeurs
  suivantes vers la gauche pour "combler". Si "agitateur mécanique à 10 min" est
  vide sur cette ligne, laisse-la à null et mets la valeur suivante dans SA colonne
  réelle ("tamisage manuel 1 min supplémentaire"), pas dans la colonne vide d'avant.
  Vérifie chaque ligne : le nombre de valeurs non-null doit correspondre exactement
  à ce qui est visiblement écrit, chacune sous l'en-tête directement au-dessus.
- Le symbole "∞" (infini) est parfois écrit tel quel dans une cellule — recopie-le
  exactement comme un seul caractère "∞", n'ajoute jamais de chiffre devant ou
  derrière (jamais "0∞").`,

  'Détermination de la teneur en sel chlorure (NF EN 1744-5)': `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Le tableau est composé de GROUPES IDENTIQUES répétés (généralement 3 fois sur ce
  document) : dans chaque groupe, EXACTEMENT 2 lignes de mesure normales, suivies
  d'UNE ligne "MOYENNE".
- Sur la ligne "MOYENNE", la colonne "Référence / Code" (la 1ère colonne) NE FAIT
  PAS partie du bandeau fusionné — elle reste une case à part, vide, sur cette
  ligne (regarde le document : le bandeau "MOYENNE" ne touche pas le bord gauche
  du tableau). Le bandeau fusionne les colonnes "Prise m (g)" à "V1" (les 4
  colonnes centrales), la dernière colonne "Teneur en chlorure Cl-" restant elle
  aussi à part. Utilise donc \`"lignes_bandeau": [{"ligne": <index>, "colonne_debut": 2,
  "colonnes": 4}]\` pour chacune des 3 lignes "MOYENNE", et place le texte
  "MOYENNE" à l'index 1 (pas 0) du tableau de valeurs de cette ligne — l'index 0
  ("Référence / Code") reste null.
- ERREUR À NE PAS FAIRE : ne varie JAMAIS le nombre de lignes de mesure avant chaque
  "MOYENNE" (jamais 1 ligne, jamais 3 — toujours exactement 2, même si le groupe est
  entièrement vide). Vérifie qu'il y a bien 3 groupes de 2+1 lignes (9 lignes au
  total dans "lignes"), pas moins.
- La colonne "Référence / Code" est fusionnée verticalement sur les 2 lignes de
  mesure de chaque groupe (PAS sur la ligne "MOYENNE" qui suit — la fusion
  s'arrête juste avant). Utilise "fusions_verticales" avec 3 entrées, une par
  groupe : \`{"colonne":"Référence / Code","ligne_debut":0,"lignes":2}\`,
  \`{"colonne":"Référence / Code","ligne_debut":3,"lignes":2}\`,
  \`{"colonne":"Référence / Code","ligne_debut":6,"lignes":2}\`.`,

  'Détermination de la résistance mécanique du ciment (NF EN 196-1)': `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Le tableau principal comporte 3 groupes ("Ecrasement à 2 jours", "Ecrasement à 7 jours",
  "Ecrasement à 28 jours"), chacun composé d'UN bandeau de titre PLEINE LARGEUR (toutes les
  colonnes, de "N° Moule" à "Ecart (%)") suivi de SES 3 lignes de mesure (éprouvettes 1-2-3,
  4-5-6, 7-8-9 respectivement).
- ERREUR À NE PAS FAIRE : le bandeau de titre vient TOUJOURS AVANT ses 3 lignes de mesure sur
  le document, jamais après. L'ordre correct dans "lignes" est donc : bandeau "Ecrasement à
  2 jours", 3 lignes de mesure, bandeau "Ecrasement à 7 jours", 3 lignes de mesure, bandeau
  "Ecrasement à 28 jours", 3 lignes de mesure (9 lignes de mesure + 3 bandeaux = 12 lignes au
  total). Ne mets jamais un bandeau juste après le groupe qu'il devrait précéder.
- Chaque bandeau fusionne TOUTES les colonnes du tableau (colonne_debut à 1, la valeur par
  défaut) — contrairement à d'autres types de documents, ne laisse aucune colonne de gauche à
  part pour ces bandeaux-ci, ils touchent bien le bord gauche du tableau sur ce document.`,

  'Détermination du temps de prise et stabilité (NF EN 196-3)': `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Le bloc central "Début de prise" / "Fin de prise" n'a PAS d'en-tête de colonnes imprimé :
  représente-le comme une PAIRE de mini-tableaux côte à côte (même "rangee"), chacun à 3
  colonnes sans nom imprimé (choisis des noms neutres, ex. "Groupe"/"Désignation"/"Valeur")
  et 3 lignes. Tableau de gauche :
  \`["Début de prise", "Valeur lue sur l'échelle d' (mm)", null]\`,
  \`[null, "Heure début prise t'(h,min)", null]\`,
  \`[null, "Temps début prise T'(h,min)", null]\`
  — et le miroir à droite pour "Fin de prise" avec les libellés d''/t''/T''.
- "Début de prise" et "Fin de prise" sont chacun fusionnés verticalement sur leurs 3 lignes
  via "fusions_verticales" (ex: \`{"colonne":"Groupe","ligne_debut":0,"lignes":3}\`) — ce ne
  sont PAS des en-têtes de groupe de colonnes ("entetes_groupes"), même si le texte apparaît
  visuellement centré verticalement dans sa case.
- Le tableau "Essais de stabilité" a un bandeau à 3 groupes : "Confection" (2 colonnes : Date,
  Heure), "Après conservation" (2 colonnes : Date, Heure) puis "Ecartement (mm)" (3 colonnes :
  "Après 24 h (A)", "après ébullition (B)", "après refroidissement (C)"). ERREUR À NE PAS
  FAIRE : ne mets JAMAIS "Après 24 h (A)" dans le groupe "Après conservation" — elle appartient
  au groupe "Ecartement (mm)" avec (B) et (C), pas à "Après conservation" qui ne contient que
  Date et Heure.
- Beaucoup de cases visiblement vides sur ce document peuvent correspondre à du texte présent
  dans la couche invisible du PDF (valeurs fantômes) — n'extrais QUE ce qui est visuellement
  rendu sur la page, ignore toute valeur qui n'apparaît pas visiblement dans la case.`,

  'Détermination de la surface spécifique (NF EN 196-6)': `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Le tableau "C/ Temps mesuré (s)" n'a PAS d'en-tête de colonnes imprimé : représente-le comme
  une PAIRE de mini-tableaux côte à côte (même "rangee"), chacun à 3 colonnes sans nom imprimé
  (noms neutres, ex. "Essai"/"Désignation"/"Valeur") et 3 lignes. Tableau de gauche :
  \`["Essai 1", "Temps t1 (s)", null]\`, \`[null, "Temps t2 (s)", null]\`,
  \`["Moyenne 1", null, null]\` — et le miroir à droite pour "Essai 2"/"Temps t3"/"Temps t4"/
  "Moyenne 2".
- "Essai 1"/"Essai 2" sont fusionnés verticalement sur leurs 2 premières lignes via
  "fusions_verticales". La ligne "Moyenne 1"/"Moyenne 2" est un bandeau qui fusionne les 2
  premières colonnes de son mini-tableau ("lignes_bandeau" avec colonne_debut:1, colonnes:2),
  la case de valeur à droite restant à part.
- Beaucoup de cases visiblement vides sur ce document peuvent correspondre à du texte présent
  dans la couche invisible du PDF (valeurs fantômes) — n'extrais QUE ce qui est visuellement
  rendu sur la page, ignore toute valeur qui n'apparaît pas visiblement dans la case.`,

  'Contrôle de conformité de fer à béton HA (NF A 35-080-1)': `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- L'en-tête a 2 SEULS vrais groupes de colonnes : "Caractéristiques géométriques" (colonnes
  a, h, c) et "Caractéristiques mécaniques" (colonnes ReH, Rm, Agt, Z, Rm/Reh). TOUTES les
  autres colonnes ("Nomenclature", "CODE/ Diamètre Nominal", "Masse linéique", "Ecart à la
  masse linéique théorique", "Observations") n'ont AUCUN sous-en-tête imprimé au-dessus
  d'elles — elles ne doivent PAS apparaître dans "entetes_groupes".
- ERREUR À NE PAS FAIRE : ne crée JAMAIS un groupe à une seule colonne dont le label est
  identique au nom de la colonne elle-même (ex. un groupe "Nomenclature" contenant juste
  "Nomenclature") — c'est interdit par la règle générale "n'invente jamais de groupe pour
  combler une colonne", applique-la strictement ici : le seul bandeau "entetes_groupes" de ce
  document ne doit contenir QUE les 2 groupes ci-dessus, rien d'autre.
- La ligne "Unités" (avec "mm", "g/m", "%", "MPa"...) est une ligne de LÉGENDE statique
  imprimée juste sous les en-têtes, à fond blanc comme les lignes de données — traite-la comme
  la première ligne de "lignes", PAS comme un bandeau d'en-tête supplémentaire.`,

  'Mesure de la densité apparente (NF EN 1097-3)': `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Le tableau est composé de GROUPES de 3 lignes de mesure, délimités par des traits
  horizontaux plus marqués sur le document. Compte précisément le nombre de groupes
  visibles (regarde chaque trait de séparation) — le nombre total de lignes doit être
  un multiple de 3 ; si ce n'est pas le cas, tu as probablement mal compté un groupe.
- Les colonnes "CODE DE L'ECHANTILLON" et "Moyen" sont fusionnées verticalement sur
  les 3 lignes de chaque groupe (une seule valeur visuelle pour tout le groupe).
  Utilise "fusions_verticales" avec une entrée par groupe pour CHACUNE de ces deux
  colonnes séparément (ex: pour un 1er groupe lignes 0-2 :
  \`{"colonne":"CODE DE L'ECHANTILLON","ligne_debut":0,"lignes":3}\` ET
  \`{"colonne":"Moyen","ligne_debut":0,"lignes":3}\`, puis pareil pour chaque groupe
  suivant avec le bon "ligne_debut").`,

  'Détermination de la masse volumique réelle des granulats (NF EN 1097-6)': `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Chaque bloc "Code échantillon :" du document forme UN SEUL tableau continu de 5
  colonnes : "Description", "Échantillon 1", "Échantillon 2", "Échantillon 3",
  "Échantillon 4" — même si le document affiche visuellement DEUX boîtes séparées
  côte à côte sur les mêmes lignes horizontales (une boîte de gauche avec les
  intitulés de ligne + 2 colonnes de valeurs pour les échantillons 1 et 2, une boîte
  de droite avec seulement 2 colonnes de valeurs SANS intitulés propres pour les
  échantillons 3 et 4). NE CRÉE JAMAIS un second tableau séparé sans intitulés de
  ligne pour la boîte de droite — réutilise les MÊMES intitulés de ligne que la
  boîte de gauche ("N° du pycno", "Volume du pycno V (mL)", "Masse du pycno m1 (g)",
  "Masse du pycno + materiau séché à l'étuve m2 (g)", "Masse du pycno + eau +
  matériau m3 (g)", "Masse du materiau m = m2 - m1 (g)", "Temperature du liquide
  d'essai (°C)", "Masse volumique du liquide d'essai (g/mL ou Mg/m3)") car ce sont
  les mêmes lignes physiques, juste continuées à droite.
- Il y a 2 blocs de ce type empilés sur le document (rangee 1 pour le premier bloc,
  rangee 2 pour le second) — chacun garde sa propre "rangee", ne les fusionne pas
  ensemble.`,

  "Minute coefficient d'aplatissement": `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Le tableau a 5 colonnes réelles : "Granulat élémentaire (d/D mm)", "Masse Ri du
  granulat élémentaire (g)", "Ecartement nominal des fentes du tamis à barre (mm)",
  "Masse mi s'écoulant à travers un tamis à barres (g)", "FIi (%)". La ligne "di/Di"
  et les unités ("mm"/"g") imprimées sous les intitulés ne sont qu'une précision
  d'unité, déjà incluse entre parenthèses dans le nom de colonne — n'en fais PAS un
  second niveau d'en-tête, et ne duplique jamais un même intitulé sur 2 colonnes.
- "Masse Ri" et "Masse mi" sont des valeurs MESURÉES (nombres décimaux type 1805.4,
  65.7...), DIFFÉRENTES de la colonne "Ecartement nominal" qui est une valeur fixe
  imprimée (50, 40, 31.5, 25...) — ne confonds jamais ces deux colonnes entre elles.
  Cela dit, applique normalement la règle générale sur les valeurs cachées : si une
  cellule de "Masse Ri"/"Masse mi" apparaît visuellement vide sur la page rendue,
  laisse-la à null même si un total plus bas (ex. "M1 = ΣRi") semble impliquer
  qu'elle devrait contenir une valeur — ce document est un export bureautique qui
  peut contenir une couche de texte invisible avec des valeurs obsolètes ; ne t'en
  sers jamais pour deviner ce qui devrait être écrit dans une case visuellement vide.
- La dernière ligne "M1 = ΣRi" / "M2 = Σmi" contient souvent des valeurs numériques
  réelles (totaux, résultat FI final) à ne pas ignorer quand elles sont visibles.`,

  'Minute analyse granulométrique granulat (NF EN 933-1)': `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- "CODE ECHANTILLON", "Nature" et "Poids sec" sont 3 lignes D'IDENTIFICATION dans un
  petit tableau À PART, au-dessus du tableau de tamisage (chacune avec ses propres
  cases vides pour jusqu'à 4 échantillons). CE NE SONT PAS des groupes d'en-tête
  ("entetes_groupes") à placer au-dessus des colonnes "R.C"/"%" du tableau principal
  — n'invente jamais "entetes_groupes" à partir de ces libellés, laisse ce champ à
  [] pour le tableau principal.
- Le tableau principal a pour colonnes : "Dimension en mm", "Module", puis 4 paires
  "R.C"/"%" (une paire par échantillon), sans aucun bandeau de regroupement visible
  au-dessus de ces paires sur le document.`,

  'Minute pierres longues (EN 13-450:2002)': `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Le tableau n'a qu'UNE SEULE ligne de données sous l'en-tête (2 colonnes : "PRISE
  D'ESSAI (g)", "ELEMENTS (L>=100mm)") — ne rajoute jamais de ligne vide supplémentaire
  avant ou après, "lignes" doit contenir exactement 1 ligne.`,

  "Essais d'usure Micro-Deval en présence d'eau (NF EN 1097-1)": `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Le tableau a EXACTEMENT 3 lignes de données, une par classe imprimée dans la colonne
  "CLASSE" : "4/6,3", "6,3/10", "10/14,0" — ne rajoute jamais de ligne vide supplémentaire
  avant la première ou après la dernière, "lignes" doit contenir exactement ces 3 lignes.`,

  'Essais Marshall - Duriez - Hubbard Field': `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Le premier tableau ("DENSITE HYDROSTATIQUE SUR CAROTTE DE BITUME") a le mot "DURIEZ"
  imprimé centré au-dessus, sur toute la largeur du tableau, comme un sous-titre — ce
  N'EST PAS une valeur de donnée à placer dans une cellule, et ce N'EST PAS un bandeau
  fusionné dans la même ligne que "Poids matériau pesé dans l'air". Mets "DURIEZ" dans
  le champ "titre" du tableau (ex: "DENSITE HYDROSTATIQUE SUR CAROTTE DE BITUME -
  METHODE B — DURIEZ") ou comme sa propre ligne "lignes_bandeau" pleine largeur
  AVANT les 3 lignes de données ("Poids matériau pesé dans l'air", "hauteur de
  l'éprouvette", "Diametre de l'éprouvette") — jamais fusionné avec elles.
- Ce tableau et le document en général n'ont pas d'en-tête de colonnes imprimé pour les
  colonnes de valeurs (juste des cases vides pour plusieurs éprouvettes) — utilise des
  noms neutres (ex: "Éprouvette 1", "Éprouvette 2"...) plutôt que d'inventer un texte.`,

  'Essais CBR (NF EN 13286-47)': `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Ce document (2 pages) a 6 tableaux au total, dans cet ordre — NE SAUTE AUCUN
  D'ENTRE EUX, notamment "2-DENSITE" qui est souvent oublié :
  1. "1-CARACTERITIQUE DU MOULAGE" : lignes "DENSITE DE COMPACTAGE", "N° DE LA TARE",
     "POIDS TOTAL HUMIDE", "POIDS TOTAL SEC", "POIDS DE TARE", "POIDS DE L'EAU",
     "POIDS DE MATERIAUX SEC", "TENEUR EN EAU", "MOYENNE" (9 lignes).
  2. "2-DENSITE" : lignes "POIDS TOTAL HUMIDE", "POIDS DU MOULE", "POIDS NET HUMIDE",
     "VOLUME DU MOULE", "DENSITE HUMIDE", "DENSITE SECHE" (6 lignes) — ce tableau est
     souvent oublié car il n'a pas de titre en gras aussi visible que les autres,
     vérifie bien sa présence.
  3. "3-MESURE DU GONFLEMENT" (JOUR/HEURE/LECTURE x3 moulages).
  4. "ENFONCEMENT EN MM" (DEF ANNEAU/CHARGE(kg) x3 moulages).
  5. Le petit tableau "INDICE PORTANT IP 2,50" / "IP 5,00" juste après (2 lignes x3
     colonnes de valeurs répétées, une par moulage) — NE LE réduis PAS à un simple
     champ scalaire dans "champs", même si les 3 valeurs sont identiques sur cet
     exemplaire : c'est un vrai tableau à part sur le document.
  6. "4-TENEUR EN EAU APRES ESSAI" : lignes "POIDS DE LA TARE", "POIDS TOTAL HUMIDE",
     "POIDS TOTAL SEC", "POIDS NET DE L'EAU", "POIDS NET DU MATERIAU SEC", "SATURATION",
     "OBSERVATION" (7 lignes).
- ERREUR À NE PAS FAIRE, très fréquente sur ce document : dans les tableaux 1, 2 et 6,
  la 1ère colonne (les libellés de ligne) N'A AUCUN EN-TÊTE IMPRIMÉ au-dessus d'elle —
  ne réutilise JAMAIS le libellé de la 1ère ligne de données (ex: "DENSITE DE
  COMPACTAGE", "POIDS DE LA TARE") comme nom de la 1ère colonne, ça le duplique en
  l'affichant à la fois comme en-tête ET comme première ligne. Utilise un nom neutre
  pour cette colonne (ex: "Désignation") et laisse le vrai libellé UNIQUEMENT dans sa
  ligne de données.`,

  'Essais Proctor normal et modifié (NF P 94-093)': `
STRUCTURE CONNUE POUR CE TYPE (à titre indicatif, vérifie toujours contre le document réel) :
- Le tableau de la 2ème page (colonnes "DUREE D'IMBIBITION", "NB DE COUPS PAR COUCHE",
  "W% DE MOULLAGE", "W% APRES IMBIBITION", "GONFLEMENT %") a une ligne de titre au-
  dessus, "SURCHAGE D'IMBIBITION ET DE PENETRATION" — c'est un TITRE de section (mets-
  le dans "titre" du tableau), PAS un groupe de colonnes ("entetes_groupes") : il ne
  correspond à aucune colonne précise, ne l'utilise jamais comme groupe.
- "W% APRES IMBIBITION" est, lui, un VRAI groupe de colonnes à 2 sous-colonnes ("sur
  2.5 cm Sup.", "sur Mat. Total") — c'est le SEUL bandeau de regroupement réel de ce
  tableau, mets-le comme UN SEUL bandeau dans "entetes_groupes" (pas dans la même liste
  que le titre de section ci-dessus).
- ATTENTION, cette zone du document mélange texte et symboles graphiques (○, Δ, □
  précédant les valeurs 56/25/10, avec des styles de trait différents — plein,
  pointillé, tireté — pour distinguer 3 groupes). Vérifie soigneusement sur le document
  réel si "96h" (ou une autre durée) s'applique à TOUTES les lignes du tableau ou
  seulement à UN groupe précis avant de fusionner "DUREE D'IMBIBITION" verticalement —
  ne suppose jamais une fusion sur la totalité des 9 lignes sans confirmation visuelle
  claire, ce point est incertain et mérite double vérification.`,
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

export async function extractFromPdf(file, typeHint) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Clé API Gemini manquante (VITE_GEMINI_API_KEY)')

  const base64 = await fileToBase64(file)

  // Indice facultatif donné par l'utilisateur (ex: "Fiche de paillasse").
  // Simple orientation, jamais une contrainte : le modèle doit toujours se
  // fier à ce qu'il voit réellement sur le document, pas au libellé choisi.
  // Pour les types calibrés (menu déroulant), on ajoute aussi un indice
  // structurel plus précis sur un piège récurrent observé en test.
  const prompt = typeHint
    ? `${PROMPT}\n\n---\n\nINDICE UTILISATEUR (à titre indicatif seulement) : l'utilisateur pense que ce document est probablement du type « ${typeHint} ». Vérifie par toi-même sur le document réel — si ce que tu vois ne correspond pas, fie-toi à ce que tu vois, jamais à cet indice.${TYPE_STRUCTURE_HINTS[typeHint] ? `\n${TYPE_STRUCTURE_HINTS[typeHint]}` : ''}`
    : PROMPT

  let lastError = ''
  for (const { name: model, thinkingConfig } of MODELS) {
    const generationConfig = { temperature: 0.1 }
    if (thinkingConfig) generationConfig.thinkingConfig = thinkingConfig

    let res
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { inline_data: { mime_type: 'application/pdf', data: base64 } },
              { text: prompt },
            ]}],
            generationConfig,
          }),
        }
      )
    } catch (networkErr) {
      // Échec réseau pur (connexion coupée, DNS, etc.) — fetch() n'a même pas
      // reçu de réponse. Fréquent sur les modèles preview en forte demande.
      // On bascule sur le modèle suivant plutôt que de faire échouer toute
      // l'extraction.
      lastError = `${model} injoignable (${networkErr.message})`
      continue
    }

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

    const match = rawText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (!match) throw new Error('Aucun JSON trouvé dans la réponse Gemini')

    let parsed = JSON.parse(match[0])

    // Filet de sécurité : malgré la consigne d'un objet unique, le modèle
    // renvoie parfois un tableau JSON (un objet par page) sur les documents
    // multi-pages — fusionne en un seul document plutôt que de planter.
    if (Array.isArray(parsed)) {
      const pages = parsed.filter(p => p && typeof p === 'object')
      parsed = pages.reduce((acc, page, i) => {
        if (i === 0) return { ...page }
        acc.champs = [...(acc.champs || []), ...(page.champs || [])]
        acc.tableaux = [...(acc.tableaux || []), ...(page.tableaux || [])]
        acc.champs_incertains = [...(acc.champs_incertains || []), ...(page.champs_incertains || [])]
        return acc
      }, {})
    }

    if (parsed.error === 'document_non_conforme') {
      throw new Error("Ce document ne semble pas être un procès-verbal d'essai de laboratoire. Vérifiez le fichier et réessayez.")
    }

    normalizeTableaux(parsed)

    const structureFlags = [...flagAmbiguousHeaders(parsed), ...flagConcatenatedBlocks(parsed)]
    if (structureFlags.length > 0) {
      parsed.champs_incertains = [...(parsed.champs_incertains || []), ...structureFlags]
    }

    // Pas de vérification "au moins une valeur non vide" ici : un gabarit
    // vierge (rien encore rempli) est un document valide, pas une erreur.
    // Le rejet des vrais mauvais fichiers passe uniquement par le signal
    // explicite du modèle ci-dessus (document_non_conforme).
    return parsed
  }

  throw new Error(`Tous les modèles Gemini sont indisponibles. Dernier: ${lastError}`)
}
