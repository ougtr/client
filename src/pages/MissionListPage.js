import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { listMissions, deleteMission } from '../api/missions';
import { listUsers } from '../api/users';
import MissionFilters from '../components/MissionFilters';
import MissionTable from '../components/MissionTable';

const ASSIGNABLE_ROLES = ['GESTIONNAIRE', 'AGENT'];

const MissionListPage = () => {
  const { token, isManager } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [filters, setFilters] = useState({});
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchMissions = async () => {
      const normalizedFilters = { ...filters };
      if (normalizedFilters.keyword !== undefined && normalizedFilters.keyword !== null) {
        const trimmedKeyword = normalizedFilters.keyword.trim();
        if (!trimmedKeyword) {
          delete normalizedFilters.keyword;
        } else if (trimmedKeyword.length < 3) {
          if (active) {
            setError('Entrez au moins 3 caracteres pour la recherche.');
            setLoading(false);
          }
          return;
        } else {
          normalizedFilters.keyword = trimmedKeyword;
        }
      }

      setLoading(true);
      setError('');
      try {
        const data = await listMissions(token, normalizedFilters);
        if (!active) return;
        setMissions(data.missions || []);
        setStatuses(data.statuses || []);
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Impossible de charger les missions');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchMissions();
    return () => {
      active = false;
    };
  }, [token, filters]);

  useEffect(() => {
    if (!isManager) {
      return;
    }
    let active = true;
    const fetchAssignees = async () => {
      try {
        const data = await listUsers(token);
        if (!active) return;
        setAssignees(data.filter((user) => ASSIGNABLE_ROLES.includes(user.role)));
      } catch (err) {
        if (!active) return;
        console.error(err);
      }
    };
    fetchAssignees();
    return () => {
      active = false;
    };
  }, [token, isManager]);

  const handleFilterChange = (nextFilters) => {
    setFilters(nextFilters);
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  const handleViewMission = (id) => {
    navigate(`/missions/${id}`);
  };

  const handleEditMission = (id) => {
    navigate(`/missions/${id}/edit`);
  };

  const handleDeleteMission = async (missionId) => {
    if (!missionId) {
      return;
    }
    const confirmed = window.confirm(`Supprimer la mission #${missionId} ?`);
    if (!confirmed) {
      return;
    }

    setError('');
    setDeletingId(missionId);
    try {
      await deleteMission(token, missionId);
      setMissions((prev) => prev.filter((mission) => mission.id !== missionId));
    } catch (err) {
      setError(err.message || 'Suppression impossible');
    } finally {
      setDeletingId(null);
    }
  };

  const lastUpdated = useMemo(() => {
    const latest = missions.reduce((acc, mission) => {
      if (!mission.updatedAt) {
        return acc;
      }
      return !acc || dayjs(mission.updatedAt).isAfter(acc) ? dayjs(mission.updatedAt) : acc;
    }, null);
    return latest ? latest.format('DD/MM/YYYY HH:mm') : null;
  }, [missions]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Liste des missions</h1>
          {lastUpdated && <p className="muted">Mise a jour: {lastUpdated}</p>}
        </div>
        {isManager && (
          <button type="button" className="btn btn-primary" onClick={() => navigate('/missions/new')}>
            Nouvelle mission
          </button>
        )}
      </div>
      <MissionFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        statuses={statuses}
        assignees={assignees}
        isManager={isManager}
      />
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="loading">Chargement...</div>
      ) : (
        <MissionTable
          missions={missions}
          onView={handleViewMission}
          onEdit={handleEditMission}
          onDelete={handleDeleteMission}
          isManager={isManager}
          deletingId={deletingId}
        />
      )}
    </div>
  );
};

export default MissionListPage;

