import React from 'react';
import type { Tool } from '../App';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { MessageCircleIcon } from './icons/MessageCircleIcon';
import { GitCompareArrowsIcon } from './icons/GitCompareArrowsIcon';
import { PencilIcon } from './icons/PencilIcon';
import { HomeIcon } from './icons/HomeIcon';
import { HelpCircleIcon } from './icons/HelpCircleIcon';
import { motion } from 'framer-motion';

interface SidebarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  isDocumentLoaded: boolean;
}

const Tooltip: React.FC<{ text: string; children: React.ReactElement; id: string }> = ({ text, children, id }) => {
    return (
        // FIX: group-focus-within makes the tooltip accessible to keyboard users.
        <div className="relative group flex items-center">
            {/* FIX: The 'aria-describedby' prop must be passed as a string literal (kebab-case) to React.cloneElement. This is because TypeScript cannot correctly infer the props of the generic 'children' element, leading to a type error when using the standard camelCase version. */}
            {React.cloneElement(children, { 'aria-describedby': id })}
            <div 
                id={id}
                role="tooltip"
                className="absolute left-16 md:left-20 p-2 text-xs font-semibold text-primary-foreground bg-gray-900/80 backdrop-blur-sm border border-white/10 rounded-md shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-300 whitespace-nowrap z-50 transform-gpu translate-x-[-4px] group-hover:translate-x-0"
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
    { id: 'draft', icon: PencilIcon, label: 'Draft with AI', disabled: true },
  ];
  
  const bottomNavItems = [
      { id: 'about', icon: HelpCircleIcon, label: 'About ClaroClause', disabled: false },
  ];

  return (
    <aside className="w-16 md:w-20 bg-white/5 backdrop-blur-lg border-r border-white/10 flex flex-col items-center justify-between p-4 shadow-glass z-10">
      <div className="flex flex-col items-center gap-8">
        <motion.button 
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95, rotate: -5 }}
            onClick={() => setActiveTool('home')} 
            aria-label="ClaroClause Home"
        >
          <SparklesIcon className="h-8 w-8 text-fuchsia-500 transition-transform duration-200" />
        </motion.button>
        <nav>
          <ul className="flex flex-col items-center gap-4">
            {navItems.map(item => (
              <li key={item.id} className="relative group hover:z-10">
                 {activeTool === item.id && (
                    <motion.div
                        layoutId="active-indicator"
                        className="absolute -left-4 h-full w-1 bg-primary rounded-r-full"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                )}
                <Tooltip text={item.label} id={`tooltip-${item.id}`}>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => !item.disabled && setActiveTool(item.id as Tool)}
                      disabled={item.disabled}
                      aria-label={item.label}
                      className={`
                        w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-200
                        ${activeTool === item.id 
                          ? 'text-primary' 
                          : 'text-gray-500 hover:bg-white/10 hover:text-primary'}
                        ${item.disabled 
                          ? 'opacity-30 cursor-not-allowed' 
                          : ''}
                      `}
                    >
                      <item.icon className="h-6 w-6" />
                    </motion.button>
                </Tooltip>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="flex flex-col items-center gap-4">
         <nav>
           <ul className="flex flex-col items-center gap-4">
            {bottomNavItems.map(item => (
              <li key={item.id} className="relative group hover:z-10">
                 {activeTool === item.id && (
                    <motion.div
                        layoutId="active-indicator-bottom"
                        className="absolute -left-4 h-full w-1 bg-primary rounded-r-full"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                )}
                <Tooltip text={item.label} id={`tooltip-${item.id}`}>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => !item.disabled && setActiveTool(item.id as Tool)}
                      disabled={item.disabled}
                      aria-label={item.label}
                      className={`
                        w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-200
                        ${activeTool === item.id 
                          ? 'text-primary' 
                          : 'text-gray-500 hover:bg-white/10 hover:text-primary'}
                        ${item.disabled 
                          ? 'opacity-30 cursor-not-allowed' 
                          : ''}
                      `}
                    >
                      <item.icon className="h-6 w-6" />
                    </motion.button>
                </Tooltip>
              </li>
            ))}
           </ul>
         </nav>
      </div>
    </aside>
  );
};