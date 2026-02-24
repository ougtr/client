import { useState } from 'react';
import StatusBadge from './StatusBadge';

const MissionTable = ({
  missions,
  onView,
  onEdit,
  onDelete,
  onQuickAssign,
  onQuickStatus,
  isManager,
  deletingId,
}) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [expandedCards, setExpandedCards] = useState(() => new Set());

  if (!missions.length) {
    return <p>Aucune mission trouvee.</p>;
  }

  const toggleCard = (missionId) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(missionId)) {
        next.delete(missionId);
      } else {
        next.add(missionId);
      }
      return next;
    });
  };

  const renderRowMenu = (mission) => (
    <div className="row-menu" role="menu" aria-label={`Actions mission ${mission.id}`}>
      <button type="button" className="btn btn-action" onClick={() => onView(mission.id)}>
        Consulter
      </button>
      {isManager && (
        <button type="button" className="btn btn-action" onClick={() => onEdit(mission.id)}>
          Modifier
        </button>
      )}
      {isManager && onQuickAssign && (
        <button type="button" className="btn btn-action" onClick={() => onQuickAssign(mission)}>
          Affecter
        </button>
      )}
      {isManager && onQuickStatus && (
        <button type="button" className="btn btn-action" onClick={() => onQuickStatus(mission)}>
          Changer statut
        </button>
      )}
      {isManager && onDelete && (
        <button
          type="button"
          className="btn btn-action text-danger"
          onClick={() => onDelete(mission.id)}
          disabled={deletingId === mission.id}
        >
          {deletingId === mission.id ? 'Suppression...' : 'Supprimer'}
        </button>
      )}
    </div>
  );

  return (
    <div className="table-wrapper mission-table-container">
      <table className="mission-table mission-table-desktop">
        <thead>
          <tr>
            <th>Mission</th>
            <th>Statut</th>
            <th>Assureur</th>
            <th>Assure</th>
            <th>Vehicule</th>
            <th>Responsable</th>
            <th>Sinistre</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {missions.map((mission) => (
            <tr key={mission.id}>
              <td>{mission.missionCode || mission.id}</td>
              <td>
                <StatusBadge statut={mission.statut} />
              </td>
              <td>
                <div className="cell-main">{mission.assureurNom}</div>
                {mission.assureurContact && <div className="cell-sub">{mission.assureurContact}</div>}
                {mission.assureurAgenceNom && <div className="cell-sub">Agence : {mission.assureurAgenceNom}</div>}
              </td>
              <td>
                <div className="cell-main">{mission.assureNom}</div>
                {mission.assureTelephone && <div className="cell-sub">{mission.assureTelephone}</div>}
              </td>
              <td>
                <div className="cell-main">
                  {mission.vehiculeMarque} {mission.vehiculeModele}
                </div>
                {mission.vehiculeImmatriculation && <div className="cell-sub">{mission.vehiculeImmatriculation}</div>}
              </td>
              <td>{mission.agentLogin || 'Non assigne'}</td>
              <td>
                <div className="cell-main">{mission.sinistreType || '-'}</div>
                {mission.sinistreDate && <div className="cell-sub">{mission.sinistreDate}</div>}
              </td>
              <td className="table-actions row-action-wrap">
                <button type="button" className="btn btn-action" onClick={() => onView(mission.id)}>
                  Consulter
                </button>
                {isManager && (
                  <button
                    type="button"
                    className="btn btn-action"
                    onClick={() => setOpenMenuId((current) => (current === mission.id ? null : mission.id))}
                    aria-haspopup="menu"
                    aria-expanded={openMenuId === mission.id}
                  >
                    Plus
                  </button>
                )}
                {openMenuId === mission.id ? renderRowMenu(mission) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mission-table-mobile">
        <div className="mission-card-list">
          {missions.map((mission) => {
            const isExpanded = expandedCards.has(mission.id);
            return (
              <article key={mission.id} className="mission-card">
                <div className="mission-card-header">
                  <div className="mission-card-meta">
                    <strong>Mission {mission.missionCode || mission.id}</strong>
                    <span className="cell-sub">{mission.vehiculeImmatriculation || '-'}</span>
                  </div>
                  <StatusBadge statut={mission.statut} />
                </div>

                <div className="mission-card-grid">
                  <div className="mission-card-row">
                    <span className="mission-card-label">Assureur</span>
                    <span>{mission.assureurNom || '-'}</span>
                  </div>
                  <div className="mission-card-row">
                    <span className="mission-card-label">Responsable</span>
                    <span>{mission.agentLogin || 'Non assigne'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mission-card-grid">
                    <div className="mission-card-row">
                      <span className="mission-card-label">Assure</span>
                      <span>{mission.assureNom || '-'}</span>
                    </div>
                    <div className="mission-card-row">
                      <span className="mission-card-label">Vehicule</span>
                      <span>
                        {mission.vehiculeMarque} {mission.vehiculeModele}
                      </span>
                    </div>
                    <div className="mission-card-row">
                      <span className="mission-card-label">Sinistre</span>
                      <span>{mission.sinistreType || '-'}</span>
                    </div>
                  </div>
                )}

                <div className="mission-card-actions">
                  <button type="button" className="btn btn-action" onClick={() => onView(mission.id)}>
                    Consulter
                  </button>
                  {isManager && (
                    <button type="button" className="btn btn-action" onClick={() => onEdit(mission.id)}>
                      Modifier
                    </button>
                  )}
                  <button type="button" className="btn btn-action" onClick={() => toggleCard(mission.id)}>
                    {isExpanded ? 'Masquer details' : 'Details'}
                  </button>
                </div>

                {isManager && (
                  <div className="mission-card-actions">
                    {onQuickAssign && (
                      <button type="button" className="btn btn-action" onClick={() => onQuickAssign(mission)}>
                        Affecter
                      </button>
                    )}
                    {onQuickStatus && (
                      <button type="button" className="btn btn-action" onClick={() => onQuickStatus(mission)}>
                        Statut
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        className="btn btn-action text-danger"
                        onClick={() => onDelete(mission.id)}
                        disabled={deletingId === mission.id}
                      >
                        {deletingId === mission.id ? 'Suppression...' : 'Supprimer'}
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MissionTable;
