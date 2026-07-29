import XLSX from 'xlsx-js-style'
import { getSetting, KEYS } from './settings'

const DARK = '1F2D5C'
const BLUE = '2F5496'

const NCOLS = 7
const col = n => String.fromCharCode(64 + n) // 1→A, 7→G

function cell(value, { bg, fc = 'FFFFFF', bold = false, halign = 'left', sz = 10 } = {}) {
  const v = value ?? ''
  const t = typeof v === 'number' ? 'n' : 's'
  const borderColor = bg ? 'FFFFFF' : 'CCCCCC'
  const style = {
    font: { name: 'Calibri', sz, bold, color: { rgb: fc } },
    alignment: { horizontal: halign, vertical: 'center', wrapText: true },
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
  const meta = Array.isArray(d?.meta) ? d.meta : []
  const sections = Array.isArray(d?.sections) ? d.sections : []

  const labName = getSetting(KEYS.LAB_NAME)
  const normRef = getSetting(KEYS.NORM_REF) || d?.reference_norme || ''

  const ws = {}
  const merges = []

  function set(r, c, value, style = {}) {
    ws[`${col(c)}${r}`] = cell(value, style)
  }

  function fillRow(r, style = {}) {
    for (let c = 1; c <= NCOLS; c++) {
      if (!ws[`${col(c)}${r}`]) set(r, c, '', style)
    }
  }

  function merge(r1, c1, r2, c2) {
    merges.push({ s: { r: r1 - 1, c: c1 - 1 }, e: { r: r2 - 1, c: c2 - 1 } })
  }

  let r = 1

  // ─── TITRE ──────────────────────────────────────────────────────────
  const title = `MINUTES — ${(d?.document_type || 'ESSAI').toUpperCase()}${normRef ? ` (${normRef})` : ''}`
  set(r, 1, title, { bg: DARK, bold: true, halign: 'center', sz: 12 })
  fillRow(r, { bg: DARK })
  merge(r, 1, r, NCOLS)
  r++

  // Nom du laboratoire (si renseigné)
  if (labName) {
    set(r, 1, labName, { bg: DARK, halign: 'center', sz: 10, fc: 'A0AEC0' })
    fillRow(r, { bg: DARK })
    merge(r, 1, r, NCOLS)
    r++
  }

  r++ // ligne vide

  // ─── EN-TÊTE INFO (générique) ────────────────────────────────────────
  meta.forEach(m => {
    set(r, 1, `${m.label} :`, { fc: '000000', bold: true })
    set(r, 2, m.value || '', { fc: '000000' })
    merge(r, 2, r, NCOLS)
    r++
  })

  if (meta.length > 0) r++ // ligne vide

  // ─── SECTIONS (génériques) ────────────────────────────────────────────
  sections.forEach(section => {
    const columns = section.columns || []
    const rows = section.rows || []
    const ncols = Math.max(columns.length, ...rows.map(rr => (rr.values || []).length), 1)
    const displayColumns = columns.length > 0
      ? columns
      : (ncols > 1 ? Array.from({ length: ncols }, (_, i) => `Col. ${i + 1}`) : [])

    set(r, 1, section.title || '', { bg: DARK, bold: true, halign: 'center' })
    fillRow(r, { bg: DARK })
    merge(r, 1, r, NCOLS)
    r++

    if (displayColumns.length > 0) {
      set(r, 1, 'Paramètre', { bg: BLUE, bold: true, halign: 'center' })
      displayColumns.forEach((c, i) => set(r, 2 + i, c, { bg: BLUE, bold: true, halign: 'center' }))
      fillRow(r, { bg: BLUE })
      r++
    }

    rows.forEach(row => {
      const style = row.highlight ? { bg: BLUE, fc: 'FFFFFF', bold: true } : { fc: '000000' }
      set(r, 1, row.label || '', style)
      const vals = row.values && row.values.length > 0 ? row.values : ['']
      vals.forEach((v, i) => set(r, 2 + i, v ?? '', { ...style, halign: 'center' }))
      fillRow(r, style) // borde les colonnes restantes pour un tableau encadré sur toute sa largeur
      r++
    })

    r++ // ligne vide entre sections
  })

  // ─── PARAMÈTRES FEUILLE ─────────────────────────────────────────────
  ws['!ref'] = `A1:${col(NCOLS)}${Math.max(r - 1, 1)}`
  ws['!merges'] = merges
  ws['!cols'] = Array.from({ length: NCOLS }, (_, i) => ({ wch: i === 0 ? 46 : 13 }))
  ws['!rows'] = [{ hpt: 32 }]

  const wb = XLSX.utils.book_new()
  const sheetName = (d?.document_type || 'Rapport').slice(0, 31)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const safeName = (filename || 'rapport').replace('.pdf', '')
  XLSX.writeFile(wb, `${safeName}_extraction.xlsx`)
}
