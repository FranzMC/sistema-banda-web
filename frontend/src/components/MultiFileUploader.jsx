import React, { useState, useEffect } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, FolderOpen } from 'lucide-react';

export default function MultiFileUploader({ 
  title, 
  color = 'red', 
  onUpload, 
  accept = '.pdf,.xlsx,.xls',
  isProcessing = false 
}) {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const colorClasses = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      title: 'text-red-800',
      button: 'bg-red-600 hover:bg-red-700',
      fileButton: 'file:text-red-600 hover:file:bg-red-50',
      dragBorder: 'border-red-400',
      itemBg: 'bg-red-100',
      itemBorder: 'border-red-300'
    }
  };

  const colors = colorClasses[color];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(file => 
        accept.split(',').some(type => file.name.toLowerCase().endsWith(type.replace('.', '')))
      );
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (files.length === 0) return;
    
    // Validar que no haya duplicados por nombre
    const fileNames = files.map(f => f.name.toLowerCase());
    const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
    
    if (duplicates.length > 0) {
      alert(`Hay archivos duplicados: ${duplicates.join(', ')}`);
      return;
    }
    
    onUpload(files);
  };

  const clearAll = () => {
    setFiles([]);
  };

  const extractSectionFromFile = (fileName) => {
    const name = fileName.toLowerCase();
    if (name.includes('trompet') || name.includes('trompeta')) return 'TROMPETAS';
    if (name.includes('clarinet') || name.includes('clarinete')) return 'CLARINETES';
    if (name.includes('saxo') || name.includes('saxofon')) return 'SAXOS';
    if (name.includes('bariton') || name.includes('barítono')) return 'BARÍTONOS';
    if (name.includes('trombon') || name.includes('trombón')) return 'TROMBONES';
    if (name.includes('tuba')) return 'TUBAS';
    if (name.includes('percusion') || name.includes('bombo') || name.includes('tambor')) return 'PERCUSIÓN';
    return 'OTROS';
  };

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-6 transition-all duration-200`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-6 h-6 text-red-600" />
          <h3 className={`font-bold ${colors.title} text-lg`}>{title}</h3>
        </div>

        {/* Área de Drag & Drop */}
        <div 
          className={`relative border-2 border-dashed ${dragActive ? colors.dragBorder : colors.border} rounded-lg p-6 text-center transition-colors duration-200 ${dragActive ? colors.bg : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept={accept}
            onChange={handleFileChange}
            className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${colors.fileButton}`}
            disabled={isProcessing}
          />
          
          <div className="text-gray-500">
            <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-medium">Arrastra los PDFs de las secciones aquí</p>
            <p className="text-xs text-gray-400 mt-1">o haz clic para seleccionar múltiples archivos</p>
            <p className="text-xs text-gray-500 mt-2">Soporta: PDF, Excel</p>
          </div>
        </div>

        {/* Lista de Archivos Seleccionados */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-700 text-sm">Archivos seleccionados ({files.length}):</h4>
              <button
                onClick={clearAll}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
                disabled={isProcessing}
              >
                Limpiar todos
              </button>
            </div>
            
            <div className="max-h-40 overflow-y-auto space-y-1">
              {files.map((file, index) => {
                const section = extractSectionFromFile(file.name);
                return (
                  <div key={index} className={`${colors.itemBg} ${colors.itemBorder} border rounded-lg p-2 flex items-center justify-between`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <File className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {section} • {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                      disabled={isProcessing}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Botón de Procesamiento */}
        <button
          onClick={handleSubmit}
          disabled={files.length === 0 || isProcessing}
          className={`w-full ${colors.button} text-white px-4 py-3 rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Procesando PDFs de Secciones...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Procesar Todos los Descuentos por Sección
            </>
          )}
        </button>
      </div>
    </div>
  );
}

