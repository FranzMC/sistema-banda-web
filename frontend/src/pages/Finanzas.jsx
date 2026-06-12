import { useState, useEffect } from 'react';
import api from '../services/api';
import { DollarSign, Printer, Download, Calendar } from 'lucide-react';
import LiquidarEvento from '../components/LiquidarEvento';

export default function Finanzas() {
  const [activeTab, setActiveTab] = useState('liquidar');
  const [musicos, setMusicos] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [selectedEvento, setSelectedEvento] = useState('');

  const fetchDatos = () => {
    api.get('/musicos/').then(res => setMusicos(res.data)).catch(console.error);
    api.get('/eventos/').then(res => setEventos(res.data)).catch(console.error);
  };

  useEffect(() => {
    fetchDatos();
  }, []);


  return (
    <div className="animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            Liquidaciones
          </h1>
          <p className="text-gray-500 mt-1">Liquida eventos directamente, aplica multas desde PDF </p>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedEvento} 
            onChange={(e) => setSelectedEvento(e.target.value)}
            className="px-4 py-2 border border-green-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 min-w-[250px] font-bold text-gray-800 shadow-sm"
          >
            <option value="">-- Seleccione un Contrato --</option>
            {eventos.map(e => <option key={e.id} value={e.id}>{e.titulo} ({new Date(e.fecha_hora_cita).toLocaleDateString()})</option>)}
          </select>
        </div>
      </header>
      {/* Tabs */}
      
      {/* Tab: Liquidar Evento */}
      {activeTab === 'liquidar' && (
         <LiquidarEvento eventos={eventos} musicos={musicos} selectedEvento={selectedEvento} setSelectedEvento={setSelectedEvento} onPlanillaGuardada={fetchDatos} />
      )}
    </div>
  );
}
