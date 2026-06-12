import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Musicos from './pages/Musicos.jsx';
import Eventos from './pages/Eventos.jsx';
import Finanzas from './pages/Finanzas.jsx';
import Financiamientos from './pages/Financiamientos.jsx';
import DescuentosSeccion from './pages/DescuentosSeccion.jsx';
import AdelantosSeccion from './pages/AdelantosSeccion.jsx';
import Usuarios from './pages/Usuarios.jsx';
import Permisos from './pages/Permisos.jsx';

function App() {
  // Inicializar isAuthenticated verificando si existe el token en localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('access_token');
  });

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login onLogin={() => setIsAuthenticated(true)} /> : <Navigate to="/dashboard" />} />
        <Route path="/*" element={isAuthenticated ? (
          <div className="flex h-screen bg-slate-50 overflow-hidden text-left">
            <Sidebar onLogout={() => setIsAuthenticated(false)} />
            <main className="flex-1 overflow-y-auto p-8">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/musicos" element={<Musicos />} />
                <Route path="/eventos" element={<Eventos />} />
                <Route path="/finanzas" element={<Finanzas />} />
                <Route path="/financiamientos" element={<Financiamientos />} />
                <Route path="/descuentos-seccion" element={<DescuentosSeccion />} />
                <Route path="/adelantos-seccion" element={<AdelantosSeccion />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/permisos" element={<Permisos />} />
              </Routes>
            </main>
          </div>
        ) : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;

