
import React from 'react';
import { CategoryFilter, Site } from '../types';

interface SidebarProps {
  currentFilter: CategoryFilter;
  setFilter: (filter: CategoryFilter) => void;
  onTagAdd: (url: string) => void;
  onContextMenu: (e: React.MouseEvent, site: Site) => void;
  onSiteClick: (site: Site) => void;
  themeName?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentFilter, 
  setFilter, 
  onTagAdd, 
  onContextMenu, 
  onSiteClick,
  themeName 
}) => {
  const NavItem = ({ filter, label, isShein = false }: { filter: CategoryFilter; label: string; isShein?: boolean }) => {
    const active = currentFilter === filter;
    let className = `
      px-3.5 py-2.5 mb-0.5 rounded-lg text-sm cursor-pointer transition-all duration-200 flex items-center justify-between
      hover:bg-[var(--glass-border)] hover:text-[var(--text-main)]
    `;
    
    if (active) {
      className += ` bg-[rgba(0,210,255,0.15)] text-[var(--text-main)] font-semibold border-l-[3px] border-[var(--accent)]`;
    } else {
      className += ` text-[var(--text-sub)] border-l-[3px] border-transparent`;
    }

    if (isShein) {
      className += ` text-[#ffe066] hover:text-[#ffd700]`;
    }

    return (
      <div onClick={() => setFilter(filter)} className={className}>
        {label}
      </div>
    );
  };

  const GroupLabel = ({ label }: { label: string }) => (
    <div className="text-xs font-semibold text-[var(--text-sub)] mt-4 mb-1.5 ml-3.5 hidden md:block">
      {label}
    </div>
  );

  return (
    <nav 
      className="
        w-full md:w-[220px] bg-[var(--sidebar-bg)] 
        border border-[var(--glass-border)] rounded-2xl 
        flex flex-row md:flex-col p-3 md:p-5 flex-shrink-0 
        transition-colors duration-500 overflow-x-auto md:overflow-y-auto md:overflow-x-visible gap-2 md:gap-0
        custom-scrollbar
      "
      style={{ backdropFilter: 'blur(var(--panel-blur))' }}
    >
      <div className="text-lg font-extrabold mb-5 pl-3 hidden md:block bg-gradient-to-r from-[var(--text-main)] to-[var(--accent)] bg-clip-text text-transparent flex-shrink-0">
        Indie Nav Cloud
      </div>

      <div className="flex flex-row md:flex-col gap-1 md:gap-0 min-w-max">
        
        <GroupLabel label="Library" />
        <NavItem filter="favorites" label="我的常用" />
        <NavItem filter="all" label="全部网站" />
        <NavItem filter="5star" label="五星精选" />
        <NavItem filter="custom" label="网友共创" />

        <GroupLabel label="SHEIN" />
        <NavItem filter="shein" label="SHEIN 全球站" isShein />

        <GroupLabel label="风格" />
        <NavItem filter="young" label="年轻 / 辣妹" />
        <NavItem filter="elegant" label="轻熟 / 通勤" />
        <NavItem filter="sport" label="运动 / 潮牌" />
        <NavItem filter="french" label="法式 / 极简" />
        <NavItem filter="gown" label="礼服 / 派对" />
        <NavItem filter="denim" label="牛仔 / 复古" />
        <NavItem filter="linen" label="棉麻 / 文青" />

        <GroupLabel label="市场" />
        <NavItem filter="curve" label="大码 / 曲线" />
        <NavItem filter="fast" label="全球快时尚" />
        <NavItem filter="euro" label="欧洲 / 小众" />
      </div>
    </nav>
  );
};

export default Sidebar;