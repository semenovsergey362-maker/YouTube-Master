import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconClassName?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  className?: string;
  closeOnBackdropClick?: boolean;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconClassName = 'text-accent',
  children,
  maxWidth = '2xl',
  className = '',
  closeOnBackdropClick = true,
  headerAction,
  footer,
}) => {
  // ESC key handler and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={closeOnBackdropClick ? onClose : undefined}
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${maxWidthStyles} bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10 animate-scale-up ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || Icon || headerAction) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 shrink-0 bg-neutral-900/90 backdrop-blur-sm">
            <div className="flex items-center gap-3 min-w-0">
              {Icon && (
                <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/80 flex items-center justify-center shrink-0">
                  <Icon size={18} className={iconClassName} />
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 className="text-base font-bold text-white truncate flex items-center gap-2">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-neutral-400 truncate mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerAction}
              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-white bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60 rounded-xl transition-all cursor-pointer"
                title="Закрыть (Esc)"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-neutral-800/80 shrink-0 bg-neutral-900/90 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
