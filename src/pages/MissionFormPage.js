import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createMission, getMission, updateMission } from '../api/missions';
import { listUsers } from '../api/users';
import { listInsurers } from '../api/insurers';
import { listAgencies } from '../api/insurerAgencies';
import { listVehicleBrands } from '../api/vehicleBrands';
import { listGarages } from '../api/garages';
import { MISSION_STATUSES } from '../constants';

const emptyForm = {
  assureurId: '',
  assureurAgenceId: '',
  vehiculeMarqueId: '',
  vehiculeMarque: '',
  assureNom: '',
  assureTelephone: '',
  assureEmail: '',
  vehiculeModele: '',
  vehiculeImmatriculation: '',
  vehiculeAnnee: '',
  sinistreType: '',
  sinistreCirconstances: '',
  sinistreDate: '',
  sinistrePolice: '',
  garageId: '',
  agentId: '',
  statut: 'cree',
};

const ASSIGNABLE_ROLES = ['GESTIONNAIRE', 'AGENT'];
const ROLE_LABELS = {
  GESTIONNAIRE: 'Gestionnaire',
  AGENT: 'Agent',
};

const MissionFormPage = ({ mode }) => {
  const isEdit = mode === 'edit';
  const { token, isManager } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [assignees, setAssignees] = useState([]);
  const [insurers, setInsurers] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [brands, setBrands] = useState([]);
  const [garages, setGarages] = useState([]);
  const [referenceLoading, setReferenceLoading] = useState(isManager);
  const [legacyGarage, setLegacyGarage] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const hasInsurers = insurers.length > 0;
  const hasBrands = brands.length > 0;
  const hasGarages = garages.length > 0;
  const selectedInsurer = useMemo(
    () => insurers.find((insurer) => String(insurer.id) === String(form.assureurId)),
    [insurers, form.assureurId]
  );
  const agenciesForInsurer = useMemo(() => {
    if (!form.assureurId) {
      return [];
    }
    return agencies.filter((agency) => String(agency.insurerId) === String(form.assureurId));
  }, [agencies, form.assureurId]);
  const selectedAgency = useMemo(
    () => agencies.find((agency) => String(agency.id) === String(form.assureurAgenceId)),
    [agencies, form.assureurAgenceId]
  );
  const selectedGarage = useMemo(
    () => garages.find((garage) => String(garage.id) === String(form.garageId)),
    [garages, form.garageId]
  );

  useEffect(() => {
    if (!isManager) {
      return;
    }

    let cancelled = false;

    const loadReferenceData = async () => {
      setReferenceLoading(true);
      try {
        const [usersData, insurersData, agenciesData, brandsData, garagesData] = await Promise.all([
          listUsers(token),
          listInsurers(token),
          listAgencies(token),
          listVehicleBrands(token),
          listGarages(token),
        ]);
        if (cancelled) {
          return;
        }
        setAssignees(usersData.filter((user) => ASSIGNABLE_ROLES.includes(user.role)));
        setInsurers(insurersData);
        setAgencies(agenciesData);
        setBrands(brandsData);
        setGarages(garagesData);
      } catch (err) {
        if (!cancelled) {
          console.error('Chargement des referentiels impossible', err);
        }
      }
    };

    loadReferenceData();

    return () => {
      cancelled = true;
    };
  }, [isManager, token]);

  useEffect(() => {
    if (!isEdit || !id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadMission = async () => {
      setLoading(true);
      try {
        const data = await getMission(token, id);
        if (cancelled) {
          return;
        }
        const mission = data.mission;
        setForm({
          assureurId: mission.assureurId ? String(mission.assureurId) : '',
          assureurAgenceId: mission.assureurAgenceId ? String(mission.assureurAgenceId) : '',
          vehiculeMarqueId: mission.vehiculeMarqueId ? String(mission.vehiculeMarqueId) : '',
          vehiculeMarque: mission.vehiculeMarque || '',
          assureNom: mission.assureNom || '',
          assureTelephone: mission.assureTelephone || '',
          assureEmail: mission.assureEmail || '',
          vehiculeModele: mission.vehiculeModele || '',
          vehiculeImmatriculation: mission.vehiculeImmatriculation || '',
          vehiculeAnnee: mission.vehiculeAnnee ? String(mission.vehiculeAnnee) : '',
          sinistreType: mission.sinistreType || '',
          sinistreCirconstances: mission.sinistreCirconstances || '',
          sinistreDate: mission.sinistreDate || '',
          sinistrePolice: mission.sinistrePolice || '',
          garageId: mission.garageId ? String(mission.garageId) : '',
          agentId: mission.agentId ? String(mission.agentId) : '',
          statut: mission.statut,
        });
        setLegacyGarage(
          mission.garageId
            ? null
            : mission.garageNom || mission.garageAdresse || mission.garageContact
            ? {
                nom: mission.garageNom || '',
                adresse: mission.garageAdresse || '',
                contact: mission.garageContact || '',
              }
            : null
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Impossible de charger la mission');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadMission();

    return () => {
      cancelled = true;
    };
  }, [isEdit, id, token]);

  useEffect(() => {
    if (!insurers.length) {
      setForm((prev) => ({ ...prev, assureurId: '' }));
      return;
    }
    setForm((prev) => {
      if (!prev.assureurId) {
        return prev;
      }
      const exists = insurers.some((insurer) => String(insurer.id) === String(prev.assureurId));
      if (!exists) {
        return { ...prev, assureurId: '' };
      }
      return prev;
    });
  }, [insurers]);

  useEffect(() => {
    if (!brands.length) {
      setForm((prev) => ({ ...prev, vehiculeMarqueId: '', vehiculeMarque: '' }));
      return;
    }

    setForm((prev) => {
      if (!prev.vehiculeMarqueId) {
        return prev;
      }
      const match = brands.find((brand) => String(brand.id) === String(prev.vehiculeMarqueId));
      if (match && prev.vehiculeMarque !== match.nom) {
        return { ...prev, vehiculeMarque: match.nom };
      }
      return prev;
    });
  }, [brands]);

  useEffect(() => {
    if (!garages.length) {
      setForm((prev) => ({ ...prev, garageId: '' }));
      return;
    }
    setForm((prev) => {
      if (!prev.garageId) {
        return prev;
      }
      const exists = garages.some((garage) => String(garage.id) === String(prev.garageId));
      if (!exists) {
        return { ...prev, garageId: '' };
      }
      return prev;
    });
  }, [garages]);

  useEffect(() => {
    if (!isEdit && hasInsurers && !form.assureurId) {
      const first = insurers[0];
      setForm((prev) => ({
        ...prev,
        assureurId: String(first.id),
      }));
    }
  }, [insurers, hasInsurers, isEdit, form.assureurId]);

  useEffect(() => {
    if (!form.assureurAgenceId) {
      return;
    }
    const stillValid = agenciesForInsurer.some(
      (agency) => String(agency.id) === String(form.assureurAgenceId)
    );
    if (!stillValid) {
      setForm((prev) => ({ ...prev, assureurAgenceId: '' }));
    }
  }, [agenciesForInsurer, form.assureurAgenceId]);

  useEffect(() => {
    if (!isEdit && hasBrands && !form.vehiculeMarqueId) {
      const first = brands[0];
      setForm((prev) => ({
        ...prev,
        vehiculeMarqueId: String(first.id),
        vehiculeMarque: first.nom,
      }));
    }
  }, [brands, hasBrands, isEdit, form.vehiculeMarqueId]);

  useEffect(() => {
    if (!isEdit && hasGarages && !form.garageId) {
      const first = garages[0];
      setLegacyGarage(null);
      setForm((prev) => ({
        ...prev,
        garageId: String(first.id),
      }));
    }
  }, [garages, hasGarages, isEdit, form.garageId]);

  const statusOptions = useMemo(() => MISSION_STATUSES, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAssureurChange = (event) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      assureurId: value,
      assureurAgenceId: '',
    }));
  };

  const handleBrandChange = (event) => {
    const value = event.target.value;
    const selected = brands.find((brand) => String(brand.id) === value);
    setForm((prev) => ({
      ...prev,
      vehiculeMarqueId: value,
      vehiculeMarque: selected ? selected.nom : '',
    }));
  };

  const handleGarageChange = (event) => {
    const value = event.target.value;
    setLegacyGarage(null);
    setForm((prev) => ({
      ...prev,
      garageId: value,
    }));
  };

  const handleAgencyChange = (event) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      assureurAgenceId: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasInsurers) {
      setError('Ajoutez au moins un assureur avant de creer une mission.');
      return;
    }
    if (!hasBrands) {
      setError('Ajoutez au moins une marque de vehicule avant de creer une mission.');
      return;
    }
    if (!hasGarages) {
      setError('Ajoutez au moins un garage avant de creer une mission.');
      return;
    }
    if (!form.garageId) {
      setError('Selectionnez un garage pour la mission.');
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      ...form,
      assureurId: form.assureurId ? Number(form.assureurId) : null,
      vehiculeMarqueId: form.vehiculeMarqueId ? Number(form.vehiculeMarqueId) : null,
      garageId: form.garageId ? Number(form.garageId) : null,
      vehiculeAnnee: form.vehiculeAnnee ? Number(form.vehiculeAnnee) : null,
      agentId: form.agentId ? Number(form.agentId) : null,
    };

    try {
      const response = isEdit
        ? await updateMission(token, id, payload)
        : await createMission(token, payload);
      navigate(`/missions/${response.id}`);
    } catch (err) {
      setError(err.message || 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  if (!isManager) {
    return (
      <div className="page">
        <div className="alert alert-error">Acces reserve au gestionnaire.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <button type="button" className="btn btn-link" onClick={() => navigate('/missions')}>
          Retour aux missions
        </button>
        <h1>{isEdit ? `Modifier la mission #${id}` : 'Nouvelle mission'}</h1>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card form-grid" onSubmit={handleSubmit}>
        <fieldset>
          <legend>Assureur</legend>
          {!referenceLoading && !hasInsurers && (
            <p className="alert alert-error">
              Aucun assureur disponible. Ajoutez-en depuis le menu "Assureurs" avant de creer une mission.
            </p>
          )}
          <label className="form-field required">
            <span>Assureur</span>
            <select
              name="assureurId"
              value={form.assureurId}
              onChange={handleAssureurChange}
              required
              disabled={!hasInsurers}
            >
              <option value="">Selectionner un assureur</option>
              {insurers.map((insurer) => (
                <option key={insurer.id} value={insurer.id}>
                  {insurer.nom}
                </option>
              ))}
            </select>
          </label>
          {selectedInsurer && (
            <div className="muted">
              Contact : {selectedInsurer.contact || 'Non renseigne'}
            </div>
          )}
          <label className="form-field">
            <span>Agence d'assurance</span>
            <select
              name="assureurAgenceId"
              value={form.assureurAgenceId}
              onChange={handleAgencyChange}
              disabled={!form.assureurId || agenciesForInsurer.length === 0}
            >
              <option value="">Aucune agence</option>
              {agenciesForInsurer.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.nom}
                </option>
              ))}
            </select>
            {!selectedInsurer && <small className="muted">Choisissez un assureur pour acceder aux agences.</small>}
            {selectedInsurer && agenciesForInsurer.length === 0 && (
              <small className="muted">Aucune agence configuree pour cet assureur.</small>
            )}
          </label>
          {selectedAgency && (
            <div className="muted">
              <div>Adresse agence : {selectedAgency.adresse || 'Non renseignee'}</div>
              <div>Telephone agence : {selectedAgency.telephone || 'Non renseigne'}</div>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Vehicule</legend>
          {!referenceLoading && !hasBrands && (
            <p className="alert alert-error">
              Aucune marque disponible. Ajoutez-en depuis le menu "Marques" avant de creer une mission.
            </p>
          )}
          <label className="form-field required">
            <span>Marque</span>
            <select
              name="vehiculeMarqueId"
              value={form.vehiculeMarqueId}
              onChange={handleBrandChange}
              required
              disabled={!hasBrands}
            >
              <option value="">Selectionner une marque</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Modele</span>
            <input name="vehiculeModele" value={form.vehiculeModele} onChange={handleChange} />
          </label>
          <label className="form-field">
            <span>Immatriculation</span>
            <input
              name="vehiculeImmatriculation"
              value={form.vehiculeImmatriculation}
              onChange={handleChange}
            />
          </label>
          <label className="form-field">
            <span>Annee</span>
            <input name="vehiculeAnnee" value={form.vehiculeAnnee} onChange={handleChange} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Assure</legend>
          <label className="form-field required">
            <span>Nom</span>
            <input name="assureNom" value={form.assureNom} onChange={handleChange} required />
          </label>
          <label className="form-field">
            <span>Telephone</span>
            <input name="assureTelephone" value={form.assureTelephone} onChange={handleChange} />
          </label>
          <label className="form-field">
            <span>Email</span>
            <input name="assureEmail" type="email" value={form.assureEmail} onChange={handleChange} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Sinistre</legend>
          <label className="form-field">
            <span>Code sinistre</span>
            <input name="sinistreType" value={form.sinistreType} onChange={handleChange} />
          </label>
          <label className="form-field">
            <span>Police</span>
            <input name="sinistrePolice" value={form.sinistrePolice} onChange={handleChange} />
          </label>
          <label className="form-field">
            <span>Circonstances</span>
            <textarea
              name="sinistreCirconstances"
              value={form.sinistreCirconstances}
              onChange={handleChange}
              rows={3}
            />
          </label>
          <label className="form-field">
            <span>Date</span>
            <input
              name="sinistreDate"
              type="date"
              value={form.sinistreDate || ''}
              onChange={handleChange}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>Garage</legend>
          {!referenceLoading && !hasGarages && (
            <p className="alert alert-error">
              Aucun garage disponible. Ajoutez-en depuis le menu "Garages" avant de creer une mission.
            </p>
          )}
          {isEdit && legacyGarage && !form.garageId && (
            <p className="alert alert-info">
              Garage actuel non reference
              {legacyGarage.nom ? ` (${legacyGarage.nom})` : ''}.
              Selectionnez un garage dans la liste ci-dessous pour poursuivre.
            </p>
          )}
          <label className="form-field required">
            <span>Garage</span>
            <select
              name="garageId"
              value={form.garageId}
              onChange={handleGarageChange}
              required
              disabled={!hasGarages}
            >
              <option value="">Selectionner un garage</option>
              {garages.map((garage) => (
                <option key={garage.id} value={garage.id}>
                  {garage.nom}
                </option>
              ))}
            </select>
          </label>
          {(form.garageId ? selectedGarage : legacyGarage) && (
            <div className="muted">
              <div>
                Adresse : {(form.garageId ? selectedGarage : legacyGarage).adresse || 'Non renseignee'}
              </div>
              <div>
                Contact : {(form.garageId ? selectedGarage : legacyGarage).contact || 'Non renseigne'}
              </div>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Affectation</legend>
          <label className="form-field">
            <span>Responsable</span>
            <select name="agentId" value={form.agentId} onChange={handleChange}>
              <option value="">Non assigne</option>
              {assignees.map((user) => (
                <option key={user.id} value={user.id}>
                  {`${user.login} (${ROLE_LABELS[user.role] || user.role})`}
                </option>
              ))}
            </select>
          </label>
          {isEdit && (
            <label className="form-field">
              <span>Statut</span>
              <select name="statut" value={form.statut} onChange={handleChange}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          )}
        </fieldset>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !hasInsurers || !hasBrands || !hasGarages}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

export default MissionFormPage;














