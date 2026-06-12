import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, Save, Plus, Trash2 } from 'lucide-react';

export default function AsignarTarifas() {
  const [eventos, setEventos] = useState([]);
  const [musicos, setMusicos] = useState([]);
  const [selectedEvento, setSelectedEvento] = useState('');
  const [fechas, setFechas] = useState([]); 
  const [tarifas, setTarifas] = useState({}); 
  const [loading, setLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    api.get('/eventos/').then(res => setEventos(res.data));
    api.get('/musicos/').then(res => setMusicos(res.data));
  }, []);

  const handleSelectEvento = async (e) => {
    const eventoId = e.target.value;
    setSelectedEvento(eventoId);
    if (!eventoId) return;

    const evento = eventos.find(ev => ev.id == eventoId);
    if (evento && evento.fecha_hora_cita) {
       const initialDate = evento.fecha_hora_cita.split('T')[0];
       setFechas([initialDate]);
    } else {
       setFechas([]);
    }

    try {
      const res = await api.get('/contratos/');
      const contratosEvento = res.data.filter(c => c.evento == eventoId);
      
      const newTarifas = {};
      const newFechas = new Set(evento && evento.fecha_hora_cita ? [evento.fecha_hora_cita.split('T')[0]] : []);
      
      contratosEvento.forEach(c => {
         newTarifas[c.musico] = {};
         if (c.detalles_diarios && c.detalles_diarios.length > 0) {
            c.detalles_diarios.forEach(d => {
               newTarifas[c.musico][d.fecha] = parseFloat(d.monto_asignado);
               newFechas.add(d.fecha);
            });
         } else if (c.monto_diario > 0) {
             const defaultDate = evento?.fecha_hora_cita.split('T')[0];
             newTarifas[c.musico][defaultDate] = parseFloat(c.monto_diario);
             if(defaultDate) newFechas.add(defaultDate);
         }
      });
      
      if (newFechas.size > 0) setFechas(Array.from(newFechas).sort());
      setTarifas(newTarifas);
      
    } catch (error) {
       console.error("Error loading contratos", error);
    }
  };

  const handleAddFecha = () => {
    const newFecha = prompt("Ingrese la nueva fecha (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    if (newFecha && !fechas.includes(newFecha)) {
      setFechas([...fechas, newFecha].sort());
    }
  };

  const handleRemoveFecha = (fechaToRemove) => {
     if (fechas.length === 1) return alert("Debe haber al menos una fecha.");
     setFechas(fechas.filter(f => f !== fechaToRemove));
  };

  const handleTarifaChange = (musicoId, fecha, value) => {
     setTarifas({
        ...tarifas,
        [musicoId]: {
           ...(tarifas[musicoId] || {}),
           [fecha]: value
        }
     });
  };

  const handleGuardar = async () => {
    if (!selectedEvento) return;
    setLoading(true);

    const payload = {
       evento_id: selectedEvento,
       contratos: []
    };

    const evento = eventos.find(ev => ev.id == selectedEvento);
    const convocadosIds = evento ? evento.convocados : [];
    const musicosList = musicos.filter(m => convocadosIds.includes(m.id));

    musicosList.forEach(musico => {
       const montosDiarios = [];
       let total = 0;
       fechas.forEach(fecha => {
          const monto = tarifas[musico.id]?.[fecha];
          if (monto !== undefined && monto !== '') {
             montosDiarios.push({ fecha, monto: parseFloat(monto) });
             total += parseFloat(monto);
          }
       });

       if (montosDiarios.length > 0) {
          payload.contratos.push({
             musico_id: musico.id,
             monto_diario: montosDiarios.length === 1 ? montosDiarios[0].monto : (total / montosDiarios.length).toFixed(2),
             montos_diarios: montosDiarios,
             observaciones: 'Asignación manual desde Tarifas'
          });
       }
    });

    try {
       await api.post('/contratos/asignar_montos_personalizados/', payload);
       alert("Tarifas guardadas correctamente.");
    } catch (err) {
       alert("Error al guardar: " + JSON.stringify(err.response?.data || err.message));
    } finally {
       setLoading(false);
    }
  };

  const selectedEventoObj = eventos.find(e => e.id == selectedEvento);
  const convocadosIds = selectedEventoObj ? selectedEventoObj.convocados : [];
  const musicosList = musicos.filter(m => convocadosIds.includes(m.id));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h3 className="text-lg font-bold text-gray-800">Asignación de Tarifas por Día y Músico</h3>
           <p className="text-sm text-gray-500">Define cuánto ganará cada músico en los distintos días del evento.</p>
        </div>
        <div className="flex gap-4 items-center">
           <select 
             value={selectedEvento} 
             onChange={handleSelectEvento}
             className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500 min-w-[250px]"
           >
             <option value="">Seleccione un Evento</option>
             {eventos.map(e => <option key={e.id} value={e.id}>{e.titulo} ({new Date(e.fecha_hora_cita).toLocaleDateString()})</option>)}
           </select>
        </div>
      </div>

      {selectedEvento && (
         <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-wrap gap-3 items-center bg-purple-50 p-4 rounded-xl border border-purple-100">
               <span className="font-bold text-purple-800 text-sm uppercase">Días del Evento:</span>
               {fechas.map(fecha => (
                  <div key={fecha} className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-purple-200 shadow-sm text-sm font-medium text-gray-700">
                     <Calendar className="w-4 h-4 text-purple-500" />
                     {fecha}
                     {fechas.length > 1 && (
                        <button onClick={() => handleRemoveFecha(fecha)} className="text-red-500 hover:text-red-700 ml-1" title="Quitar día">
                           <Trash2 className="w-3 h-3" />
                        </button>
                     )}
                  </div>
               ))}
               <button onClick={handleAddFecha} className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-800 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors">
                  <Plus className="w-4 h-4" /> Añadir Día
               </button>
            </div>

            <div className="overflow-x-auto border rounded-xl">
               <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600">
                     <tr>
                        <th className="px-4 py-3 font-bold border-b border-r min-w-[200px] sticky left-0 bg-gray-50 z-10">Músico Convocado</th>
                        {fechas.map(fecha => (
                           <th key={fecha} className="px-4 py-3 font-bold border-b text-center min-w-[120px]">
                              {fecha}
                           </th>
                        ))}
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {musicosList.length > 0 ? musicosList.map(musico => (
                        <tr key={musico.id} className="hover:bg-gray-50">
                           <td className="px-4 py-3 font-medium text-gray-800 border-r sticky left-0 bg-white z-10">{musico.nombres} {musico.apellidos}</td>
                           {fechas.map(fecha => (
                              <td key={fecha} className="px-4 py-2">
                                 <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">Bs.</span>
                                    <input 
                                       type="number" 
                                       step="0.01"
                                       value={tarifas[musico.id]?.[fecha] || ''}
                                       onChange={(e) => handleTarifaChange(musico.id, fecha, e.target.value)}
                                       className="w-full pl-9 pr-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all hover:border-purple-300"
                                       placeholder="0.00"
                                    />
                                 </div>
                              </td>
                           ))}
                        </tr>
                     )) : (
                        <tr>
                           <td colSpan={fechas.length + 1} className="px-4 py-8 text-center text-gray-500">
                              No hay músicos convocados para este evento. Añádelos primero en la pestaña de Eventos.
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>

            {musicosList.length > 0 && (
               <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                  <button 
                     onClick={handleGuardar}
                     disabled={loading}
                     className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                  >
                     <Save className="w-5 h-5" />
                     {loading ? 'Guardando Tarifas...' : 'Guardar Tarifas'}
                  </button>
               </div>
            )}
         </div>
      )}
    </div>
  );
}

