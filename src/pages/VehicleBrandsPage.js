import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  listVehicleBrands,
  createVehicleBrand,
  updateVehicleBrand,
  deleteVehicleBrand,
} from '../api/vehicleBrands';

const emptyForm = { nom: '' };

const VehicleBrandsPage = () => {
  const { token, isManager } = useAuth();
  const [brands, setBrands] = useState([]);
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
      const data = await listVehicleBrands(token);
      setBrands(data);
      const nextEdits = data.reduce((acc, brand) => {
        acc[brand.id] = { nom: brand.nom };
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
      await createVehicleBrand(token, createForm);
      setMessage('Marque ajoutee');
      setCreateForm(emptyForm);
      refresh();
    } catch (err) {
      setError(err.message || 'Creation impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleEditChange = (id, value) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { nom: value },
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
      await updateVehicleBrand(token, id, payload);
      setMessage('Marque mise a jour');
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
    const confirmed = window.confirm('Supprimer cette marque ?');
    if (!confirmed) {
      return;
    }
    setSaving(true);
    try {
      await deleteVehicleBrand(token, id);
      setMessage('Marque supprimee');
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
        <h1>Gestion des marques vehicule</h1>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <section className="card">
        <h2>Ajouter une marque</h2>
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
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Ajouter'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Liste des marques</h2>
        {loading ? (
          <div className="loading">Chargement...</div>
        ) : (
          <div className="table-wrapper">
            <table className="mission-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => (
                  <tr key={brand.id}>
                    <td>
                      <input
                        value={edits[brand.id]?.nom || ''}
                        onChange={(event) => handleEditChange(brand.id, event.target.value)}
                      />
                    </td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className="btn btn-action"
                        onClick={() => handleUpdate(brand.id)}
                        disabled={saving}
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        className="btn btn-action text-danger"
                        onClick={() => handleDelete(brand.id)}
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

export default VehicleBrandsPage;
