import { useState } from 'react'

function EditableCell({ value, onSave, fieldPath, highlight = false }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value ?? '')

  function handleSave() {
    setEditing(false)
    if (String(val) !== String(value)) onSave(fieldPath, value, val)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
        className="w-full rounded-lg px-2 py-1 text-sm font-medium focus:outline-none text-center text-white"
        style={{ background: 'rgba(255,255,255,0.08)', border: '2px solid #4f6ef7', boxShadow: '0 0 0 3px rgba(79,110,247,0.15)' }}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Cliquer pour modifier"
      className="group/cell relative cursor-pointer inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg w-full transition-all"
      style={{
        color: highlight ? '#ffffff' : 'rgba(255,255,255,0.75)',
        fontWeight: highlight ? 600 : 400,
      }}
      onMouseEnter={e => { if (!highlight) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
      onMouseLeave={e => { if (!highlight) e.currentTarget.style.background = 'transparent' }}
    >
      {value ?? <span style={{ color: 'rgba(255,255,255,0.18)', fontStyle: 'italic', fontSize: '0.75rem' }}>—</span>}
      <svg
        className="w-3 h-3 flex-shrink-0 opacity-0 group-hover/cell:opacity-50 transition-opacity"
        style={{ color: highlight ? '#fff' : '#818cf8' }}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </span>
  )
}

const SECTION_HEADER = { background: 'linear-gradient(135deg, #1a2545 0%, #1e3a7a 100%)' }
const COL_HEADER = { background: 'rgba(30,58,122,0.8)' }
const ROW_EVEN = { background: 'rgba(255,255,255,0.02)' }
const ROW_ODD = { background: 'rgba(255,255,255,0.04)' }
const ROW_BORDER = { borderBottom: '1px solid rgba(255,255,255,0.05)' }

export function SectionATable({ data, onSave }) {
  const tares = data?.tares || []
  const rows = [
    { label: 'N° Tare',                              key: 'id' },
    { label: 'Masse de la Tare vide (g)',            key: 'masse_tare' },
    { label: 'Sol humide + tare (g)',                key: 'sol_humide_tare' },
    { label: 'Sol sec + tare (g) – 1ère pesée',     key: 'sol_sec_1' },
    { label: 'Sol sec + tare (g) – 2ème pesée',     key: 'sol_sec_2' },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th colSpan={tares.length + 1}
              className="px-5 py-3 text-left text-xs font-bold text-white uppercase tracking-wider"
              style={SECTION_HEADER}>
              Section A — Proportion &lt; 0,4 mm
            </th>
          </tr>
          <tr style={COL_HEADER}>
            <th className="text-left px-5 py-2.5 text-xs font-semibold w-72" style={{ color: 'rgba(165,180,252,0.8)' }}>Paramètre</th>
            {tares.map((t, i) => (
              <th key={i} className="text-center px-4 py-2.5 text-xs font-semibold" style={{ color: 'rgba(165,180,252,0.8)' }}>
                {t.id ? `Tare — ${t.id}` : `Tare ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.key} className="transition-colors"
              style={{ ...(ri % 2 === 0 ? ROW_EVEN : ROW_ODD), ...ROW_BORDER }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,110,247,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = ri % 2 === 0 ? ROW_EVEN.background : ROW_ODD.background}>
              <td className="px-5 py-3 font-medium text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{row.label}</td>
              {tares.map((t, i) => (
                <td key={i} className="px-4 py-3 text-center">
                  <EditableCell value={t[row.key]} fieldPath={`section_a.tares[${i}].${row.key}`} onSave={onSave} />
                </td>
              ))}
            </tr>
          ))}
          {/* Orange accent rows */}
          {[
            { label: 'Masse éprouvette non séchée (g)', key: 'masse_eprouvette', path: 'section_a.masse_eprouvette' },
            { label: 'Masse retenue sur tamis 0,400 (g)', key: 'masse_retenue_tamis', path: 'section_a.masse_retenue_tamis' },
          ].map(row => (
            <tr key={row.key} style={{ borderBottom: '1px solid rgba(251,146,60,0.15)' }}>
              <td className="px-5 py-3 font-semibold text-sm" style={{ background: 'rgba(251,146,60,0.08)', color: '#fb923c' }}>{row.label}</td>
              <td className="px-4 py-3 text-center" style={{ background: 'rgba(251,146,60,0.05)' }} colSpan={tares.length}>
                <EditableCell value={data?.[row.key]} fieldPath={row.path} onSave={onSave} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SectionB1Table({ data, onSave }) {
  const mesures = data?.mesures || []
  const rows = [
    { label: 'Nombre de rotations',              key: 'nb_rotations' },
    { label: 'N° Tare',                          key: 'tare' },
    { label: 'Masse de la Tare vide (g)',        key: 'masse_tare' },
    { label: 'Sol humide + tare (g)',            key: 'sol_humide_tare' },
    { label: 'Sol sec + tare (g) – 1ère pesée', key: 'sol_sec_1' },
    { label: 'Sol sec + tare (g) – 2ème pesée', key: 'sol_sec_2' },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th colSpan={mesures.length + 1}
              className="px-5 py-3 text-left text-xs font-bold text-white uppercase tracking-wider"
              style={SECTION_HEADER}>
              B-1 — Limite de Liquidité
            </th>
          </tr>
          <tr style={COL_HEADER}>
            <th className="text-left px-5 py-2.5 text-xs font-semibold w-72" style={{ color: 'rgba(165,180,252,0.8)' }}>Paramètre</th>
            {mesures.map((_, i) => (
              <th key={i} className="text-center px-4 py-2.5 text-xs font-semibold" style={{ color: 'rgba(165,180,252,0.8)' }}>
                Col. {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.key} className="transition-colors"
              style={{ ...(ri % 2 === 0 ? ROW_EVEN : ROW_ODD), ...ROW_BORDER }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,110,247,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = ri % 2 === 0 ? ROW_EVEN.background : ROW_ODD.background}>
              <td className="px-5 py-3 font-medium text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{row.label}</td>
              {mesures.map((m, i) => (
                <td key={i} className="px-4 py-3 text-center">
                  <EditableCell value={m[row.key]} fieldPath={`section_b1.mesures[${i}].${row.key}`} onSave={onSave} />
                </td>
              ))}
            </tr>
          ))}
          {/* Teneur en eau — blue highlight row */}
          <tr style={{ background: 'linear-gradient(135deg, #1a2545 0%, #1e3a7a 100%)' }}>
            <td className="px-5 py-3 font-semibold text-white text-sm">Teneur en eau mesurée (%)</td>
            {mesures.map((m, i) => (
              <td key={i} className="px-4 py-3 text-center">
                <EditableCell value={m.teneur_eau} fieldPath={`section_b1.mesures[${i}].teneur_eau`} onSave={onSave} highlight />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function SectionB2Table({ data, onSave }) {
  const mesures = data?.mesures || []
  const rows = [
    { label: 'N° Tare',                          key: 'tare' },
    { label: 'Masse de la Tare vide (g)',        key: 'masse_tare' },
    { label: 'Sol humide + tare (g)',            key: 'sol_humide_tare' },
    { label: 'Sol sec + tare (g) – 1ère pesée', key: 'sol_sec_1' },
    { label: 'Sol sec + tare (g) – 2ème pesée', key: 'sol_sec_2' },
    { label: 'Teneur en eau (%)',                key: 'teneur_eau' },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th colSpan={mesures.length + 1}
              className="px-5 py-3 text-left text-xs font-bold text-white uppercase tracking-wider"
              style={SECTION_HEADER}>
              B-2 — Limite de Plasticité
            </th>
          </tr>
          <tr style={COL_HEADER}>
            <th className="text-left px-5 py-2.5 text-xs font-semibold w-72" style={{ color: 'rgba(165,180,252,0.8)' }}>Paramètre</th>
            {mesures.map((_, i) => (
              <th key={i} className="text-center px-4 py-2.5 text-xs font-semibold" style={{ color: 'rgba(165,180,252,0.8)' }}>
                Tare {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.key} className="transition-colors"
              style={{ ...(ri % 2 === 0 ? ROW_EVEN : ROW_ODD), ...ROW_BORDER }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,110,247,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = ri % 2 === 0 ? ROW_EVEN.background : ROW_ODD.background}>
              <td className="px-5 py-3 font-medium text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{row.label}</td>
              {mesures.map((m, i) => (
                <td key={i} className="px-4 py-3 text-center">
                  <EditableCell value={m[row.key]} fieldPath={`section_b2.mesures[${i}].${row.key}`} onSave={onSave} />
                </td>
              ))}
            </tr>
          ))}
          {/* Teneur en eau Moyenne — blue highlight row */}
          <tr style={{ background: 'linear-gradient(135deg, #1a2545 0%, #1e3a7a 100%)' }}>
            <td className="px-5 py-3 font-semibold text-white text-sm">Teneur en eau Moyenne (%)</td>
            <td className="px-4 py-3 text-center font-semibold" colSpan={mesures.length}>
              <EditableCell value={data?.teneur_eau_moyenne} fieldPath="section_b2.teneur_eau_moyenne" onSave={onSave} highlight />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
