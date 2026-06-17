import * as XLSX from 'xlsx'

export function exportToExcel(report) {
  const { raw_json: d, filename } = report
  const wb = XLSX.utils.book_new()

  // ── Feuille INFO GÉNÉRALES ───────────────────────────────
  const infoRows = [
    ['MINUTES - DÉTERMINATION DES LIMITES D\'ATTERBERG (ISO 17892-12 Version 2018)'],
    [],
    ['Date de l\'essai', d.meta?.date_essai || ''],
    ['Opérateur', d.meta?.operateur || ''],
    ['Code échantillon', d.meta?.code_echantillon || ''],
    ['Référence', d.meta?.ref || ''],
  ]
  const wsInfo = XLSX.utils.aoa_to_sheet(infoRows)
  wsInfo['!cols'] = [{ wch: 30 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Infos générales')

  // ── Feuille SECTION A ────────────────────────────────────
  const tares = d.section_a?.tares || []
  const aHeaders = ['Paramètre', ...tares.map((t, i) => `Tare ${i + 1} (${t.id})`)]
  const aRows = [
    aHeaders,
    ['N° Tare', ...tares.map(t => t.id)],
    ['Masse de la Tare vide (g)', ...tares.map(t => t.masse_tare)],
    ['Sol humide + tare (g)', ...tares.map(t => t.sol_humide_tare)],
    ['Sol sec + tare (g) – 1ère pesée', ...tares.map(t => t.sol_sec_1)],
    ['Sol sec + tare (g) – 2ème pesée', ...tares.map(t => t.sol_sec_2)],
    [],
    ['Masse éprouvette non séchée (g)', d.section_a?.masse_eprouvette || ''],
    ['Masse retenue sur tamis 0,400 (g)', d.section_a?.masse_retenue_tamis || ''],
  ]
  const wsA = XLSX.utils.aoa_to_sheet(aRows)
  wsA['!cols'] = [{ wch: 38 }, { wch: 16 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsA, 'Section A')

  // ── Feuille SECTION B1 ───────────────────────────────────
  const b1 = d.section_b1?.mesures || []
  const b1Headers = ['Paramètre', ...b1.map((_, i) => `Mesure ${i + 1}`)]
  const b1Rows = [
    b1Headers,
    ['Nombre de rotations', ...b1.map(m => m.nb_rotations)],
    ['N° Tare', ...b1.map(m => m.tare)],
    ['Masse de la Tare vide (g)', ...b1.map(m => m.masse_tare)],
    ['Sol humide + tare (g)', ...b1.map(m => m.sol_humide_tare)],
    ['Sol sec + tare (g) – 1ère pesée', ...b1.map(m => m.sol_sec_1)],
    ['Sol sec + tare (g) – 2ème pesée', ...b1.map(m => m.sol_sec_2)],
    ['Teneur en eau mesurée (%)', ...b1.map(m => m.teneur_eau)],
  ]
  const wsB1 = XLSX.utils.aoa_to_sheet(b1Rows)
  wsB1['!cols'] = [{ wch: 38 }, ...b1.map(() => ({ wch: 14 }))]
  XLSX.utils.book_append_sheet(wb, wsB1, 'B1 - Limite Liquidité')

  // ── Feuille SECTION B2 ───────────────────────────────────
  const b2 = d.section_b2?.mesures || []
  const b2Rows = [
    ['Paramètre', ...b2.map((_, i) => `Tare ${i + 1}`)],
    ['N° Tare', ...b2.map(m => m.tare)],
    ['Masse de la Tare vide (g)', ...b2.map(m => m.masse_tare)],
    ['Sol humide + tare (g)', ...b2.map(m => m.sol_humide_tare)],
    ['Sol sec + tare (g) – 1ère pesée', ...b2.map(m => m.sol_sec_1)],
    ['Sol sec + tare (g) – 2ème pesée', ...b2.map(m => m.sol_sec_2)],
    ['Teneur en eau (%)', ...b2.map(m => m.teneur_eau)],
    [],
    ['Teneur en eau Moyenne (%)', d.section_b2?.teneur_eau_moyenne || ''],
  ]
  const wsB2 = XLSX.utils.aoa_to_sheet(b2Rows)
  wsB2['!cols'] = [{ wch: 38 }, { wch: 16 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsB2, 'B2 - Limite Plasticité')

  // ── Téléchargement ───────────────────────────────────────
  const safeName = (filename || 'rapport').replace('.pdf', '')
  XLSX.writeFile(wb, `${safeName}_extrait.xlsx`)
}
