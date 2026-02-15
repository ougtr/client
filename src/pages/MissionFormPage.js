import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createMission, getMission, updateMission } from '../api/missions';
import { listUsers } from '../api/users';
import { listInsurers } from '../api/insurers';
import { listAgencies } from '../api/insurerAgencies';
import { listVehicleBrands } from '../api/vehicleBrands';
import { listGarages } from '../api/garages';
import { addDamage, updateDamage, deleteDamage } from '../api/damages';
import { saveLabors } from '../api/labors';
import { MISSION_STATUSES, DAMAGE_PARTS, LABOR_CATEGORIES } from '../constants';

const emptyForm = {
  assureurId: '',
  assureurAgenceId: '',
  assureurAdverseId: '',
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
  sinistrePoliceAdverse: '',
  garageId: '',
  agentId: '',
  statut: 'cree',
};

const ASSIGNABLE_ROLES = ['GESTIONNAIRE', 'AGENT'];
const ROLE_LABELS = {
  GESTIONNAIRE: 'Gestionnaire',
  AGENT: 'Agent',
};

const buildLaborEntries = (entries = []) => {
  const existingMap = new Map(entries.map((entry) => [entry.category, entry]));
  return LABOR_CATEGORIES.map((category) => {
    const source = existingMap.get(category.id);
    return {
      category: category.id,
      label: category.label,
      hours: source ? Number(source.hours) || 0 : 0,
      rate: source ? Number(source.rate) || 0 : 0,
    };
  });
};

const computeLaborTotals = (entries, suppliesHt) => {
  const supplies = Number(suppliesHt) || 0;
  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
  const totalHt = entries.reduce((sum, entry) => sum + entry.hours * entry.rate, 0);
  const totalTva = totalHt * 0.2;
  const totalTtc = totalHt + totalTva;
  const suppliesTva = supplies * 0.2;
  const suppliesTtc = supplies + suppliesTva;
  return {
    totalHours,
    totalHt,
    totalTva,
    totalTtc,
    suppliesHt: supplies,
    suppliesTva,
    suppliesTtc,
    grandTotalHt: totalHt + supplies,
    grandTotalTtc: totalTtc + suppliesTtc,
  };
};

