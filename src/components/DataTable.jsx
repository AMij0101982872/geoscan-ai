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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th colSpan={ncols} className="px-5 py-3 text-left text-xs font-bold text-white uppercase tracking-wider" style={SECTION_HEADER}>
              {section?.titre || `Tableau ${sectionIndex + 1}`}
            </th>
          </tr>
          <tr style={COL_HEADER}>
            {displayColumns.map((c, i) => (
              <th key={i} className="text-center first:text-left px-5 py-2.5 text-xs font-semibold text-blue-100 first:w-72">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne, ri) => (
            <tr key={ri} className="transition-colors"
              style={{ background: ri % 2 === 0 ? t.rowEven : t.rowOdd, borderBottom: `1px solid ${t.rowBorder}` }}
              onMouseEnter={e => { e.currentTarget.style.background = t.rowHover }}
              onMouseLeave={e => { e.currentTarget.style.background = ri % 2 === 0 ? t.rowEven : t.rowOdd }}>
              {(ligne && ligne.length > 0 ? ligne : Array(ncols).fill(null)).map((v, ci) => (
                <td key={ci} className={ci === 0 ? 'px-5 py-3' : 'px-4 py-3 text-center'}>
                  <EditableCell
                    value={v}
                    fieldPath={`tableaux[${sectionIndex}].lignes[${ri}][${ci}]`}
                    onSave={onSave}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
