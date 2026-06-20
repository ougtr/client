import { useEffect, useState } from 'react';
import { createTenant, listTenants, updateTenant } from '../api/tenants';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  nom: '',
  slug: '',
  adminLogin: '',
  adminPassword: '',
};

const TenantManagementPage = () => {
  const { token, isSuperAdmin } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listTenants(token);
      setTenants(data);
    } catch (err) {
      setError(err.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isSuperAdmin]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await createTenant(token, {
        ...form,
        adminLogin: form.adminLogin || undefined,
        adminPassword: form.adminPassword || undefined,
      });
      setForm(initialForm);
      setMessage('Cabinet cree');
      refresh();
    } catch (err) {
      setError(err.message || 'Creation impossible');
    }
  };

  const toggleTenant = async (tenant) => {
    setError('');
    setMessage('');
    try {
      await updateTenant(token, tenant.id, { actif: !tenant.actif });
      setMessage('Cabinet mis a jour');
      refresh();
    } catch (err) {
      setError(err.message || 'Mise a jour impossible');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="page">
        <div className="alert alert-error">Acces reserve au super admin.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Cabinets</h1>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <section className="card">
        <h2>Creer un cabinet</h2>
        <form className="user-create-form" onSubmit={handleCreate}>
          <label className="form-field">
            <span>Nom cabinet</span>
            <input name="nom" value={form.nom} onChange={handleChange} required />
          </label>
          <label className="form-field">
            <span>Slug</span>
            <input name="slug" value={form.slug} onChange={handleChange} placeholder="optionnel" />
          </label>
          <label className="form-field">
            <span>Login admin</span>
            <input name="adminLogin" value={form.adminLogin} onChange={handleChange} />
          </label>
          <label className="form-field">
            <span>Mot de passe admin</span>
            <input name="adminPassword" value={form.adminPassword} onChange={handleChange} />
          </label>
          <button type="submit" className="btn btn-primary">Creer</button>
        </form>
      </section>

      <section className="card">
        <h2>Cabinets existants</h2>
        {loading ? (
          <div className="loading">Chargement...</div>
        ) : (
          <div className="table-wrapper">
            <table className="mission-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Slug</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>{tenant.nom}</td>
                    <td>{tenant.slug}</td>
                    <td>{tenant.actif ? 'Actif' : 'Inactif'}</td>
                    <td className="table-actions">
                      <button type="button" className="btn btn-action" onClick={() => toggleTenant(tenant)}>
                        {tenant.actif ? 'Desactiver' : 'Activer'}
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

export default TenantManagementPage;
