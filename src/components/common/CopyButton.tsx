import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '../../utils/helpers';

interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  copiedLabel?: string;
  successMessage?: string;
  className?: string;
  iconSize?: number;
  variant?: 'default' | 'ghost' | 'outline' | 'accent' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  showToast?: boolean;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  textToCopy,
  label,
  copiedLabel,
  successMessage = 'Скопировано в буфер обмена',
  className = '',
  iconSize = 13,
  variant = 'default',
  size = 'sm',
  showToast = true,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!textToCopy) return;

    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopied(true);
      if (showToast) {
        toast.success(successMessage);
      }
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Не удалось скопировать текст');
    }
  };

  // Variant styling
  const variantStyles = {
    default: 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/80',
    ghost: 'bg-transparent hover:bg-neutral-800/80 text-neutral-400 hover:text-white border border-transparent',
    outline: 'bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800',
    accent: 'bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20',
    subtle: 'bg-neutral-950/80 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800/80',
  }[variant];

  // Size styling
  const sizeStyles = {
    sm: 'px-2 py-1 text-[11px] gap-1.5 rounded-lg',
    md: 'px-2.5 py-1.5 text-xs gap-2 rounded-xl',
    lg: 'px-3 py-2 text-sm gap-2 rounded-xl',
  }[size];

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center justify-center font-medium transition-all cursor-pointer active:scale-95 shrink-0 ${variantStyles} ${sizeStyles} ${className}`}
      title={label || 'Скопировать'}
    >
      {copied ? (
        <>
          <Check size={iconSize} className="text-emerald-400 animate-in zoom-in-50 duration-200" />
          {copiedLabel !== undefined ? (
            <span className="text-emerald-400">{copiedLabel}</span>
          ) : label ? (
            <span className="text-emerald-400">Скопировано!</span>
          ) : null}
        </>
      ) : (
        <>
          <Copy size={iconSize} />
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
};
