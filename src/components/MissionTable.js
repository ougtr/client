import StatusBadge from './StatusBadge';

const MissionTable = ({ missions, onView, onEdit, onDelete, isManager, deletingId }) => {
  if (!missions.length) {
    return <p>Aucune mission trouvee.</p>;
  }

  return (
    <div className="table-wrapper">
      <table className="mission-table">
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
              <td>{mission.id}</td>
              <td><StatusBadge statut={mission.statut} /></td>
              <td>
                <div className="cell-main">{mission.assureurNom}</div>
                {mission.assureurContact && <div className="cell-sub">{mission.assureurContact}</div>}
              </td>
              <td>
                <div className="cell-main">{mission.assureNom}</div>
                {mission.assureTelephone && <div className="cell-sub">{mission.assureTelephone}</div>}
              </td>
              <td>
                <div className="cell-main">{mission.vehiculeMarque} {mission.vehiculeModele}</div>
                {mission.vehiculeImmatriculation && (
                  <div className="cell-sub">{mission.vehiculeImmatriculation}</div>
                )}
              </td>
              <td>{mission.agentLogin || 'Non assigne'}</td>
              <td>
                <div className="cell-main">{mission.sinistreType || 'Non renseigne'}</div>
                {mission.sinistreDate && <div className="cell-sub">{mission.sinistreDate}</div>}
              </td>
              <td className="table-actions">
                <button type="button" className="btn btn-action" onClick={() => onView(mission.id)}>
                  Consulter
                </button>
                {isManager && (
                  <>
                    <button type="button" className="btn btn-action" onClick={() => onEdit(mission.id)}>
                      Modifier
                    </button>
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
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MissionTable;

