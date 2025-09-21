import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  listInsurers,
  createInsurer,
  updateInsurer,
  deleteInsurer,
} from '../api/insurers';

const emptyForm = { nom: '', contact: '' };

const InsurersPage = () => {
  const { token, isManager } = useAuth();
  const [insurers, setInsurers] = useState([]);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const canManage = isManager;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listInsurers(token);
      setInsurers(data);
      const nextEdits = data.reduce((acc, insurer) => {
        acc[insurer.id] = { nom: insurer.nom, contact: insurer.contact || '' };
        return acc;
      }, {});
      setEdits(nextEdits);
    } catch (err) {
      setError(err.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (canManage) {
      refresh();
    }
  }, [canManage, refresh]);

  if (!canManage) {
    return (
      <div className="page">
        <div className="alert alert-error">Acces reserve au gestionnaire.</div>
      </div>
    );
  }

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
    </div>
  );
};

export default InsurersPage;
