import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Activate light mode' : 'Activate dark mode'}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="relative w-12 h-12 flex items-center justify-center rounded-2xl transition-colors duration-200 text-gray-400 hover:bg-muted/20 hover:text-primary"
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={theme === 'dark' ? 'moon' : 'sun'}
          initial={{ y: -20, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 20, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="absolute"
        >
          {theme === 'dark' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
};