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
import { MISSION_STATUSES, DAMAGE_PARTS, DAMAGE_TYPE_OPTIONS, LABOR_CATEGORIES } from '../constants';

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
  vehiculeVin: '',
  vehiculeKilometrage: '',
  vehiculePuissanceFiscale: '',
  vehiculeEnergie: '',
  sinistreType: '',
  sinistreCirconstances: '',
  sinistreDate: '',
  sinistrePolice: '',
  sinistrePoliceAdverse: '',
  sinistreNomAdverse: '',
  sinistreImmatriculationAdverse: '',
  garageId: '',
  agentId: '',
  statut: 'cree',
  garantieType: '',
  garantieFranchiseTaux: '',
  garantieFranchiseMontant: '',
  responsabilite: '',
  reformeType: '',
  valeurAssuree: '',
  valeurVenale: '',
  valeurEpaves: '',
  indemnisationFinale: '',
  synthese: '',
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

const ENERGY_OPTIONS = [
  { value: 'diesel', label: 'Diesel' },
  { value: 'essence', label: 'Essence' },
  { value: 'electrique', label: 'Electrique' },
  { value: 'hybride', label: 'Hybride' },
];

const GUARANTEE_OPTIONS = [
  { value: 'dommage collision', label: 'Dommage collision' },
  { value: 'tierce', label: 'Tierce' },
  { value: 'rc', label: 'RC' },
];

const RESPONSIBILITY_OPTIONS = [
  { value: '0%', label: '0%' },
  { value: '50%', label: '50%' },
  { value: '100%', label: '100%' },
];

const guaranteeRequiresFranchise = (value) => {
  if (!value) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'dommage collision' || normalized === 'tierce';
};

const REFORME_OPTIONS = [
  { value: 'economique', label: 'Economique' },
  { value: 'technique', label: 'Technique' },
];

const DAMAGE_TYPE_LABELS = DAMAGE_TYPE_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const formatDamageTypeLabel = (value) => {
  if (!value) {
    return '-';
  }
  const normalized = String(value).trim().toLowerCase();
  return DAMAGE_TYPE_LABELS[normalized] || value;
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
    pieceType: DAMAGE_TYPE_OPTIONS[0].value,
    withVat: true,
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
          vehiculeVin: mission.vehiculeVin || '',
          vehiculeKilometrage:
            mission.vehiculeKilometrage !== null && mission.vehiculeKilometrage !== undefined
              ? String(mission.vehiculeKilometrage)
              : '',
          vehiculePuissanceFiscale: mission.vehiculePuissanceFiscale || '',
          vehiculeEnergie: mission.vehiculeEnergie || '',
          sinistreType: mission.sinistreType || '',
          sinistreCirconstances: mission.sinistreCirconstances || '',
          sinistreDate: mission.sinistreDate || '',
          sinistrePolice: mission.sinistrePolice || '',
          sinistrePoliceAdverse: mission.sinistrePoliceAdverse || '',
          sinistreNomAdverse: mission.sinistreNomAdverse || '',
          sinistreImmatriculationAdverse: mission.sinistreImmatriculationAdverse || '',
          garantieType: mission.garantieType || '',
          garantieFranchiseTaux:
            mission.garantieFranchiseTaux !== null && mission.garantieFranchiseTaux !== undefined
              ? String(mission.garantieFranchiseTaux)
              : '',
          garantieFranchiseMontant:
            mission.garantieFranchiseMontant !== null && mission.garantieFranchiseMontant !== undefined
              ? String(mission.garantieFranchiseMontant)
              : '',
          responsabilite: mission.responsabilite || '',
          reformeType: mission.reformeType || '',
          valeurAssuree:
            mission.valeurAssuree !== null && mission.valeurAssuree !== undefined
              ? String(mission.valeurAssuree)
              : '',
          valeurVenale:
            mission.valeurVenale !== null && mission.valeurVenale !== undefined ? String(mission.valeurVenale) : '',
          valeurEpaves:
            mission.valeurEpaves !== null && mission.valeurEpaves !== undefined ? String(mission.valeurEpaves) : '',
          indemnisationFinale:
            mission.indemnisationFinale !== null && mission.indemnisationFinale !== undefined
              ? String(mission.indemnisationFinale)
              : '',
          synthese: mission.synthese || '',
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
  const showFranchiseFields = guaranteeRequiresFranchise(form.garantieType);
  const damageVetusteLoss = Math.max(0, damageTotals.totalTtc - damageTotals.totalAfterTtc);
  const { franchiseAmount, recommendedIndemnisation } = useMemo(() => {
    const totalTtc = laborTotals.grandTotalTtc || 0;
    const rate = Number(form.garantieFranchiseTaux) || 0;
    const fixed = Number(form.garantieFranchiseMontant) || 0;
    const percentValue = (rate / 100) * totalTtc;
    const franchise = Math.max(percentValue, fixed);
    return {
      franchiseAmount: franchise,
      recommendedIndemnisation: Math.max(0, totalTtc - franchise),
    };
  }, [laborTotals.grandTotalTtc, form.garantieFranchiseTaux, form.garantieFranchiseMontant]);

  const handleIndemnisationRecalc = () => {
    setForm((prev) => ({
      ...prev,
      indemnisationFinale: recommendedIndemnisation.toFixed(2),
    }));
  };

  useEffect(() => {
    if (
      !isEdit &&
      (form.indemnisationFinale === '' || form.indemnisationFinale === null) &&
      laborTotals.grandTotalTtc
    ) {
      setForm((prev) => ({
        ...prev,
        indemnisationFinale: recommendedIndemnisation.toFixed(2),
      }));
    }
  }, [laborTotals.grandTotalTtc, form.indemnisationFinale, isEdit, recommendedIndemnisation]);

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
    pieceType: DAMAGE_TYPE_OPTIONS[0].value,
    withVat: true,
  });
};

