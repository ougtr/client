import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  listInsurers,
  createInsurer,
  updateInsurer,
  deleteInsurer,
} from '../api/insurers';
import {
  listAgencies,
  createAgency,
  updateAgency,
  deleteAgency,
} from '../api/insurerAgencies';

const emptyForm = { nom: '', contact: '' };
const emptyAgencyForm = { insurerId: '', nom: '', adresse: '', telephone: '' };

const InsurersPage = () => {
  const { token, isManager } = useAuth();
  const [insurers, setInsurers] = useState([]);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [edits, setEdits] = useState({});
  const [agencies, setAgencies] = useState([]);
  const [agencyEdits, setAgencyEdits] = useState({});
  const [agencyForm, setAgencyForm] = useState(emptyAgencyForm);
  const [agencyFilter, setAgencyFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agencySaving, setAgencySaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const canManage = isManager;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [insurersData, agenciesData] = await Promise.all([
        listInsurers(token),
        listAgencies(token),
      ]);
      setInsurers(insurersData);
      setAgencies(agenciesData);
      const nextEdits = insurersData.reduce((acc, insurer) => {
        acc[insurer.id] = { nom: insurer.nom, contact: insurer.contact || '' };
        return acc;
      }, {});
      setEdits(nextEdits);
      const nextAgencyEdits = agenciesData.reduce((acc, agency) => {
        acc[agency.id] = {
          insurerId: String(agency.insurerId),
          nom: agency.nom,
          adresse: agency.adresse || '',
          telephone: agency.telephone || '',
        };
        return acc;
      }, {});
      setAgencyEdits(nextAgencyEdits);
      if (!agencyForm.insurerId && insurersData.length) {
        setAgencyForm((prev) => ({ ...prev, insurerId: String(insurersData[0].id) }));
      }
    } catch (err) {
      setError(err.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [token, agencyForm.insurerId]);

  useEffect(() => {
    if (canManage) {
      refresh();
    }
  }, [canManage, refresh]);

  const handleCreateChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await createInsurer(token, createForm);
      setMessage('Assureur ajoute');
      setCreateForm(emptyForm);
      refresh();
    } catch (err) {
      setError(err.message || 'Creation impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleEditChange = (id, field, value) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleUpdate = async (id) => {
    setError('');
    setMessage('');
    const payload = edits[id];
    if (!payload) {
      return;
    }
    setSaving(true);
    try {
      await updateInsurer(token, id, payload);
      setMessage('Assureur mis a jour');
      refresh();
    } catch (err) {
      setError(err.message || 'Mise a jour impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setError('');
    setMessage('');
    const confirmed = window.confirm('Supprimer cet assureur ?');
    if (!confirmed) {
      return;
    }
    setSaving(true);
    try {
      await deleteInsurer(token, id);
      setMessage('Assureur supprime');
      refresh();
    } catch (err) {
      setError(err.message || 'Suppression impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleAgencyCreateChange = (event) => {
    const { name, value } = event.target;
    setAgencyForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateAgency = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setAgencySaving(true);
    try {
      await createAgency(token, agencyForm);
      setMessage('Agence ajoutee');
      setAgencyForm((prev) => ({ ...prev, nom: '', adresse: '', telephone: '' }));
      refresh();
    } catch (err) {
      setError(err.message || 'Creation agence impossible');
    } finally {
      setAgencySaving(false);
    }
  };

  const handleAgencyEditChange = (id, field, value) => {
    setAgencyEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleUpdateAgency = async (id) => {
    setError('');
    setMessage('');
    const payload = agencyEdits[id];
    if (!payload) {
      return;
    }
    setAgencySaving(true);
    try {
      await updateAgency(token, id, payload);
      setMessage('Agence mise a jour');
      refresh();
    } catch (err) {
      setError(err.message || 'Mise a jour agence impossible');
    } finally {
      setAgencySaving(false);
    }
  };

  const handleDeleteAgency = async (id) => {
    setError('');
    setMessage('');
    const confirmed = window.confirm('Supprimer cette agence ?');
    if (!confirmed) {
      return;
    }
    setAgencySaving(true);
    try {
      await deleteAgency(token, id);
      setMessage('Agence supprimee');
      refresh();
    } catch (err) {
      setError(err.message || 'Suppression agence impossible');
    } finally {
      setAgencySaving(false);
    }
  };

  const handleAgencyFilterChange = (event) => {
    setAgencyFilter(event.target.value);
  };

  const filteredAgencies = useMemo(() => {
    if (!agencyFilter) {
      return agencies;
    }
    return agencies.filter((agency) => String(agency.insurerId) === agencyFilter);
  }, [agencies, agencyFilter]);

  if (!canManage) {
    return (
      <div className="page">
        <div className="alert alert-error">Acces reserve au gestionnaire.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Gestion des assureurs</h1>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <section className="card">
        <h2>Ajouter un assureur</h2>
        <form className="user-create-form" onSubmit={handleCreate}>
          <label className="form-field">
            <span>Nom</span>
            <input
              name="nom"
              value={createForm.nom}
              onChange={handleCreateChange}
              required
            />
          </label>
          <label className="form-field">
            <span>Contact</span>
            <input
              name="contact"
              value={createForm.contact}
              onChange={handleCreateChange}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Ajouter'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Liste des assureurs</h2>
        {loading ? (
          <div className="loading">Chargement...</div>
        ) : (
          <div className="table-wrapper">
            <table className="mission-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Contact</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {insurers.map((insurer) => (
                  <tr key={insurer.id}>
                    <td>
                      <input
                        value={edits[insurer.id]?.nom || ''}
                        onChange={(event) => handleEditChange(insurer.id, 'nom', event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        value={edits[insurer.id]?.contact || ''}
                        onChange={(event) => handleEditChange(insurer.id, 'contact', event.target.value)}
                      />
                    </td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className="btn btn-action"
                        onClick={() => handleUpdate(insurer.id)}
                        disabled={saving}
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        className="btn btn-action text-danger"
                        onClick={() => handleDelete(insurer.id)}
                        disabled={saving}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Agences d'assurance</h2>
        <form className="user-create-form" onSubmit={handleCreateAgency}>
          <label className="form-field required">
            <span>Assureur</span>
            <select
              name="insurerId"
              value={agencyForm.insurerId}
              onChange={handleAgencyCreateChange}
              required
            >
              <option value="">Selectionner un assureur</option>
              {insurers.map((insurer) => (
                <option key={insurer.id} value={insurer.id}>
                  {insurer.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Nom de l'agence</span>
            <input name="nom" value={agencyForm.nom} onChange={handleAgencyCreateChange} required />
          </label>
          <label className="form-field">
            <span>Adresse</span>
            <input name="adresse" value={agencyForm.adresse} onChange={handleAgencyCreateChange} />
          </label>
          <label className="form-field">
            <span>Telephone</span>
            <input name="telephone" value={agencyForm.telephone} onChange={handleAgencyCreateChange} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={agencySaving}>
            {agencySaving ? 'Enregistrement...' : 'Ajouter'}
          </button>
        </form>

        <div className="filters-actions" style={{ marginTop: '1rem' }}>
          <label className="form-field">
            <span>Filtrer par assureur</span>
            <select value={agencyFilter} onChange={handleAgencyFilterChange}>
              <option value="">Tous</option>
              {insurers.map((insurer) => (
                <option key={insurer.id} value={insurer.id}>
                  {insurer.nom}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="table-wrapper" style={{ marginTop: '1rem' }}>
          {loading ? (
            <div className="loading">Chargement...</div>
          ) : filteredAgencies.length === 0 ? (
            <p className="muted">Aucune agence.</p>
          ) : (
            <table className="mission-table">
              <thead>
                <tr>
                  <th>Assureur</th>
                  <th>Agence</th>
                  <th>Adresse</th>
                  <th>Telephone</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredAgencies.map((agency) => (
                  <tr key={agency.id}>
                    <td>
                      <select
                        value={agencyEdits[agency.id]?.insurerId || ''}
                        onChange={(event) => handleAgencyEditChange(agency.id, 'insurerId', event.target.value)}
                      >
                        {insurers.map((insurer) => (
                          <option key={insurer.id} value={insurer.id}>
                            {insurer.nom}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={agencyEdits[agency.id]?.nom || ''}
                        onChange={(event) => handleAgencyEditChange(agency.id, 'nom', event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        value={agencyEdits[agency.id]?.adresse || ''}
                        onChange={(event) => handleAgencyEditChange(agency.id, 'adresse', event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        value={agencyEdits[agency.id]?.telephone || ''}
                        onChange={(event) => handleAgencyEditChange(agency.id, 'telephone', event.target.value)}
                      />
                    </td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className="btn btn-action"
                        onClick={() => handleUpdateAgency(agency.id)}
                        disabled={agencySaving}
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        className="btn btn-action text-danger"
                        onClick={() => handleDeleteAgency(agency.id)}
                        disabled={agencySaving}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};

export default InsurersPage;
