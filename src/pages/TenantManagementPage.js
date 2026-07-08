import { useEffect, useState } from 'react';
import { createTenant, listTenants, updateTenant } from '../api/tenants';
import { createUser, listUsers, updateUser } from '../api/users';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  nom: '',
  slug: '',
  adminLogin: '',
  adminPassword: '',
};

const initialUserForm = {
  login: '',
  password: '',
  role: 'AGENT',
};

const roleOptions = [
  { value: 'ADMIN_CABINET', label: 'Admin cabinet' },
  { value: 'GESTIONNAIRE', label: 'Gestionnaire' },
  { value: 'AGENT', label: 'Agent' },
];

const roleLabels = roleOptions.reduce((acc, option) => ({ ...acc, [option.value]: option.label }), {});

const generatePassword = () => {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `Expert-${randomPart}`;
};

const TenantManagementPage = () => {
  const { token, isSuperAdmin } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [expandedTenantId, setExpandedTenantId] = useState(null);
  const [tenantUsers, setTenantUsers] = useState({});
  const [userForms, setUserForms] = useState({});
  const [resetPasswords, setResetPasswords] = useState({});
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState({});
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

  const loadTenantUsers = async (tenantId) => {
    setUsersLoading((prev) => ({ ...prev, [tenantId]: true }));
    setError('');
    try {
      const data = await listUsers(token, { tenantId });
      setTenantUsers((prev) => ({ ...prev, [tenantId]: data }));
      setUserForms((prev) => ({
        ...prev,
        [tenantId]: prev[tenantId] || { ...initialUserForm },
      }));
    } catch (err) {
      setError(err.message || 'Chargement des utilisateurs impossible');
    } finally {
      setUsersLoading((prev) => ({ ...prev, [tenantId]: false }));
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
      if (form.adminLogin && form.adminPassword) {
        setVisiblePasswords((prev) => ({
          ...prev,
          newCabinetAdmin: { login: form.adminLogin, password: form.adminPassword },
        }));
      }
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

  const toggleUsersPanel = async (tenantId) => {
    const nextTenantId = expandedTenantId === tenantId ? null : tenantId;
    setExpandedTenantId(nextTenantId);
    if (nextTenantId && !tenantUsers[nextTenantId]) {
      await loadTenantUsers(nextTenantId);
    }
  };

  const handleUserFormChange = (tenantId, field, value) => {
    setUserForms((prev) => ({
      ...prev,
      [tenantId]: {
        ...(prev[tenantId] || initialUserForm),
        [field]: value,
      },
    }));
  };

  const handleCreateUser = async (event, tenantId) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const currentForm = userForms[tenantId] || initialUserForm;
    const password = currentForm.password || generatePassword();

    try {
      const created = await createUser(token, {
        ...currentForm,
        password,
        tenantId,
      });
      setVisiblePasswords((prev) => ({
        ...prev,
        [`user-${created.id}`]: { login: created.login, password },
      }));
      setUserForms((prev) => ({ ...prev, [tenantId]: { ...initialUserForm } }));
      setMessage('Utilisateur cree');
      await loadTenantUsers(tenantId);
    } catch (err) {
      setError(err.message || 'Creation utilisateur impossible');
    }
  };

  const handleResetPasswordChange = (userId, value) => {
    setResetPasswords((prev) => ({ ...prev, [userId]: value }));
  };

  const handleResetPassword = async (tenantId, userItem) => {
    setError('');
    setMessage('');
    const password = resetPasswords[userItem.id] || generatePassword();

    try {
      await updateUser(token, userItem.id, { password });
      setVisiblePasswords((prev) => ({
        ...prev,
        [`user-${userItem.id}`]: { login: userItem.login, password },
      }));
      setResetPasswords((prev) => ({ ...prev, [userItem.id]: '' }));
      setMessage(`Mot de passe reinitialise pour ${userItem.login}`);
      await loadTenantUsers(tenantId);
    } catch (err) {
      setError(err.message || 'Reinitialisation impossible');
    }
  };

  const copyPassword = async (password) => {
    try {
      await navigator.clipboard.writeText(password);
      setMessage('Mot de passe copie');
    } catch (err) {
      setError('Copie impossible, selectionnez le mot de passe manuellement');
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
      {visiblePasswords.newCabinetAdmin && (
        <div className="alert alert-success password-alert">
          <strong>Admin cree :</strong> {visiblePasswords.newCabinetAdmin.login}
          <span>Mot de passe : {visiblePasswords.newCabinetAdmin.password}</span>
          <button
            type="button"
            className="btn btn-action"
            onClick={() => copyPassword(visiblePasswords.newCabinetAdmin.password)}
          >
            Copier
          </button>
        </div>
      )}

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
            <input name="adminPassword" type="text" value={form.adminPassword} onChange={handleChange} />
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
                    <td colSpan="4" className="tenant-row-cell">
                      <div className="tenant-row-main">
                        <div className="tenant-row-info">
                          <strong>{tenant.nom}</strong>
                          <span>{tenant.slug}</span>
                          <span className={tenant.actif ? 'status-badge status-active' : 'status-badge status-inactive'}>
                            {tenant.actif ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        <div className="table-actions">
                          <button type="button" className="btn btn-action" onClick={() => toggleUsersPanel(tenant.id)}>
                            {expandedTenantId === tenant.id ? 'Masquer utilisateurs' : 'Utilisateurs'}
                          </button>
                          <button type="button" className="btn btn-action" onClick={() => toggleTenant(tenant)}>
                            {tenant.actif ? 'Desactiver' : 'Activer'}
                          </button>
                        </div>
                      </div>

                      {expandedTenantId === tenant.id && (
                        <div className="tenant-users-panel">
                          <h3>Utilisateurs du cabinet</h3>
                          <form className="tenant-user-form" onSubmit={(event) => handleCreateUser(event, tenant.id)}>
                            <label className="form-field">
                              <span>Login</span>
                              <input
                                value={userForms[tenant.id]?.login || ''}
                                onChange={(event) => handleUserFormChange(tenant.id, 'login', event.target.value)}
                                required
                              />
                            </label>
                            <label className="form-field">
                              <span>Mot de passe initial</span>
                              <input
                                type="text"
                                placeholder="Vide = genere automatiquement"
                                value={userForms[tenant.id]?.password || ''}
                                onChange={(event) => handleUserFormChange(tenant.id, 'password', event.target.value)}
                              />
                            </label>
                            <label className="form-field">
                              <span>Role</span>
                              <select
                                value={userForms[tenant.id]?.role || initialUserForm.role}
                                onChange={(event) => handleUserFormChange(tenant.id, 'role', event.target.value)}
                              >
                                {roleOptions.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </label>
                            <button type="submit" className="btn btn-primary">Creer utilisateur</button>
                          </form>

                          {usersLoading[tenant.id] ? (
                            <div className="loading">Chargement des utilisateurs...</div>
                          ) : (
                            <div className="table-wrapper">
                              <table className="mission-table tenant-users-table">
                                <thead>
                                  <tr>
                                    <th>Login</th>
                                    <th>Role</th>
                                    <th>Nouveau mot de passe</th>
                                    <th>Mot de passe visible</th>
                                    <th></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(tenantUsers[tenant.id] || []).map((item) => {
                                    const passwordInfo = visiblePasswords[`user-${item.id}`];
                                    return (
                                      <tr key={item.id}>
                                        <td>{item.login}</td>
                                        <td>{roleLabels[item.role] || item.role}</td>
                                        <td>
                                          <input
                                            type="text"
                                            placeholder="Vide = genere automatiquement"
                                            value={resetPasswords[item.id] || ''}
                                            onChange={(event) => handleResetPasswordChange(item.id, event.target.value)}
                                          />
                                        </td>
                                        <td>
                                          {passwordInfo ? (
                                            <div className="visible-password">
                                              <span>{passwordInfo.password}</span>
                                              <button
                                                type="button"
                                                className="btn btn-action"
                                                onClick={() => copyPassword(passwordInfo.password)}
                                              >
                                                Copier
                                              </button>
                                            </div>
                                          ) : (
                                            <span className="muted-text">Non disponible</span>
                                          )}
                                        </td>
                                        <td className="table-actions">
                                          <button
                                            type="button"
                                            className="btn btn-action"
                                            onClick={() => handleResetPassword(tenant.id, item)}
                                          >
                                            Reinitialiser
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {(tenantUsers[tenant.id] || []).length === 0 && (
                                    <tr>
                                      <td colSpan="5" className="empty-cell">Aucun utilisateur pour ce cabinet.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
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
