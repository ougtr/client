import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { listMissions, deleteMission, updateMission, updateMissionStatus } from '../api/missions';
import { listUsers } from '../api/users';
import MissionFilters from '../components/MissionFilters';
import MissionTable from '../components/MissionTable';
import ToastStack from '../components/ToastStack';
import SkeletonBlock from '../components/SkeletonBlock';
import { MISSION_STATUSES } from '../constants';

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
  const [toasts, setToasts] = useState([]);
  const [assignMission, setAssignMission] = useState(null);
  const [statusMission, setStatusMission] = useState(null);
  const [assignValue, setAssignValue] = useState('');
  const [statusValue, setStatusValue] = useState('');
  const [panelSaving, setPanelSaving] = useState(false);
  const pageSizeOptions = [10, 20, 30];
  const [pageSize, setPageSize] = useState(pageSizeOptions[0]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  const pushToast = (type, message) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

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
        if (!active) {
          return;
        }
        setMissions(data.missions || []);
        setStatuses(data.statuses || []);
        setTotalItems(typeof data.total === 'number' ? data.total : data.missions?.length || 0);
        setLastUpdated(data.latestUpdate ? dayjs(data.latestUpdate).format('DD/MM/YYYY HH:mm') : null);
        if (typeof data.page === 'number' && data.page !== page) {
          setPage(data.page);
        }
      } catch (err) {
        if (!active) {
          return;
        }
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
        if (!active) {
          return;
        }
        setAssignees(data.filter((user) => ASSIGNABLE_ROLES.includes(user.role)));
      } catch (err) {
        if (!active) {
          return;
        }
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

  const handleStatusFilter = (statut) => {
    setPage(1);
    setFilters((prev) => {
      const next = { ...prev };
      if (!statut) {
        delete next.statut;
      } else {
        next.statut = statut;
      }
      return next;
    });
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
      pushToast('success', `Mission #${missionId} supprimee.`);
    } catch (err) {
      setError(err.message || 'Suppression impossible');
      pushToast('error', err.message || 'Suppression impossible');
    } finally {
      setDeletingId(null);
    }
  };

  const openAssignPanel = (mission) => {
    setAssignMission(mission);
    setAssignValue(mission.agentId ? String(mission.agentId) : '');
  };

  const openStatusPanel = (mission) => {
    setStatusMission(mission);
    setStatusValue(mission.statut || 'cree');
  };

  const closePanels = () => {
    setAssignMission(null);
    setStatusMission(null);
    setAssignValue('');
    setStatusValue('');
    setPanelSaving(false);
  };

  const submitAssign = async () => {
    if (!assignMission) {
      return;
    }
    setPanelSaving(true);
    try {
      await updateMission(token, assignMission.id, {
        agentId: assignValue ? Number(assignValue) : null,
      });
      pushToast('success', `Mission ${assignMission.missionCode || `#${assignMission.id}`} mise a jour.`);
      closePanels();
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      pushToast('error', err.message || 'Affectation impossible');
      setPanelSaving(false);
    }
  };

  const submitStatus = async () => {
    if (!statusMission || !statusValue) {
      return;
    }
    setPanelSaving(true);
    try {
      await updateMissionStatus(token, statusMission.id, statusValue);
      pushToast('success', `Statut de la mission ${statusMission.missionCode || `#${statusMission.id}`} mis a jour.`);
      closePanels();
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      pushToast('error', err.message || 'Changement de statut impossible');
      setPanelSaving(false);
    }
  };

  const totalPages = useMemo(() => {
    if (!totalItems) {
      return 1;
    }
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }, [totalItems, pageSize]);

  const currentStart = totalItems && missions.length ? (page - 1) * pageSize + 1 : 0;
  const currentEnd = totalItems && missions.length ? Math.min(currentStart + missions.length - 1, totalItems) : 0;

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

  const missionStatusOptions = statuses.length ? statuses : MISSION_STATUSES;

  const statusCounts = useMemo(() => {
    const counts = missions.reduce((acc, mission) => {
      const key = mission.statut || 'inconnu';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return counts;
  }, [missions]);

  return (
    <div className="page">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="page-header">
        <div>
          <div className="page-breadcrumb">
            <span className="breadcrumb-chip">Missions</span>
            <span>/</span>
            <span className="breadcrumb-chip">Liste</span>
          </div>
          <h1>Liste des missions</h1>
          <div className="header-chip-list">
            {lastUpdated && <span className="header-chip">Mise a jour: {lastUpdated}</span>}
            <span className="header-chip">{totalItems} mission(s)</span>
          </div>
        </div>
        {isManager && (
          <button type="button" className="btn btn-primary" onClick={() => navigate('/missions/new')}>
            Nouvelle mission
          </button>
        )}
      </div>

      <div className="card">
        <div className="quick-filters">
          <button
            type="button"
            className={`filter-chip ${!filters.statut ? 'active' : ''}`}
            onClick={() => handleStatusFilter('')}
          >
            Tous ({missions.length})
          </button>
          {missionStatusOptions.map((statut) => (
            <button
              key={statut}
              type="button"
              className={`filter-chip ${filters.statut === statut ? 'active' : ''}`}
              onClick={() => handleStatusFilter(statut)}
            >
              {statut} ({statusCounts[statut] || 0})
            </button>
          ))}
        </div>
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
        <>
          <SkeletonBlock lines={5} />
          <SkeletonBlock lines={6} />
        </>
      ) : (
        <>
          <MissionTable
            missions={missions}
            onView={handleViewMission}
            onEdit={handleEditMission}
            onDelete={handleDeleteMission}
            onQuickAssign={isManager ? openAssignPanel : undefined}
            onQuickStatus={isManager ? openStatusPanel : undefined}
            isManager={isManager}
            deletingId={deletingId}
          />
          <div className="pagination-bar pagination-bottom">
            <div className="pagination-info">
              {totalItems ? `Affichage ${currentStart}-${currentEnd} sur ${totalItems} missions` : 'Aucune mission'}
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

      {assignMission && (
        <div className="overlay" role="presentation" onClick={closePanels}>
          <aside className="side-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>Affectation rapide</h2>
              <button type="button" className="btn btn-link" onClick={closePanels}>
                Fermer
              </button>
            </div>
            <div className="panel-body">
              <p className="muted">Mission {assignMission.missionCode || `#${assignMission.id}`}</p>
              <label className="form-field">
                <span>Responsable</span>
                <select value={assignValue} onChange={(event) => setAssignValue(event.target.value)}>
                  <option value="">Non assigne</option>
                  {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.login} ({assignee.role})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="panel-actions">
              <button type="button" className="btn btn-secondary" onClick={closePanels}>
                Annuler
              </button>
              <button type="button" className="btn btn-primary" onClick={submitAssign} disabled={panelSaving}>
                {panelSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {statusMission && (
        <div className="overlay" role="presentation" onClick={closePanels}>
          <aside className="side-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>Changer le statut</h2>
              <button type="button" className="btn btn-link" onClick={closePanels}>
                Fermer
              </button>
            </div>
            <div className="panel-body">
              <p className="muted">Mission {statusMission.missionCode || `#${statusMission.id}`}</p>
              <label className="form-field">
                <span>Statut</span>
                <select value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
                  {missionStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="panel-actions">
              <button type="button" className="btn btn-secondary" onClick={closePanels}>
                Annuler
              </button>
              <button type="button" className="btn btn-primary" onClick={submitStatus} disabled={panelSaving}>
                {panelSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default MissionListPage;