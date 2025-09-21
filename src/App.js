import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import MissionDetailPage from './pages/MissionDetailPage';
import MissionFormPage from './pages/MissionFormPage';
import MissionListPage from './pages/MissionListPage';
import UserManagementPage from './pages/UserManagementPage';
import InsurersPage from './pages/InsurersPage';
import VehicleBrandsPage from './pages/VehicleBrandsPage';
import GaragesPage from './pages/GaragesPage';

const App = () => (
  <AuthProvider>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/missions" replace />} />
          <Route path="/missions" element={<MissionListPage />} />
          <Route path="/missions/new" element={<MissionFormPage mode="create" />} />
          <Route path="/missions/:id" element={<MissionDetailPage />} />
          <Route path="/missions/:id/edit" element={<MissionFormPage mode="edit" />} />
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="/insurers" element={<InsurersPage />} />
          <Route path="/vehicle-brands" element={<VehicleBrandsPage />} />
          <Route path="/garages" element={<GaragesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/missions" replace />} />
    </Routes>
  </AuthProvider>
);

export default App;
