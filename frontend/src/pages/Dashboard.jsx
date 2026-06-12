import { Users, CalendarCheck, TrendingUp, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { label: 'Total Músicos', value: '45', icon: Users, color: 'bg-blue-500' },
    { label: 'Próximo Evento', value: 'Concierto Gala', icon: CalendarCheck, color: 'bg-emerald-500' },
    { label: 'Asistencia Promedio', value: '92%', icon: TrendingUp, color: 'bg-violet-500' },
    { label: 'Descuentos Pendientes', value: '12', icon: AlertCircle, color: 'bg-amber-500' },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Hola, Porfirio 👋</h1>
        <p className="text-gray-500 mt-1">Aquí tienes el resumen de tu banda el día de hoy.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-sm`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <h3 className="text-xl font-bold text-gray-800">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Sección de Actividad Reciente */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Top Rendimiento (Canastón) 🏆</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center h-48 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">Aquí conectaremos el gráfico Chart.js pronto...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
