const ROLE_LABELS = {
  GESTIONNAIRE: 'Gestionnaire',
  AGENT: 'Agent',
};

const MissionFilters = ({ filters, onChange, onReset, statuses, assignees = [], isManager }) => {
  const handleChange = (event) => {
    const { name, value } = event.target;
    onChange({ ...filters, [name]: value });
  };

  return (
    <div className="card filters-card">
      <div className="filters-grid">
        <label className="form-field">
          <span>Recherche</span>
          <input
            name="keyword"
            value={filters.keyword || ''}
            onChange={handleChange}
            placeholder="Mot cle (3+ caracteres)"
          />
        </label>
        <label className="form-field">
          <span>Statut</span>
          <select name="statut" value={filters.statut || ''} onChange={handleChange}>
            <option value="">Tous</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        {isManager && (
          <label className="form-field">
            <span>Responsable</span>
            <select name="agentId" value={filters.agentId || ''} onChange={handleChange}>
              <option value="">Tous</option>
              {assignees.map((user) => (
                <option key={user.id} value={user.id}>
                  {`${user.login} (${ROLE_LABELS[user.role] || user.role})`}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="form-field">
          <span>Du</span>
          <input
            type="date"
            name="fromDate"
            value={filters.fromDate || ''}
            onChange={handleChange}
          />
        </label>
        <label className="form-field">
          <span>Au</span>
          <input
            type="date"
            name="toDate"
            value={filters.toDate || ''}
            onChange={handleChange}
          />
        </label>
      </div>
      <div className="filters-actions">
        <button type="button" className="btn btn-secondary" onClick={onReset}>
          Reinitialiser
        </button>
      </div>
    </div>
  );
};

export default MissionFilters;



