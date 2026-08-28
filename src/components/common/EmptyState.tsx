import React from 'react';
import { Sparkles } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Sparkles,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`border border-dashed border-neutral-800/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-neutral-900/20 backdrop-blur-sm ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center mb-3 text-neutral-400">
        <Icon size={22} className="text-accent" />
      </div>
      <h4 className="text-sm font-bold text-neutral-200">{title}</h4>
      {description && (
        <p className="text-xs text-neutral-400 max-w-md mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
