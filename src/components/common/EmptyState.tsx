import React from 'react';
import { PackageOpen, Plus } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionIcon = <Plus className="w-4 h-4" />,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm my-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-yellow-600 mb-4 shadow-sm">
        {icon || <PackageOpen className="w-8 h-8 text-yellow-600" />}
      </div>
      <h3 className="text-base font-bold text-zinc-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-yellow-400 font-semibold text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {actionIcon}
          {actionText}
        </button>
      )}
    </div>
  );
};
