import { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Filter, Download, Eye, TrendingDown, Calendar, Users } from 'lucide-react';

export default function DescuentosSeccion() {
  const [descuentos, setDescuentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeccion, setSelectedSeccion] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [availableYears, setAvailableYears] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetalle, setShowDetalle] = useState(false);
  const [selectedDescuento, setSelectedDescuento] = useState(null);
  const [resumen, setResumen] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);

  const secciones = [
    'TROMPETA', 'SAXOFON', 'CLARINETE', 'BARITONO', 'TROMBON', 'TUBA', 'BOMBO', 'TAMBOR', 'PLATILLOS', 'PERCUSION'
  ];

  useEffect(() => {
    cargarDatos();
  }, [selectedSeccion, selectedYear]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      let descuentosUrl = '/descuentos/?only_pdf=true';
      if (selectedSeccion !== 'all') {
        descuentosUrl += `&seccion=${selectedSeccion}`;
      }
      if (selectedYear !== 'all') {
        descuentosUrl += `&year=${selectedYear}`;
      }

      const descuentosResponse = await api.get(descuentosUrl);
      const descuentosData = descuentosResponse.data;
      setDescuentos(Array.isArray(descuentosData) ? descuentosData : descuentosData.results || []);

      const years = Array.from(new Set((Array.isArray(descuentosData) ? descuentosData : descuentosData.results || []).map((item) => new Date(item.fecha_procesamiento).getFullYear()))).sort((a, b) => b - a);
      setAvailableYears(years);

      try {
        const resumenUrl = `/descuentos/resumen_por_seccion/?only_pdf=true${selectedYear !== 'all' ? `&year=${selectedYear}` : ''}`;
        const resumenResponse = await api.get(resumenUrl);
        setResumen(resumenResponse.data);
      } catch (e) {
        console.warn('Resumen no disponible:', e.message);
      }

      try {
        const statsUrl = `/descuentos/estadisticas/?only_pdf=true${selectedYear !== 'all' ? `&year=${selectedYear}` : ''}`;
        const statsResponse = await api.get(statsUrl);
        setEstadisticas(statsResponse.data);
      } catch (e) {
        console.warn('Estadísticas no disponibles:', e.message);
      }

    } catch (error) {
      if (error.response?.status === 403) {
        setError('No tienes permisos para ver este módulo de descuentos. Solo Jefes de Sección pueden acceder.');
      } else if (error.response?.status === 404) {
        setError('El endpoint de descuentos no está disponible.');
      } else if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
        setError('Error de conexión. Verifica que el servidor esté disponible.');
      } else {
        setError(error.response?.data?.detail || 'Error cargando descuentos. Intenta nuevamente.');
      }
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const descuentosFiltrados = descuentos.filter(descuento => {
    const coincideBusqueda = descuento.observaciones?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           descuento.seccion_display?.toLowerCase().includes(searchTerm.toLowerCase());
    return coincideBusqueda;
  });

  const descuentosPorSeccion = descuentosFiltrados.reduce((acc, descuento) => {
    const seccionNombre = descuento.seccion_display || descuento.seccion;
    if (!acc[seccionNombre]) {
      acc[seccionNombre] = [];
    }
    acc[seccionNombre].push(descuento);
    return acc;
  }, {});

  const verDetalle = async (descuento) => {
    try {
      const response = await api.get(`/descuentos/${descuento.id}/`);
      setSelectedDescuento(response.data);
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
      const response = await api.post('/descuentos/procesar_todos_existentes/', {});

      if (response.data.success) {
        alert(`✅ ${response.data.message}\n\nSecciones procesadas: ${response.data.secciones_procesadas}\nTotal descuentos: ${response.data.total_descuentos}`);
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
            <h1 className="text-3xl font-bold text-gray-900">Descuentos por Sección</h1>
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
              <h3 className="text-lg font-semibold text-red-900">Error al cargar descuentos</h3>
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
          <h1 className="text-3xl font-bold text-gray-900">Descuentos por Sección</h1>
          <p className="text-gray-600 mt-2">Gestión centralizada de descuentos en PDF agrupados por sección.</p>
          <p className="text-sm text-gray-500">Filtra por año y sección para ver cuánto recaudó cada sección con descuentos PDF.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={procesarDatosExistentes} 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <TrendingDown className="w-4 h-4" />
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
                <p className="text-sm font-medium text-gray-600">Total Descuentos</p>
                <p className="text-2xl font-bold text-gray-900">{formatearMonto(estadisticas.total_descuentos)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
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
              <Filter className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Último Mes</p>
                <p className="text-2xl font-bold text-gray-900">{formatearMonto(estadisticas.ultimo_mes.total)}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar descuentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="w-full xl:w-60">
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
          <div className="w-full xl:w-48">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los años</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="space-y-8">
        {Object.keys(descuentosPorSeccion).length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <TrendingDown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No hay descuentos en PDF registrados para los filtros seleccionados.</p>
            <p className="text-gray-500 text-sm mt-2">Los descuentos aparecerán aquí una vez que se registren en el sistema.</p>
          </div>
        ) : (
          Object.entries(descuentosPorSeccion).map(([seccionNombre, registros]) => {
            const totalSeccion = registros.reduce((sum, item) => sum + Number(item.monto_total_entregado), 0);
            return (
              <div key={seccionNombre} className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">Sección {seccionNombre}</h2>
                    <p className="text-sm text-gray-600">Total recaudado en descuentos PDF: {formatearMonto(totalSeccion)}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {registros.length} registro{registros.length === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título / Contrato</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Procesado Por</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archivo PDF</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {registros.map((descuento) => (
                        <tr key={descuento.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{descuento.observaciones || 'Descuento PDF'}</div>
                            <div className="text-xs text-gray-500">{descuento.detalles_json?.descuentos_originales?.length ? `${descuento.detalles_json.descuentos_originales.length} descuentos individuales` : 'Registro PDF'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{formatearMonto(descuento.monto_total_entregado)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{descuento.cantidad_descuentos}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatearFecha(descuento.fecha_procesamiento)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{descuento.procesado_por_nombre || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {descuento.pdf_origen ? (
                              <a href={descuento.pdf_origen} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                Ver PDF
                              </a>
                            ) : (
                              <span className="text-gray-500">Sin PDF</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button 
                              onClick={() => verDetalle(descuento)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Detalle */}
      {showDetalle && selectedDescuento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Detalle de Descuentos - {selectedDescuento.seccion_display}</h2>
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
                <p className="text-lg font-bold">{formatearMonto(selectedDescuento.monto_total_entregado)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cantidad de Descuentos</p>
                <p className="text-lg font-bold">{selectedDescuento.cantidad_descuentos}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha Procesamiento</p>
                <p className="text-lg">{formatearFecha(selectedDescuento.fecha_procesamiento)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Procesado Por</p>
                <p className="text-lg">{selectedDescuento.procesado_por_nombre || 'N/A'}</p>
              </div>
            </div>

            {selectedDescuento.observaciones && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Observaciones</p>
                <p className="text-sm">{selectedDescuento.observaciones}</p>
              </div>
            )}

            {selectedDescuento.descuentos_individuales && selectedDescuento.descuentos_individuales.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Descuentos Individuales</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Músico</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Aplicación</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedDescuento.descuentos_individuales.map((descuento) => (
                        <tr key={descuento.id}>
                          <td className="px-6 py-4 whitespace-nowrap">{descuento.musico_nombre}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{formatearMonto(descuento.monto)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{descuento.motivo}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatearFecha(descuento.fecha_aplicacion)}</td>
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

