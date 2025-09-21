const STATUS_CONFIG = {
  cree: { label: 'Cree', className: 'status-badge status-cree' },
  affectee: { label: 'Affectee', className: 'status-badge status-affectee' },
  en_cours: { label: 'En cours', className: 'status-badge status-encours' },
  terminee: { label: 'Terminee', className: 'status-badge status-terminee' },
};

const StatusBadge = ({ statut }) => {
  const config = STATUS_CONFIG[statut] || { label: statut, className: 'status-badge' };
  return <span className={config.className}>{config.label}</span>;
};

export default StatusBadge;
