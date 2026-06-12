import { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Filter, Download, Eye, TrendingUp, Calendar, Users } from 'lucide-react';

export default function AdelantosSeccion() {
  const [adelantos, setAdelantos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeccion, setSelectedSeccion] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetalle, setShowDetalle] = useState(false);
  const [selectedAdelanto, setSelectedAdelanto] = useState(null);
  const [resumen, setResumen] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);

  const secciones = [
    'TROMPETA', 'SAXOFON', 'CLARINETE', 'BARITONO', 'TROMBON', 'TUBA', 'BOMBO', 'TAMBOR', 'PLATILLOS', 'PERCUSION'
  ];

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      const adelantosResponse = await api.get('/adelantos/');
      setAdelantos(Array.isArray(adelantosResponse.data) ? adelantosResponse.data : adelantosResponse.data.results || []);

      try {
        const resumenResponse = await api.get('/adelantos/resumen_por_seccion/');
        setResumen(resumenResponse.data);
      } catch (e) {
        console.warn('Resumen no disponible:', e.message);
      }

      try {
        const statsResponse = await api.get('/adelantos/estadisticas/');
        setEstadisticas(statsResponse.data);
      } catch (e) {
        console.warn('Estadísticas no disponibles:', e.message);
      }

    } catch (error) {
      if (error.response?.status === 403) {
        setError('No tienes permisos para ver adelantos. Solo Directores y Presidentes pueden registrar adelantos.');
      } else if (error.response?.status === 404) {
        setError('El endpoint de adelantos no está disponible.');
      } else if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
        setError('Error de conexión. Verifica que el servidor esté disponible.');
      } else {
        setError(error.response?.data?.detail || 'Error cargando adelantos. Intenta nuevamente.');
      }
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const adelantosFiltrados = adelantos.filter(adelanto => {
    const coincideSeccion = selectedSeccion === 'all' || adelanto.seccion === selectedSeccion;
    const coincideBusqueda = adelanto.observaciones?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           adelanto.seccion_display?.toLowerCase().includes(searchTerm.toLowerCase());
    return coincideSeccion && coincideBusqueda;
  });

  const verDetalle = async (adelanto) => {
    try {
      const response = await api.get(`/adelantos/${adelanto.id}/`);
      setSelectedAdelanto(response.data);
      setShowDetalle(true);
    } catch (error) {
      alert('Error cargando detalle: ' + (error.response?.data?.detail || error.message));
      console.error('Error cargando detalle:', error);
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearMonto = (monto) => {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB'
    }).format(monto);
  };

  const procesarDatosExistentes = async () => {
    try {
      setLoading(true);
      const response = await api.post('/adelantos/procesar_todos_existentes/', {});

      if (response.data.success) {
        alert(`✅ ${response.data.message}\n\nSecciones procesadas: ${response.data.secciones_procesadas}\nTotal adelantos: ${response.data.total_adelantos}`);
        await cargarDatos();
      } else {
        alert(`ℹ️ ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error procesando datos:', error);
      alert('❌ Error al procesar datos existentes. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Adelantos por Sección</h1>
          </div>
          <button
            onClick={cargarDatos}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Reintentar
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-red-600 mt-1">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">Error al cargar adelantos</h3>
              <p className="text-red-700 mt-2">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Adelantos por Sección</h1>
          <p className="text-gray-600 mt-2">Gestión centralizada de adelantos organizados por sección</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={procesarDatosExistentes} 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Procesar Datos Existentes
          </button>
          <button 
            onClick={cargarDatos} 
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Adelantos</p>
                <p className="text-2xl font-bold text-gray-900">{formatearMonto(estadisticas.total_adelantos)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Registros</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total_registros}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Secciones Activas</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.secciones_activas}</p>
              </div>
              <Filter className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Último Mes</p>
                <p className="text-2xl font-bold text-gray-900">{formatearMonto(estadisticas.ultimo_mes.total)}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar adelantos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select 
              value={selectedSeccion} 
              onChange={(e) => setSelectedSeccion(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las secciones</option>
              {secciones.map(seccion => (
                <option key={seccion} value={seccion}>{seccion}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Adelantos Registrados</h2>
        </div>
        <div className="overflow-x-auto">
          {adelantosFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No hay adelantos registrados para los filtros seleccionados.</p>
              <p className="text-gray-500 text-sm mt-2">Los adelantos aparecerán aquí una vez que se registren en el sistema.</p>
            </div>
          ) : (
            <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sección</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Procesamiento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Procesado Por</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {adelantosFiltrados.map((adelanto) => (
                <tr key={adelanto.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                      {adelanto.seccion_display || adelanto.seccion}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{formatearMonto(adelanto.monto_total_entregado)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{adelanto.cantidad_adelantos}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatearFecha(adelanto.fecha_procesamiento)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{adelanto.procesado_por_nombre || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => verDetalle(adelanto)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {adelanto.pdf_origen && (
                        <a 
                          href={adelanto.pdf_origen} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Modal de Detalle */}
      {showDetalle && selectedAdelanto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Detalle de Adelantos - {selectedAdelanto.seccion_display}</h2>
              <button 
                onClick={() => setShowDetalle(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Monto Total</p>
                <p className="text-lg font-bold">{formatearMonto(selectedAdelanto.monto_total_entregado)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cantidad de Adelantos</p>
                <p className="text-lg font-bold">{selectedAdelanto.cantidad_adelantos}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha Procesamiento</p>
                <p className="text-lg">{formatearFecha(selectedAdelanto.fecha_procesamiento)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Procesado Por</p>
                <p className="text-lg">{selectedAdelanto.procesado_por_nombre || 'N/A'}</p>
              </div>
            </div>

            {selectedAdelanto.observaciones && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Observaciones</p>
                <p className="text-sm">{selectedAdelanto.observaciones}</p>
              </div>
            )}

            {selectedAdelanto.adelantos_individuales && selectedAdelanto.adelantos_individuales.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Adelantos Individuales</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Músico</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedAdelanto.adelantos_individuales.map((adelanto) => (
                        <tr key={adelanto.id}>
                          <td className="px-6 py-4 whitespace-nowrap">{adelanto.musico_nombre}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{formatearMonto(adelanto.monto)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{adelanto.motivo}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatearFecha(adelanto.fecha)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

