import { useEffect, useState } from 'react';
import api from '../services/api.js';
import { Plus, Edit3, Save, Trash2, ShieldCheck, ChevronLeft } from 'lucide-react';

const roles = [
  { value: 'PRESIDENTE', label: 'Presidente/Fundador' },
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'SUBDIRECTOR', label: 'Jefe de Sección' },
  { value: 'MUSICO', label: 'Músico' },
];

const initialForm = {
  id: null,
  username: '',
  password: '',
  ci: '',
  first_name: '',
  last_name: '',
  email: '',
  telefono: '',
  rol: 'MUSICO',
  is_active: true,
  documento_identidad: '',
  musico_telefono: '',
  modulos_personales: [],
};

export default function Usuarios() {
  const [users, setUsers] = useState([]);
  const [modules, setModules] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchModules();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('usuarios/');
      setUsers(response.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la lista de usuarios.');
    }
  };

  const fetchModules = async () => {
    try {
      const response = await api.get('modulos/');
      setModules(response.data.filter((module) => module.activo));
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar los módulos disponibles.');
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setIsEditing(false);
    setMessage('');
    setError('');
  };

  const handleInput = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleModuleChange = (moduleClave) => {
    setForm((prev) => {
      const list = prev.modulos_personales || [];
      if (list.includes(moduleClave)) {
        return {
          ...prev,
          modulos_personales: list.filter((clave) => clave !== moduleClave),
        };
      }
      return {
        ...prev,
        modulos_personales: [...list, moduleClave],
      };
    });
  };

  const handleEdit = (user) => {
    const musicoData = user.musico_data || {};
    setForm({
      id: user.id,
      username: user.username,
      password: '',
      ci: '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      telefono: user.telefono || '',
      rol: user.rol,
      is_active: user.is_active,
      documento_identidad: musicoData.documento_identidad || '',
      musico_telefono: musicoData.telefono || user.telefono || '',
      modulos_personales: user.modulos_personales || [],
    });
    setIsEditing(true);
    setMessage('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const payload = {
      username: form.username,
      password: form.password || undefined,
      ci: form.ci || undefined,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      telefono: form.telefono,
      rol: form.rol,
      is_active: form.is_active,
      modulos_personales: form.modulos_personales,
    };

    if (form.rol === 'MUSICO') {
      payload.musico_data = {
        documento_identidad: form.documento_identidad,
        nombres: form.first_name,
        apellidos: form.last_name,
        telefono: form.musico_telefono || form.telefono,
      };
    }

    try {
      if (isEditing) {
        await api.patch(`usuarios/${form.id}/`, payload);
        setMessage('Usuario actualizado correctamente.');
      } else {
        await api.post('usuarios/', payload);
        setMessage('Usuario creado correctamente.');
      }
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data ? JSON.stringify(err.response.data) : 'No se pudo guardar el usuario.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await api.delete(`usuarios/${userId}/`);
      fetchUsers();
      setMessage('Usuario eliminado.');
    } catch (err) {
      console.error(err);
      setError('No se pudo eliminar el usuario.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Usuarios y permisos</h2>
          <p className="text-sm text-slate-500 max-w-2xl">
            Crea usuarios, asigna roles y controla módulos individuales para cada cuenta.
          </p>
        </div>
        <button
          onClick={resetForm}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </button>
      </div>

      {(message || error) && (
        <div className={`rounded-2xl p-4 text-sm ${message ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {message || error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Formulario</p>
              <h3 className="text-xl font-semibold text-slate-900">Registrar / editar usuario</h3>
            </div>
            {isEditing && (
              <button onClick={resetForm} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                <ChevronLeft className="inline-block w-4 h-4 mr-1 align-text-bottom" />
                Cancelar edición
              </button>
            )}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Nombre
                <input
                  type="text"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleInput}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-blue-500 outline-none"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Apellido
                <input
                  type="text"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleInput}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-blue-500 outline-none"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Usuario
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleInput}
                  required={!isEditing}
                  disabled={isEditing}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:ring-blue-500 outline-none disabled:cursor-not-allowed"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Correo
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleInput}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-blue-500 outline-none"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Rol
                <select
                  name="rol"
                  value={form.rol}
                  onChange={handleInput}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-blue-500 outline-none"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Teléfono
                <input
                  type="text"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleInput}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-blue-500 outline-none"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                CI
                <input
                  type="text"
                  name="ci"
                  value={form.ci}
                  onChange={handleInput}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-blue-500 outline-none"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Contraseña
                <input
                  type="text"
                  name="password"
                  value={form.password}
                  onChange={handleInput}
                  placeholder="Opcional: se genera desde CI"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-blue-500 outline-none"
                />
              </label>
            </div>

            {form.rol === 'MUSICO' && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-3">Datos adicionales para músico</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    CI del músico
                    <input
                      type="text"
                      name="documento_identidad"
                      value={form.documento_identidad}
                      onChange={handleInput}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-blue-500 outline-none"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Teléfono músico
                    <input
                      type="text"
                      name="musico_telefono"
                      value={form.musico_telefono}
                      onChange={handleInput}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-blue-500 outline-none"
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800 mb-3">Módulos personales</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {modules.map((module) => (
                  <label key={module.clave} className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={(form.modulos_personales || []).includes(module.clave)}
                      onChange={() => handleModuleChange(module.clave)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    {module.nombre}
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Estas asignaciones tienen prioridad sobre los permisos por rol y sirven para casos especiales.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                {isEditing ? 'Actualizar usuario' : 'Crear usuario'}
              </button>
              <p className="text-sm text-slate-500">
                Si no defines contraseña, se generará automáticamente con los primeros 4 dígitos del CI.
              </p>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Usuarios registrados</p>
              <h3 className="text-xl font-semibold text-slate-900">Lista de cuentas</h3>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">
              {users.length} usuarios
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-sm font-semibold text-slate-600 uppercase">
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Módulos</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-4 font-medium text-slate-900">{user.username}</td>
                    <td className="px-4 py-4">{user.first_name} {user.last_name}</td>
                    <td className="px-4 py-4">{roles.find((role) => role.value === user.rol)?.label || user.rol}</td>
                    <td className="px-4 py-4 max-w-[280px] whitespace-normal">
                      {(user.modulos || []).join(', ') || 'Sin módulos'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-6 text-center text-sm text-slate-500">No hay usuarios registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

