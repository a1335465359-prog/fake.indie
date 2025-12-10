
import React, { useState, useEffect, useMemo } from 'react';
import { Site, ContextMenuState, CategoryFilter } from './types';
import { THEMES } from './constants';
import { 
  fetchSites, 
  createSite, 
  updateSite, 
  deleteSite 
} from './services/storageService';
import { 
  recordClick, 
  getFavorites, 
  toggleLocalPin, 
  isLocallyPinned,
  reorderPinned 
} from './services/localStats';

import AuroraBackground from './components/AuroraBackground';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import SiteCard from './components/SiteCard';

const WALLPAPER_KEY = 'indie_nav_wallpaper';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [sites, setSites] = useState<Site[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  
  // Theme State
  const [themeIndex, setThemeIndex] = useState(3); 

  // Stats / Local Storage Version Trigger
  const [localDataVersion, setLocalDataVersion] = useState(0); 

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, siteUrl: null });
  const [showAddModal, setShowAddModal] = useState(false);

  // New Site Form State
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newCat, setNewCat] = useState('custom');

  // Drag & Drop State
  const [draggedPinnedIndex, setDraggedPinnedIndex] = useState<number | null>(null);

  // Load Sites
  useEffect(() => {
    fetchSites().then(data => {
      setSites(data);
    });
  }, []);

  // Load Wallpaper Preference
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(WALLPAPER_KEY);
      if (savedMode) {
        const foundIndex = THEMES.findIndex(t => t.bgMode === savedMode);
        if (foundIndex !== -1) {
          setThemeIndex(foundIndex);
        }
      }
    } catch (e) {
      console.error("Failed to load wallpaper preference", e);
    }
  }, []);

  const currentTheme = THEMES[themeIndex];

  // Apply Theme Vars
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(currentTheme.vars).forEach(([key, value]) => {
      // @ts-ignore
      root.style.setProperty(key, value);
    });
  }, [themeIndex]);

  const toggleTheme = () => {
    setThemeIndex((prev) => {
      const nextIndex = (prev + 1) % THEMES.length;
      const nextTheme = THEMES[nextIndex];
      try {
        localStorage.setItem(WALLPAPER_KEY, nextTheme.bgMode);
      } catch(e) { console.error(e); }
      return nextIndex;
    });
  };

  const handleLogin = (admin: boolean) => {
    setIsAuthenticated(true);
    setIsAdmin(admin);
  };

  const handleSiteClick = (site: Site) => {
    recordClick(site.objectId || site.u);
    setLocalDataVersion(v => v + 1);
  };

  const handleToggleLocalPin = (site: Site) => {
    toggleLocalPin(site.objectId || site.u);
    setLocalDataVersion(v => v + 1);
  };

  const handleLocalPinFromContext = () => {
    if (!contextMenu.siteUrl) return;
    const target = sites.find(s => s.u === contextMenu.siteUrl);
    if (target) {
        handleToggleLocalPin(target);
        closeContextMenu();
    }
  };

  // --- Sorting & Filtering Logic ---
  
  // 1. Favorites View Logic
  const favoritesData = useMemo(() => {
    if (filter === 'favorites') {
      return getFavorites(sites);
    }
    return { pinned: [], frequent: [] };
  }, [sites, filter, localDataVersion]);

  // 2. Standard View Logic
  const filteredSites = useMemo(() => {
    if (filter === 'favorites') return []; // Handled separately

    return sites.filter(site => {
      if (filter !== 'all') {
        if (filter === 'custom') {
           if (site.c !== 'custom') return false; 
        } else if (filter === '5star') {
          if ((site.rating || 0) !== 5) return false;
        } else {
          if (site.c !== filter) return false;
        }
      }
      
      if (search) {
        const lowerSearch = search.toLowerCase();
        const inName = site.n.toLowerCase().includes(lowerSearch);
        const inTags = site.t.some(t => t.toLowerCase().includes(lowerSearch));
        if (!inName && !inTags) return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Admin Pin Priority
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      // Rating sorting (hide 1-2 stars at bottom)
      const rA = a.rating || 0;
      const rB = b.rating || 0;
      const isBadA = rA > 0 && rA <= 2;
      const isBadB = rB > 0 && rB <= 2;
      if (isBadA !== isBadB) return isBadA ? 1 : -1;
      return 0;
    });
  }, [sites, filter, search]);


  // --- Drag & Drop Handlers for Pinned Items ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPinnedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag image or default
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedPinnedIndex === null || draggedPinnedIndex === dropIndex) return;
    
    reorderPinned(draggedPinnedIndex, dropIndex);
    setDraggedPinnedIndex(null);
    setLocalDataVersion(v => v + 1); // Refresh list
  };


  // --- Standard Event Handlers ---

  const handleAddTag = async (url: string) => {
    const tag = prompt("输入新标签:");
    if (tag) {
      const target = sites.find(s => s.u === url);
      if (target) {
        const updatedSite = { ...target, t: [...target.t, tag] };
        setSites(sites.map(s => s.u === url ? updatedSite : s));
        await updateSite(updatedSite);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, site: Site) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      siteUrl: site.u
    });
  };

  const closeContextMenu = () => {
    if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false });
  };

  const handleRate = async (rating: number) => {
    if (!contextMenu.siteUrl) return;
    const target = sites.find(s => s.u === contextMenu.siteUrl);
    if (target) {
        const updatedSite = { ...target, rating };
        setSites(sites.map(s => s.u === contextMenu.siteUrl ? updatedSite : s));
        closeContextMenu();
        await updateSite(updatedSite);
    }
  };

  const handlePin = async () => {
    if (!isAdmin || !contextMenu.siteUrl) return;
    const target = sites.find(s => s.u === contextMenu.siteUrl);
    if (target) {
        const updatedSite = { ...target, pinned: !target.pinned };
        setSites(sites.map(s => s.u === contextMenu.siteUrl ? updatedSite : s));
        closeContextMenu();
        await updateSite(updatedSite);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || !contextMenu.siteUrl) return;
    if (confirm("确定删除此网站？")) {
      const target = sites.find(s => s.u === contextMenu.siteUrl);
      if (target && target.objectId) {
          setSites(sites.filter(s => s.u !== contextMenu.siteUrl));
          closeContextMenu();
          await deleteSite(target.objectId);
      }
    }
  };

  const handleRename = async () => {
    if (!contextMenu.siteUrl) return;
    const newName = prompt("输入新名称:");
    if (newName) {
       const target = sites.find(s => s.u === contextMenu.siteUrl);
       if (target) {
           const updatedSite = { ...target, n: newName };
           setSites(sites.map(s => s.u === contextMenu.siteUrl ? updatedSite : s));
           closeContextMenu();
           await updateSite(updatedSite);
       }
    }
  };

  const handleManageTags = async () => {
    if (!isAdmin || !contextMenu.siteUrl) return;
    const site = sites.find(s => s.u === contextMenu.siteUrl);
    if (!site) return;
    const newTagsStr = prompt("编辑标签 (逗号分隔，留空则清空):", site.t.join(", "));
    if (newTagsStr !== null) {
      const newTagsArr = newTagsStr.trim() ? newTagsStr.split(/,|，/).map(s => s.trim()) : [];
      const updatedSite = { ...site, t: newTagsArr };
      setSites(sites.map(s => s.u === contextMenu.siteUrl ? updatedSite : s));
      closeContextMenu();
      await updateSite(updatedSite);
    }
  };

  const submitNewSite = async () => {
    if (!newUrl || !newName) return alert("请输入名称和网址");
    let formattedUrl = newUrl;
    if (!formattedUrl.startsWith('http')) formattedUrl = 'https://' + formattedUrl;

    const tempSite: Site = {
      n: newName,
      u: formattedUrl,
      c: newCat,
      t: newTags ? newTags.split(/,|，/) : ['网友推荐'],
      rating: 0,
      pinned: false
    };

    setSites([tempSite, ...sites]);
    setShowAddModal(false);
    setNewUrl('');
    setNewName('');
    setNewTags('');
    setFilter('custom');
    alert("添加成功！正在同步到云端...");

    try {
        const created = await createSite(tempSite);
        setSites(prev => prev.map(s => s.u === tempSite.u ? created : s));
    } catch(e) {
        console.error(e);
        alert("云端同步失败，请检查网络");
    }
  };

  const autoFillName = () => {
     if (newUrl && !newName) {
       try {
         const urlObj = new URL(newUrl.startsWith('http') ? newUrl : 'https://' + newUrl);
         setNewName(urlObj.hostname.replace('www.', '').split('.')[0]);
       } catch (e) {}
     }
  };

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const currentSite = sites.find(s => s.u === contextMenu.siteUrl);
  const isAdminPinned = currentSite?.pinned;

  if (!isAuthenticated) {
    return (
      <>
        <AuroraBackground mode="particles" />
        <AuthScreen onLogin={handleLogin} />
      </>
    );
  }

  // Helper to determine context menu position to avoid bottom overflow
  const getContextMenuStyle = () => {
    const MENU_HEIGHT = 220; // Estimated height
    const isNearBottom = contextMenu.y + MENU_HEIGHT > window.innerHeight;
    
    return {
      top: isNearBottom ? 'auto' : contextMenu.y,
      bottom: isNearBottom ? window.innerHeight - contextMenu.y : 'auto',
      left: Math.min(contextMenu.x, window.innerWidth - 150)
    };
  };

  return (
    <div className="flex w-full h-screen overflow-hidden relative text-[var(--text-main)] transition-colors duration-300 font-sans">
      <AuroraBackground mode={currentTheme.bgMode} />
      
      <div className="relative z-10 flex w-full h-full max-w-[1920px] mx-auto p-4 gap-4 flex-col md:flex-row">
        <Sidebar 
          currentFilter={filter} 
          setFilter={setFilter}
          onTagAdd={handleAddTag}
          onContextMenu={handleContextMenu}
          onSiteClick={handleSiteClick}
          themeName={currentTheme.name}
        />

        <main 
          className="flex-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl flex flex-col overflow-hidden relative transition-colors duration-500 shadow-2xl"
          style={{ backdropFilter: 'blur(var(--panel-blur))' }}
        >
          <div className="p-4 md:px-6 md:py-3.5 flex justify-between items-center border-b border-[var(--glass-border)]">
            <input 
              type="text" 
              placeholder="搜索..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[280px] py-2 px-3.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-surface)] text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all placeholder-[var(--text-sub)]"
            />
            <button 
              onClick={toggleTheme} 
              className="w-8 h-8 rounded-full bg-[var(--glass-border)] text-[var(--text-main)] flex items-center justify-center hover:bg-[var(--accent)] hover:text-black transition-colors"
              title={`切换主题 (${currentTheme.name})`}
            >
              🎨
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            
            {/* --- FAVORITES VIEW --- */}
            {filter === 'favorites' ? (
               <div className="flex flex-col gap-6">
                 {/* Combined Grid: Pinned first, then Frequent */}
                 {(favoritesData.pinned.length > 0 || favoritesData.frequent.length > 0) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
                      
                      {/* Pinned Items (Draggable) */}
                      {favoritesData.pinned.map((site, index) => (
                          <SiteCard 
                            key={site.objectId || site.u}
                            site={site}
                            onTagAdd={handleAddTag}
                            onContextMenu={handleContextMenu}
                            onClick={handleSiteClick}
                            themeName={currentTheme.name}
                            isLocalPinned={true}
                            onToggleLocalPin={handleToggleLocalPin}
                            // Drag Props
                            isDraggable={true}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                          />
                      ))}

                      {/* Frequent Items (Algorithm Sorted, Not Draggable) */}
                      {favoritesData.frequent.map((site) => (
                          <SiteCard 
                            key={site.objectId || site.u}
                            site={site}
                            onTagAdd={handleAddTag}
                            onContextMenu={handleContextMenu}
                            onClick={handleSiteClick}
                            themeName={currentTheme.name}
                            isLocalPinned={false} // Force false to not show pin button on card face
                            onToggleLocalPin={handleToggleLocalPin}
                          />
                      ))}

                    </div>
                 ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-[var(--text-sub)] opacity-60">
                         <div className="text-4xl mb-4">📌</div>
                         <div className="text-lg">暂无常用网站</div>
                         <div className="text-sm mt-2">在网站上右键点击 "设为常用" 添加</div>
                     </div>
                 )}
               </div>
            ) : (
            /* --- STANDARD VIEW --- */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
                {filteredSites.map((site, index) => (
                  <SiteCard 
                    key={site.objectId || site.u + index} 
                    site={site} 
                    onTagAdd={handleAddTag} 
                    onContextMenu={handleContextMenu}
                    onClick={handleSiteClick}
                    themeName={currentTheme.name}
                    isLocalPinned={isLocallyPinned(site.objectId || site.u)}
                    onToggleLocalPin={handleToggleLocalPin}
                  />
                ))}
              </div>
            )}

          </div>

          <button 
            onClick={() => setShowAddModal(true)}
            className="absolute bottom-8 right-8 w-[50px] h-[50px] rounded-full bg-[var(--accent)] text-black text-3xl flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:scale-110 hover:bg-white transition-all z-50 cursor-pointer"
          >
            +
          </button>
        </main>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#222] p-6 rounded-2xl w-[380px] border border-white/20 text-white" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold">添加新网站</h3>
            <input 
              value={newUrl} 
              onChange={e => setNewUrl(e.target.value)} 
              onBlur={autoFillName}
              placeholder="网址 (https://...)" 
              className="w-full p-3 bg-white/10 border border-white/10 rounded-lg mb-3 text-white outline-none"
            />
            <input 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              placeholder="网站名称" 
              className="w-full p-3 bg-white/10 border border-white/10 rounded-lg mb-3 text-white outline-none"
            />
            <input 
              value={newTags} 
              onChange={e => setNewTags(e.target.value)} 
              placeholder="标签 (逗号分隔)" 
              className="w-full p-3 bg-white/10 border border-white/10 rounded-lg mb-3 text-white outline-none"
            />
            <select 
              value={newCat} 
              onChange={e => setNewCat(e.target.value)}
              className="w-full p-3 bg-[#333] border border-white/10 rounded-lg mb-3 text-white outline-none"
            >
              <option value="custom">-- 默认分类 (Custom) --</option>
              <option value="young">年轻 / 辣妹</option>
              <option value="elegant">轻熟 / 通勤</option>
              <option value="sport">运动 / 潮牌</option>
              <option value="french">法式 / 极简</option>
              <option value="gown">礼服 / 派对</option>
              <option value="denim">牛仔 / 复古</option>
              <option value="linen">棉麻 / 文青</option>
              <option value="curve">大码 / 曲线</option>
              <option value="fast">全球快时尚</option>
              <option value="euro">欧洲 / 小众</option>
              <option value="shein">SHEIN</option>
            </select>
            <button onClick={submitNewSite} className="w-full p-3 bg-[var(--accent)] text-black font-bold rounded-lg mb-2">保存</button>
            <button onClick={() => setShowAddModal(false)} className="w-full p-3 bg-white/10 text-white font-bold rounded-lg">取消</button>
          </div>
        </div>
      )}

      {contextMenu.visible && (
        <div 
          className="fixed bg-[#222] border border-[#444] rounded-lg p-1.5 z-[100] shadow-xl w-[140px]"
          style={getContextMenuStyle()}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-center gap-1 p-1">
            {[1, 2, 3, 4, 5].map(num => {
               const site = sites.find(s => s.u === contextMenu.siteUrl);
               const currentRating = site?.rating || 0;
               return (
                 <span 
                   key={num} 
                   onClick={() => handleRate(num)}
                   className={`text-lg cursor-pointer hover:text-[#ffd700] ${num <= currentRating ? 'text-[#ffd700]' : 'text-[#555]'}`}
                 >
                   ★
                 </span>
               )
            })}
          </div>
          <div className="h-px bg-[#444] my-1"></div>
          
          <div onClick={handleLocalPinFromContext} className="p-2 text-sm text-[#ddd] cursor-pointer hover:bg-[#333] hover:text-white rounded flex items-center justify-between">
            <span>{isLocallyPinned(contextMenu.siteUrl || '') ? '🚫 取消常用' : '📌 设为常用'}</span>
          </div>

          <div className="h-px bg-[#444] my-1"></div>
          
          {isAdmin && (
            <div onClick={handlePin} className="p-2 text-sm text-[#ddd] cursor-pointer hover:bg-[#333] hover:text-white rounded flex items-center justify-between">
              <span>{isAdminPinned ? '📍 取消全局置顶' : '📍 全局置顶'}</span>
            </div>
          )}

          <div onClick={handleRename} className="p-2 text-sm text-[#ddd] cursor-pointer hover:bg-[#333] hover:text-white rounded">
            ✏️ 重命名
          </div>
          {isAdmin && (
            <>
              <div onClick={handleManageTags} className="p-2 text-sm text-[#ddd] cursor-pointer hover:bg-[#333] hover:text-white rounded">
                🏷️ 管理标签
              </div>
              <div onClick={handleDelete} className="p-2 text-sm text-[#ff453a] cursor-pointer hover:bg-[#333] hover:text-white rounded">
                🗑 删除网站
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default App;