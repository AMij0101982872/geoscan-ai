import XLSX from 'xlsx-js-style'

const DARK = '1F2D5C'
const BLUE = '2F5496'
const ORANGE = 'FFC000'

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
  const meta = d?.meta || {}
  const tares = d?.section_a?.tares || []
  const b1 = d?.section_b1?.mesures || []
  const b2 = d?.section_b2?.mesures || []

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
  set(r, 1, "MINUTES - DÉTERMINATION DES LIMITES D'ATTERBERG (ISO 17892-12 Version 2018)",
    { bg: DARK, bold: true, halign: 'center', sz: 12 })
  fillRow(r, { bg: DARK })
  merge(r, 1, r, NCOLS)
  r++

  r++ // ligne vide

  // ─── EN-TÊTE INFO ───────────────────────────────────────────────────
  const infoLines = [
    ["Date de l'essai :", meta.date_essai],
    ['Opérateur :', meta.operateur],
    ['Code balances :', meta.code_balances],
    ['Code étuve :', meta.code_etuve],
    ['Code appareil Casagrande :', meta.code_casagrande],
    ['Code échantillon :', meta.code_echantillon],
  ]
  infoLines.forEach(([label, value], i) => {
    set(r, 1, label, { fc: '000000', bold: true })
    set(r, 2, value || '', { fc: '000000' })
    merge(r, 2, r, 4)
    if (i === 0) {
      set(r, 6, `Ref : ${meta.ref || ''}     Version : ${meta.version || ''}`,
        { fc: '000000', halign: 'right' })
      merge(r, 6, r, NCOLS)
    }
    r++
  })

  r++ // ligne vide

  // ─── SECTION A ──────────────────────────────────────────────────────
  set(r, 1, "A - Données pour le calcul de la proportion d'échantillon inférieure à 0,4 mm",
    { bg: DARK, bold: true, halign: 'center' })
  fillRow(r, { bg: DARK })
  merge(r, 1, r, NCOLS)
  r++

  // En-têtes colonnes A
  set(r, 1, 'Paramètre', { bg: BLUE, bold: true, halign: 'center' })
  tares.forEach((_, i) => set(r, 2 + i, `Tare ${i + 1}`, { bg: BLUE, bold: true, halign: 'center' }))
  fillRow(r, { bg: BLUE })
  r++

  // Données section A
  ;[
    ["N° Tare", tares.map(t => t?.id)],
    ['Masse de la Tare vide (g)', tares.map(t => t?.masse_tare)],
    ['Masse sol humide + tare (g)', tares.map(t => t?.sol_humide_tare)],
    ['Masse Sol sec + tare (g) – 1ère pesée', tares.map(t => t?.sol_sec_1)],
    ['Masse Sol sec + tare (g) – 2ème pesée', tares.map(t => t?.sol_sec_2)],
    ["Teneur en eau de l'échantillon original (%)", tares.map(t => t?.teneur_eau)],
  ].forEach(([label, vals]) => {
    set(r, 1, label, { fc: '000000' })
    vals.forEach((v, i) => set(r, 2 + i, v ?? '', { fc: '000000', halign: 'center' }))
    r++
  })

  r++ // ligne vide

  // Lignes orange
  set(r, 1, 'Masse éprouvette non séchée (g)', { fc: '000000', bold: true })
  set(r, 2, d?.section_a?.masse_eprouvette ?? '', { bg: ORANGE, fc: '000000', bold: true, halign: 'center' })
  set(r, 3, '', { bg: ORANGE })
  merge(r, 2, r, 3)
  r++

  set(r, 1, 'Masse retenue sur tamis 0,400 (g)', { fc: '000000', bold: true })
  set(r, 2, d?.section_a?.masse_retenue_tamis ?? '', { bg: ORANGE, fc: '000000', bold: true, halign: 'center' })
  set(r, 3, '', { bg: ORANGE })
  merge(r, 2, r, 3)
  r++

  r++ // ligne vide

  // ─── SECTION B1 ─────────────────────────────────────────────────────
  set(r, 1, 'B-1 - Limite de Liquidité', { bg: DARK, bold: true, halign: 'center' })
  fillRow(r, { bg: DARK })
  merge(r, 1, r, NCOLS)
  r++

  set(r, 1, 'Paramètre', { bg: BLUE, bold: true, halign: 'center' })
  b1.forEach((_, i) => set(r, 2 + i, `Col. ${i + 1}`, { bg: BLUE, bold: true, halign: 'center' }))
  fillRow(r, { bg: BLUE })
  r++

  ;[
    ['Nombre de rotations', b1.map(m => m?.nb_rotations)],
    ['N° Tare', b1.map(m => m?.tare)],
    ['Masse de la Tare vide (g)', b1.map(m => m?.masse_tare)],
    ['Sol humide + tare (g)', b1.map(m => m?.sol_humide_tare)],
    ['Sol sec + tare (g) – 1ère pesée', b1.map(m => m?.sol_sec_1)],
    ['Sol sec + tare (g) – 2ème pesée', b1.map(m => m?.sol_sec_2)],
  ].forEach(([label, vals]) => {
    set(r, 1, label, { fc: '000000' })
    vals.forEach((v, i) => set(r, 2 + i, v ?? '', { fc: '000000', halign: 'center' }))
    r++
  })

  // Teneur en eau mesurée (surlignée)
  set(r, 1, 'Teneur en eau mesurée (%)', { bg: BLUE, bold: true })
  b1.forEach((m, i) => set(r, 2 + i, m?.teneur_eau ?? '', { bg: BLUE, bold: true, halign: 'center' }))
  fillRow(r, { bg: BLUE })
  r++

  r++ // ligne vide

  // ─── SECTION B2 ─────────────────────────────────────────────────────
  set(r, 1, 'B-2 - Limite de Plasticité', { bg: DARK, bold: true, halign: 'center' })
  fillRow(r, { bg: DARK })
  merge(r, 1, r, NCOLS)
  r++

  set(r, 1, 'Paramètre', { bg: BLUE, bold: true, halign: 'center' })
  b2.forEach((_, i) => set(r, 2 + i, `Tare ${i + 1}`, { bg: BLUE, bold: true, halign: 'center' }))
  fillRow(r, { bg: BLUE })
  r++

  ;[
    ['N° Tare', b2.map(m => m?.tare)],
    ['Masse de la Tare vide (g)', b2.map(m => m?.masse_tare)],
    ['Sol humide + tare (g)', b2.map(m => m?.sol_humide_tare)],
    ['Sol sec + tare (g) – 1ère pesée', b2.map(m => m?.sol_sec_1)],
    ['Sol sec + tare (g) – 2ème pesée', b2.map(m => m?.sol_sec_2)],
    ['Teneur en eau (%)', b2.map(m => m?.teneur_eau)],
  ].forEach(([label, vals]) => {
    set(r, 1, label, { fc: '000000' })
    vals.forEach((v, i) => set(r, 2 + i, v ?? '', { fc: '000000', halign: 'center' }))
    r++
  })

  // Teneur en eau Moyenne (surlignée)
  set(r, 1, 'Teneur en eau Moyenne (%)', { bg: BLUE, bold: true })
  set(r, 2, d?.section_b2?.teneur_eau_moyenne ?? '', { bg: BLUE, bold: true, halign: 'center' })
  b2.slice(1).forEach((_, i) => set(r, 3 + i, '', { bg: BLUE }))
  fillRow(r, { bg: BLUE })
  r++

  // ─── PARAMÈTRES FEUILLE ─────────────────────────────────────────────
  ws['!ref'] = `A1:${col(NCOLS)}${r}`
  ws['!merges'] = merges
  ws['!cols'] = [
    { wch: 46 },
    { wch: 13 },
    { wch: 13 },
    { wch: 13 },
    { wch: 13 },
    { wch: 13 },
    { wch: 13 },
  ]
  ws['!rows'] = [{ hpt: 32 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Atterberg')

  const safeName = (filename || 'rapport').replace('.pdf', '')
  XLSX.writeFile(wb, `${safeName}_atterberg.xlsx`)
}
