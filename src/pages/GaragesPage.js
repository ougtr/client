import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listGarages, createGarage, updateGarage, deleteGarage } from '../api/garages';

const emptyForm = { nom: '', adresse: '', contact: '' };

const GaragesPage = () => {
  const { token, isManager } = useAuth();
  const [garages, setGarages] = useState([]);
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
      const data = await listGarages(token);
      setGarages(data);
      const nextEdits = data.reduce((acc, garage) => {
        acc[garage.id] = {
          nom: garage.nom,
          adresse: garage.adresse || '',
          contact: garage.contact || '',
        };
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
      await createGarage(token, createForm);
      setMessage('Garage ajoute');
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
      [id]: {
        ...prev[id],
        [field]: value,
      },
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
      await updateGarage(token, id, payload);
      setMessage('Garage mis a jour');
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
    const confirmed = window.confirm('Supprimer ce garage ?');
    if (!confirmed) {
      return;
    }
    setSaving(true);
    try {
      await deleteGarage(token, id);
      setMessage('Garage supprime');
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
        <h1>Gestion des garages</h1>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <section className="card">
        <h2>Ajouter un garage</h2>
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
            <span>Adresse</span>
            <input
              name="adresse"
              value={createForm.adresse}
              onChange={handleCreateChange}
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
        <h2>Liste des garages</h2>
        {loading ? (
          <div className="loading">Chargement...</div>
        ) : (
          <div className="table-wrapper">
            <table className="mission-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Adresse</th>
                  <th>Contact</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {garages.map((garage) => (
                  <tr key={garage.id}>
                    <td>
                      <input
                        value={edits[garage.id]?.nom || ''}
                        onChange={(event) => handleEditChange(garage.id, 'nom', event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        value={edits[garage.id]?.adresse || ''}
                        onChange={(event) => handleEditChange(garage.id, 'adresse', event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        value={edits[garage.id]?.contact || ''}
                        onChange={(event) => handleEditChange(garage.id, 'contact', event.target.value)}
                      />
                    </td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className="btn btn-action"
                        onClick={() => handleUpdate(garage.id)}
                        disabled={saving}
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        className="btn btn-action text-danger"
                        onClick={() => handleDelete(garage.id)}
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

export default GaragesPage;
