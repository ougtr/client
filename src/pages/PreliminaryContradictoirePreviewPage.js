import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { downloadMissionPdfBlob, getMission } from '../api/missions';
import ToastStack from '../components/ToastStack';
import SkeletonBlock from '../components/SkeletonBlock';

const ENERGY_LABELS = {
  diesel: 'DIESEL',
  essence: 'ESSENCE',
  electrique: 'ELECTRIQUE',
  hybride: 'HYBRIDE',
};

const REPORT_TITLE_MODES = ['Contradictoire', 'Collégiale'];

const normalizeReportTitleMode = (value) =>
  REPORT_TITLE_MODES.includes(value) ? value : REPORT_TITLE_MODES[0];

const formatDate = (value) => {
  if (!value) {
    return '';
  }
  const raw = String(value).trim();
  if (!raw) {
    return '';
  }
  const slashMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    return raw;
  }
  if (/^\d{4}$/.test(raw)) {
    return `01/01/${raw}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatToday = () => formatDate(new Date().toISOString());

const parseMoneyInput = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const normalized = String(value).replace(/\s+/g, '').replace(',', '.').trim();
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatAmount = (value) =>
  parseMoneyInput(value).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const buildInitialForm = (data) => {
  const mission = data?.mission || {};
  const laborTotals = data?.laborTotals || {};
  const damageTotals = data?.damageTotals || {};

  const laborBodyAmount = parseMoneyInput(laborTotals.totalHt);
  const suppliesAmount = parseMoneyInput(laborTotals.suppliesHt);
  const vatAmount = parseMoneyInput(laborTotals.grandTotalTva);
  const vetusteAmount = Math.max(
    0,
    parseMoneyInput(damageTotals.totalTtc) - parseMoneyInput(damageTotals.totalAfterTtc)
  );
  const grossTotal = parseMoneyInput(laborTotals.grandTotalTtc);
  const netAfterVetuste = Math.max(0, grossTotal - vetusteAmount);
  const valeurVenale = parseMoneyInput(mission.valeurVenale);
  const valeurEpave = parseMoneyInput(mission.valeurEpaves);
  const valueDifference =
    valeurVenale || valeurEpave ? formatAmount(Math.max(0, valeurVenale - valeurEpave)) : '';

  return {
    reportTitleMode: normalizeReportTitleMode(data?.reportTitleMode),
    reference: mission.missionCode || `M-${mission.id || ''}`,
    issueDate: formatDate(mission.sinistreDate),
    insuredName: mission.assureNom || '',
    insuredPhone: mission.assureTelephone || '',
    firstExpertInsurer: mission.assureurNom || '',
    firstExpertVehicleLabel: [mission.vehiculeMarque, mission.vehiculeModele].filter(Boolean).join(' '),
    firstExpertVehicleRegistration: mission.vehiculeImmatriculation || '',
    firstExpertPolicyNumber: mission.sinistrePolice || '',
    secondExpertName: '',
    secondExpertInsurer: mission.assureurAdverseNom || '',
    secondExpertVehicleLabel: '',
    secondExpertVehicleRegistration: mission.sinistreImmatriculationAdverse || '',
    secondExpertPolicyNumber: mission.sinistrePoliceAdverse || '',
    damagedPartyLabel: mission.assureNom || '',
    city: 'Casa',
    reportDate: formatToday(),
    observations: '',
    vehicle: {
      marque: mission.vehiculeMarque || '',
      chassis: mission.vehiculeVin || '',
      type: mission.vehiculeModele || '',
      puissance: mission.vehiculePuissanceFiscale || '',
      dmc: formatDate(mission.vehiculeAnnee),
      carburant: ENERGY_LABELS[String(mission.vehiculeEnergie || '').trim().toLowerCase()] || mission.vehiculeEnergie || '',
      cylindres: '',
      kilometrage:
        mission.vehiculeKilometrage !== null && mission.vehiculeKilometrage !== undefined
          ? String(mission.vehiculeKilometrage)
          : '',
    },
    firstExpert: {
      repairSelected: true,
      repairerName: mission.garageNom || '',
      suppliesAmount: suppliesAmount.toFixed(2),
      laborBodyAmount: laborBodyAmount.toFixed(2),
      laborPaintAmount: '',
      laborMechanicalAmount: '',
      vatAmount: vatAmount.toFixed(2),
      grossTotal: grossTotal.toFixed(2),
      vetusteAmount: vetusteAmount.toFixed(2),
      netTotal: netAfterVetuste.toFixed(2),
      reformeType: mission.reformeType || '',
      valeurVenale: valeurVenale ? valeurVenale.toFixed(2) : '',
      valeurEpave: valeurEpave ? valeurEpave.toFixed(2) : '',
      valueDifference,
      companyLabel: mission.assureurNom || '',
      cabinetLabel: 'OPALE EXPERTISE',
    },
    secondExpert: {
      repairSelected: false,
      suppliesAmount: '',
      laborBodyAmount: '',
      laborPaintAmount: '',
      laborMechanicalAmount: '',
      vatAmount: '',
      vetusteAmount: '',
      grossTotal: '',
      netTotal: '',
      reformeType: '',
      valeurVenale: '',
      valeurEpave: '',
      valueDifference: '',
      companyLabel: mission.assureurAdverseNom || '',
      cabinetLabel: '',
    },
  };
};

const InlineInput = ({ value, onChange, className = '', ...props }) => (
  <input
    className={`preview-inline-input ${className}`.trim()}
    value={value}
    onChange={onChange}
    {...props}
  />
);

const InlineTextarea = ({ value, onChange, className = '', ...props }) => (
  <textarea
    className={`preview-inline-textarea ${className}`.trim()}
    value={value}
    onChange={onChange}
    {...props}
  />
);

const InlineSelect = ({ value, onChange, className = '', children, ...props }) => (
  <select
    className={`preview-inline-select ${className}`.trim()}
    value={value}
    onChange={onChange}
    {...props}
  >
    {children}
  </select>
);

const CheckboxLine = ({ checked, label, onToggle }) => (
  <button type="button" className="preview-checkbox-line" onClick={onToggle}>
    <span className={`preview-checkbox ${checked ? 'checked' : ''}`}>{checked ? 'X' : ''}</span>
    <span>{label}</span>
  </button>
);

const PreliminaryContradictoirePreviewPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [toasts, setToasts] = useState([]);

  const pushToast = (type, message) => {
    const toastId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
  };

  const dismissToast = (toastId) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  };

  useEffect(() => {
    const fetchMissionPreview = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getMission(token, id);
        setForm(buildInitialForm(data));
      } catch (err) {
        setError(err.message || 'Impossible de charger la mission');
      } finally {
        setLoading(false);
      }
    };

    fetchMissionPreview();
  }, [id, token]);

  const updateField = (field) => (event) => {
    const nextValue = event.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
  };

  const updateNestedField = (section, field) => (event) => {
    const nextValue = event.target.value;
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: nextValue,
      },
    }));
  };

  const toggleRepairSelection = (section) => () => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        repairSelected: !prev[section].repairSelected,
      },
    }));
  };

  const setReformeType = (section, reformeType) => () => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        reformeType: prev[section].reformeType === reformeType ? '' : reformeType,
      },
    }));
  };

  const handleGenerate = async () => {
    if (!form) {
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const blob = await downloadMissionPdfBlob(token, id, 'preliminary-contradictoire-report', {
        method: 'POST',
        body: form,
      });
      const filename = `rapport-preliminaire-contradictoire-mission-${id}.pdf`;
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      pushToast('success', 'PDF généré et ajouté aux documents de la mission.');
    } catch (err) {
      setError(err.message || 'Impossible de générer le rapport');
      pushToast('error', err.message || 'Impossible de générer le rapport');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <SkeletonBlock lines={6} />
        <SkeletonBlock lines={10} />
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate(`/missions/${id}`)}>
          Retour à la mission
        </button>
      </div>
    );
  }

  return (
    <div className="page preliminary-preview-page">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <div className="page-header">
        <div>
          <div className="page-breadcrumb">
            <button type="button" className="btn btn-link" onClick={() => navigate('/missions')}>
              Missions
            </button>
            <span>/</span>
            <button type="button" className="btn btn-link" onClick={() => navigate(`/missions/${id}`)}>
              Mission {id}
            </button>
            <span>/</span>
            <span className="breadcrumb-chip">Rapport préliminaire contradictoire</span>
          </div>
          <h1>Prévisualisation du rapport préliminaire contradictoire</h1>
          <p className="muted">
            Les champs préremplis viennent de la mission. Les champs non connus restent éditables avant génération.
          </p>
        </div>
        <div className="status-panel">
          <button type="button" className="btn btn-outline" onClick={() => navigate(`/missions/${id}`)}>
            Retour
          </button>
          <button type="button" className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Génération...' : 'Générer le PDF'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="card">
        <p className="muted preliminary-preview-note">
          Chaque génération télécharge le PDF et ajoute automatiquement une copie dans la section documents de la
          mission.
        </p>
        <div className="preliminary-paper-stack">
          <div className="preliminary-paper">
            <div className="preliminary-title-box">
              <span>Annexe 4 : Rapport d&apos;expertise préliminaire -</span>
              <InlineSelect
                value={form.reportTitleMode}
                onChange={updateField('reportTitleMode')}
                className="preview-title-select"
              >
                {REPORT_TITLE_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </InlineSelect>
            </div>

            <div className="preliminary-top-table">
              <div className="label">N/Réf</div>
              <div className="value">
                <InlineInput value={form.reference} onChange={updateField('reference')} />
              </div>
              <div className="label">Sinistre du</div>
              <div className="value">
                <InlineInput value={form.issueDate} onChange={updateField('issueDate')} />
              </div>
              <div className="label">Assuré / GSM</div>
              <div className="value stacked">
                <InlineInput value={form.insuredName} onChange={updateField('insuredName')} />
                <InlineInput value={form.insuredPhone} onChange={updateField('insuredPhone')} />
              </div>
            </div>

            <div className="preliminary-text-block">
              <p className="strong">Entre les soussignés :</p>
              <p>
                <strong>OPALE EXPERTISE</strong>, désigné par la compagnie{' '}
                <InlineInput value={form.firstExpertInsurer} onChange={updateField('firstExpertInsurer')} className="w-sm" />{' '}
                assureur du véhicule{' '}
                <InlineInput
                  value={form.firstExpertVehicleLabel}
                  onChange={updateField('firstExpertVehicleLabel')}
                  className="w-md"
                />{' '}
                immatriculé{' '}
                <InlineInput
                  value={form.firstExpertVehicleRegistration}
                  onChange={updateField('firstExpertVehicleRegistration')}
                  className="w-sm"
                />{' '}
                par la police N°{' '}
                <InlineInput
                  value={form.firstExpertPolicyNumber}
                  onChange={updateField('firstExpertPolicyNumber')}
                  className="w-sm"
                />
              </p>
              <p>
                <strong>Et Monsieur</strong>{' '}
                <InlineInput value={form.secondExpertName} onChange={updateField('secondExpertName')} className="w-sm" /> ,
                Expert désigné par la compagnie{' '}
                <InlineInput value={form.secondExpertInsurer} onChange={updateField('secondExpertInsurer')} className="w-sm" />{' '}
                assureur du{' '}
                <InlineInput
                  value={form.secondExpertVehicleLabel}
                  onChange={updateField('secondExpertVehicleLabel')}
                  className="w-md"
                />{' '}
                véhicule immatriculé{' '}
                <InlineInput
                  value={form.secondExpertVehicleRegistration}
                  onChange={updateField('secondExpertVehicleRegistration')}
                  className="w-sm"
                />{' '}
                par la police N°{' '}
                <InlineInput
                  value={form.secondExpertPolicyNumber}
                  onChange={updateField('secondExpertPolicyNumber')}
                  className="w-sm"
                />
              </p>
              <p>
                A l&apos;effet de procéder à l&apos;estimation contradictoire des dommages subis par{' '}
                <InlineInput value={form.damagedPartyLabel} onChange={updateField('damagedPartyLabel')} className="w-md" /> dont
                les caractéristiques se présentent comme suit :
              </p>
            </div>

            <div className="preliminary-section-title">CARACTERISTIQUE TECHNIQUE DU VEHICULE :</div>
            <div className="preliminary-vehicle-table">
              <div className="cell label">Marque</div>
              <div className="cell">
                <InlineInput value={form.vehicle.marque} onChange={updateNestedField('vehicle', 'marque')} />
              </div>
              <div className="cell label">Châssis</div>
              <div className="cell">
                <InlineInput value={form.vehicle.chassis} onChange={updateNestedField('vehicle', 'chassis')} />
              </div>
              <div className="cell label">Type</div>
              <div className="cell">
                <InlineInput value={form.vehicle.type} onChange={updateNestedField('vehicle', 'type')} />
              </div>
              <div className="cell label">Puissance</div>
              <div className="cell">
                <InlineInput value={form.vehicle.puissance} onChange={updateNestedField('vehicle', 'puissance')} />
              </div>
              <div className="cell label">DMC</div>
              <div className="cell">
                <InlineInput value={form.vehicle.dmc} onChange={updateNestedField('vehicle', 'dmc')} />
              </div>
              <div className="cell label">Carburant</div>
              <div className="cell">
                <InlineInput value={form.vehicle.carburant} onChange={updateNestedField('vehicle', 'carburant')} />
              </div>
              <div className="cell label">N° Cylindre</div>
              <div className="cell">
                <InlineInput value={form.vehicle.cylindres} onChange={updateNestedField('vehicle', 'cylindres')} />
              </div>
              <div className="cell label">Kilométrage</div>
              <div className="cell">
                <InlineInput value={form.vehicle.kilometrage} onChange={updateNestedField('vehicle', 'kilometrage')} />
              </div>
            </div>

            <div className="preliminary-section-title">POSITION DU 1ER EXPERT :</div>
            <div className="preliminary-subtitle">ESTIMATION DES DOMMAGES :</div>
            <div className="preliminary-row-between">
              <CheckboxLine
                checked={form.firstExpert.repairSelected}
                label="Réparation"
                onToggle={toggleRepairSelection('firstExpert')}
              />
              <label className="preliminary-inline-label">
                <span>Nom Réparateur :</span>
                <InlineInput
                  value={form.firstExpert.repairerName}
                  onChange={updateNestedField('firstExpert', 'repairerName')}
                  className="w-md"
                />
              </label>
            </div>

            <div className="preliminary-estimation-table">
              <div className="head">Désignation et descriptif</div>
              <div className="head">Valeur estimée</div>
              <div className="desc">-Fournitures (pièces, fournitures peinture)</div>
              <div className="amount">
                <InlineInput
                  value={form.firstExpert.suppliesAmount}
                  onChange={updateNestedField('firstExpert', 'suppliesAmount')}
                />
              </div>
              <div className="desc">-Main d&apos;oeuvre tôlerie</div>
              <div className="amount">
                <InlineInput
                  value={form.firstExpert.laborBodyAmount}
                  onChange={updateNestedField('firstExpert', 'laborBodyAmount')}
                />
              </div>
              <div className="desc">-TVA</div>
              <div className="amount">
                <InlineInput
                  value={form.firstExpert.vatAmount}
                  onChange={updateNestedField('firstExpert', 'vatAmount')}
                />
              </div>
              <div className="desc strong">Total brut des dommages</div>
              <div className="amount">
                <InlineInput
                  value={form.firstExpert.grossTotal}
                  onChange={updateNestedField('firstExpert', 'grossTotal')}
                />
              </div>
              <div className="desc">A déduire vétusté</div>
              <div className="amount">
                <InlineInput
                  value={form.firstExpert.vetusteAmount}
                  onChange={updateNestedField('firstExpert', 'vetusteAmount')}
                />
              </div>
              <div className="desc strong">Total net des dommages</div>
              <div className="amount">
                <InlineInput
                  value={form.firstExpert.netTotal}
                  onChange={updateNestedField('firstExpert', 'netTotal')}
                />
              </div>
            </div>
          </div>

          <div className="preliminary-paper">
            <div className="preliminary-reforme-row">
              <CheckboxLine
                checked={form.firstExpert.reformeType === 'economique'}
                label="Réforme Economique"
                onToggle={setReformeType('firstExpert', 'economique')}
              />
              <CheckboxLine
                checked={form.firstExpert.reformeType === 'technique'}
                label="Réforme Technique"
                onToggle={setReformeType('firstExpert', 'technique')}
              />
            </div>

            <div className="preliminary-value-table">
              <div className="label">Valeur Vénale</div>
              <div className="field">
                <InlineInput
                  value={form.firstExpert.valeurVenale}
                  onChange={updateNestedField('firstExpert', 'valeurVenale')}
                />
              </div>
              <div className="label">Valeur épave (sous réserve de la maximalisation)</div>
              <div className="field">
                <InlineInput
                  value={form.firstExpert.valeurEpave}
                  onChange={updateNestedField('firstExpert', 'valeurEpave')}
                />
              </div>
              <div className="label">Différence des valeurs</div>
              <div className="field">
                <InlineInput
                  value={form.firstExpert.valueDifference}
                  onChange={updateNestedField('firstExpert', 'valueDifference')}
                />
              </div>
            </div>

            <div className="preliminary-section-title">POSITION DU 2eme EXPERT :</div>
            <div className="preliminary-subtitle">ESTIMATION DES DOMMAGES :</div>
            <CheckboxLine
              checked={form.secondExpert.repairSelected}
              label="Réparation"
              onToggle={toggleRepairSelection('secondExpert')}
            />

            <div className="preliminary-estimation-table compact-gap">
              <div className="head">Désignation et descriptif</div>
              <div className="head">Valeur estimée</div>
              <div className="desc">-Fournitures (pièces, fournitures peinture)</div>
              <div className="amount">
                <InlineInput
                  value={form.secondExpert.suppliesAmount}
                  onChange={updateNestedField('secondExpert', 'suppliesAmount')}
                />
              </div>
              <div className="desc">-Main d&apos;oeuvre tôlerie</div>
              <div className="amount">
                <InlineInput
                  value={form.secondExpert.laborBodyAmount}
                  onChange={updateNestedField('secondExpert', 'laborBodyAmount')}
                />
              </div>
              <div className="desc">-Main d&apos;oeuvre peinture</div>
              <div className="amount">
                <InlineInput
                  value={form.secondExpert.laborPaintAmount}
                  onChange={updateNestedField('secondExpert', 'laborPaintAmount')}
                />
              </div>
              <div className="desc">-Main d&apos;oeuvre mécanique</div>
              <div className="amount">
                <InlineInput
                  value={form.secondExpert.laborMechanicalAmount}
                  onChange={updateNestedField('secondExpert', 'laborMechanicalAmount')}
                />
              </div>
              <div className="desc strong">Total brut des dommages</div>
              <div className="amount">
                <InlineInput
                  value={form.secondExpert.grossTotal}
                  onChange={updateNestedField('secondExpert', 'grossTotal')}
                />
              </div>
              <div className="desc">A déduire vétusté</div>
              <div className="amount">
                <InlineInput
                  value={form.secondExpert.vetusteAmount}
                  onChange={updateNestedField('secondExpert', 'vetusteAmount')}
                />
              </div>
              <div className="desc strong">Total net des dommages</div>
              <div className="amount">
                <InlineInput
                  value={form.secondExpert.netTotal}
                  onChange={updateNestedField('secondExpert', 'netTotal')}
                />
              </div>
            </div>

            <div className="preliminary-reforme-row spaced">
              <CheckboxLine
                checked={form.secondExpert.reformeType === 'economique'}
                label="Réforme Economique"
                onToggle={setReformeType('secondExpert', 'economique')}
              />
              <CheckboxLine
                checked={form.secondExpert.reformeType === 'technique'}
                label="Réforme Technique"
                onToggle={setReformeType('secondExpert', 'technique')}
              />
            </div>

            <div className="preliminary-value-table">
              <div className="label">Valeur Vénale</div>
              <div className="field">
                <InlineInput
                  value={form.secondExpert.valeurVenale}
                  onChange={updateNestedField('secondExpert', 'valeurVenale')}
                />
              </div>
              <div className="label">Valeur épave (sous réserve de la maximalisation)</div>
              <div className="field">
                <InlineInput
                  value={form.secondExpert.valeurEpave}
                  onChange={updateNestedField('secondExpert', 'valeurEpave')}
                />
              </div>
              <div className="label">Différence des valeurs</div>
              <div className="field">
                <InlineInput
                  value={form.secondExpert.valueDifference}
                  onChange={updateNestedField('secondExpert', 'valueDifference')}
                />
              </div>
            </div>

            <div className="preliminary-section-title">OBSERVATION OU MOTIF DE DESACORD :</div>
            <InlineTextarea
              value={form.observations}
              onChange={updateField('observations')}
              rows={7}
              className="preliminary-observations"
            />

            <p className="preliminary-footer-copy">
              En foi de quoi, la présente minute est établie pour servir et valoir ce que de droit .
            </p>

            <div className="preliminary-signature-date">
              Fait à{' '}
              <InlineInput value={form.city} onChange={updateField('city')} className="w-xs" />, le{' '}
              <InlineInput value={form.reportDate} onChange={updateField('reportDate')} className="w-sm" />
            </div>

            <div className="preliminary-signature-grid">
              <div>
                <div className="signature-title">EXPERT DE LA COMPAGNIE</div>
                <InlineInput
                  value={form.firstExpert.companyLabel}
                  onChange={updateNestedField('firstExpert', 'companyLabel')}
                  className="w-md"
                />
                <div className="signature-cabinet">
                  Cabinet{' '}
                  <InlineInput
                    value={form.firstExpert.cabinetLabel}
                    onChange={updateNestedField('firstExpert', 'cabinetLabel')}
                    className="w-md"
                  />
                </div>
              </div>
              <div>
                <div className="signature-title">EXPERT DE LA COMPAGNIE</div>
                <InlineInput
                  value={form.secondExpert.companyLabel}
                  onChange={updateNestedField('secondExpert', 'companyLabel')}
                  className="w-md"
                />
                <div className="signature-cabinet">
                  Cabinet{' '}
                  <InlineInput
                    value={form.secondExpert.cabinetLabel}
                    onChange={updateNestedField('secondExpert', 'cabinetLabel')}
                    className="w-md"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PreliminaryContradictoirePreviewPage;
