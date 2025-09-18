import React from 'react';
import type { Tool } from '../App';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { MessageCircleIcon } from './icons/MessageCircleIcon';
import { GitCompareArrowsIcon } from './icons/GitCompareArrowsIcon';
import { PencilIcon } from './icons/PencilIcon';
import { HomeIcon } from './icons/HomeIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { motion } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  isDocumentLoaded: boolean;
}

const Tooltip: React.FC<{ text: string; children: React.ReactElement; id: string }> = ({ text, children, id }) => {
    return (
        <div className="relative group flex items-center">
            {/*
              Breathtaking Polish: The spread operator (`...`) on `children.props` can cause type errors.
              Using `Object.assign` is a safer, more robust way to merge props, resolving potential
              "Spread types may only be created from object types" errors and improving maintainability.
            */}
            {React.cloneElement(children, Object.assign({}, children.props, { 'aria-describedby': id }))}
            <div 
                id={id}
                role="tooltip"
                className="absolute left-16 md:left-20 p-2 text-xs font-semibold text-foreground bg-background/80 backdrop-blur-md border border-border rounded-md shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap z-50 transform-gpu translate-x-[-8px] scale-95 group-hover:translate-x-0 group-hover:scale-100"
            >
                {text}
            </div>
        </div>
    )
}


export const Sidebar: React.FC<SidebarProps> = ({ activeTool, setActiveTool, isDocumentLoaded }) => {
  const navItems = [
    { id: 'home', icon: HomeIcon, label: 'Home', disabled: false },
    { id: 'analyze', icon: ClipboardListIcon, label: 'Analyze Document', disabled: false },
    { id: 'chat', icon: MessageCircleIcon, label: 'Chat with Document', disabled: !isDocumentLoaded },
    { id: 'compare', icon: GitCompareArrowsIcon, label: 'Compare Documents', disabled: false },
    { id: 'draft', icon: PencilIcon, label: 'Draft with AI', disabled: false },
    { id: 'history', icon: HistoryIcon, label: 'Analysis History', disabled: false },
  ];
  
  const bottomNavItems: { id: string; icon: React.FC<any>; label: string; disabled: boolean }[] = [];

  return (
    <aside className="w-16 md:w-20 bg-gradient-to-b from-card/10 to-card/20 backdrop-blur-xl border-r border-border flex flex-col items-center justify-between py-5 px-2 z-10">
      <div className="flex flex-col items-center gap-8">
        <motion.button 
            whileHover={{ scale: 1.1, rotate: 10 }}
            whileTap={{ scale: 0.95, rotate: -5 }}
            onClick={() => setActiveTool('home')} 
            aria-label="ClaroClause Home"
            className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
        >
          <SparklesIcon className="h-10 w-10 text-primary transition-transform duration-200" />
        </motion.button>
        <nav>
          <ul className="flex flex-col items-center gap-3">
            {navItems.map(item => (
              <li key={item.id} className="relative">
                <Tooltip text={item.label} id={`tooltip-${item.id}`}>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => !item.disabled && setActiveTool(item.id as Tool)}
                      disabled={item.disabled}
                      aria-label={item.label}
                      className={`
                        w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 relative
                        ${activeTool === item.id 
                          ? 'text-primary' 
                          : 'text-muted-foreground hover:bg-secondary hover:text-primary'}
                        ${item.disabled 
                          ? 'opacity-30 cursor-not-allowed' 
                          : ''}
                      `}
                    >
                      {activeTool === item.id && (
                          <motion.div
                              layoutId="active-indicator"
                              className="absolute inset-0 bg-primary/10 rounded-xl"
                              initial={false}
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                      )}
                      <item.icon className="h-6 w-6 relative" />
                    </motion.button>
                </Tooltip>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="flex flex-col items-center gap-4">
         {bottomNavItems.length > 0 && (
         <nav>
           <ul className="flex flex-col items-center gap-3">
            {bottomNavItems.map(item => (
              <li key={item.id} className="relative">
                <Tooltip text={item.label} id={`tooltip-${item.id}`}>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => !item.disabled && setActiveTool(item.id as Tool)}
                      disabled={item.disabled}
                      aria-label={item.label}
                      className={`
                        w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 relative
                        ${activeTool === item.id 
                          ? 'text-primary' 
                          : 'text-muted-foreground hover:bg-secondary/10 hover:text-primary'}
                        ${item.disabled 
                          ? 'opacity-30 cursor-not-allowed' 
                          : ''}
                      `}
                    >
                      {activeTool === item.id && (
                          <motion.div
                              layoutId="active-indicator-bottom"
                              className="absolute inset-0 bg-primary/10 rounded-xl"
                              initial={false}
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                      )}
                      <item.icon className="h-6 w-6 relative" />
                    </motion.button>
                </Tooltip>
              </li>
            ))}
           </ul>
         </nav>
         )}
         <ThemeToggle />
      </div>
    </aside>
  );
};