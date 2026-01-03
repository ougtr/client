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
  const pageSizeOptions = [10, 20, 30];
  const [pageSize, setPageSize] = useState(pageSizeOptions[0]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

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
        const data = await listMissions(token, { ...normalizedFilters, page, pageSize });
        if (!active) return;
        setMissions(data.missions || []);
        setStatuses(data.statuses || []);
        setTotalItems(typeof data.total === 'number' ? data.total : (data.missions?.length || 0));
        setLastUpdated(
          data.latestUpdate ? dayjs(data.latestUpdate).format('DD/MM/YYYY HH:mm') : null
        );
        if (typeof data.page === 'number' && data.page !== page) {
          setPage(data.page);
        }
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
  }, [token, filters, page, pageSize, reloadKey]);

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
    setPage(1);
    setFilters(nextFilters);
  };

  const handleResetFilters = () => {
    setPage(1);
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
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      setError(err.message || 'Suppression impossible');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = useMemo(() => {
    if (!totalItems) {
      return 1;
    }
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }, [totalItems, pageSize]);

  const currentStart = totalItems && missions.length ? (page - 1) * pageSize + 1 : 0;
  const currentEnd =
    totalItems && missions.length ? Math.min(currentStart + missions.length - 1, totalItems) : 0;

  const handlePageSizeChange = (event) => {
    setPageSize(Number(event.target.value));
    setPage(1);
  };

  const goToPreviousPage = () => {
    setPage((current) => Math.max(1, current - 1));
  };

  const goToNextPage = () => {
    setPage((current) => Math.min(totalPages, current + 1));
  };

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
        <>
          <MissionTable
            missions={missions}
            onView={handleViewMission}
            onEdit={handleEditMission}
            onDelete={handleDeleteMission}
            isManager={isManager}
            deletingId={deletingId}
          />
          <div className="pagination-bar pagination-bottom">
            <div className="pagination-info">
              {totalItems
                ? `Affichage ${currentStart}-${currentEnd} sur ${totalItems} missions`
                : 'Aucune mission'}
            </div>
            <div className="pagination-controls">
              <label className="form-field inline-field pagination-size">
                <span>Par page</span>
                <select value={pageSize} onChange={handlePageSizeChange}>
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn btn-outline pagination-btn"
                  disabled={page <= 1}
                  onClick={goToPreviousPage}
                >
                  Precedent
                </button>
                <span className="pagination-status">
                  Page {totalItems ? page : 0} / {totalItems ? totalPages : 0}
                </span>
                <button
                  type="button"
                  className="btn btn-outline pagination-btn"
                  disabled={page >= totalPages || !totalItems}
                  onClick={goToNextPage}
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MissionListPage;

