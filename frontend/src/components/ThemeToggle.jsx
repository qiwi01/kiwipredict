import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="navbar-theme-toggle"
      aria-label="Toggle theme"
    >
      {isDarkMode ? (
        <Sun className="navbar-theme-icon sun" />
      ) : (
        <Moon className="navbar-theme-icon moon" />
      )}
    </button>
  );
};

export default ThemeToggle;
