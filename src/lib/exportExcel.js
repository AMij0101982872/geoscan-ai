import XLSX from 'xlsx-js-style'
import { getSetting, KEYS } from './settings'

const DARK = '1F2D5C'
const BLUE = '2F5496'

const col = n => String.fromCharCode(64 + n) // 1→A, 7→G

function cell(value, { bg, fc = 'FFFFFF', bold = false, halign = 'left', sz = 10, wrap = false } = {}) {
  const v = value ?? ''
  const t = typeof v === 'number' ? 'n' : 's'
  const borderColor = bg ? 'FFFFFF' : 'CCCCCC'
  const style = {
    font: { name: 'Calibri', sz, bold, color: { rgb: fc } },
    alignment: { horizontal: halign, vertical: 'center', wrapText: wrap },
    border: {
      top: { style: 'thin', color: { rgb: borderColor } },
      bottom: { style: 'thin', color: { rgb: borderColor } },
      left: { style: 'thin', color: { rgb: borderColor } },
      right: { style: 'thin', color: { rgb: borderColor } },
    },
  }
  if (bg) style.fill = { patternType: 'solid', fgColor: { rgb: bg } }
  return { v, t, s: style }
}

export function exportToExcel(report) {
  const { raw_json: d, filename } = report
  const champs = Array.isArray(d?.champs) ? d.champs : []
  const tableaux = Array.isArray(d?.tableaux) ? d.tableaux : []

  const labName = getSetting(KEYS.LAB_NAME)
  const normRef = getSetting(KEYS.NORM_REF) || ''

  const ws = {}
  const merges = []
  // Lignes d'en-tête (bandeaux de groupe + ligne de noms de colonnes) : texte
  // souvent long, retour à la ligne activé pour elles — on leur donne une
  // hauteur plus généreuse pour laisser la place à 2-3 lignes.
  const headerRows = new Set()

  function set(r, c, value, style = {}) {
    ws[`${col(c)}${r}`] = cell(value, style)
  }

  function fillRange(r, c1, c2, style = {}) {
    for (let c = c1; c <= c2; c++) {
      if (!ws[`${col(c)}${r}`]) set(r, c, '', style)
    }
  }

  function merge(r1, c1, r2, c2) {
    if (r1 === r2 && c1 === c2) return
    merges.push({ s: { r: r1 - 1, c: c1 - 1 }, e: { r: r2 - 1, c: c2 - 1 } })
  }

  // Bordure épaisse tout autour d'un bloc (titre + colonnes + lignes) pour
  // qu'il se détache visuellement comme un cadre distinct, comme sur le PDF
  // source — sans toucher aux fines bordures internes entre cellules.
  const THICK = { style: 'medium', color: { rgb: '1F2D5C' } }
  function frame(r1, c1, r2, c2) {
    for (let c = c1; c <= c2; c++) {
      const top = ws[`${col(c)}${r1}`]
      if (top) top.s.border.top = THICK
      const bottom = ws[`${col(c)}${r2}`]
      if (bottom) bottom.s.border.bottom = THICK
    }
    for (let rr = r1; rr <= r2; rr++) {
      const left = ws[`${col(c1)}${rr}`]
      if (left) left.s.border.left = THICK
      const right = ws[`${col(c2)}${rr}`]
      if (right) right.s.border.right = THICK
    }
  }

  // Chaque tableau garde sa propre largeur. "rangee" regroupe les tableaux
  // qui sont côte à côte sur le document source (même bande horizontale) ;
  // un tableau d'une rangée supérieure se place plus bas, sous les autres —
  // ça reproduit la disposition réelle au lieu de tout aligner sur une seule
  // ligne.
  const tableauWidth = tb => Math.max((tb.colonnes || []).length, ...(tb.lignes || []).map(l => (l || []).length), 1)
  const rangeeGroups = new Map()
  tableaux.forEach(tb => {
    const key = tb.rangee ?? 1
    if (!rangeeGroups.has(key)) rangeeGroups.set(key, [])
    rangeeGroups.get(key).push(tb)
  })
  const sortedRangees = [...rangeeGroups.keys()].sort((a, b) => a - b)
  const tableauxWidth = Math.max(
    1,
    ...sortedRangees.map(key => rangeeGroups.get(key).reduce((sum, tb) => sum + tableauWidth(tb), 0))
  )
  // Les champs s'affichent 2 par ligne (label/valeur/label/valeur), comme
  // sur le document source — nécessite au moins 4 colonnes.
  const sheetWidth = Math.max(tableauxWidth, champs.length > 0 ? 4 : 1)

  let r = 1

  // ─── TITRE ──────────────────────────────────────────────────────────
  const title = `MINUTES — ${(d?.type_document || 'ESSAI').toUpperCase()}${normRef ? ` (${normRef})` : ''}`
  set(r, 1, title, { bg: DARK, bold: true, halign: 'center', sz: 12 })
  fillRange(r, 1, sheetWidth, { bg: DARK })
  merge(r, 1, r, sheetWidth)
  r++

  if (labName) {
    set(r, 1, labName, { bg: DARK, halign: 'center', sz: 10, fc: 'A0AEC0' })
    fillRange(r, 1, sheetWidth, { bg: DARK })
    merge(r, 1, r, sheetWidth)
    r++
  }

  r++ // ligne vide

  // ─── CHAMPS D'EN-TÊTE (2 par ligne) ─────────────────────────────────────
  const champsStartRow = r
  for (let i = 0; i < champs.length; i += 2) {
    const f1 = champs[i]
    const f2 = champs[i + 1]
    set(r, 1, `${f1.label} :`, { fc: '000000', bold: true })
    set(r, 2, f1.valeur ?? '', { fc: '000000' })
    if (f2) {
      set(r, 3, `${f2.label} :`, { fc: '000000', bold: true })
      set(r, 4, f2.valeur ?? '', { fc: '000000' })
      if (sheetWidth > 4) merge(r, 4, r, sheetWidth)
    } else {
      merge(r, 2, r, sheetWidth)
    }
    r++
  }
  if (champs.length > 0) frame(champsStartRow, 1, r - 1, sheetWidth)

  if (champs.length > 0) r++ // ligne vide

  // ─── TABLEAUX, une bande horizontale par rangée ─────────────────────────
  for (const rangeeKey of sortedRangees) {
    const group = rangeeGroups.get(rangeeKey)
    const groupStartRow = r
    let colOffset = 1
    let groupMaxRow = r

    group.forEach((tb, ti) => {
      const colonnes = tb.colonnes || []
      const lignes = tb.lignes || []
      const width = tableauWidth(tb)
      let tr = groupStartRow

      if (tb.titre) {
        // "titre_norme" (facultatif) : référence de norme affichée dans sa
        // PROPRE cellule à droite du titre, comme sur le document source
        // (deux cases distinctes sur la même ligne) — plutôt que noyée dans
        // le texte du titre lui-même.
        const hasNorme = !!tb.titre_norme && width > 1
        const titreSpan = hasNorme ? width - 1 : width
        set(tr, colOffset, tb.titre, { bg: DARK, bold: true, halign: 'center' })
        fillRange(tr, colOffset, colOffset + titreSpan - 1, { bg: DARK })
        merge(tr, colOffset, tr, colOffset + titreSpan - 1)
        if (hasNorme) {
          set(tr, colOffset + titreSpan, tb.titre_norme, { bg: DARK, bold: true, halign: 'center' })
          if (width - titreSpan > 1) merge(tr, colOffset + titreSpan, tr, colOffset + width - 1)
        }
        tr++
      }

      const displayColumns = colonnes.length > 0
        ? colonnes
        : Array.from({ length: width }, (_, i) => `Col. ${i + 1}`)

      // Bandeaux d'en-tête empilés (facultatif, cosmétique) — un ou plusieurs
      // niveaux de regroupement de colonnes chapeautant l'en-tête réel, comme
      // "TAMIS" au-dessus de "CODE TAMIS"/"DIAMETRE (mm)", ou "CODE ECHANTILLON"
      // puis "N° DE LA TARE" empilés au-dessus des colonnes de tare. Tolère
      // l'ancien format à plat (rapports sauvegardés avant ce changement).
      let bands = tb.entetes_groupes || []
      if (bands.length > 0 && !Array.isArray(bands[0])) bands = [bands]
      bands.forEach(band => {
        // Associe chaque colonne à son groupe par POSITION, pas par nom : deux
        // colonnes peuvent légitimement porter le même nom sous des groupes
        // différents (ex: "A l'air"/"A l'eau" répétées sous "POIDS AVANT
        // MISE" puis "POIDS APRES MISE") — un simple .find() par nom
        // associerait à tort les deux occurrences au premier groupe trouvé.
        const groupForCol = new Array(displayColumns.length).fill(null)
        const claimed = new Array(displayColumns.length).fill(false)
        band.forEach(g => {
          g.colonnes.forEach(name => {
            const idx = displayColumns.findIndex((c, i) => c === name && !claimed[i])
            if (idx !== -1) { groupForCol[idx] = g.label; claimed[idx] = true }
          })
        })
        let ci = 0
        while (ci < groupForCol.length) {
          const label = groupForCol[ci]
          let span = 1
          while (ci + span < groupForCol.length && groupForCol[ci + span] === label && label !== null) span++
          if (label !== null) {
            set(tr, colOffset + ci, label, { bg: DARK, bold: true, halign: 'center', wrap: true })
            fillRange(tr, colOffset + ci, colOffset + ci + span - 1, { bg: DARK })
            merge(tr, colOffset + ci, tr, colOffset + ci + span - 1)
          } else {
            set(tr, colOffset + ci, '', { bg: DARK })
          }
          ci += span
        }
        headerRows.add(tr)
        tr++
      })

      displayColumns.forEach((c, i) => set(tr, colOffset + i, c, { bg: BLUE, bold: true, halign: 'center', wrap: true }))
      fillRange(tr, colOffset, colOffset + width - 1, { bg: BLUE })
      headerRows.add(tr)
      tr++

      // Une ligne peut porter PLUSIEURS bandeaux indépendants (ex: deux cases
      // "Moyenne" côte à côte dans deux mini-tableaux distincts sur la même
      // ligne physique) — regroupées par ligne, pas une seule par ligne.
      const bandeauxByRow = new Map()
      ;(tb.lignes_bandeau || []).forEach(b => {
        const list = bandeauxByRow.get(b.ligne) || []
        list.push({ span: b.colonnes, start: b.colonne_debut || 1 })
        bandeauxByRow.set(b.ligne, list)
      })
      const dataStartRow = tr
      lignes.forEach((ligne, li) => {
        const vals = ligne && ligne.length > 0 ? ligne : Array(width).fill('')
        const bandeaux = (bandeauxByRow.get(li) || []).slice().sort((a, b) => a.start - b.start)
        if (bandeaux.length > 0) {
          // Bandeaux de séparation : fusionnent exactement le nombre de
          // colonnes indiqué, à partir de "colonne_debut" chacun (pas de
          // couleur de remplissage, juste le texte en gras, comme sur le
          // document source) — les colonnes avant/entre/après restent
          // rendues normalement.
          let cursor = 0
          bandeaux.forEach(b => {
            const labelIdx = b.start - 1
            for (let i = cursor; i < labelIdx; i++) {
              set(tr, colOffset + i, vals[i] ?? '', { fc: '000000', halign: i === 0 ? 'left' : 'center' })
            }
            set(tr, colOffset + labelIdx, vals[labelIdx] ?? '', { fc: '000000', bold: true, halign: 'left' })
            if (b.span > 1) merge(tr, colOffset + labelIdx, tr, colOffset + labelIdx + b.span - 1)
            cursor = labelIdx + b.span
          })
          for (let i = cursor; i < vals.length; i++) {
            set(tr, colOffset + i, vals[i] ?? '', { fc: '000000', halign: 'center' })
          }
        } else {
          vals.forEach((v, i) => set(tr, colOffset + i, v ?? '', { fc: '000000', halign: i === 0 ? 'left' : 'center' }))
        }
        fillRange(tr, colOffset, colOffset + width - 1, { fc: '000000' })
        tr++
      })

      // Fusions verticales (facultatif, cosmétique) : une valeur qui s'étend
      // visuellement sur plusieurs lignes d'une même colonne, ex: un code de
      // référence couvrant tout un groupe de mesures + sa ligne "MOYENNE".
      ;(tb.fusions_verticales || []).forEach(f => {
        const ci = displayColumns.indexOf(f.colonne)
        if (ci === -1) return
        const r1 = dataStartRow + f.ligne_debut
        const r2 = r1 + f.lignes - 1
        merge(r1, colOffset + ci, r2, colOffset + ci)
      })

      // Bordure verticale fine entre deux tableaux voisins de la même
      // rangée (pas de cadre individuel ni d'espace entre eux)
      if (ti > 0) {
        for (let rr = groupStartRow; rr < tr; rr++) {
          const first = ws[`${col(colOffset)}${rr}`]
          if (first) first.s.border.left = { style: 'thin', color: { rgb: '888888' } }
        }
      }

      groupMaxRow = Math.max(groupMaxRow, tr)
      colOffset += width
    })

    frame(groupStartRow, 1, groupMaxRow - 1, colOffset - 1)
    r = groupMaxRow + 1 // ligne vide entre deux rangées de tableaux
  }

  // Supprime les bordures internes partagées entre les cellules d'une même
  // fusion : chaque cellule garde par défaut sa propre bordure fine sur ses
  // 4 côtés, donc sans ça Excel affiche un trait au milieu de la cellule
  // "fusionnée" (ex. bas de la 1ère cellule + haut de la 2ème), qui masque
  // visuellement la fusion même si elle est bien appliquée dans le fichier.
  merges.forEach(m => {
    const r1 = m.s.r + 1, c1 = m.s.c + 1, r2 = m.e.r + 1, c2 = m.e.c + 1
    for (let rr = r1; rr <= r2; rr++) {
      for (let cc = c1; cc <= c2; cc++) {
        const cellObj = ws[`${col(cc)}${rr}`]
        if (!cellObj) continue
        const b = cellObj.s.border
        if (rr > r1) b.top = { style: 'none' }
        if (rr < r2) b.bottom = { style: 'none' }
        if (cc > c1) b.left = { style: 'none' }
        if (cc < c2) b.right = { style: 'none' }
      }
    }
  })

  // ─── PARAMÈTRES FEUILLE ─────────────────────────────────────────────
  const lastRow = Math.max(r - 1, 1)
  const finalWidth = Math.max(sheetWidth, tableauxWidth)
  ws['!ref'] = `A1:${col(finalWidth)}${lastRow}`
  ws['!merges'] = merges
  // Colonnes 1 et 3 : étiquettes des champs (2 par ligne) — texte long,
  // besoin de largeur. Les autres restent des colonnes de valeurs/données.
  ws['!cols'] = Array.from({ length: finalWidth }, (_, i) => ({ wch: i === 0 || i === 2 ? 30 : 20 }))
  // Ligne de titre plus haute ; lignes d'en-tête de tableau (bandeaux de
  // groupe + noms de colonnes) plus hautes aussi pour laisser le texte
  // (souvent long) s'enrouler sur plusieurs lignes au lieu d'être tronqué.
  const rows = [{ hpt: 32 }]
  headerRows.forEach(rowNum => { rows[rowNum - 1] = { hpt: 45 } })
  ws['!rows'] = rows

  const wb = XLSX.utils.book_new()
  const sheetName = (d?.type_document || 'Rapport').slice(0, 31)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const safeName = (filename || 'rapport').replace('.pdf', '')
  XLSX.writeFile(wb, `${safeName}_extraction.xlsx`)
}
