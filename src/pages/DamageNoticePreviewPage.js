import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { downloadMissionPdfBlob, getMission } from '../api/missions';
import ToastStack from '../components/ToastStack';
import SkeletonBlock from '../components/SkeletonBlock';

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

const buildInitialForm = (data) => {
  const mission = data?.mission || {};
  const subjectVehicleLabel = [mission.vehiculeMarque, mission.vehiculeModele].filter(Boolean).join(' ');

  return {
    city: 'Casablanca',
    reportDate: formatToday(),
    recipientInsurer: mission.assureurNom || '',
    recipientAddressLine1: mission.assureurAgenceAdresse || '',
    recipientAddressLine2: '',
    recipientAddressLine3: '',
    serviceLabel: 'SERVICE SINISTRES MATERIELS :',
    victimReferencePrefix: 'POL Ndeg:',
    victimReference: mission.sinistrePolice || '',
    noticeReference: mission.missionCode || '',
    accidentDate: formatDate(mission.sinistreDate),
    subjectOwnerName: mission.assureNom || '',
    adverseOwnerName: mission.sinistreNomAdverse || '',
    subjectVehicleLabel,
    subjectVehicleRegistration: mission.vehiculeImmatriculation || '',
    subjectPolicyNumber: mission.sinistrePolice || '',
    adverseVehicleLabel: '',
    adverseVehicleRegistration: mission.sinistreImmatriculationAdverse || '',
    adversePolicyNumber: mission.sinistrePoliceAdverse || '',
    adverseInsurer: mission.assureurAdverseNom || '',
    mandatingCabinetName: '',
    ceilingArticle: "l'article 25",
    conventionalCeiling: '20.000,00',
    salutation: 'Messieurs,',
    waitingLine: "Dans l'attente de vous lire,",
    closingLine: "Veuillez agreer, Messieurs, l'expression de mes salutations distinguees.",
    signatureLabel: 'OPALE EXPERTISE',
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

const DamageNoticePreviewPage = () => {
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

  const handleGenerate = async () => {
    if (!form) {
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const blob = await downloadMissionPdfBlob(token, id, 'damage-notice-report', {
        method: 'POST',
        body: form,
      });
      const filename = `avis-dommages-mission-${id}.pdf`;
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      pushToast('success', 'PDF genere.');
    } catch (err) {
      setError(err.message || "Impossible de generer l'avis des dommages");
      pushToast('error', err.message || "Impossible de generer l'avis des dommages");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <SkeletonBlock lines={5} />
        <SkeletonBlock lines={8} />
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate(`/missions/${id}`)}>
          Retour a la mission
        </button>
      </div>
    );
  }

  return (
    <div className="page damage-notice-preview-page">
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
            <span className="breadcrumb-chip">Avis des dommages</span>
          </div>
          <h1>Previsualisation de l'avis des dommages</h1>
          <p className="muted">
            Les donnees connues sont pre-remplies. Tu peux modifier librement tout le contenu avant generation.
          </p>
        </div>
        <div className="status-panel">
          <button type="button" className="btn btn-outline" onClick={() => navigate(`/missions/${id}`)}>
            Retour
          </button>
          <button type="button" className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generation...' : 'Generer le PDF'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="card">
        <p className="muted preliminary-preview-note">
          Ce PDF est telecharge directement. Il n'est pas ajoute automatiquement aux documents de la mission.
        </p>

        <div className="preliminary-paper-stack">
          <div className="damage-notice-paper">
            <div className="damage-notice-topline">
              <span>
                <InlineInput value={form.city} onChange={updateField('city')} className="w-xs" />
              </span>
              <span> le, </span>
              <InlineInput value={form.reportDate} onChange={updateField('reportDate')} className="w-sm" />
            </div>

            <div className="damage-notice-header-grid">
              <div className="damage-notice-left-block">
                <div className="damage-notice-underlined">
                  <InlineInput value={form.serviceLabel} onChange={updateField('serviceLabel')} />
                </div>
                <div className="damage-notice-underlined damage-notice-line-row">
                  <span>V.REF :</span>
                  <InlineInput value={form.victimReferencePrefix} onChange={updateField('victimReferencePrefix')} className="w-sm" />
                  <InlineInput value={form.victimReference} onChange={updateField('victimReference')} className="w-sm" />
                </div>
                <div className="damage-notice-underlined damage-notice-line-row">
                  <span>N.REF :</span>
                  <InlineInput value={form.noticeReference} onChange={updateField('noticeReference')} className="w-md" />
                </div>
                <div className="damage-notice-underlined damage-notice-line-row">
                  <span>ACC.DU :</span>
                  <InlineInput value={form.accidentDate} onChange={updateField('accidentDate')} className="w-sm" />
                </div>
                <div className="damage-notice-name-line">
                  <InlineInput value={form.subjectOwnerName} onChange={updateField('subjectOwnerName')} className="w-md" />
                </div>
                <div className="damage-notice-separator">C/</div>
                <div className="damage-notice-name-line">
                  <InlineInput value={form.adverseOwnerName} onChange={updateField('adverseOwnerName')} className="w-md" />
                </div>
              </div>

              <div className="damage-notice-right-block">
                <div className="damage-notice-underlined">
                  <InlineInput value={form.recipientInsurer} onChange={updateField('recipientInsurer')} className="w-md" />
                </div>
                <div className="damage-notice-underlined">
                  <InlineInput
                    value={form.recipientAddressLine1}
                    onChange={updateField('recipientAddressLine1')}
                    className="w-md"
                  />
                </div>
                <div className="damage-notice-underlined">
                  <InlineInput
                    value={form.recipientAddressLine2}
                    onChange={updateField('recipientAddressLine2')}
                    className="w-md"
                  />
                </div>
                <div className="damage-notice-underlined">
                  <InlineInput
                    value={form.recipientAddressLine3}
                    onChange={updateField('recipientAddressLine3')}
                    className="w-md"
                  />
                </div>
              </div>
            </div>

            <div className="damage-notice-title">
              <div>AVIS DES DOMMAGES SUPERIEURS AU PLAFOND</div>
              <div>D&apos;INCONTESTABILITE</div>
            </div>

            <div className="damage-notice-body">
              <p>
                <InlineInput value={form.salutation} onChange={updateField('salutation')} className="w-sm" />
              </p>
              <p>
                Dans le cadre de la convention d&apos;expertises directes dont le cabinet d&apos;assurance{' '}
                <InlineInput
                  value={form.mandatingCabinetName}
                  onChange={updateField('mandatingCabinetName')}
                  className="w-sm"
                />{' '}
                m&apos;a commis pour proceder a l&apos;expertise du vehicule{' '}
                <InlineInput
                  value={form.subjectVehicleLabel}
                  onChange={updateField('subjectVehicleLabel')}
                  className="w-md"
                />
                , Mle:{' '}
                <InlineInput
                  value={form.subjectVehicleRegistration}
                  onChange={updateField('subjectVehicleRegistration')}
                  className="w-sm"
                />
                , appartenant a{' '}
                <InlineInput value={form.subjectOwnerName} onChange={updateField('subjectOwnerName')} className="w-md" />
                , assure par vos soins par Police Ndeg:{' '}
                <InlineInput
                  value={form.subjectPolicyNumber}
                  onChange={updateField('subjectPolicyNumber')}
                  className="w-sm"
                />
                , lors du sinistre qui se serait produit le{' '}
                <InlineInput value={form.accidentDate} onChange={updateField('accidentDate')} className="w-sm" />
                , avec le vehicule{' '}
                <InlineInput
                  value={form.adverseVehicleLabel}
                  onChange={updateField('adverseVehicleLabel')}
                  className="w-md"
                />
                , Mle:{' '}
                <InlineInput
                  value={form.adverseVehicleRegistration}
                  onChange={updateField('adverseVehicleRegistration')}
                  className="w-sm"
                />
                {' '}appartenant a{' '}
                <InlineInput value={form.adverseOwnerName} onChange={updateField('adverseOwnerName')} className="w-md" />
                , assure a{' '}
                <InlineInput value={form.adverseInsurer} onChange={updateField('adverseInsurer')} className="w-sm" />
                {' '}par Police Ndeg:{' '}
                <InlineInput
                  value={form.adversePolicyNumber}
                  onChange={updateField('adversePolicyNumber')}
                  className="w-sm"
                />
                .
              </p>
              <p>
                Je vous informe qu&apos;aux premiers examens, le cout de reparation du vehicule en question est
                superieur au Plafond conventionnel d&apos;incontestabilite prevu par{' '}
                <InlineInput value={form.ceilingArticle} onChange={updateField('ceilingArticle')} className="w-sm" /> (+{' '}
                <InlineInput
                  value={form.conventionalCeiling}
                  onChange={updateField('conventionalCeiling')}
                  className="w-sm"
                />{' '}
                DHS).
              </p>
              <p>
                <InlineInput value={form.waitingLine} onChange={updateField('waitingLine')} className="damage-notice-full-input" />
              </p>
              <p>
                <InlineInput value={form.closingLine} onChange={updateField('closingLine')} className="damage-notice-full-input" />
              </p>
            </div>

            <div className="damage-notice-signature">
              <InlineInput value={form.signatureLabel} onChange={updateField('signatureLabel')} className="w-md" />
            </div>
            <div className="damage-notice-stamp-hint">Cachet OPALE applique a la generation du PDF</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DamageNoticePreviewPage;
