import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createUser, deleteUser, listUsers, updateUser } from '../api/users';

const initialCreate = { login: '', password: '', role: 'AGENT' };

const UserManagementPage = () => {
  const { token, isManager, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [edits, setEdits] = useState({});
  const [createForm, setCreateForm] = useState(initialCreate);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listUsers(token);
      setUsers(data);
      const nextEdits = data.reduce((acc, current) => {
        acc[current.id] = { role: current.role, password: '' };
        return acc;
      }, {});
      setEdits(nextEdits);
    } catch (err) {
      setError(err.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isManager) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isManager]);

  const handleCreateChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await createUser(token, createForm);
      setCreateForm(initialCreate);
      setMessage('Utilisateur cree');
      refresh();
    } catch (err) {
      setError(err.message || 'Creation impossible');
    }
  };

  const handleEditChange = (id, field, value) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleUpdate = async (id) => {
    setMessage('');
    const payload = {};
    const current = edits[id];
    if (!current) {
      return;
    }
    if (current.role) {
      payload.role = current.role;
    }
    if (current.password) {
      payload.password = current.password;
    }
    try {
      await updateUser(token, id, payload);
      setMessage('Utilisateur mis a jour');
      refresh();
    } catch (err) {
      setError(err.message || 'Mise a jour impossible');
    }
  };

  const handleDelete = async (id) => {
    if (id === user?.id) {
      setError('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }
    const confirmed = window.confirm('Supprimer cet utilisateur ?');
    if (!confirmed) {
      return;
    }
    setMessage('');
    try {
      await deleteUser(token, id);
      setMessage('Utilisateur supprime');
      refresh();
    } catch (err) {
      setError(err.message || 'Suppression impossible');
    }
  };

  if (!isManager) {
    return (
      <div className="page">
        <div className="alert alert-error">Acces reserve au gestionnaire.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Gestion des utilisateurs</h1>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      <section className="card">
        <h2>Creer un utilisateur</h2>
        <form className="user-create-form" onSubmit={handleCreate}>
          <label className="form-field">
            <span>Identifiant</span>
            <input name="login" value={createForm.login} onChange={handleCreateChange} required />
          </label>
          <label className="form-field">
            <span>Mot de passe</span>
            <input name="password" value={createForm.password} onChange={handleCreateChange} required />
          </label>
          <label className="form-field">
            <span>Role</span>
            <select name="role" value={createForm.role} onChange={handleCreateChange}>
              <option value="GESTIONNAIRE">Gestionnaire</option>
              <option value="AGENT">Agent</option>
            </select>
          </label>
          <button type="submit" className="btn btn-primary">Creer</button>
        </form>
      </section>

      <section className="card">
        <h2>Utilisateurs existants</h2>
        {loading ? (
          <div className="loading">Chargement...</div>
        ) : (
          <div className="table-wrapper">
            <table className="mission-table">
              <thead>
                <tr>
                  <th>Login</th>
                  <th>Role</th>
                  <th>Mot de passe</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>{item.login}</td>
                    <td>
                      <select
                        value={edits[item.id]?.role || ''}
                        onChange={(event) => handleEditChange(item.id, 'role', event.target.value)}
                      >
                        <option value="GESTIONNAIRE">Gestionnaire</option>
                        <option value="AGENT">Agent</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="password"
                        placeholder="Nouveau mot de passe"
                        value={edits[item.id]?.password || ''}
                        onChange={(event) => handleEditChange(item.id, 'password', event.target.value)}
                      />
                    </td>
                    <td className="table-actions">
                      <button type="button" className="btn btn-action" onClick={() => handleUpdate(item.id)}>
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        className="btn btn-action text-danger"
                        onClick={() => handleDelete(item.id)}
                        disabled={item.id === user?.id}
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

export default UserManagementPage;
