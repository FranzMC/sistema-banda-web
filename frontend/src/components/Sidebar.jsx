import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, FileText, Trophy, LogOut, Music, TrendingDown, TrendingUp, DollarSign, Shield, Key } from 'lucide-react';

export default function Sidebar({ onLogout }) {
  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/musicos', icon: Users, label: 'Músicos' },
    { path: '/eventos', icon: CalendarDays, label: 'Relacion Nominal/Contratos' },
    { path: '/finanzas', icon: FileText, label: 'Liquidaciones' },
    { path: '/financiamientos', icon: DollarSign, label: 'Financiamientos' },
    { path: '/descuentos-seccion', icon: TrendingDown, label: 'Descuentos por Sección' },
    { path: '/adelantos-seccion', icon: TrendingUp, label: 'Adelantos por Sección' },
    { path: '/usuarios', icon: Key, label: 'Usuarios & Roles' },
    { path: '/permisos', icon: Shield, label: 'Permisos' },
    { path: '/canaston', icon: Trophy, label: 'Canastón' },
  ];

  return (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-screen">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <Music className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800 leading-none">Banda Mejillones de Bolivia</h1>
          <span className="text-xs text-gray-500">Panel de Director</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                isActive 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button onClick={onLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-600 font-medium hover:bg-red-50 transition-colors">
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
