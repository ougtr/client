import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import {
  getMission,
  updateMissionStatus,
  uploadMissionPhotos,
  deleteMissionPhoto,
  uploadMissionDocuments,
  deleteMissionDocument,
} from '../api/missions';
import PhotoGallery from '../components/PhotoGallery';
import DocumentList from '../components/DocumentList';
import StatusBadge from '../components/StatusBadge';
import { MISSION_STATUSES, PHOTO_LABELS } from '../constants';

const formatStatusLabel = (status) => status.replace(/_/g, ' ');

const formatCirculationDate = (value) => {
  if (!value) {
    return null;
  }
  const trimmed = String(value).trim();
  const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    return trimmed;
  }
  if (/^\d{4}$/.test(trimmed)) {
    return `01/01/${trimmed}`;
  }
  const parsed = dayjs(trimmed);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : trimmed;
};

const MissionDetailPage = () => {
  const { token, isManager, isAgent, user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [mission, setMission] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [availableLabels, setAvailableLabels] = useState(PHOTO_LABELS);
  const [labelSearch, setLabelSearch] = useState('');
  const [photoLabel, setPhotoLabel] = useState(PHOTO_LABELS[0] || '');
  const [uploadPhase, setUploadPhase] = useState('avant');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [photoActionError, setPhotoActionError] = useState('');
  const [documentActionError, setDocumentActionError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);

  const filteredLabels = useMemo(() => {
    const query = labelSearch.trim().toLowerCase();
    if (!query) {
      return availableLabels;
    }
    return availableLabels.filter((label) => label.toLowerCase().includes(query));
  }, [availableLabels, labelSearch]);

  useEffect(() => {
    if (filteredLabels.length === 0) {
      return;
    }
    setPhotoLabel((current) => (filteredLabels.includes(current) ? current : filteredLabels[0]));
  }, [filteredLabels]);

  const fetchMission = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMission(token, id);
      setMission(data.mission);
      setPhotos(data.photos || []);
      setDocuments(data.documents || []);
      if (Array.isArray(data.photoLabels) && data.photoLabels.length) {
        setAvailableLabels(data.photoLabels);
      }
    } catch (err) {
      setError(err.message || 'Impossible de charger la mission');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const allowedStatuses = useMemo(() => {
    if (!mission) {
      return [];
    }
    const currentIndex = MISSION_STATUSES.indexOf(mission.statut);
    if (currentIndex === -1) {
      return [];
    }
    return MISSION_STATUSES.filter((status, index) => {
      if (index < currentIndex) {
        return false;
      }
      if (!isManager && status === 'terminee') {
        return false;
      }
      return true;
    });
  }, [mission, isManager]);

  const canManageAttachments = useMemo(() => {
    if (isManager) {
      return true;
    }
    if (!mission || !isAgent) {
      return false;
    }
    return mission.agentId === user?.id;
  }, [isManager, isAgent, mission, user]);

  const handleStatusChange = async (statut) => {
    if (!mission || statut === mission.statut) {
      return;
    }
    setStatusError('');
    setStatusUpdating(true);
    try {
      const updated = await updateMissionStatus(token, id, statut);
      setMission(updated);
    } catch (err) {
      setStatusError(err.message || 'Mise a jour impossible');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleUploadPhotos = async (event) => {
    event.preventDefault();
    setPhotoActionError('');
    const files = Array.from(event.target.photos.files || []);
    if (!files.length) {
      setPhotoActionError('Selectionnez au moins une photo');
      return;
    }

    if (!availableLabels.includes(photoLabel)) {
      setPhotoActionError('Veuillez choisir un libelle valide');
      return;
    }

    setUploading(true);
    try {
      const response = await uploadMissionPhotos(token, id, files, {
        phase: uploadPhase,
        label: photoLabel,
      });
      setPhotos(response.photos || []);
      setMission(response.mission || mission);
      event.target.reset();
      setUploadPhase('avant');
      setLabelSearch('');
      setPhotoLabel(availableLabels[0] || '');
    } catch (err) {
      setPhotoActionError(err.message || 'Echec de lenvoi');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photo) => {
    setPhotoActionError('');
    try {
      const response = await deleteMissionPhoto(token, id, photo.id);
      setPhotos(response.photos || []);
      setMission(response.mission || mission);
    } catch (err) {
      setPhotoActionError(err.message || 'Suppression impossible');
      throw err;
    }
  };

  const handleUploadDocuments = async (event) => {
    event.preventDefault();
    setDocumentActionError('');
    const files = Array.from(event.target.documents.files || []);
    if (!files.length) {
      setDocumentActionError('Selectionnez au moins un document');
      return;
    }

    setDocumentUploading(true);
    try {
      const response = await uploadMissionDocuments(token, id, files);
      setDocuments(response.documents || []);
      setMission(response.mission || mission);
      event.target.reset();
    } catch (err) {
      setDocumentActionError(err.message || 'Import impossible');
    } finally {
      setDocumentUploading(false);
    }
  };

  const handleDeleteDocument = async (document) => {
    setDocumentActionError('');
    try {
      const response = await deleteMissionDocument(token, id, document.id);
      setDocuments(response.documents || []);
      setMission(response.mission || mission);
    } catch (err) {
      setDocumentActionError(err.message || 'Suppression impossible');
      throw err;
    }
  };

  const canSubmitUpload = filteredLabels.length > 0 && !uploading;

  const photosAvant = useMemo(
    () => photos.filter((photo) => (photo.phase || 'avant') === 'avant'),
    [photos]
  );

  const photosApres = useMemo(
    () => photos.filter((photo) => (photo.phase || 'avant') === 'apres'),
    [photos]
  );

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
          Retour
        </button>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="page">
        <p>Mission introuvable.</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/missions')}>
          Retour a la liste
        </button>
      </div>
    );
  }

  const infoItem = (label, value) => (
    <div className="info-item">
      <span className="info-label">{label}</span>
      <span className="info-value">{value || 'Non renseigne'}</span>
    </div>
  );

  return (
    <div className="page mission-detail">
      <div className="page-header">
        <div>
          <button type="button" className="btn btn-link" onClick={() => navigate('/missions')}>
            Retour aux missions
          </button>
          <h1>Mission #{mission.id}</h1>
          <p className="muted">
            Derniere mise a jour {mission.updatedAt ? dayjs(mission.updatedAt).format('DD/MM/YYYY HH:mm') : 'N/A'}
          </p>
        </div>
        <div className="status-panel">
          <StatusBadge statut={mission.statut} />
          {isManager && (
            <button type="button" className="btn btn-primary" onClick={() => navigate(`/missions/${mission.id}/edit`)}>
              Modifier
            </button>
          )}
        </div>
      </div>

      <section className="card">
        <h2>Informations principales</h2>
        <div className="info-grid">
          {infoItem('Assureur', mission.assureurNom)}
          {infoItem('Contact assureur', mission.assureurContact)}
          {infoItem("Agence d'assurance", mission.assureurAgenceNom)}
          {infoItem('Contact agence', mission.assureurAgenceContact)}
          {infoItem('Adresse agence', mission.assureurAgenceAdresse)}
          {infoItem('Assure', mission.assureNom)}
          {infoItem('Telephone assure', mission.assureTelephone)}
          {infoItem('Email assure', mission.assureEmail)}
          {infoItem('Responsable', mission.agentLogin || 'Non assigne')}
        </div>
      </section>

      <section className="card">
        <h2>Vehicule</h2>
        <div className="info-grid">
          {infoItem('Marque', mission.vehiculeMarque)}
          {infoItem('Modele', mission.vehiculeModele)}
          {infoItem('Immatriculation', mission.vehiculeImmatriculation)}
          {infoItem(
            'Date de mise en circulation',
            mission.vehiculeAnnee ? formatCirculationDate(mission.vehiculeAnnee) : null
          )}
        </div>
      </section>

      <section className="card">
        <h2>Sinistre</h2>
        <div className="info-grid">
          {infoItem('Code sinistre', mission.sinistreType)}
          {infoItem('Police', mission.sinistrePolice)}
          {infoItem('Circonstances', mission.sinistreCirconstances)}
          {infoItem('Date', mission.sinistreDate ? dayjs(mission.sinistreDate).format('DD/MM/YYYY') : null)}
        </div>
      </section>

      <section className="card">
        <h2>Garage</h2>
        <div className="info-grid">
          {infoItem('Nom', mission.garageNom)}
          {infoItem('Adresse', mission.garageAdresse)}
          {infoItem('Contact', mission.garageContact)}
        </div>
      </section>

      <section className="card">
        <h2>Statut</h2>
        <div className="assignment-summary">
          <span>Responsable actuel : <strong>{mission.agentLogin || 'Non assigne'}</strong></span>
        </div>
        {statusError && <div className="alert alert-error">{statusError}</div>}
        <div className="status-actions">
          {allowedStatuses.map((status) => (
            <button
              key={status}
              type="button"
              className={`btn ${status === mission.statut ? 'btn-secondary' : 'btn-outline'}`}
              disabled={statusUpdating || status === mission.statut}
              onClick={() => handleStatusChange(status)}
            >
              {formatStatusLabel(status)}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Photos</h2>
        {photoActionError && <div className="alert alert-error">{photoActionError}</div>}
        {canManageAttachments ? (
          <form className="upload-form" onSubmit={handleUploadPhotos}>
            <div className="upload-fields photo-upload-grid">
              <label className="form-field">
                <span>Phase</span>
                <select value={uploadPhase} onChange={(event) => setUploadPhase(event.target.value)}>
                  <option value="avant">Avant</option>
                  <option value="apres">Apres</option>
                </select>
              </label>
              <label className="form-field">
                <span>Rechercher un libelle</span>
                <input
                  type="text"
                  value={labelSearch}
                  onChange={(event) => setLabelSearch(event.target.value)}
                  placeholder="Filtrer les libelles..."
                />
              </label>
              <label className="form-field">
                <span>Libelle</span>
                <select
                  name="photoLabel"
                  value={filteredLabels.includes(photoLabel) ? photoLabel : ''}
                  onChange={(event) => setPhotoLabel(event.target.value)}
                  required
                >
                  {filteredLabels.length > 0 ? (
                    filteredLabels.map((labelOption) => (
                      <option key={labelOption} value={labelOption}>
                        {labelOption}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      Aucun libelle disponible
                    </option>
                  )}
                </select>
                {filteredLabels.length === 0 && (
                  <small className="muted">Aucun libelle ne correspond a votre recherche.</small>
                )}
              </label>
              <label className="form-field file-field">
                <span>Ajouter des photos</span>
                <input name="photos" type="file" multiple accept="image/*" />
              </label>
              <div className="upload-submit">
                <button type="submit" className="btn btn-primary" disabled={!canSubmitUpload}>
                  {uploading ? 'Envoi...' : 'Importer'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <p className="muted">Seule la personne assignee (agent ou gestionnaire) ou un gestionnaire peut ajouter des photos.</p>
        )}
        <div className="photo-phase-grid">
          <div className="photo-phase-card">
            <div className="photo-phase-header">
              <h3>Phase &laquo; Avant &raquo;</h3>
              <span className="muted">{photosAvant.length} fichier(s)</span>
            </div>
            <PhotoGallery
              photos={photosAvant}
              canDelete={canManageAttachments}
              onDelete={canManageAttachments ? handleDeletePhoto : undefined}
            />
          </div>
          <div className="photo-phase-card">
            <div className="photo-phase-header">
              <h3>Phase &laquo; Apres &raquo;</h3>
              <span className="muted">{photosApres.length} fichier(s)</span>
            </div>
            <PhotoGallery
              photos={photosApres}
              canDelete={canManageAttachments}
              onDelete={canManageAttachments ? handleDeletePhoto : undefined}
            />
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Documents</h2>
        {documentActionError && <div className="alert alert-error">{documentActionError}</div>}
        {canManageAttachments ? (
          <form className="upload-form" onSubmit={handleUploadDocuments}>
            <div className="upload-fields document-upload-grid">
              <label className="form-field file-field">
                <span>Ajouter des documents</span>
                <input name="documents" type="file" multiple accept=".pdf,.doc,.docx,.txt" />
                <small className="muted">Formats acceptes : PDF, DOC, DOCX ou TXT.</small>
              </label>
              <div className="upload-submit">
                <button type="submit" className="btn btn-primary" disabled={documentUploading}>
                  {documentUploading ? 'Envoi...' : 'Importer'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <p className="muted">
            Seule la personne assignee (agent ou gestionnaire) ou un gestionnaire peut ajouter des documents.
          </p>
        )}
        <DocumentList
          documents={documents}
          canDelete={canManageAttachments}
          onDelete={canManageAttachments ? handleDeleteDocument : undefined}
        />
      </section>
    </div>
  );
};

export default MissionDetailPage;



