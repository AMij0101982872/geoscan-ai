const config = {
  pending:    { label: 'En attente',   dot: 'bg-gray-400',  className: 'bg-gray-100 text-gray-600'   },
  processing: { label: 'En cours…',   dot: 'bg-blue-500',  className: 'bg-blue-50 text-blue-700'    },
  done:       { label: 'Terminé',     dot: 'bg-green-500', className: 'bg-green-50 text-green-700'  },
  error:      { label: 'Erreur',      dot: 'bg-red-500',   className: 'bg-red-50 text-red-700'      },
}

export default function StatusBadge({ status }) {
  const c = config[status] || config.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot} ${status === 'processing' ? 'animate-pulse' : ''}`} />
      {c.label}
    </span>
  )
}
