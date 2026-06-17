const config = {
  pending:    { label: 'En attente',    className: 'bg-gray-100 text-gray-600'   },
  processing: { label: 'Extraction…',  className: 'bg-blue-100 text-blue-700'   },
  done:       { label: 'Terminé',      className: 'bg-green-100 text-green-700' },
  error:      { label: 'Erreur',       className: 'bg-red-100 text-red-700'     },
}

export default function StatusBadge({ status }) {
  const { label, className } = config[status] || config.pending
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {status === 'processing' && (
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-blue-500 animate-pulse" />
      )}
      {label}
    </span>
  )
}
