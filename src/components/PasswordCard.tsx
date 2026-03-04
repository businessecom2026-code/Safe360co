import { useState } from 'react';
import { Eye, EyeOff, Copy, Check, Trash2, KeyRound, Paperclip, Download, Pencil } from 'lucide-react';
import { VaultItem, PasswordField } from '../server/database/db';

interface PasswordFieldRowProps {
  field: PasswordField;
  isVisible: boolean;
  onToggle: () => void;
  tVault: { showPassword: string; hidePassword: string; copyField: string; fieldCopied: string };
}

function PasswordFieldRow({ field, isVisible, onToggle, tVault }: PasswordFieldRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(field.value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-1.5">
      {/* Label */}
      <span className="text-[10px] text-slate-400 font-medium min-w-[56px] truncate flex-shrink-0">
        {field.label || '—'}
      </span>

      {/* Value */}
      <span className={`flex-1 text-xs font-mono truncate ${isVisible ? 'text-slate-700 dark:text-slate-200 select-text' : 'text-slate-400 select-none'}`}>
        {isVisible ? field.value : '••••••••'}
      </span>

      {/* Eye toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="p-1 text-slate-400 hover:text-blue-500 transition-colors flex-shrink-0"
        title={isVisible ? tVault.hidePassword : tVault.showPassword}
      >
        {isVisible ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>

      {/* Copy */}
      <button
        onClick={handleCopy}
        className={`p-1 flex-shrink-0 transition-colors ${copied ? 'text-green-500' : 'text-slate-400 hover:text-green-500'}`}
        title={copied ? tVault.fieldCopied : tVault.copyField}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  );
}

interface PasswordCardProps {
  item: VaultItem;
  onDelete?: (id: string) => void;
  onEdit?: (item: VaultItem) => void;
  tVault: {
    showPassword: string;
    hidePassword: string;
    copyField: string;
    fieldCopied: string;
    passwordsSection: string;
    itemPending?: string;
  };
}

export function PasswordCard({ item, onDelete, onEdit, tVault }: PasswordCardProps) {
  // Each field has its own visibility state — indexed by position
  const [visibleFields, setVisibleFields] = useState<Record<number, boolean>>({});

  const toggleField = (index: number) => {
    setVisibleFields(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const fields: PasswordField[] = Array.isArray(item.passwords) && item.passwords.length > 0
    ? item.passwords
    : item.description
      ? [{ label: tVault.passwordsSection, value: item.description }]
      : [];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3 space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <KeyRound size={12} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold truncate">{item.title}</h3>
          {item.status === 'pending' && (
            <span className="flex-shrink-0 text-[9px] bg-yellow-500 text-white px-1.5 py-0.5 rounded-full font-bold leading-none">
              {tVault.itemPending || '⏳'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="p-1 text-slate-300 hover:text-blue-500 transition-colors"
              title="Editar"
            >
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="p-1 text-slate-300 hover:text-red-500 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Note (legacy text content) */}
      {item.note && fields.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
          {item.note}
        </p>
      )}

      {/* Password fields */}
      {fields.length > 0 && (
        <div className="space-y-1">
          {fields.map((field, i) => (
            <PasswordFieldRow
              key={i}
              field={field}
              isVisible={!!visibleFields[i]}
              onToggle={() => toggleField(i)}
              tVault={tVault}
            />
          ))}
        </div>
      )}

      {/* Attachment */}
      {item.attachment && (
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-1.5">
          <Paperclip size={12} className="text-slate-400 flex-shrink-0" />
          <span className="flex-1 text-xs text-slate-600 dark:text-slate-300 truncate">{item.attachment.name}</span>
          <span className="text-[10px] text-slate-400 flex-shrink-0">{(item.attachment.size / 1024).toFixed(0)}KB</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const blob = new Blob(
                [Uint8Array.from(atob(item.attachment!.data), c => c.charCodeAt(0))],
                { type: item.attachment!.mimeType }
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = item.attachment!.name;
              document.body.appendChild(a); a.click();
              document.body.removeChild(a); URL.revokeObjectURL(url);
            }}
            className="p-1 text-slate-400 hover:text-blue-500 transition-colors flex-shrink-0"
            title="Baixar arquivo"
          >
            <Download size={12} />
          </button>
        </div>
      )}

      {/* Timestamp */}
      <p className="text-[10px] text-slate-300 dark:text-slate-600 pt-0.5">
        {new Date(item.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}
