const config = {
  pending:    { label: 'En attente',  dot: '#94a3b8', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', light: 'bg-gray-100 text-gray-600'  },
  processing: { label: 'En cours…',  dot: '#60a5fa', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  light: 'bg-blue-50 text-blue-700'   },
  done:       { label: 'Terminé',    dot: '#4ade80', color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  light: 'bg-green-50 text-green-700' },
  error:      { label: 'Erreur',     dot: '#f87171', color: '#f87171', bg: 'rgba(248,113,113,0.12)', light: 'bg-red-50 text-red-700'     },
}

export default function StatusBadge({ status, dark = false }) {
  const c = config[status] || config.pending
  if (dark) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ background: c.bg, color: c.color }}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === 'processing' ? 'animate-pulse' : ''}`}
          style={{ background: c.dot }} />
        {c.label}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.light}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === 'processing' ? 'animate-pulse' : ''}`}
        style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}
