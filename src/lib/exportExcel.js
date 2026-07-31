import XLSX from 'xlsx-js-style'
import { getSetting, KEYS } from './settings'

const DARK = '1F2D5C'
const BLUE = '2F5496'

const col = n => String.fromCharCode(64 + n) // 1→A, 7→G

function cell(value, { bg, fc = 'FFFFFF', bold = false, halign = 'left', sz = 10 } = {}) {
  const v = value ?? ''
  const t = typeof v === 'number' ? 'n' : 's'
  const borderColor = bg ? 'FFFFFF' : 'CCCCCC'
  const style = {
    font: { name: 'Calibri', sz, bold, color: { rgb: fc } },
    alignment: { horizontal: halign, vertical: 'center', wrapText: false },
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

  // Chaque tableau garde sa propre largeur ; ils seront placés côte à côte,
  // collés les uns aux autres (comme un seul bloc continu sur le document
  // source), séparés uniquement par une bordure fine, pas par un espace.
  const tableauWidths = tableaux.map(tb =>
    Math.max((tb.colonnes || []).length, ...(tb.lignes || []).map(l => (l || []).length), 1)
  )
  const tableauxWidth = Math.max(1, tableauWidths.reduce((sum, w) => sum + w, 0))
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

  // ─── TABLEAUX (côte à côte, comme sur le document source) ──────────────
  const tableauxStartRow = r
  let colOffset = 1
  let maxRowReached = r

  tableaux.forEach((tb, ti) => {
    const colonnes = tb.colonnes || []
    const lignes = tb.lignes || []
    const width = tableauWidths[ti]
    let tr = tableauxStartRow

    if (tb.titre) {
      set(tr, colOffset, tb.titre, { bg: DARK, bold: true, halign: 'center' })
      fillRange(tr, colOffset, colOffset + width - 1, { bg: DARK })
      merge(tr, colOffset, tr, colOffset + width - 1)
      tr++
    }

    const displayColumns = colonnes.length > 0
      ? colonnes
      : Array.from({ length: width }, (_, i) => `Col. ${i + 1}`)
    displayColumns.forEach((c, i) => set(tr, colOffset + i, c, { bg: BLUE, bold: true, halign: 'center' }))
    fillRange(tr, colOffset, colOffset + width - 1, { bg: BLUE })
    tr++

    lignes.forEach(ligne => {
      const vals = ligne && ligne.length > 0 ? ligne : Array(width).fill('')
      vals.forEach((v, i) => set(tr, colOffset + i, v ?? '', { fc: '000000', halign: i === 0 ? 'left' : 'center' }))
      fillRange(tr, colOffset, colOffset + width - 1, { fc: '000000' })
      tr++
    })

    // Bordure verticale fine entre deux tableaux voisins (pas de cadre
    // individuel ni d'espace : ça doit rester un seul bloc visuel continu)
    if (ti > 0) {
      for (let rr = tableauxStartRow; rr < tr; rr++) {
        const first = ws[`${col(colOffset)}${rr}`]
        if (first) first.s.border.left = { style: 'thin', color: { rgb: '888888' } }
      }
    }

    maxRowReached = Math.max(maxRowReached, tr)
    colOffset += width
  })

  frame(tableauxStartRow, 1, maxRowReached - 1, tableauxWidth)
  r = maxRowReached

  // ─── PARAMÈTRES FEUILLE ─────────────────────────────────────────────
  const lastRow = Math.max(r - 1, 1)
  const finalWidth = Math.max(sheetWidth, tableauxWidth)
  ws['!ref'] = `A1:${col(finalWidth)}${lastRow}`
  ws['!merges'] = merges
  ws['!cols'] = Array.from({ length: finalWidth }, (_, i) => ({ wch: i === 0 ? 32 : 16 }))
  ws['!rows'] = [{ hpt: 32 }]

  const wb = XLSX.utils.book_new()
  const sheetName = (d?.type_document || 'Rapport').slice(0, 31)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const safeName = (filename || 'rapport').replace('.pdf', '')
  XLSX.writeFile(wb, `${safeName}_extraction.xlsx`)
}
