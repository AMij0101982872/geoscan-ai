import { useState } from 'react'
import { useTheme, T } from '../lib/theme'

function EditableCell({ value, onSave, fieldPath }) {
  const { isDark } = useTheme()
  const t = isDark ? T.dark : T.light
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value ?? '')

  function handleSave() {
    setEditing(false)
    if (String(val) !== String(value ?? '')) onSave(fieldPath, value, val)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
        className="w-full rounded-lg px-2 py-1 text-sm font-medium focus:outline-none text-center"
        style={{
          background: t.editInputBg,
          border: `2px solid ${t.editInputBorder}`,
          boxShadow: t.editInputShadow,
          color: t.text,
        }}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Cliquer pour modifier"
      className="group/cell relative cursor-pointer inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg w-full transition-all"
      style={{ color: t.textSub }}
      onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {value ?? <span style={{ color: t.textMuted, fontStyle: 'italic', fontSize: '0.75rem' }}>—</span>}
      <svg
        className="w-3 h-3 flex-shrink-0 opacity-0 group-hover/cell:opacity-50 transition-opacity"
        style={{ color: '#818cf8' }}
        fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </span>
  )
}

const SECTION_HEADER = { background: 'linear-gradient(135deg, #1e2d5c 0%, #2f5496 100%)' }
const COL_HEADER = { background: '#2f5496' }

export function SectionTable({ section, sectionIndex, onSave }) {
  const { isDark } = useTheme()
  const t = isDark ? T.dark : T.light

  const colonnes = section?.colonnes || []
  const lignes = section?.lignes || []
  const ncols = Math.max(colonnes.length, ...lignes.map(l => (l || []).length), 1)
  const displayColumns = colonnes.length > 0
    ? colonnes
    : Array.from({ length: ncols }, (_, i) => `Col. ${i + 1}`)

  // Bandeaux d'en-tête empilés (facultatif, cosmétique) — un ou plusieurs
  // niveaux de regroupement de colonnes au-dessus de l'en-tête réel, comme
  // sur le document source (ex: "CODE ECHANTILLON" puis "N° DE LA TARE").
  // Tolère l'ancien format à plat (rapports sauvegardés avant ce changement).
  let entetesGroupes = Array.isArray(section?.entetes_groupes) ? section.entetes_groupes : []
  if (entetesGroupes.length > 0 && !Array.isArray(entetesGroupes[0])) entetesGroupes = [entetesGroupes]
  const bandRuns = entetesGroupes.map(band => {
    const groupForCol = displayColumns.map(c => band.find(g => g.colonnes.includes(c))?.label ?? null)
    const runs = []
    let ci = 0
    while (ci < groupForCol.length) {
      const label = groupForCol[ci]
      let span = 1
      while (ci + span < groupForCol.length && groupForCol[ci + span] === label && label !== null) span++
      runs.push({ label, span })
      ci += span
    }
    return runs
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th colSpan={ncols} className="px-5 py-3 text-left text-xs font-bold text-white uppercase tracking-wider" style={SECTION_HEADER}>
              {section?.titre || `Tableau ${sectionIndex + 1}`}
            </th>
          </tr>
          {bandRuns.map((runs, bi) => (
            <tr key={bi} style={SECTION_HEADER}>
              {runs.map((g, i) => (
                <th key={i} colSpan={g.span} className="px-4 py-2 text-center text-xs font-semibold text-blue-100 border-l border-white/10 first:border-l-0">
                  {g.label || ''}
                </th>
              ))}
            </tr>
          ))}
          <tr style={COL_HEADER}>
            {displayColumns.map((c, i) => (
              <th key={i} className="text-center first:text-left px-5 py-2.5 text-xs font-semibold text-blue-100 first:w-72">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(() => {
            const bandeauByRow = new Map(
              (Array.isArray(section?.lignes_bandeau) ? section.lignes_bandeau : []).map(b => [b.ligne, { span: b.colonnes, start: b.colonne_debut || 1 }])
            )
            // Fusions verticales : par colonne, quelle ligne "démarre" une
            // fusion (avec sa hauteur) et quelles lignes sont "couvertes"
            // (aucune cellule à rendre, déjà occupée par la fusion du dessus).
            const fusions = Array.isArray(section?.fusions_verticales) ? section.fusions_verticales : []
            const rowSpanStart = new Map() // `${ci}:${ri}` -> hauteur
            const covered = new Set() // `${ci}:${ri}`
            fusions.forEach(f => {
              const ci = displayColumns.indexOf(f.colonne)
              if (ci === -1) return
              rowSpanStart.set(`${ci}:${f.ligne_debut}`, f.lignes)
              for (let r = f.ligne_debut + 1; r < f.ligne_debut + f.lignes; r++) covered.add(`${ci}:${r}`)
            })
            return lignes.map((ligne, ri) => {
            const vals = ligne && ligne.length > 0 ? ligne : Array(ncols).fill(null)
            const bandeau = bandeauByRow.get(ri)
            const leadCount = bandeau ? bandeau.start - 1 : 0
            const afterStart = leadCount + (bandeau ? bandeau.span : 0)
            return (
              <tr key={ri} className="transition-colors"
                style={{ background: ri % 2 === 0 ? t.rowEven : t.rowOdd, borderBottom: `1px solid ${t.rowBorder}` }}
                onMouseEnter={e => { e.currentTarget.style.background = t.rowHover }}
                onMouseLeave={e => { e.currentTarget.style.background = ri % 2 === 0 ? t.rowEven : t.rowOdd }}>
                {vals.slice(0, leadCount).map((v, i) => {
                  if (covered.has(`${i}:${ri}`)) return null
                  const rowSpan = rowSpanStart.get(`${i}:${ri}`)
                  return (
                    <td key={i} rowSpan={rowSpan} className={i === 0 ? 'px-5 py-3' : 'px-4 py-3 text-center'}>
                      <EditableCell
                        value={v}
                        fieldPath={`tableaux[${sectionIndex}].lignes[${ri}][${i}]`}
                        onSave={onSave}
                      />
                    </td>
                  )
                })}
                {bandeau && (
                  <td colSpan={bandeau.span} className="px-5 py-3 font-semibold" style={{ color: t.text }}>
                    <EditableCell
                      value={vals[leadCount]}
                      fieldPath={`tableaux[${sectionIndex}].lignes[${ri}][${leadCount}]`}
                      onSave={onSave}
                    />
                  </td>
                )}
                {vals.slice(afterStart).map((v, i) => {
                  const ci = afterStart + i
                  if (covered.has(`${ci}:${ri}`)) return null
                  const rowSpan = rowSpanStart.get(`${ci}:${ri}`)
                  return (
                    <td key={ci} rowSpan={rowSpan} className={ci === 0 ? 'px-5 py-3' : 'px-4 py-3 text-center'}>
                      <EditableCell
                        value={v}
                        fieldPath={`tableaux[${sectionIndex}].lignes[${ri}][${ci}]`}
                        onSave={onSave}
                      />
                    </td>
                  )
                })}
              </tr>
            )
          })
          })()}
        </tbody>
      </table>
    </div>
  )
}
