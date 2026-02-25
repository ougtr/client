import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../api/http';
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
import { MISSION_STATUSES, PHOTO_LABELS, DAMAGE_TYPE_OPTIONS } from '../constants';
import ToastStack from '../components/ToastStack';
import SkeletonBlock from '../components/SkeletonBlock';

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

const ENERGY_LABELS = {
  diesel: 'Diesel',
  essence: 'Essence',
  electrique: 'Electrique',
  hybride: 'Hybride',
};

const REFORME_LABELS = {
  economique: 'Economique',
  technique: 'Technique',
};

const DAMAGE_TYPE_LABELS = DAMAGE_TYPE_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const formatKilometrage = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numberValue = Number(value);
  const displayValue = Number.isFinite(numberValue)
    ? numberValue.toLocaleString('fr-FR')
    : value;
  return `${displayValue} km`;
};

const formatEnergyLabel = (value) => {
  if (!value) {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  return ENERGY_LABELS[normalized] || value;
};

const GUARANTEE_LABELS = {
  'dommage collision': 'Dommage collision',
  tierce: 'Tierce',
  rc: 'RC',
};

const guaranteeRequiresFranchise = (value) => {
  if (!value) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'dommage collision' || normalized === 'tierce';
};

const formatGuaranteeType = (value) => {
  if (!value) {
    return '-';
  }
  const normalized = String(value).trim().toLowerCase();
  return GUARANTEE_LABELS[normalized] || value;
};

const formatFranchiseRate = (value) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const num = Number(value);
  const display = Number.isFinite(num) ? num.toFixed(2).replace(/\.00$/, '') : value;
  return `${display} %`;
};

const formatFranchiseAmount = (value) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const num = Number(value);
  const display = Number.isFinite(num) ? num.toFixed(2) : value;
  return `${display} MAD`;
};

const formatResponsabilite = (value) => {
  if (!value) {
    return '-';
  }
  return value;
};

const formatCurrencyValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const num = Number(value);
  const display = Number.isFinite(num) ? `${num.toFixed(2)} MAD` : `${value} MAD`;
  return display;
};

const formatReforme = (value) => {
  if (!value) {
    return '-';
  }
  const normalized = String(value).trim().toLowerCase();
  return REFORME_LABELS[normalized] || value;
};

const formatDamageTypeLabel = (value) => {
  if (!value) {
    return '-';
  }
  const normalized = String(value).trim().toLowerCase();
  return DAMAGE_TYPE_LABELS[normalized] || value;
};

const DEFAULT_DAMAGE_TOTALS = {
  totalHt: 0,
  totalTtc: 0,
  totalAfter: 0,
  totalAfterTtc: 0,
};

