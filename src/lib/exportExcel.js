import XLSX from 'xlsx-js-style'
import { getSetting, KEYS } from './settings'

const DARK = '1F2D5C'
const BLUE = '2F5496'
const CHARS_PER_COL = 16 // approx. caractères affichables par colonne de données à la largeur définie plus bas

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

function sectionWidth(section) {
  const columns = section.columns || []
  const rows = section.rows || []
  return Math.max(columns.length, ...rows.map(x => (x.values || []).length), 1)
}

// Groupe les sections par row_group (tableaux côte à côte = même row_group), en conservant l'ordre d'apparition
function groupSections(sections) {
  const order = []
  const groups = {}
  sections.forEach((s, i) => {
    const key = s.row_group ?? `_solo_${i}`
    if (!(key in groups)) { groups[key] = []; order.push(key) }
    groups[key].push(s)
  })
  return order.map(k => groups[k])
}

export function exportToExcel(report) {
  const { raw_json: d, filename } = report
  const meta = Array.isArray(d?.meta) ? d.meta : []
  const sections = Array.isArray(d?.sections) ? d.sections : []

  const labName = getSetting(KEYS.LAB_NAME)
  const normRef = getSetting(KEYS.NORM_REF) || d?.reference_norme || ''

  const ws = {}
  const merges = []
  const rowLineCount = new Map() // row -> nb de lignes de texte nécessaires (en-têtes qui wrappent)

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

  function noteWrap(r, text, spanCols) {
    const lines = Math.max(1, Math.ceil((text || '').length / (CHARS_PER_COL * spanCols)))
    rowLineCount.set(r, Math.max(rowLineCount.get(r) || 1, lines))
  }

  // Dessine une section à partir de (startRow, startCol) et renvoie la ligne suivante libre
  function renderSection(section, startRow, startCol) {
    let r = startRow
    const columns = section.columns || []
    const rows = section.rows || []
    const columnGroups = section.column_groups || []
    const width = Math.max(columns.length, ...rows.map(x => (x.values || []).length), 1)

    // Titre de section
    set(r, startCol, section.title || '', { bg: DARK, bold: true, halign: 'center' })
    fillRange(r, startCol, startCol + width - 1, { bg: DARK })
    merge(r, startCol, r, startCol + width - 1)
    r++

    // En-têtes groupés (double niveau), optionnel
    if (columnGroups.length > 0) {
      let c = startCol
      columnGroups.forEach(g => {
        const span = Math.max(g.span || 1, 1)
        set(r, c, g.label || '', { bg: BLUE, bold: true, halign: 'center', wrap: true })
        merge(r, c, r, c + span - 1)
        noteWrap(r, g.label, span)
        c += span
      })
      fillRange(r, startCol, startCol + width - 1, { bg: BLUE })
      r++
    }

    // En-têtes colonnes
    const displayColumns = columns.length > 0
      ? columns
      : Array.from({ length: width }, (_, i) => `Col. ${i + 1}`)
    displayColumns.forEach((c, i) => {
      set(r, startCol + i, c, { bg: BLUE, bold: true, halign: 'center', wrap: true })
      noteWrap(r, c, 1)
    })
    fillRange(r, startCol, startCol + width - 1, { bg: BLUE })
    r++

    // Lignes de données
    rows.forEach(row => {
      const style = row.highlight ? { bg: BLUE, fc: 'FFFFFF', bold: true } : { fc: '000000' }
      const vals = row.values && row.values.length > 0 ? row.values : Array(width).fill('')
      vals.forEach((v, i) => set(r, startCol + i, v ?? '', { ...style, halign: i === 0 ? 'left' : 'center' }))
      fillRange(r, startCol, startCol + width - 1, style)
      r++
    })

    return r
  }

  const groups = groupSections(sections)
  const GAP = 1

  // Largeur totale du document = la plus large ligne de tableaux côte à côte
  const totalWidth = Math.max(
    1,
    ...groups.map(g => g.reduce((sum, s) => sum + sectionWidth(s), 0) + GAP * Math.max(g.length - 1, 0))
  )

  let r = 1

  // ─── TITRE ──────────────────────────────────────────────────────────
  const title = `MINUTES — ${(d?.document_type || 'ESSAI').toUpperCase()}${normRef ? ` (${normRef})` : ''}`
  set(r, 1, title, { bg: DARK, bold: true, halign: 'center', sz: 12 })
  fillRange(r, 1, totalWidth, { bg: DARK })
  merge(r, 1, r, totalWidth)
  r++

  if (labName) {
    set(r, 1, labName, { bg: DARK, halign: 'center', sz: 10, fc: 'A0AEC0' })
    fillRange(r, 1, totalWidth, { bg: DARK })
    merge(r, 1, r, totalWidth)
    r++
  }

  r++ // ligne vide

  // ─── EN-TÊTE INFO (générique) ────────────────────────────────────────
  meta.forEach(m => {
    set(r, 1, `${m.label} :`, { fc: '000000', bold: true })
    set(r, 2, m.value || '', { fc: '000000' })
    merge(r, 2, r, totalWidth)
    r++
  })

  if (meta.length > 0) r++ // ligne vide

  // ─── SECTIONS (groupées par row_group, côte à côte) ──────────────────
  groups.forEach(group => {
    let colOffset = 1
    let groupEndRow = r
    group.forEach(section => {
      const endRow = renderSection(section, r, colOffset)
      groupEndRow = Math.max(groupEndRow, endRow)
      colOffset += sectionWidth(section) + GAP
    })
    r = groupEndRow + 1 // ligne vide entre les rangées de tableaux
  })

  // ─── PARAMÈTRES FEUILLE ─────────────────────────────────────────────
  const lastRow = Math.max(r - 1, 1)
  ws['!ref'] = `A1:${col(totalWidth)}${lastRow}`
  ws['!merges'] = merges
  ws['!cols'] = Array.from({ length: totalWidth }, () => ({ wch: CHARS_PER_COL }))
  ws['!rows'] = Array.from({ length: lastRow }, (_, i) => {
    if (i === 0) return { hpt: 32 }
    const lines = rowLineCount.get(i + 1)
    return lines ? { hpt: lines * 14 + 12 } : {}
  })

  const wb = XLSX.utils.book_new()
  const sheetName = (d?.document_type || 'Rapport').slice(0, 31)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const safeName = (filename || 'rapport').replace('.pdf', '')
  XLSX.writeFile(wb, `${safeName}_extraction.xlsx`)
}
