import { useEffect, useState } from 'react';
import { ASSET_URL } from '../api/http';
import { getTenantSettings, updateTenantSettings } from '../api/tenantSettings';
import { useAuth } from '../context/AuthContext';

const textFields = [
  { name: 'cabinetNom', label: 'Nom du cabinet' },
  { name: 'expertNom', label: 'Nom expert' },
  { name: 'cabinetAdresse', label: 'Adresse' },
  { name: 'cabinetTelephone', label: 'Telephone' },
  { name: 'cabinetEmail', label: 'Email' },
  { name: 'cabinetSiteWeb', label: 'Site web' },
  { name: 'villeDefaut', label: 'Ville par defaut' },
  { name: 'missionReferencePrefix', label: 'Prefixe reference mission' },
  { name: 'ice', label: 'ICE' },
  { name: 'identifiantFiscal', label: 'IF' },
  { name: 'registreCommerce', label: 'RC' },
  { name: 'cnss', label: 'CNSS' },
  { name: 'banque', label: 'Banque' },
  { name: 'rib', label: 'RIB' },
];

const colorFields = [
  { name: 'rapportCouleurPrimaire', label: 'Couleur principale rapport', fallback: '#d90429' },
  { name: 'rapportCouleurSecondaire', label: 'Couleur secondaire rapport', fallback: '#111827' },
];

const multilineFields = [
  { name: 'rapportFooter', label: 'Texte footer rapport' },
  { name: 'mentionsLegales', label: 'Mentions legales / textes standards' },
];

const initialSettings = [...textFields, ...colorFields, ...multilineFields].reduce(
  (acc, field) => ({ ...acc, [field.name]: '' }),
  {}
);

const assetUrl = (path) => (path ? `${ASSET_URL}/uploads/${path}` : '');
const isHexColor = (value) => /^#[0-9a-f]{6}$/i.test(String(value || '').trim());

const TenantSettingsPage = () => {
  const { token, isManager } = useAuth();
  const [form, setForm] = useState(initialSettings);
  const [currentAssets, setCurrentAssets] = useState({ logoPath: '', cachetPath: '' });
  const [files, setFiles] = useState({ logo: null, cachet: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTenantSettings(token);
      setForm({ ...initialSettings, ...data });
      setCurrentAssets({
        logoPath: data.logoPath || '',
        cachetPath: data.cachetPath || '',
      });
    } catch (err) {
      setError(err.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isManager) {
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isManager]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    const { name, files: selectedFiles } = event.target;
    setFiles((prev) => ({ ...prev, [name]: selectedFiles?.[0] || null }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data = await updateTenantSettings(token, form, files);
      setForm({ ...initialSettings, ...data });
      setCurrentAssets({
        logoPath: data.logoPath || '',
        cachetPath: data.cachetPath || '',
      });
      setFiles({ logo: null, cachet: null });
      setMessage('Parametres cabinet enregistres');
    } catch (err) {
      setError(err.message || 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  if (!isManager) {
    return (
      <div className="page">
        <div className="alert alert-error">Acces reserve aux admins du cabinet.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Parametres cabinet</h1>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : (
        <form className="form-grid tenant-settings-form" onSubmit={handleSubmit}>
          <section className="card">
            <h2>Identite et rapport</h2>
            <div className="tenant-settings-grid">
              {textFields.map((field) => (
                <label className="form-field" key={field.name}>
                  <span>{field.label}</span>
                  <input name={field.name} value={form[field.name] || ''} onChange={handleChange} />
                </label>
              ))}
              {colorFields.map((field) => (
                <label className="form-field" key={field.name}>
                  <span>{field.label}</span>
                  <div className="color-picker-row">
                    <input
                      className="color-picker-input"
                      name={field.name}
                      type="color"
                      value={isHexColor(form[field.name]) ? form[field.name] : field.fallback}
                      onChange={handleChange}
                    />
                    <input
                      name={field.name}
                      value={form[field.name] || ''}
                      onChange={handleChange}
                      placeholder={field.fallback}
                      pattern="#[0-9a-fA-F]{6}"
                    />
                  </div>
                </label>
              ))}
              {multilineFields.map((field) => (
                <label className="form-field form-field-full" key={field.name}>
                  <span>{field.label}</span>
                  <textarea
                    name={field.name}
                    value={form[field.name] || ''}
                    onChange={handleChange}
                    rows={3}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Logo et cachet</h2>
            <div className="tenant-settings-grid">
              <label className="form-field file-field">
                <span>Logo</span>
                <small className="field-help">
                  Proportions recommandees : 347 x 72 px pour le web. Le rapport PDF force un rendu maximum de
                  260 x 55 px pour eviter les debordements.
                </small>
                <input name="logo" type="file" accept="image/*" onChange={handleFileChange} />
                {currentAssets.logoPath && (
                  <div className="logo-proportion-frame">
                    <img className="settings-logo-preview" src={assetUrl(currentAssets.logoPath)} alt="Logo cabinet" />
                  </div>
                )}
              </label>
              <label className="form-field file-field">
                <span>Cachet / signature</span>
                <input name="cachet" type="file" accept="image/*" onChange={handleFileChange} />
                {currentAssets.cachetPath && (
                  <img className="settings-image-preview" src={assetUrl(currentAssets.cachetPath)} alt="Cachet cabinet" />
                )}
              </label>
            </div>
          </section>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TenantSettingsPage;