const DEFAULT_LABOR_TOTALS = {
  totalHours: 0,
  totalHt: 0,
  totalTva: 0,
  totalTtc: 0,
  suppliesHt: 0,
  suppliesTtc: 0,
  grandTotalHt: 0,
  grandTotalTtc: 0,
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
  const [exporting, setExporting] = useState(false);
  const [damages, setDamages] = useState([]);
  const [damageTotals, setDamageTotals] = useState(DEFAULT_DAMAGE_TOTALS);
  const [labors, setLabors] = useState([]);
  const [laborTotals, setLaborTotals] = useState(DEFAULT_LABOR_TOTALS);
  const [toasts, setToasts] = useState([]);

  const pushToast = (type, message) => {
    const toastId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
  };

  const dismissToast = (toastId) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  };

  const damageVetusteLoss = Math.max(0, damageTotals.totalTtc - damageTotals.totalAfterTtc);
  const missionLabel = mission?.missionCode ? mission.missionCode : mission ? `#${mission.id}` : '#';
  const totalEvaluationTtc = laborTotals.grandTotalTtc || 0;
  const netEvaluationTtc = Math.max(0, totalEvaluationTtc - damageVetusteLoss);
  const { missionFranchiseAmount, missionRecommendedIndemnisation } = useMemo(() => {
    if (!mission) {
      return { missionFranchiseAmount: 0, missionRecommendedIndemnisation: 0 };
    }
    const rate = Number(mission.garantieFranchiseTaux) || 0;
    const fixed = Number(mission.garantieFranchiseMontant) || 0;
    const percentValue = (rate / 100) * totalEvaluationTtc;
    const franchise = Math.max(percentValue, fixed);
    return {
      missionFranchiseAmount: franchise,
      missionRecommendedIndemnisation: Math.max(0, netEvaluationTtc - franchise),
    };
  }, [mission, totalEvaluationTtc, netEvaluationTtc]);
  const displayedIndemnisation =
    mission && mission.indemnisationFinale !== null && mission.indemnisationFinale !== undefined
      ? Number(mission.indemnisationFinale)
      : missionRecommendedIndemnisation;

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
      setDamages(data.damages || []);
      setDamageTotals(data.damageTotals || DEFAULT_DAMAGE_TOTALS);
      setLabors(data.labors || []);
      setLaborTotals(data.laborTotals || DEFAULT_LABOR_TOTALS);
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
      pushToast('success', 'Statut mis a jour.');
    } catch (err) {
      setStatusError(err.message || 'Mise a jour impossible');
      pushToast('error', err.message || 'Mise a jour impossible');
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
      pushToast('success', 'Photos importees.');
    } catch (err) {
      setPhotoActionError(err.message || 'Echec de lenvoi');
      pushToast('error', err.message || 'Echec de lenvoi');
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
      pushToast('success', 'Photo supprimee.');
    } catch (err) {
      setPhotoActionError(err.message || 'Suppression impossible');
      pushToast('error', err.message || 'Suppression impossible');
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
      pushToast('success', 'Documents importes.');
    } catch (err) {
      setDocumentActionError(err.message || 'Import impossible');
      pushToast('error', err.message || 'Import impossible');
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
      pushToast('success', 'Document supprime.');
    } catch (err) {
      setDocumentActionError(err.message || 'Suppression impossible');
      pushToast('error', err.message || 'Suppression impossible');
      throw err;
    }
  };

  const handleExportReport = async () => {
    if (!id) {
      return;
    }
    setError('');
    setExporting(true);
    try {
      const response = await fetch(`${API_URL}/missions/${id}/report`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Export impossible');
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `rapport-mission-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      pushToast('success', 'Export PDF termine.');
    } catch (err) {
      setError(err.message || 'Export impossible');
      pushToast('error', err.message || 'Export impossible');
    } finally {
      setExporting(false);
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
        <SkeletonBlock lines={8} />
        <SkeletonBlock lines={6} />
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
      <span className="info-value">{value || '-'}</span>
    </div>
  );

  return (
    <div className="page mission-detail">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <div className="page-header">
        <div>
          <div className="page-breadcrumb">
            <button type="button" className="btn btn-link" onClick={() => navigate('/missions')}>
              Missions
            </button>
            <span>/</span>
            <span className="breadcrumb-chip">Mission {missionLabel}</span>
          </div>
          <h1>Mission {missionLabel}</h1>
          <div className="header-chip-list">
            <span className="header-chip">
              Derniere mise a jour {mission.updatedAt ? dayjs(mission.updatedAt).format('DD/MM/YYYY HH:mm') : 'N/A'}
            </span>
            <span className="header-chip">Immatriculation: {mission.vehiculeImmatriculation || '-'}</span>
          </div>
        </div>
        <div className="status-panel">
          <StatusBadge statut={mission.statut} />
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleExportReport}
            disabled={exporting}
          >
            {exporting ? 'Export...' : 'Export PDF'}
          </button>
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
          {infoItem('Numero de chassis (VIN)', mission.vehiculeVin)}
          {infoItem('Kilometrage', formatKilometrage(mission.vehiculeKilometrage))}
          {infoItem('Puissance fiscale', mission.vehiculePuissanceFiscale)}
          {infoItem('Energie', formatEnergyLabel(mission.vehiculeEnergie))}
        </div>
      </section>

      <section className="card">
        <h2>Sinistre</h2>
        <div className="info-grid">
          {infoItem('Code sinistre', mission.sinistreType)}
          {infoItem('Police', mission.sinistrePolice)}
          {infoItem('Police vehicule adversaire', mission.sinistrePoliceAdverse)}
          {infoItem('Compagnie adverse', mission.assureurAdverseNom)}
          {infoItem('Nom & prenom adverse', mission.sinistreNomAdverse)}
          {infoItem('Immatriculation adverse', mission.sinistreImmatriculationAdverse)}
          {infoItem('Circonstances', mission.sinistreCirconstances)}
          {infoItem('Date', mission.sinistreDate ? dayjs(mission.sinistreDate).format('DD/MM/YYYY') : null)}
        </div>
      </section>

      <section className="card">
        <h2>Description des dommages</h2>
        {damages.length ? (
          <>
            <div className="table-wrapper damage-table">
              <table>
                <thead>
                  <tr>
                    <th>Piece</th>
                    <th>Type</th>
                    <th>Prix HT</th>
                    <th>Vetuste</th>
                    <th>Apres vetuste</th>
                    <th>TVA</th>
                    <th>Prix TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {damages.map((damage) => {
                    const withVat = damage.withVat !== false;
                    const priceTtc =
                      damage.priceTtc !== undefined ? damage.priceTtc : damage.priceHt * (withVat ? 1.2 : 1);
                    return (
                      <tr key={damage.id}>
                        <td>{damage.piece}</td>
                        <td>{formatDamageTypeLabel(damage.pieceType)}</td>
                        <td>{damage.priceHt.toFixed(2)} MAD</td>
                        <td>{damage.vetuste.toFixed(0)}%</td>
                        <td>{damage.priceAfter.toFixed(2)} MAD</td>
                        <td>{withVat ? 'Oui' : 'Non'}</td>
                        <td>{priceTtc.toFixed(2)} MAD</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="damage-totals">
              <div>
                <strong>Total HT :</strong> {damageTotals.totalHt.toFixed(2)} MAD
              </div>
              <div>
                <strong>Total TTC :</strong> {damageTotals.totalTtc.toFixed(2)} MAD
              </div>
              <div>
                <strong>Apres vetuste HT :</strong> {damageTotals.totalAfter.toFixed(2)} MAD
              </div>
              <div>
                <strong>Apres vetuste TTC :</strong> {damageTotals.totalAfterTtc.toFixed(2)} MAD
              </div>
            </div>
          </>
        ) : (
          <p className="muted">Aucun dommage enregistre pour cette mission.</p>
        )}
      </section>

      <section className="card">
        <h2>Synthese</h2>
        {mission?.synthese ? (
          <p>{mission.synthese}</p>
        ) : (
          <p className="muted">Aucune synthese saisie pour cette mission.</p>
        )}
      </section>

      <section className="card">
        <h2>Évaluation de la remise en état</h2>
        {labors.length ? (
          <>
            <div className="table-wrapper damage-table">
              <table>
                <thead>
                  <tr>
                    <th>Main d'œuvre</th>
                    <th>Nombre d'heures</th>
                    <th>Taux horaire</th>
                    <th>Hors taxe</th>
                    <th>T.V.A</th>
                    <th>Total TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {labors.map((labor) => (
                    <tr key={labor.category}>
                      <td>{labor.label}</td>
                      <td>{labor.hours.toFixed(2)}</td>
                      <td>{labor.rate.toFixed(2)} MAD</td>
                      <td>{labor.horsTaxe.toFixed(2)} MAD</td>
                      <td>{labor.tva.toFixed(2)} MAD</td>
                      <td>{labor.ttc.toFixed(2)} MAD</td>
                    </tr>
                  ))}
                  <tr>
                    <td>Fournitures</td>
                    <td>-</td>
                    <td>-</td>
                    <td>{laborTotals.suppliesHt.toFixed(2)} MAD</td>
                    <td>{Math.max(0, (laborTotals.suppliesTtc || 0) - (laborTotals.suppliesHt || 0)).toFixed(2)} MAD</td>
                    <td>{(laborTotals.suppliesTtc || 0).toFixed(2)} MAD</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="damage-totals">
              <div>
                <strong>Total main d'œuvre HT :</strong> {laborTotals.totalHt.toFixed(2)} MAD
              </div>
              <div>
                <strong>Total main d'œuvre TTC :</strong> {laborTotals.totalTtc.toFixed(2)} MAD
              </div>
              <div>
                <strong>Fournitures HT :</strong> {laborTotals.suppliesHt.toFixed(2)} MAD
              </div>
              <div>
                <strong>Fournitures TTC :</strong> {laborTotals.suppliesTtc.toFixed(2)} MAD
              </div>
              <div>
                <strong>Montant total TTC :</strong> {laborTotals.grandTotalTtc.toFixed(2)} MAD
              </div>
              <div>
                <strong>Montant TTC après vétusté :</strong> {netEvaluationTtc.toFixed(2)} MAD
              </div>
              <div>
                <strong>Vétusté TTC :</strong> {damageVetusteLoss.toFixed(2)} MAD
              </div>
              {guaranteeRequiresFranchise(mission.garantieType) && (
                <div>
                  <strong>Franchise calculé :</strong> {missionFranchiseAmount.toFixed(2)} MAD
                </div>
              )}
              <div>
                <strong>Montant final indemnisation :</strong>{' '}
                {mission ? `${displayedIndemnisation.toFixed(2)} MAD` : '-'}
              </div>
            </div>
            <div className="info-inline-list">
              <div className="info-inline-item">
                <span className="info-inline-label">Type de garantie :</span>
                <span className="info-inline-value">{formatGuaranteeType(mission.garantieType)}</span>
              </div>
              {guaranteeRequiresFranchise(mission.garantieType) && (
                <>
                  <div className="info-inline-item">
                    <span className="info-inline-label">Taux franchise :</span>
                    <span className="info-inline-value">{formatFranchiseRate(mission.garantieFranchiseTaux)}</span>
                  </div>
                  <div className="info-inline-item">
                    <span className="info-inline-label">Franchise (MAD) :</span>
                    <span className="info-inline-value">
                      {formatFranchiseAmount(mission.garantieFranchiseMontant)}
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="info-grid">
              {infoItem('Responsabilite', formatResponsabilite(mission.responsabilite))}
            </div>
            <div className="info-grid">
              {infoItem('Reforme', formatReforme(mission.reformeType))}
              {infoItem('Valeur assuree', formatCurrencyValue(mission.valeurAssuree))}
              {infoItem('Valeur venale', formatCurrencyValue(mission.valeurVenale))}
              {infoItem('Valeur epaves', formatCurrencyValue(mission.valeurEpaves))}
            </div>
          </>
        ) : (
          <p className="muted">Pas d'information de main d'œuvre disponible.</p>
        )}
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
      <div className="floating-action-spacer" />
      <div className="floating-action-bar">
        <button type="button" className="btn btn-outline" onClick={() => navigate('/missions')}>
          Retour
        </button>
        <button type="button" className="btn btn-primary" onClick={handleExportReport} disabled={exporting}>
          {exporting ? 'Export...' : 'Export PDF'}
        </button>
        {isManager && (
          <button type="button" className="btn btn-secondary" onClick={() => navigate(`/missions/${mission.id}/edit`)}>
            Modifier
          </button>
        )}
      </div>
    </div>
  );
};

export default MissionDetailPage;




