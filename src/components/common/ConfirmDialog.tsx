import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'primary',
  isLoading = false,
}) => {
  const iconAndColors = {
    danger: {
      icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
      bg: 'bg-red-50',
      btn: 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
      bg: 'bg-amber-50',
      btn: 'bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-amber-500/20',
    },
    primary: {
      icon: <Info className="w-6 h-6 text-yellow-600" />,
      bg: 'bg-yellow-50',
      btn: 'bg-zinc-900 hover:bg-black text-yellow-400 font-semibold shadow-zinc-900/20',
    },
  }[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="md">
      <div className="flex flex-col items-center text-center p-2">
        <div className={`p-3 rounded-2xl ${iconAndColors.bg} mb-4`}>
          {iconAndColors.icon}
        </div>
        <h3 className="text-lg font-bold text-zinc-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6">{message}</p>

        <div className="flex items-center justify-center gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-xl font-medium shadow-md transition-all ${iconAndColors.btn}`}
          >
            {isLoading ? 'Processando...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
