import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  // Default cyan neon: 180 100% 50%
  const [primaryColor, setPrimaryColor] = useState('180 100% 50%');

  // Load saved theme on mount
  useEffect(() => {
    const savedColor = localStorage.getItem('theme_primary_color');
    if (savedColor) {
      setPrimaryColor(savedColor);
    }
  }, []);

  // Update CSS variable when primaryColor changes
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', primaryColor);
    localStorage.setItem('theme_primary_color', primaryColor);
  }, [primaryColor]);

  const updatePrimaryColor = (hslString) => {
    setPrimaryColor(hslString);
  };

  /**
   * Helper to convert HEX to HSL format used by Tailwind (e.g., "180 100% 50%")
   * Simple approximation for the color picker
   */
  const hexToHSL = (hex) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = "0x" + hex[1] + hex[1];
      g = "0x" + hex[2] + hex[2];
      b = "0x" + hex[3] + hex[3];
    } else if (hex.length === 7) {
      r = "0x" + hex[1] + hex[2];
      g = "0x" + hex[3] + hex[4];
      b = "0x" + hex[5] + hex[6];
    }
    r /= 255; g /= 255; b /= 255;
    let cmin = Math.min(r,g,b),
        cmax = Math.max(r,g,b),
        delta = cmax - cmin,
        h = 0, s = 0, l = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;
    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return `${h} ${s}% ${l}%`;
  };

  /**
   * Converts Tailwind HSL string "H S% L%" back to Hex for the color picker input
   */
  const hslStringToHex = (hslStr) => {
    const parts = hslStr.replace(/%/g, '').split(' ');
    if (parts.length !== 3) return '#00f2fe';
    let h = parseFloat(parts[0]);
    let s = parseFloat(parts[1]) / 100;
    let l = parseFloat(parts[2]) / 100;

    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs((h / 60) % 2 - 1)),
        m = l - c/2,
        r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
    
    r = Math.round((r + m) * 255).toString(16);
    g = Math.round((g + m) * 255).toString(16);
    b = Math.round((b + m) * 255).toString(16);

    if (r.length === 1) r = "0" + r;
    if (g.length === 1) g = "0" + g;
    if (b.length === 1) b = "0" + b;

    return "#" + r + g + b;
  };

  return (
    <ThemeContext.Provider value={{ primaryColor, updatePrimaryColor, hexToHSL, hslStringToHex }}>
      {children}
    </ThemeContext.Provider>
  );
};
