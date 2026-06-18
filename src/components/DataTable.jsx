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
        className="w-full border-2 border-brand-500 rounded-lg px-2 py-1 text-sm font-medium focus:outline-none bg-white shadow-sm text-center"
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Cliquer pour modifier"
      className={`group/cell relative cursor-pointer inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg w-full transition-all
        ${highlight
          ? 'font-semibold text-white'
          : 'text-gray-700 hover:bg-white hover:shadow-sm'
        }`}
    >
      {value ?? <span className="text-gray-300 italic text-xs">—</span>}
      <svg
        className={`w-3 h-3 flex-shrink-0 opacity-0 group-hover/cell:opacity-60 transition-opacity ${highlight ? 'text-white' : 'text-slate-400'}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </span>
  )
}

// Shared table header style
function SectionHeader({ title, cols }) {
  return (
    <thead>
      <tr>
        <th
          colSpan={cols + 1}
          className="px-5 py-3 text-left text-xs font-bold text-white uppercase tracking-wider"
          style={{ background: 'linear-gradient(135deg, #1e2d5c 0%, #2f5496 100%)' }}
        >
          {title}
        </th>
      </tr>
      <tr style={{ background: '#2f5496' }}>
        <th className="text-left px-5 py-2.5 text-xs font-semibold text-blue-100 w-64">Paramètre</th>
        {Array.from({ length: cols }).map((_, i) => (
          <th key={i} className="text-center px-4 py-2.5 text-xs font-semibold text-blue-100">
            Col. {i + 1}
          </th>
        ))}
      </tr>
    </thead>
  )
}

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
            <th
              colSpan={tares.length + 1}
              className="px-5 py-3 text-left text-xs font-bold text-white uppercase tracking-wider"
              style={{ background: 'linear-gradient(135deg, #1e2d5c 0%, #2f5496 100%)' }}
            >
              Section A — Proportion &lt; 0,4 mm
            </th>
          </tr>
          <tr style={{ background: '#2f5496' }}>
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-blue-100 w-72">Paramètre</th>
            {tares.map((t, i) => (
              <th key={i} className="text-center px-4 py-2.5 text-xs font-semibold text-blue-100">
                {t.id ? `Tare — ${t.id}` : `Tare ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.key} className={`border-b border-gray-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30 transition-colors`}>
              <td className="px-5 py-3 text-gray-700 font-medium text-sm">{row.label}</td>
              {tares.map((t, i) => (
                <td key={i} className="px-4 py-3 text-center">
                  <EditableCell value={t[row.key]} fieldPath={`section_a.tares[${i}].${row.key}`} onSave={onSave} />
                </td>
              ))}
            </tr>
          ))}
          {/* Orange rows */}
          {[
            { label: 'Masse éprouvette non séchée (g)', key: 'masse_eprouvette', path: 'section_a.masse_eprouvette' },
            { label: 'Masse retenue sur tamis 0,400 (g)', key: 'masse_retenue_tamis', path: 'section_a.masse_retenue_tamis' },
          ].map(row => (
            <tr key={row.key} className="border-b border-orange-100">
              <td className="px-5 py-3 font-semibold text-orange-800 text-sm bg-orange-50">{row.label}</td>
              <td className="px-4 py-3 text-center bg-orange-50" colSpan={tares.length}>
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
            <th
              colSpan={mesures.length + 1}
              className="px-5 py-3 text-left text-xs font-bold text-white uppercase tracking-wider"
              style={{ background: 'linear-gradient(135deg, #1e2d5c 0%, #2f5496 100%)' }}
            >
              B-1 — Limite de Liquidité
            </th>
          </tr>
          <tr style={{ background: '#2f5496' }}>
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-blue-100 w-72">Paramètre</th>
            {mesures.map((_, i) => (
              <th key={i} className="text-center px-4 py-2.5 text-xs font-semibold text-blue-100">
                Col. {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.key} className={`border-b border-gray-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30 transition-colors`}>
              <td className="px-5 py-3 text-gray-700 font-medium text-sm">{row.label}</td>
              {mesures.map((m, i) => (
                <td key={i} className="px-4 py-3 text-center">
                  <EditableCell value={m[row.key]} fieldPath={`section_b1.mesures[${i}].${row.key}`} onSave={onSave} />
                </td>
              ))}
            </tr>
          ))}
          {/* Teneur en eau — highlighted blue */}
          <tr style={{ background: '#2f5496' }}>
            <td className="px-5 py-3 font-semibold text-white text-sm">Teneur en eau mesurée (%)</td>
            {mesures.map((m, i) => (
              <td key={i} className="px-4 py-3 text-center">
                <EditableCell
                  value={m.teneur_eau}
                  fieldPath={`section_b1.mesures[${i}].teneur_eau`}
                  onSave={onSave}
                  highlight
                />
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
            <th
              colSpan={mesures.length + 1}
              className="px-5 py-3 text-left text-xs font-bold text-white uppercase tracking-wider"
              style={{ background: 'linear-gradient(135deg, #1e2d5c 0%, #2f5496 100%)' }}
            >
              B-2 — Limite de Plasticité
            </th>
          </tr>
          <tr style={{ background: '#2f5496' }}>
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-blue-100 w-72">Paramètre</th>
            {mesures.map((_, i) => (
              <th key={i} className="text-center px-4 py-2.5 text-xs font-semibold text-blue-100">
                Tare {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.key} className={`border-b border-gray-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30 transition-colors`}>
              <td className="px-5 py-3 text-gray-700 font-medium text-sm">{row.label}</td>
              {mesures.map((m, i) => (
                <td key={i} className="px-4 py-3 text-center">
                  <EditableCell value={m[row.key]} fieldPath={`section_b2.mesures[${i}].${row.key}`} onSave={onSave} />
                </td>
              ))}
            </tr>
          ))}
          {/* Teneur en eau Moyenne — highlighted blue */}
          <tr style={{ background: '#2f5496' }}>
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
