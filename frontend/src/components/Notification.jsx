import React, { useEffect } from 'react';
import { CheckCircle, X, AlertCircle, Info } from 'lucide-react';

export default function Notification({ 
  type = 'success', 
  message, 
  duration = 4000, 
  onClose 
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeStyles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      text: 'text-green-800'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      text: 'text-red-800'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      text: 'text-blue-800'
    }
  };

  const styles = typeStyles[type];
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info
  };

  const Icon = icons[type];

  return (
    <div className={`fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300 ${styles.bg} ${styles.border} border rounded-lg shadow-lg p-4 min-w-[320px] max-w-md`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${styles.text}`}>
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className={`text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

