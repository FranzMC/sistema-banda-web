import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { CalendarDays, Plus, X, Edit2, Trash2, MessageCircle, MapPin, Clock, Users, CheckSquare, Square } from 'lucide-react';

const initialFormState = {
  id: null,
  titulo: '',
  uniforme: 'DIARIO',
  detalles_uniforme: '',
  lugar_concentracion: '',
  fecha_hora_cita: '',
  convocados: []
};

const UNIFORMES = [
  { value: 'GALA', label: 'Uniforme de Gala' },
  { value: 'DIARIO', label: 'Uniforme Diario' },
  { value: 'VIAJE', label: 'Uniforme de Viaje' },
  { value: 'VELADA', label: 'Uniforme de Velada' },
  { value: 'OTRO', label: 'Otro (especificar)' }
];

export default function Eventos() {
  const [eventos, setEventos] = useState([]);
  const [musicos, setMusicos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [eventoToDelete, setEventoToDelete] = useState(null);

  useEffect(() => {
    fetchEventos();
    fetchMusicos();
  }, []);

  const fetchEventos = () => {
    api.get('/eventos/')
      .then(response => setEventos(response.data))
      .catch(error => console.error("Error al obtener eventos:", error));
  };

  const fetchMusicos = () => {
    api.get('/musicos/')
      .then(response => setMusicos(response.data))
      .catch(error => console.error("Error al obtener músicos:", error));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleConvocadosChange = (musicoId) => {
    const newConvocados = formData.convocados.includes(musicoId)
      ? formData.convocados.filter(id => id !== musicoId)
      : [...formData.convocados, musicoId];
    setFormData({ ...formData, convocados: newConvocados });
  };

  const handleSectionSelectAll = (sectionMusicos, isSelected) => {
    const sectionIds = sectionMusicos.map(m => m.id);
    let newConvocados = [...formData.convocados];
    
    if (isSelected) {
      newConvocados = newConvocados.filter(id => !sectionIds.includes(id));
    } else {
      const idsToAdd = sectionIds.filter(id => !newConvocados.includes(id));
      newConvocados = [...newConvocados, ...idsToAdd];
    }
    
    setFormData({ ...formData, convocados: newConvocados });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`/eventos/${formData.id}/`, formData);
      } else {
        await api.post('/eventos/', formData);
      }
      setIsModalOpen(false);
      fetchEventos();
      setFormData(initialFormState);
    } catch (error) {
      alert("Error al guardar: " + JSON.stringify(error.response?.data || "Revisa los datos"));
    }
  };

  const handleEdit = (evento) => {
    setFormData({
      id: evento.id,
      titulo: evento.titulo || '',
      uniforme: evento.uniforme || 'DIARIO',
      detalles_uniforme: evento.detalles_uniforme || '',
      lugar_concentracion: evento.lugar_concentracion || '',
      fecha_hora_cita: evento.fecha_hora_cita ? evento.fecha_hora_cita.slice(0, 16) : '',
      convocados: evento.convocados || []
    });
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!eventoToDelete) return;
    try {
      await api.delete(`/eventos/${eventoToDelete.id}/`);
      fetchEventos();
      setEventoToDelete(null);
    } catch (error) {
      alert("Error al eliminar: " + JSON.stringify(error.response?.data || error.message));
      setEventoToDelete(null);
    }
  };

  const handleWhatsApp = async (evento) => {
    try {
      const response = await api.get(`/eventos/${evento.id}/generar_mensaje/`);
      const mensaje = response.data.mensaje;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      alert("Error al generar mensaje: " + JSON.stringify(error.response?.data || error.message));
    }
  };

  // Agrupar músicos por secciones
  const secciones = useMemo(() => {
    return [
      { id: 'trompetas', nombre: 'Trompetas', instrumentos: ['TROMPETA'] },
      { id: 'saxos', nombre: 'Saxos', instrumentos: ['SAXOFON'] },
      { id: 'clarinetes', nombre: 'Clarinetes', instrumentos: ['CLARINETE'] },
      { id: 'baritonos', nombre: 'Barítonos', instrumentos: ['BARITONO'] },
      { id: 'trombones', nombre: 'Trombones', instrumentos: ['TROMBON'] },
      { id: 'tubas', nombre: 'Tubas', instrumentos: ['TUBA'] },
      { id: 'percusion', nombre: 'Percusión (Bombos, Tambores, Platillos)', instrumentos: ['BOMBO', 'TAMBOR', 'PLATILLOS', 'PERCUSION'] },
    ];
  }, []);

  return (
    <div className="animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-blue-600" />
            Gestión de Eventos
          </h1>
          <p className="text-gray-500 mt-1">Crea contratos, retretas y genera convocatorias por secciones.</p>
        </div>
        <button 
          onClick={() => {
            setFormData(initialFormState);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nueva Relacion Nominal
        </button>
      </header>

      {/* Lista de Eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {eventos.map(evento => (
          <div key={evento.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="p-6 flex-1">
              <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">{evento.titulo}</h3>
              <div className="space-y-3 mt-4">
                <div className="flex items-start gap-3 text-gray-600">
                  <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Fecha y Hora</p>
                    <p className="font-medium">{new Date(evento.fecha_hora_cita).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-gray-600">
                  <MapPin className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Concentración</p>
                    <p className="font-medium">{evento.lugar_concentracion || 'No especificada'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Users className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium"><span className="font-bold">{evento.convocados?.length || 0}</span> músicos convocados</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 border-t border-gray-100 p-4 flex items-center justify-between">
              <div className="flex gap-2">
                <button onClick={() => handleEdit(evento)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Editar">
                  <Edit2 className="w-5 h-5" />
                </button>
                <button onClick={() => setEventoToDelete(evento)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Eliminar">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <button 
                onClick={() => handleWhatsApp(evento)}
                className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar a WhatsApp
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para Crear/Editar Evento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-bold text-gray-800">{formData.id ? 'Editar Evento' : 'Crear Nuevo Evento'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-8">
              {/* Formulario de Datos del Evento */}
              <div className="lg:w-1/2 space-y-5">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider border-b pb-2">Detalles del Evento</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Evento</label>
                  <input type="text" name="titulo" value={formData.titulo} onChange={handleChange} required placeholder="Ej: Boda Familia Perez"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora</label>
                    <input type="datetime-local" name="fecha_hora_cita" value={formData.fecha_hora_cita} onChange={handleChange} required
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Uniforme</label>
                    <select name="uniforme" value={formData.uniforme} onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                      {UNIFORMES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Detalles del Uniforme (Opcional)</label>
                  <input type="text" name="detalles_uniforme" value={formData.detalles_uniforme} onChange={handleChange} placeholder="Ej: Camisa blanca, corbata roja..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lugar de Concentración</label>
                  <input type="text" name="lugar_concentracion" value={formData.lugar_concentracion} onChange={handleChange} required placeholder="Ej: Sede de la banda / Plaza principal"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                </div>
              </div>

              {/* Selección de Músicos por Secciones */}
              <div className="lg:w-1/2 flex flex-col">
                <div className="flex justify-between items-end border-b pb-2 mb-4">
                  <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Convocatoria por Secciones</h3>
                  <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{formData.convocados.length} seleccionados</span>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                  {secciones.map(seccion => {
                    const sectionMusicos = musicos.filter(m => seccion.instrumentos.includes(m.instrumento));
                    if (sectionMusicos.length === 0) return null;
                    
                    const sectionIds = sectionMusicos.map(m => m.id);
                    const isAllSelected = sectionIds.every(id => formData.convocados.includes(id));
                    const isSomeSelected = sectionIds.some(id => formData.convocados.includes(id));
                    
                    return (
                      <div key={seccion.id} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                        <div 
                          className="bg-gray-100 px-4 py-3 flex items-center justify-between cursor-pointer border-b border-gray-200 hover:bg-gray-200 transition-colors"
                          onClick={() => handleSectionSelectAll(sectionMusicos, isAllSelected)}
                        >
                          <span className="font-bold text-gray-800">{seccion.nombre} <span className="text-gray-500 text-sm font-normal">({sectionMusicos.length})</span></span>
                          <button className="text-blue-600">
                            {isAllSelected ? <CheckSquare className="w-5 h-5" /> : (isSomeSelected ? <CheckSquare className="w-5 h-5 text-blue-400 opacity-70" /> : <Square className="w-5 h-5" />)}
                          </button>
                        </div>
                        <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sectionMusicos.map(musico => (
                            <label key={musico.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200 hover:shadow-sm">
                              <input 
                                type="checkbox" 
                                checked={formData.convocados.includes(musico.id)}
                                onChange={() => handleConvocadosChange(musico.id)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-gray-700 truncate">{musico.nombres} {musico.apellidos}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleSubmit} className="px-5 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">
                {formData.id ? 'Actualizar Evento' : 'Guardar Evento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {eventoToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar Evento?</h3>
            <p className="text-gray-600 mb-6">
              Estás a punto de eliminar el evento <span className="font-bold text-gray-800">{eventoToDelete.titulo}</span>. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setEventoToDelete(null)} 
                className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
