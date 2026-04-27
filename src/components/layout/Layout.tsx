import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, Bell, User, Box, Search, Command, X, ChevronRight } from 'lucide-react';
import { navItems } from '../../config/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Command palette shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsCommandOpen(false);
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const filteredItems = navItems.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col md:flex-row antialiased">
      {/* Top Header - Mobile */}
      <header className="bg-surface-container-lowest fixed top-0 w-full z-50 border-b border-outline-variant flex items-center justify-between px-6 h-16 md:hidden">
        <div className="flex items-center gap-4">
          <button className="text-on-surface hover:bg-surface-container transition-colors p-2 rounded-sm">
            <Menu size={24} />
          </button>
          <span className="text-xl font-serif italic tracking-tight flex items-center gap-2">
            <Box size={20} className="text-on-surface" />
           <span className="text-xl font-serif italic text-on-surface leading-none mt-1">LogiSense AI</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-sm text-on-surface-variant hover:bg-surface-container">
            <Bell size={20} />
          </button>
        </div>
      </header>

      {/* Desktop Navigation Drawer */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 border-r border-outline-variant bg-surface-container-lowest z-40">
        <div className="h-20 flex items-center px-8 border-b border-outline-variant">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-on-surface rounded flex items-center justify-center text-surface-container-lowest shadow-sm">
               <Box size={18} />
             </div>
             <span className="text-xl font-serif italic text-on-surface leading-none mt-1">LogiSense AI</span>
          </div>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-2 px-4 mt-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center gap-4 px-4 py-3 rounded-sm transition-all duration-300 ease-out text-[11px] font-mono tracking-widest uppercase ${
                  isActive
                    ? 'bg-on-surface text-surface-container-lowest shadow-md shadow-on-surface/10'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon 
                    size={18} 
                    strokeWidth={isActive ? 2.5 : 1.5} 
                    className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:-rotate-6'}`} 
                  />
                  <span className="mt-0.5">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Global Search Trigger */}
        <div className="px-4 mb-4">
           <button 
             onClick={() => setIsCommandOpen(true)}
             className="w-full flex items-center justify-between px-4 py-2 border border-outline-variant rounded-sm text-outline hover:border-on-surface transition-all">
              <div className="flex items-center gap-3">
                 <Search size={14} />
                 <span className="text-[10px] font-mono uppercase tracking-widest">Search...</span>
              </div>
              <div className="flex items-center gap-1 opacity-40">
                 <Command size={10} />
                 <span className="text-[9px] font-mono">K</span>
              </div>
           </button>
        </div>

        <div className="p-6 border-t border-outline-variant bg-surface-container-low/20 relative overflow-hidden group/profile">
          <div className="absolute inset-0 bg-gradient-to-br from-on-surface/[0.03] to-transparent opacity-0 group-hover/profile:opacity-100 transition-opacity duration-500" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="h-10 w-10 rounded shadow-lg bg-on-surface border border-on-surface flex items-center justify-center font-serif italic text-lg text-white group-hover/profile:scale-110 transition-transform duration-500">
              N
            </div>
            <div className="min-w-0">
              <div className="font-serif italic text-base text-on-surface leading-none mb-1 truncate group-hover/profile:translate-x-1 transition-transform duration-500">Nguyễn Thái Bảo</div>
              <div className="text-[9px] tracking-widest font-mono uppercase opacity-40 text-on-surface-variant flex items-center gap-1">
                 <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> Fleet Manager
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full md:pl-64 pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen relative overflow-x-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(26,26,26,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(26,26,26,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
        <div className="relative z-10 min-h-full min-w-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center h-20 bg-surface-container-lowest/90 backdrop-blur-xl z-50 border-t border-outline-variant pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 w-full transition-transform active:scale-95 ${
                isActive ? 'text-on-surface' : 'text-on-surface-variant hover:bg-surface-container-low'
              }`
            }
          >
            {({ isActive }) => (
              <>
                 <div className={`p-1.5 rounded-full transition-colors mb-1 ${isActive ? 'bg-surface-container-high' : ''}`}>
                   <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                 </div>
                 <span className="text-[9px] font-mono tracking-widest uppercase">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {isCommandOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setIsCommandOpen(false)}
               className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" />
             
             <motion.div initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }}
               className="relative w-full max-w-2xl bg-surface-container-lowest shadow-2xl rounded-sm border border-outline-variant overflow-hidden">
                <div className="p-6 border-b border-outline-variant flex items-center gap-4">
                   <Search size={20} className="text-outline" />
                   <input 
                     autoFocus
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     placeholder="Search navigation, tools, or reports (Ctrl+K)"
                     className="flex-1 bg-transparent border-none outline-none text-on-surface font-mono text-sm uppercase tracking-widest" />
                   <div className="px-2 py-1 bg-surface-container-low border border-outline-variant rounded-sm text-[10px] font-mono text-outline">ESC</div>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto p-4 space-y-1 custom-scrollbar">
                   {filteredItems.map(item => (
                     <button key={item.path} onClick={() => { navigate(item.path); setIsCommandOpen(false); }}
                       className="w-full text-left p-4 rounded-sm hover:bg-surface-container-low flex items-center justify-between group transition-colors">
                        <div className="flex items-center gap-4">
                           <item.icon size={18} className="text-outline group-hover:text-on-surface transition-colors" />
                           <span className="text-[11px] font-mono uppercase tracking-widest font-bold">{item.label}</span>
                        </div>
                        <ChevronRight size={14} className="text-outline opacity-0 group-hover:opacity-100 transition-all" />
                     </button>
                   ))}
                   {filteredItems.length === 0 && (
                     <div className="p-10 text-center text-outline opacity-40 text-[10px] font-mono uppercase tracking-[0.2em]">
                        No matching results found
                     </div>
                   )}
                </div>
                
                <div className="p-4 bg-surface-container-low/50 border-t border-outline-variant flex justify-between items-center text-[9px] font-mono text-outline uppercase tracking-widest">
                   <div className="flex gap-4">
                      <span>↑↓ Navigate</span>
                      <span>↵ Select</span>
                   </div>
                    <span>LogiSense AI · HCM Node</span>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
