import { useState } from 'react'

function EditableCell({ value, onSave, fieldPath }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value ?? '')

  function handleSave() {
    setEditing(false)
    if (String(val) !== String(value)) {
      onSave(fieldPath, value, val)
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
        className="w-full border border-brand-500 rounded px-1.5 py-0.5 text-sm focus:outline-none"
      />
    )
  }

  return (
    <span
      className="cursor-pointer hover:bg-yellow-50 px-1 py-0.5 rounded block text-sm"
      title="Cliquer pour modifier"
      onClick={() => setEditing(true)}
    >
      {value ?? <span className="text-gray-300 italic">—</span>}
    </span>
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
          <tr className="bg-gray-50">
            <th className="text-left px-4 py-2.5 font-medium text-gray-600 border-b border-gray-100 w-64">Paramètre</th>
            {tares.map((t, i) => (
              <th key={i} className="text-center px-4 py-2.5 font-medium text-gray-600 border-b border-gray-100">{t.id || `Tare ${i+1}`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="px-4 py-2 text-gray-700 font-medium">{row.label}</td>
              {tares.map((t, i) => (
                <td key={i} className="px-4 py-2 text-center">
                  <EditableCell
                    value={t[row.key]}
                    fieldPath={`section_a.tares[${i}].${row.key}`}
                    onSave={onSave}
                  />
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-b border-gray-100 bg-blue-50/30">
            <td className="px-4 py-2 text-gray-700 font-medium">Masse éprouvette non séchée (g)</td>
            <td className="px-4 py-2 text-center" colSpan={tares.length}>
              <EditableCell value={data?.masse_eprouvette} fieldPath="section_a.masse_eprouvette" onSave={onSave} />
            </td>
          </tr>
          <tr className="bg-blue-50/30">
            <td className="px-4 py-2 text-gray-700 font-medium">Masse retenue sur tamis 0,400 (g)</td>
            <td className="px-4 py-2 text-center" colSpan={tares.length}>
              <EditableCell value={data?.masse_retenue_tamis} fieldPath="section_a.masse_retenue_tamis" onSave={onSave} />
            </td>
          </tr>
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
    { label: 'Teneur en eau mesurée (%)',        key: 'teneur_eau', highlight: true },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left px-4 py-2.5 font-medium text-gray-600 border-b border-gray-100 w-64">Paramètre</th>
            {mesures.map((_, i) => (
              <th key={i} className="text-center px-4 py-2.5 font-medium text-gray-600 border-b border-gray-100">Mesure {i+1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key} className={`border-b border-gray-50 ${row.highlight ? 'bg-green-50/40' : 'hover:bg-gray-50/50'}`}>
              <td className={`px-4 py-2 font-medium ${row.highlight ? 'text-green-700' : 'text-gray-700'}`}>{row.label}</td>
              {mesures.map((m, i) => (
                <td key={i} className="px-4 py-2 text-center">
                  <EditableCell
                    value={m[row.key]}
                    fieldPath={`section_b1.mesures[${i}].${row.key}`}
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

export function SectionB2Table({ data, onSave }) {
  const mesures = data?.mesures || []
  const rows = [
    { label: 'N° Tare',                          key: 'tare' },
    { label: 'Masse de la Tare vide (g)',        key: 'masse_tare' },
    { label: 'Sol humide + tare (g)',            key: 'sol_humide_tare' },
    { label: 'Sol sec + tare (g) – 1ère pesée', key: 'sol_sec_1' },
    { label: 'Sol sec + tare (g) – 2ème pesée', key: 'sol_sec_2' },
    { label: 'Teneur en eau (%)',                key: 'teneur_eau', highlight: true },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left px-4 py-2.5 font-medium text-gray-600 border-b border-gray-100 w-64">Paramètre</th>
            {mesures.map((_, i) => (
              <th key={i} className="text-center px-4 py-2.5 font-medium text-gray-600 border-b border-gray-100">Tare {i+1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key} className={`border-b border-gray-50 ${row.highlight ? 'bg-green-50/40' : 'hover:bg-gray-50/50'}`}>
              <td className={`px-4 py-2 font-medium ${row.highlight ? 'text-green-700' : 'text-gray-700'}`}>{row.label}</td>
              {mesures.map((m, i) => (
                <td key={i} className="px-4 py-2 text-center">
                  <EditableCell
                    value={m[row.key]}
                    fieldPath={`section_b2.mesures[${i}].${row.key}`}
                    onSave={onSave}
                  />
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-green-100/50">
            <td className="px-4 py-2 font-semibold text-green-800">Teneur en eau Moyenne (%)</td>
            <td className="px-4 py-2 text-center font-semibold text-green-800" colSpan={mesures.length}>
              <EditableCell
                value={data?.teneur_eau_moyenne}
                fieldPath="section_b2.teneur_eau_moyenne"
                onSave={onSave}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