const formatCirculationInputValue = (value) => {
  if (!value) {
    return '';
  }
  const trimmed = String(value).trim();
  const isoPattern = /^(\d{4})-(\d{2})-(\d{2})/;
  if (isoPattern.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month}-${day}`;
  }
  const yearMatch = trimmed.match(/^(\d{4})$/);
  if (yearMatch) {
    return `${yearMatch[1]}-01-01`;
  }
  return '';
};

const DEFAULT_DAMAGE_TOTALS = {
  totalHt: 0,
  totalTtc: 0,
  totalAfter: 0,
  totalAfterTtc: 0,
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
  const [damages, setDamages] = useState([]);
  const [damageTotals, setDamageTotals] = useState(DEFAULT_DAMAGE_TOTALS);
  const [damageForm, setDamageForm] = useState({
    id: null,
    piece: '',
    priceHt: '',
    vetuste: 0,
  });
  const [damageError, setDamageError] = useState('');
  const [damageSubmitting, setDamageSubmitting] = useState(false);
  const [labors, setLabors] = useState(buildLaborEntries());
  const [laborSupplies, setLaborSupplies] = useState(0);
  const laborTotals = useMemo(() => computeLaborTotals(labors, laborSupplies), [labors, laborSupplies]);
  const [laborError, setLaborError] = useState('');
  const [laborSaving, setLaborSaving] = useState(false);

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
          assureurAdverseId: mission.assureurAdverseId ? String(mission.assureurAdverseId) : '',
          vehiculeMarqueId: mission.vehiculeMarqueId ? String(mission.vehiculeMarqueId) : '',
          vehiculeMarque: mission.vehiculeMarque || '',
          assureNom: mission.assureNom || '',
          assureTelephone: mission.assureTelephone || '',
          assureEmail: mission.assureEmail || '',
          vehiculeModele: mission.vehiculeModele || '',
          vehiculeImmatriculation: mission.vehiculeImmatriculation || '',
          vehiculeAnnee: formatCirculationInputValue(mission.vehiculeAnnee),
          sinistreType: mission.sinistreType || '',
          sinistreCirconstances: mission.sinistreCirconstances || '',
          sinistreDate: mission.sinistreDate || '',
          sinistrePolice: mission.sinistrePolice || '',
          sinistrePoliceAdverse: mission.sinistrePoliceAdverse || '',
          garageId: mission.garageId ? String(mission.garageId) : '',
          agentId: mission.agentId ? String(mission.agentId) : '',
          statut: mission.statut,
        });
        setDamages(data.damages || []);
        setDamageTotals(data.damageTotals || DEFAULT_DAMAGE_TOTALS);
        setLabors(buildLaborEntries(data.labors || []));
        setLaborSupplies(data.laborTotals?.suppliesHt || 0);
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
    if (!insurers.length) {
      setForm((prev) => ({ ...prev, assureurAdverseId: '' }));
      return;
    }
    setForm((prev) => {
      if (!prev.assureurAdverseId) {
        return prev;
      }
      const exists = insurers.some((insurer) => String(insurer.id) === String(prev.assureurAdverseId));
      if (!exists) {
        return { ...prev, assureurAdverseId: '' };
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

  const resetDamageForm = () => {
    setDamageForm({
      id: null,
      piece: '',
      priceHt: '',
      vetuste: 0,
    });
  };

  const handleDamageChange = (event) => {
    const { name, value } = event.target;
    setDamageForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDamageSubmit = async () => {
    if (!isEdit) {
      return;
    }
    setDamageError('');
    if (!damageForm.piece.trim()) {
      setDamageError('Veuillez saisir le nom de la piece');
      return;
    }
    const priceValue = Number(damageForm.priceHt);
    if (Number.isNaN(priceValue) || priceValue < 0) {
      setDamageError('Tarif hors taxe invalide');
      return;
    }
    const vetusteValue = Number(damageForm.vetuste);
    if (Number.isNaN(vetusteValue) || vetusteValue < 0 || vetusteValue > 100) {
      setDamageError('Vetuste doit etre comprise entre 0 et 100');
      return;
    }

    setDamageSubmitting(true);
    try {
      const payload = {
        piece: damageForm.piece.trim(),
        priceHt: priceValue,
        vetuste: vetusteValue,
      };
      const response = damageForm.id
        ? await updateDamage(token, id, damageForm.id, payload)
        : await addDamage(token, id, payload);
      setDamages(response.items || []);
      setDamageTotals(response.totals || DEFAULT_DAMAGE_TOTALS);
      resetDamageForm();
    } catch (err) {
      setDamageError(err.message || 'Enregistrement impossible');
    } finally {
      setDamageSubmitting(false);
    }
  };

  const handleEditDamage = (damage) => {
    setDamageError('');
    setDamageForm({
      id: damage.id,
      piece: damage.piece,
      priceHt: damage.priceHt.toString(),
      vetuste: damage.vetuste.toString(),
    });
  };

  const handleCancelDamageEdit = () => {
    resetDamageForm();
    setDamageError('');
  };

  const handleDeleteDamageItem = async (damage) => {
    if (!window.confirm('Supprimer cette piece ?')) {
      return;
    }
    setDamageError('');
    setDamageSubmitting(true);
    try {
      const response = await deleteDamage(token, id, damage.id);
      setDamages(response.items || []);
      setDamageTotals(response.totals || DEFAULT_DAMAGE_TOTALS);
      if (damageForm.id === damage.id) {
        resetDamageForm();
      }
    } catch (err) {
      setDamageError(err.message || 'Suppression impossible');
    } finally {
      setDamageSubmitting(false);
    }
  };

  const handleLaborRowChange = (category, field, value) => {
    const numValue = Number(value);
    setLabors((prev) =>
      prev.map((entry) =>
        entry.category === category
          ? {
              ...entry,
              [field]: Number.isNaN(numValue) ? 0 : numValue,
            }
          : entry
      )
    );
  };

  const handleLaborSuppliesChange = (event) => {
    setLaborSupplies(Number(event.target.value) || 0);
  };

  const handleLaborSave = async () => {
    if (!isEdit) {
      return;
    }
    setLaborError('');
    setLaborSaving(true);
    try {
      const payload = {
        entries: labors.map((entry) => ({
          category: entry.category,
          hours: entry.hours,
          rate: entry.rate,
        })),
        suppliesHt: laborSupplies,
      };
      const response = await saveLabors(token, id, payload);
      setLabors(buildLaborEntries(response.entries || []));
      setLaborSupplies(response.totals?.suppliesHt || 0);
    } catch (err) {
      setLaborError(err.message || 'Enregistrement impossible');
    } finally {
      setLaborSaving(false);
    }
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

    setSaving(true);
    setError('');
    const payload = {
      ...form,
      assureurId: form.assureurId ? Number(form.assureurId) : null,
      vehiculeMarqueId: form.vehiculeMarqueId ? Number(form.vehiculeMarqueId) : null,
      garageId: form.garageId ? Number(form.garageId) : null,
      vehiculeAnnee: form.vehiculeAnnee || null,
      agentId: form.agentId ? Number(form.agentId) : null,
      assureurAdverseId: form.assureurAdverseId ? Number(form.assureurAdverseId) : null,
      sinistrePoliceAdverse: form.sinistrePoliceAdverse || null,
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
      <form className="card form-grid" noValidate onSubmit={handleSubmit}>
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
              Contact : {selectedInsurer.contact || '-'}
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
              <div>Adresse agence : {selectedAgency.adresse || '-'}</div>
              <div>Telephone agence : {selectedAgency.telephone || '-'}</div>
            </div>
          )}
        </fieldset>

        {isEdit && (
          <fieldset>
            <legend>Description des dommages</legend>
            {damageError && <div className="alert alert-error">{damageError}</div>}
            <div className="damage-form">
              <div className="damage-form-fields">
                <label className="form-field">
                  <span>Piece</span>
                  <input
                    name="piece"
                    list="damage-parts"
                    value={damageForm.piece}
                    onChange={handleDamageChange}
                    placeholder="Selectionner ou saisir une piece"
                  />
                  <datalist id="damage-parts">
                    {DAMAGE_PARTS.map((part) => (
                      <option key={part} value={part} />
                    ))}
                  </datalist>
                </label>
                <label className="form-field">
                  <span>Tarif HT (MAD)</span>
                  <input
                    name="priceHt"
                    type="number"
                    min="0"
                    step="0.01"
                    value={damageForm.priceHt}
                    onChange={handleDamageChange}
                  />
                </label>
                <label className="form-field">
                  <span>Vetuste (%)</span>
                  <input
                    name="vetuste"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={damageForm.vetuste}
                    onChange={handleDamageChange}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDamageSubmit}
                  disabled={damageSubmitting}
                >
                  {damageForm.id ? 'Mettre a jour' : 'Ajouter'}
                </button>
                {damageForm.id && (
                  <button type="button" className="btn btn-secondary" onClick={handleCancelDamageEdit}>
                    Annuler
                  </button>
                )}
              </div>
            </div>
            {damages.length ? (
              <>
                <div className="table-wrapper damage-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Piece</th>
                        <th>Prix HT</th>
                        <th>Vetuste</th>
                        <th>Apres vetuste</th>
                        <th>Prix TTC</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {damages.map((damage) => {
                        const priceTtc = damage.priceHt * 1.2;
                        return (
                          <tr key={damage.id}>
                            <td>{damage.piece}</td>
                            <td>{damage.priceHt.toFixed(2)} MAD</td>
                            <td>{damage.vetuste.toFixed(0)}%</td>
                            <td>{damage.priceAfter.toFixed(2)} MAD</td>
                            <td>{priceTtc.toFixed(2)} MAD</td>
                            <td className="table-actions">
                              <button
                                type="button"
                                className="btn btn-action"
                                onClick={() => handleEditDamage(damage)}
                                disabled={damageSubmitting}
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                className="btn btn-action text-danger"
                                onClick={() => handleDeleteDamageItem(damage)}
                                disabled={damageSubmitting}
                              >
                                Supprimer
                              </button>
                            </td>
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
              <p className="muted">Aucune piece enregistree pour cette mission.</p>
            )}
          </fieldset>
        )}

        {isEdit && (
          <fieldset>
            <legend>Évaluation de la remise en état</legend>
            {laborError && <div className="alert alert-error">{laborError}</div>}
            <div className="table-wrapper damage-table">
              <table>
                <thead>
                  <tr>
                    <th>Main d’oeuvre</th>
                    <th>Nombre d’heures</th>
                    <th>Taux horaire</th>
                    <th>Hors taxe</th>
                    <th>T.V.A</th>
                    <th>Total TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {labors.map((labor) => {
                    const ht = labor.hours * labor.rate;
                    const tva = ht * 0.2;
                    const ttc = ht + tva;
                    return (
                      <tr key={labor.category}>
                        <td>{labor.label}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={labor.hours}
                            onChange={(event) => handleLaborRowChange(labor.category, 'hours', event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={labor.rate}
                            onChange={(event) => handleLaborRowChange(labor.category, 'rate', event.target.value)}
                          />
                        </td>
                        <td>{ht.toFixed(2)} MAD</td>
                        <td>{tva.toFixed(2)} MAD</td>
                        <td>{ttc.toFixed(2)} MAD</td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td>Fournitures</td>
                    <td>—</td>
                    <td>—</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={laborSupplies}
                        onChange={handleLaborSuppliesChange}
                      />
                    </td>
                    <td>{(laborSupplies * 0.2).toFixed(2)} MAD</td>
                    <td>{(laborSupplies * 1.2).toFixed(2)} MAD</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={handleLaborSave} disabled={laborSaving}>
                Enregistrer la main d’oeuvre
              </button>
            </div>
            <div className="damage-totals">
              <div>
                <strong>Total main d’oeuvre HT :</strong> {laborTotals.totalHt.toFixed(2)} MAD
              </div>
              <div>
                <strong>Total main d’oeuvre TTC :</strong> {laborTotals.totalTtc.toFixed(2)} MAD
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
            </div>
          </fieldset>
        )}

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
            <span>Date de mise en circulation</span>
            <input
              name="vehiculeAnnee"
              type="date"
              value={form.vehiculeAnnee || ''}
              onChange={handleChange}
            />
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
            <span>Police vehicule adverse</span>
            <input
              name="sinistrePoliceAdverse"
              value={form.sinistrePoliceAdverse}
              onChange={handleChange}
            />
          </label>
          <label className="form-field">
            <span>Compagnie adverse</span>
            <select
              name="assureurAdverseId"
              value={form.assureurAdverseId}
              onChange={handleChange}
              disabled={!insurers.length}
            >
            <option value="">-</option>
              {insurers.map((insurer) => (
                <option key={insurer.id} value={insurer.id}>
                  {insurer.nom}
                </option>
              ))}
            </select>
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
            <p className="alert alert-info">
              Aucun garage reference pour le moment. Vous pouvez creer la mission sans garage ou en ajouter
              depuis le menu "Garages".
            </p>
          )}
          {isEdit && legacyGarage && !form.garageId && (
            <p className="alert alert-info">
              Garage actuel non reference
              {legacyGarage.nom ? ` (${legacyGarage.nom})` : ''}.
              Vous pouvez en selectionner un dans la liste ci-dessous ou laisser ce champ vide.
            </p>
          )}
          <label className="form-field">
            <span>Garage</span>
            <select
              name="garageId"
              value={form.garageId}
              onChange={handleGarageChange}
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
                Adresse : {(form.garageId ? selectedGarage : legacyGarage).adresse || '-'}
              </div>
              <div>
                Contact : {(form.garageId ? selectedGarage : legacyGarage).contact || '-'}
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
            disabled={saving || !hasInsurers || !hasBrands}
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














