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
      "lignes_bandeau": [{ "ligne": 0, "colonnes": 2 }],
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
où le texte de la première case s'étend visuellement sur plusieurs colonnes
voisines (fusion), comme un sous-titre de section au milieu d'un tableau
(ex: "AVANT EXTRACTION", "APRES EXTRACTION"). Chaque entrée est
\`{ "ligne": index (0 = première ligne de "lignes"), "colonnes": nombre de
colonnes fusionnées en partant de la gauche }\`. Donne le vrai nombre de
colonnes que couvre visuellement ce bandeau sur le document — ne devine
jamais ce nombre en comptant les cases vides qui suivent, une colonne d'un
AUTRE bloc peut aussi être vide sur cette ligne sans faire partie du bandeau.
Remplis quand même "lignes" pour cette ligne EXACTEMENT comme n'importe
quelle autre (même nombre de valeurs que "colonnes"). Ne fusionne jamais deux
bandeaux différents (ex: "AVANT EXTRACTION" et "APRES EXTRACTION") en un seul
texte — chacun reste sur sa propre ligne, avec son propre texte. Laisse à []
s'il n'y a aucun bandeau de ce type.

Si une colonne n'a aucun en-tête imprimé au-dessus d'elle sur le document,
choisis un nom de colonne simple et neutre (ex: "Description") — ne
concatène JAMAIS plusieurs bandeaux de lignes différents pour en fabriquer un.

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

    // "lignes_bandeau" — même filet de sécurité : { ligne, colonnes } valides
    // seulement, colonnes bornées à la largeur réelle du tableau.
    if (Array.isArray(t.lignes_bandeau)) {
      t.lignes_bandeau = t.lignes_bandeau
        .filter(b => b && Number.isInteger(b.ligne) && b.ligne >= 0 && b.ligne < t.lignes.length && Number.isInteger(b.colonnes) && b.colonnes > 0)
        .map(b => ({ ligne: b.ligne, colonnes: Math.min(b.colonnes, colonnes.length || b.colonnes) }))
    } else {
      t.lignes_bandeau = []
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
  chacune alignée avec son propre diamètre — ne les saute jamais.`,

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

    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Aucun JSON trouvé dans la réponse Gemini')

    const parsed = JSON.parse(match[0])
    if (parsed.error === 'document_non_conforme') {
      throw new Error("Ce document ne semble pas être un procès-verbal d'essai de laboratoire. Vérifiez le fichier et réessayez.")
    }

    normalizeTableaux(parsed)

    const structureFlags = [...flagAmbiguousHeaders(parsed), ...flagConcatenatedBlocks(parsed)]
    if (structureFlags.length > 0) {
      parsed.champs_incertains = [...(parsed.champs_incertains || []), ...structureFlags]
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
