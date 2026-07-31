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

  const totalWidth = Math.max(
    1,
    ...tableaux.map(tb => Math.max((tb.colonnes || []).length, ...(tb.lignes || []).map(l => (l || []).length), 1))
  )

  let r = 1

  // ─── TITRE ──────────────────────────────────────────────────────────
  const title = `MINUTES — ${(d?.type_document || 'ESSAI').toUpperCase()}${normRef ? ` (${normRef})` : ''}`
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

  // ─── CHAMPS D'EN-TÊTE ─────────────────────────────────────────────────
  champs.forEach(f => {
    set(r, 1, `${f.label} :`, { fc: '000000', bold: true })
    set(r, 2, f.valeur ?? '', { fc: '000000' })
    merge(r, 2, r, totalWidth)
    r++
  })

  if (champs.length > 0) r++ // ligne vide

  // ─── TABLEAUX (empilés verticalement) ─────────────────────────────────
  tableaux.forEach(tb => {
    const colonnes = tb.colonnes || []
    const lignes = tb.lignes || []
    const width = Math.max(colonnes.length, ...lignes.map(l => (l || []).length), 1)

    if (tb.titre) {
      set(r, 1, tb.titre, { bg: DARK, bold: true, halign: 'center' })
      fillRange(r, 1, width, { bg: DARK })
      merge(r, 1, r, width)
      r++
    }

    const displayColumns = colonnes.length > 0
      ? colonnes
      : Array.from({ length: width }, (_, i) => `Col. ${i + 1}`)
    displayColumns.forEach((c, i) => set(r, 1 + i, c, { bg: BLUE, bold: true, halign: 'center' }))
    fillRange(r, 1, width, { bg: BLUE })
    r++

    lignes.forEach(ligne => {
      const vals = ligne && ligne.length > 0 ? ligne : Array(width).fill('')
      vals.forEach((v, i) => set(r, 1 + i, v ?? '', { fc: '000000', halign: i === 0 ? 'left' : 'center' }))
      fillRange(r, 1, width, { fc: '000000' })
      r++
    })

    r++ // ligne vide entre tableaux
  })

  // ─── PARAMÈTRES FEUILLE ─────────────────────────────────────────────
  const lastRow = Math.max(r - 1, 1)
  ws['!ref'] = `A1:${col(totalWidth)}${lastRow}`
  ws['!merges'] = merges
  ws['!cols'] = Array.from({ length: totalWidth }, (_, i) => ({ wch: i === 0 ? 32 : 16 }))
  ws['!rows'] = [{ hpt: 32 }]

  const wb = XLSX.utils.book_new()
  const sheetName = (d?.type_document || 'Rapport').slice(0, 31)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const safeName = (filename || 'rapport').replace('.pdf', '')
  XLSX.writeFile(wb, `${safeName}_extraction.xlsx`)
}