const handleDamageChange = (event) => {
  const { name, value } = event.target;
  setDamageForm((prev) => ({ ...prev, [name]: value }));
};

const handleDamageCheckboxChange = (event) => {
  const { name, checked } = event.target;
  setDamageForm((prev) => ({ ...prev, [name]: checked }));
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
        pieceType: damageForm.pieceType,
        withVat: damageForm.withVat,
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
      pieceType: damage.pieceType || DAMAGE_TYPE_OPTIONS[0].value,
      withVat: damage.withVat !== false,
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
    const requiresFranchise = guaranteeRequiresFranchise(form.garantieType);
    payload.garantieType = form.garantieType || null;
    payload.garantieFranchiseTaux =
      requiresFranchise && form.garantieFranchiseTaux !== ''
        ? Number(form.garantieFranchiseTaux)
        : null;
    payload.garantieFranchiseMontant =
      requiresFranchise && form.garantieFranchiseMontant !== ''
        ? Number(form.garantieFranchiseMontant)
        : null;
    payload.responsabilite = form.responsabilite || null;
    payload.synthese = form.synthese || null;
    payload.indemnisationFinale = form.indemnisationFinale !== '' ? Number(form.indemnisationFinale) : null;
    payload.reformeType = form.reformeType || null;
    payload.valeurAssuree = form.valeurAssuree !== '' ? Number(form.valeurAssuree) : null;
    payload.valeurVenale = form.valeurVenale !== '' ? Number(form.valeurVenale) : null;
    payload.valeurEpaves = form.valeurEpaves !== '' ? Number(form.valeurEpaves) : null;

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
                <label className="form-field">
                  <span>Type de piece</span>
                  <select name="pieceType" value={damageForm.pieceType} onChange={handleDamageChange}>
                    {DAMAGE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field checkbox-field">
                  <span>Avec TVA</span>
                  <div className="checkbox-row">
                    <input
                      type="checkbox"
                      name="withVat"
                      checked={damageForm.withVat}
                      onChange={handleDamageCheckboxChange}
                    />
                    <span className="muted">Appliquer la TVA sur cette piece</span>
                  </div>
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
                        <th>Type</th>
                        <th>Prix HT</th>
                        <th>Vetuste</th>
                        <th>Apres vetuste</th>
                        <th>TVA</th>
                        <th>Prix TTC</th>
                        <th></th>
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
                    <th>Main d'œuvre</th>
                    <th>Nombre d'heures</th>
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
                    <td>-</td>
                    <td>-</td>
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
                Enregistrer la main d'œuvre
              </button>
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
                <strong>Vétusté TTC :</strong> {damageVetusteLoss.toFixed(2)} MAD
              </div>
              <div className="form-field">
                <span>Montant final de l'indemnisation (MAD)</span>
                <div className="inline-input">
                  <input
                    name="indemnisationFinale"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.indemnisationFinale}
                    onChange={handleChange}
                  />
                  <button type="button" className="btn btn-secondary" onClick={handleIndemnisationRecalc}>
                    Recalculer
                  </button>
                </div>
                <small className="muted">
                  Calcul = Montant total TTC ({laborTotals.grandTotalTtc.toFixed(2)} MAD) - Franchise (
                  {franchiseAmount.toFixed(2)} MAD)
                </small>
            </div>
          </div>
            <div className="form-grid">
          <label className="form-field">
            <span>Type de garantie</span>
            <select name="garantieType" value={form.garantieType} onChange={handleChange}>
              <option value="">Selectionner un type</option>
              {GUARANTEE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {showFranchiseFields && (
                <>
                  <label className="form-field">
                    <span>Taux franchise (%)</span>
                    <input
                      name="garantieFranchiseTaux"
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.garantieFranchiseTaux}
                      onChange={handleChange}
                    />
                  </label>
                  <label className="form-field">
                    <span>Franchise (MAD)</span>
                    <input
                      name="garantieFranchiseMontant"
                      type="number"
                      min="0"
                      step="10"
                      value={form.garantieFranchiseMontant}
                      onChange={handleChange}
                    />
                  </label>
                </>
              )}
          <label className="form-field">
            <span>Responsabilite</span>
            <select name="responsabilite" value={form.responsabilite} onChange={handleChange}>
              <option value="">Selectionner un taux</option>
              {RESPONSIBILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label className="form-field">
            <span>Reforme</span>
            <select name="reformeType" value={form.reformeType} onChange={handleChange}>
              <option value="">Aucune</option>
              {REFORME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Valeur assuree (MAD)</span>
            <input
              name="valeurAssuree"
              type="number"
              min="0"
              step="100"
              value={form.valeurAssuree}
              onChange={handleChange}
            />
          </label>
          <label className="form-field">
            <span>Valeur venale (MAD)</span>
            <input
              name="valeurVenale"
              type="number"
              min="0"
              step="100"
              value={form.valeurVenale}
              onChange={handleChange}
            />
          </label>
          <label className="form-field">
            <span>Valeur epaves (MAD)</span>
            <input
              name="valeurEpaves"
              type="number"
              min="0"
              step="100"
              value={form.valeurEpaves}
              onChange={handleChange}
            />
          </label>
        </div>

        <fieldset>
          <legend>Synthese</legend>
          <label className="form-field">
            <span>Résumé / Synthèse de mission</span>
            <textarea
              name="synthese"
              rows={4}
              value={form.synthese}
              onChange={handleChange}
              placeholder="Saisissez ici les remarques ou conclusions principales..."
            />
          </label>
        </fieldset>
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
            <span>Numero de chassis (VIN)</span>
            <input name="vehiculeVin" value={form.vehiculeVin} onChange={handleChange} />
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
          <label className="form-field">
            <span>Kilometrage</span>
            <input
              name="vehiculeKilometrage"
              type="number"
              min="0"
              value={form.vehiculeKilometrage}
              onChange={handleChange}
            />
          </label>
          <label className="form-field">
            <span>Puissance fiscale</span>
            <input
              name="vehiculePuissanceFiscale"
              value={form.vehiculePuissanceFiscale}
              onChange={handleChange}
            />
          </label>
          <label className="form-field">
            <span>Energie</span>
            <select name="vehiculeEnergie" value={form.vehiculeEnergie} onChange={handleChange}>
              <option value="">Selectionner une energie</option>
              {ENERGY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
            <span>Nom &amp; prenom adverse</span>
            <input name="sinistreNomAdverse" value={form.sinistreNomAdverse} onChange={handleChange} />
          </label>
          <label className="form-field">
            <span>Immatriculation adverse</span>
            <input
              name="sinistreImmatriculationAdverse"
              value={form.sinistreImmatriculationAdverse}
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















