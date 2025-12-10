
import React from 'react';
import { Site } from '../types';

interface SiteCardProps {
  site: Site;
  onTagAdd: (url: string) => void;
  onContextMenu: (e: React.MouseEvent, site: Site) => void;
  themeName?: string;
  onClick?: (site: Site) => void;
  // Local Pin Props
  isLocalPinned?: boolean;
  onToggleLocalPin?: (site: Site) => void;
  // Drag Props
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

const SiteCard: React.FC<SiteCardProps> = ({ 
  site, 
  onTagAdd, 
  onContextMenu, 
  themeName, 
  onClick,
  isLocalPinned,
  onToggleLocalPin,
  isDraggable,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  const isShein = site.c === 'shein';
  const domain = site.u.replace('https://', '').replace('www.', '').split('/')[0];
  const stars = '★'.repeat(site.rating || 0);

  const cardStyle = {
    boxShadow: 'var(--card-shadow)',
    backdropFilter: 'blur(var(--card-blur))',
    cursor: isDraggable ? 'grab' : 'pointer'
  };

  let cardClass = `
    card group relative flex flex-col justify-between p-3.5 h-[110px] rounded-xl border border-[var(--glass-border)]
    bg-[var(--glass-surface)] text-decoration-none transition-all duration-300
    hover:-translate-y-1
  `;

  if (isShein) {
    cardClass += ` border-[rgba(255,215,0,0.3)]`;
  }
  
  // Visual feedback for dragging
  if (isDraggable) {
    cardClass += ` active:cursor-grabbing active:scale-95 active:opacity-90`;
  }

  const titleClass = `
    text-[15px] font-semibold mb-1 whitespace-nowrap overflow-hidden text-ellipsis
    text-[var(--text-main)]
    ${isShein ? 'text-[#ffe066]' : ''}
    ${isShein && themeName === 'White' ? '!text-[#d4a017]' : ''}
  `;

  const handleClick = (e: React.MouseEvent) => {
    // If clicking drag handle or pin button, don't trigger site open
    if ((e.target as HTMLElement).closest('.stop-propagation')) return;
    if (onClick) {
      onClick(site);
    }
  };

  return (
    <a 
      href={site.u} 
      target="_blank" 
      rel="noopener noreferrer"
      className={cardClass}
      style={cardStyle}
      onContextMenu={(e) => onContextMenu(e, site)}
      onClick={handleClick}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--card-shadow)'}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Admin Pinned Indicator (Global) */}
      {site.pinned && (
        <div className="absolute top-0 right-0 w-3 h-3 bg-[var(--accent)] rounded-bl-lg rounded-tr-lg shadow-[0_0_5px_var(--accent)] z-10" title="管理员置顶" />
      )}
      
      {/* Local Pin Button - Only visible if pinned (Active State) */}
      {isLocalPinned && onToggleLocalPin && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onToggleLocalPin) onToggleLocalPin(site);
          }}
          className="stop-propagation absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full transition-all duration-200 z-20 bg-[var(--accent)] text-black opacity-100 shadow-[0_0_8px_var(--accent)] hover:scale-110"
          title="取消常用钉住"
        >
          <span className="text-xs">📌</span>
        </button>
      )}

      {/* Drag Handle for Pinned Items */}
      {isDraggable && (
        <div className="stop-propagation absolute top-1/2 left-1 -translate-y-1/2 opacity-0 group-hover:opacity-60 text-[var(--text-sub)] text-xl cursor-grab active:cursor-grabbing px-1">
          ⋮⋮
        </div>
      )}

      <div className={isDraggable ? "pl-4 transition-all" : ""}>
        <div className={titleClass}>{site.n}</div>
        <div className="text-[#ffd700] text-[11px] tracking-widest h-4 drop-shadow-sm">{stars}</div>
        <div className="text-[11px] text-[var(--text-sub)] font-mono opacity-80">{domain}</div>
      </div>
      
      <div className="flex justify-between items-center mt-auto">
        <div className="flex gap-1 flex-wrap flex-1 overflow-hidden h-5">
          {site.t.map((tag, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[var(--text-sub)] whitespace-nowrap">
              {tag}
            </span>
          ))}
        </div>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTagAdd(site.u);
          }}
          className="stop-propagation ml-1 w-5 h-5 rounded flex items-center justify-center bg-[var(--glass-border)] text-[var(--text-main)] hover:bg-[var(--accent)] hover:text-black transition-colors"
        >
          +
        </button>
      </div>
    </a>
  );
};

export default SiteCard;
