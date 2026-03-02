import { Folder as FolderIcon, Trash2, ChevronRight } from 'lucide-react';
import { Folder } from '../server/database/db';

interface FolderCardProps {
  folder: Folder;
  itemCount?: number;
  childCount?: number;
  isActive?: boolean;
  onOpen: (folder: Folder) => void;
  onColorChange: (folderId: string, hex: string) => void;
  onDelete: (folderId: string) => void;
  tVault: {
    folderColor: string;
    folderEmpty: string;
  };
}

export function FolderCard({
  folder,
  itemCount = 0,
  childCount = 0,
  isActive = false,
  onOpen,
  onColorChange,
  onDelete,
  tVault,
}: FolderCardProps) {
  const totalCount = itemCount + childCount;

  return (
    <div
      onClick={() => onOpen(folder)}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none
        ${isActive
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
    >
      {/* Color accent bar */}
      <div
        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
        style={{ backgroundColor: folder.color }}
      />

      {/* Color dot + icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${folder.color}22` }}
      >
        <FolderIcon size={16} style={{ color: folder.color }} />
      </div>

      {/* Name + count */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{folder.name}</p>
        <p className="text-[10px] text-slate-400">
          {totalCount === 0 ? tVault.folderEmpty : `${totalCount} ${totalCount === 1 ? 'item' : 'itens'}`}
        </p>
      </div>

      {/* Actions (visible on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        {/* Color picker */}
        <label
          className="p-1 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={tVault.folderColor}
        >
          <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: folder.color }} />
          <input
            type="color"
            value={folder.color}
            onChange={e => onColorChange(folder.id, e.target.value)}
            className="sr-only"
          />
        </label>

        {/* Delete */}
        <button
          onClick={() => onDelete(folder.id)}
          className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Chevron */}
      <ChevronRight size={14} className="text-slate-300 flex-shrink-0 group-hover:text-slate-500 transition-colors" />
    </div>
  );
}
