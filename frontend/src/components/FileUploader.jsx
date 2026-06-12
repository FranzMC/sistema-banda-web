import React, { useState, useEffect } from 'react';
import { Upload, File, X, CheckCircle } from 'lucide-react';

export default function FileUploader({ 
  title, 
  color = 'blue', 
  onUpload, 
  accept = '.pdf,.xlsx,.xls',
  isProcessing = false,
  clearFile = false 
}) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Limpiar archivo cuando se solicita
  useEffect(() => {
    if (clearFile) {
      setFile(null);
    }
  }, [clearFile]);

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      title: 'text-blue-800',
      button: 'bg-blue-600 hover:bg-blue-700',
      fileButton: 'file:text-blue-600 hover:file:bg-blue-50',
      dragBorder: 'border-blue-400'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      title: 'text-red-800',
      button: 'bg-red-600 hover:bg-red-700',
      fileButton: 'file:text-red-600 hover:file:bg-red-50',
      dragBorder: 'border-red-400'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      title: 'text-orange-800',
      button: 'bg-orange-600 hover:bg-orange-700',
      fileButton: 'file:text-orange-600 hover:file:bg-orange-50',
      dragBorder: 'border-orange-400'
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (file && !isProcessing) {
      onUpload(file);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-4 transition-all duration-200 ${dragActive ? 'ring-2 ring-opacity-50 ' + colors.dragBorder : ''}`}>
      <div className="space-y-3">
        <h3 className={`font-bold ${colors.title} text-sm`}>{title}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <div 
            className={`relative border-2 border-dashed ${dragActive ? colors.dragBorder : colors.border} rounded-lg p-4 text-center transition-colors duration-200 ${dragActive ? colors.bg : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${colors.fileButton}`}
              disabled={isProcessing}
            />
            
            {file ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <File className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-xs text-gray-700 truncate">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-gray-500">
                <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p className="text-xs font-medium">Arrastra un archivo aquí</p>
                <p className="text-xs text-gray-400 mt-1">o haz clic para seleccionar</p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!file || isProcessing}
            className={`w-full ${colors.button} text-white px-4 py-2 rounded-lg font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow-md transform hover:-translate-y-0.5`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Procesando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Subir Archivo
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

