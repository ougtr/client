const STATUS_CONFIG = {
  cree: { label: 'Cree', className: 'status-badge status-cree', icon: '○' },
  affectee: { label: 'Affectee', className: 'status-badge status-affectee', icon: '◔' },
  en_cours: { label: 'En cours', className: 'status-badge status-encours', icon: '◑' },
  terminee: { label: 'Terminee', className: 'status-badge status-terminee', icon: '●' },
};

const StatusBadge = ({ statut }) => {
  const config = STATUS_CONFIG[statut] || { label: statut, className: 'status-badge', icon: '○' };
  return (
    <span className={config.className}>
      <span aria-hidden="true" className="status-badge-icon">
        {config.icon}
      </span>
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;
