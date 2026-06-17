import { exportToExcel } from '../lib/exportExcel'

export default function ExportBtn({ report }) {
  if (!report?.raw_json) return null

  return (
    <button
      onClick={() => exportToExcel(report)}
      className="btn-secondary flex items-center gap-2 text-sm"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      </svg>
      Exporter Excel
    </button>
  )
}
