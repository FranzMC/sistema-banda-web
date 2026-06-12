import { useEffect, useState } from 'react';
import api from '../services/api.js';
import { Shield, Plus, Save, Trash2 } from 'lucide-react';

const roles = [
  { value: 'PRESIDENTE', label: 'Presidente' },
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'SUBDIRECTOR', label: 'Jefe de Sección' },
  { value: 'MUSICO', label: 'Músico' },
];

export default function Permisos() {
  const [modules, setModules] = useState([]);
  const [roleModules, setRoleModules] = useState([]);
  const [newModule, setNewModule] = useState({ clave: '', nombre: '', descripcion: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchModules();
    fetchRoleModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await api.get('modulos/');
      setModules(response.data);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los módulos.');
    }
  };

  const fetchRoleModules = async () => {
    try {
      const response = await api.get('roles-modulos/');
      setRoleModules(response.data);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los permisos por rol.');
    }
  };

  const roleHasModule = (role, moduleId) => {
    return roleModules.some((item) => item.rol === role && item.modulo?.id === moduleId);
  };

  const getRoleModuleId = (role, moduleId) => {
    const item = roleModules.find((item) => item.rol === role && item.modulo?.id === moduleId);
    return item?.id;
  };

  const handleToggleRoleModule = async (role, moduleId) => {
    setLoading(true);
    setError('');
    setMessage('');
    const existingId = getRoleModuleId(role, moduleId);

    try {
      if (existingId) {
        await api.delete(`roles-modulos/${existingId}/`);
        setMessage('Permiso eliminado.');
      } else {
        await api.post('roles-modulos/', { rol: role, modulo_id: moduleId });
        setMessage('Permiso asignado.');
      }
      await fetchRoleModules();
    } catch (err) {
      console.error(err);
      setError('No se pudo actualizar el permiso.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await api.post('modulos/', newModule);
      setMessage('Módulo creado correctamente.');
      setNewModule({ clave: '', nombre: '', descripcion: '' });
      fetchModules();
    } catch (err) {
      console.error(err);
      setError('No se pudo crear el módulo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoleModule = async (id) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await api.delete(`roles-modulos/${id}/`);
      setMessage('Permiso removido.');
      fetchRoleModules();
    } catch (err) {
      console.error(err);
      setError('No se pudo eliminar el permiso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Permisos y módulos</h2>
          <p className="text-sm text-slate-500 max-w-2xl">
            Gestiona los módulos disponibles y asigna acceso por rol de forma centralizada.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          <Shield className="h-4 w-4" />
          Acceso por roles
        </div>
      </div>

      {(message || error) && (
        <div className={`rounded-2xl p-4 text-sm ${message ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {message || error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Roles</p>
              <h3 className="text-xl font-semibold text-slate-900">Asignación por rol</h3>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">
              {modules.length} módulos
            </span>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Módulo</th>
                  {roles.map((role) => (
                    <th key={role.value} className="px-4 py-3">{role.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map((module) => (
                  <tr key={module.id} className="border-t border-slate-200">
                    <td className="px-4 py-4 font-medium text-slate-900">{module.nombre}</td>
                    {roles.map((role) => {
                      const checked = roleHasModule(role.value, module.id);
                      return (
                        <td key={role.value} className="px-4 py-4">
                          <label className="inline-flex cursor-pointer items-center gap-2 text-slate-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleRoleModule(role.value, module.id)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600"
                              disabled={loading}
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {modules.length === 0 && (
                  <tr>
                    <td colSpan={roles.length + 1} className="px-4 py-6 text-center text-slate-500">
                      No hay módulos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Crear módulo</p>
            <h3 className="text-xl font-semibold text-slate-900">Nuevo módulo</h3>
          </div>

          <form className="space-y-4" onSubmit={handleCreateModule}>
            <label className="block text-sm font-medium text-slate-700">
              Clave
              <input
                value={newModule.clave}
                onChange={(event) => setNewModule((prev) => ({ ...prev, clave: event.target.value }))}
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-blue-500 outline-none"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Nombre
              <input
                value={newModule.nombre}
                onChange={(event) => setNewModule((prev) => ({ ...prev, nombre: event.target.value }))}
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-blue-500 outline-none"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Descripción
              <textarea
                value={newModule.descripcion}
                onChange={(event) => setNewModule((prev) => ({ ...prev, descripcion: event.target.value }))}
                rows="4"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-blue-500 outline-none"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-70"
            >
              <Plus className="h-4 w-4" />
              Crear módulo
            </button>
          </form>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-900 mb-2">
              <Shield className="h-4 w-4" />
              Nota de seguridad
            </div>
            <p>
              Los módulos definidos aquí se usan para controlar acceso global por rol y también pueden asignarse a usuarios de forma puntual.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

