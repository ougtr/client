import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const AppLayout = () => {
  const navigate = useNavigate();
  const { user, logout, isManager } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/missions" className="brand" aria-label="Gestion Missions Auto">
          <Logo size="md" withText />
        </Link>
        <div className="header-actions">
          <span className="user-info">{user?.login} ({user?.role})</span>
          <button type="button" className="btn btn-secondary" onClick={handleLogout}>
            Deconnexion
          </button>
        </div>
      </header>
      <nav className="app-nav">
        <NavLink to="/missions" className={navClass} end>
          Missions
        </NavLink>
        {isManager && (
          <>
            <NavLink to="/missions/new" className={navClass}>
              Nouvelle mission
            </NavLink>
            <NavLink to="/users" className={navClass}>
              Utilisateurs
            </NavLink>
            <NavLink to="/insurers" className={navClass}>
              Assureurs
            </NavLink>
            <NavLink to="/vehicle-brands" className={navClass}>
              Marques
            </NavLink>
            <NavLink to="/garages" className={navClass}>
              Garages
            </NavLink>
          </>
        )}
      </nav>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
