import React from 'react';
import { CheckCircle, AlertCircle, X, TrendingDown } from 'lucide-react';

export default function DescuentosResumenModal({ 
  isOpen, 
  onClose, 
  resultados = [],
  totalGeneral = 0 
}) {
  if (!isOpen) return null;

  const secciones = {
    'TROMPETAS': { icon: '🎺', color: 'purple' },
    'CLARINETES': { icon: '🎵', color: 'blue' },
    'SAXOS': { icon: '🎷', color: 'green' },
    'BARÍTONOS': { icon: '🎶', color: 'orange' },
    'TROMBONES': { icon: '🎵', color: 'red' },
    'TUBAS': { icon: '🎺', color: 'indigo' },
    'PERCUSIÓN': { icon: '🥁', color: 'yellow' },
    'OTROS': { icon: '🎼', color: 'gray' }
  };

  const getColorClasses = (color) => {
    const colors = {
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800',
      red: 'bg-red-50 border-red-200 text-red-800',
      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      gray: 'bg-gray-50 border-gray-200 text-gray-800'
    };
    return colors[color] || colors.gray;
  };

  const totalMusicos = resultados.reduce((sum, r) => sum + r.musicosAfectados, 0);
  const exitosos = resultados.filter(r => r.estado === 'exitoso').length;
  const conErrores = resultados.filter(r => r.estado === 'error').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-3">
                <CheckCircle className="w-8 h-8" />
                Resumen de Descuentos Procesados
              </h2>
              <p className="text-green-100 mt-2">
                Procesamiento completado exitosamente
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-green-100 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Estadísticas Generales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-green-700">{resultados.length}</div>
              <div className="text-sm text-green-600 font-medium">Secciones Procesadas</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-blue-700">{totalMusicos}</div>
              <div className="text-sm text-blue-600 font-medium">Músicos Afectados</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-orange-700">{exitosos}</div>
              <div className="text-sm text-orange-600 font-medium">Procesamientos Exitosos</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-red-700">{conErrores}</div>
              <div className="text-sm text-red-600 font-medium">Con Errores</div>
            </div>
          </div>

          {/* Detalle por Sección */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Detalle por Sección
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resultados.map((resultado, index) => {
                const seccion = secciones[resultado.seccion] || secciones.OTROS;
                const colorClasses = getColorClasses(seccion.color);
                
                return (
                  <div key={index} className={`${colorClasses} border rounded-xl p-4`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{seccion.icon}</span>
                        <div>
                          <h4 className="font-bold text-lg">{resultado.seccion}</h4>
                          <p className="text-sm opacity-75">{resultado.archivo}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                        resultado.estado === 'exitoso' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {resultado.estado === 'exitoso' ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Exitoso
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            Error
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Músicos afectados:</span>
                        <span className="font-bold">{resultado.musicosAfectados}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Descuentos aplicados:</span>
                        <span className="font-bold">{resultado.descuentosAplicados}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total descuentos:</span>
                        <span className="font-bold text-lg">Bs. {resultado.totalDescuentos.toFixed(2)}</span>
                      </div>
                      
                      {resultado.errores && resultado.errores.length > 0 && (
                        <div className="mt-3 p-2 bg-red-100 rounded-lg">
                          <p className="text-xs font-medium text-red-700 mb-1">Errores:</p>
                          {resultado.errores.map((error, i) => (
                            <p key={i} className="text-xs text-red-600">• {error}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer con Total General */}
        <div className="bg-gray-50 border-t border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Total General de Descuentos</h3>
              <p className="text-sm text-gray-600">Suma de todas las secciones procesadas</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-red-700">Bs. {totalGeneral.toFixed(2)}</div>
              <div className="text-sm text-gray-500">Total a descontar</div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Aceptar y Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

