import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('geoscan-theme') === 'dark')

  function toggle() {
    setIsDark(d => {
      const next = !d
      localStorage.setItem('geoscan-theme', next ? 'dark' : 'light')
      return next
    })
  }

  return <ThemeContext.Provider value={{ isDark, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}

export const T = {
  light: {
    bg: '#f5f7fb',
    card: {
      background: '#ffffff',
      border: '1px solid #eef0f5',
      borderRadius: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
    },
    text:     '#111827',
    textMuted: '#94a3b8',
    textSub:  '#64748b',
    divider:  '#f1f5f9',
    topbar:   'rgba(255,255,255,0.92)',
    topbarBorder: '#e8edf5',
    rowEven:  '#ffffff',
    rowOdd:   'rgba(248,250,252,0.8)',
    rowHover: 'rgba(79,110,247,0.04)',
    rowBorder: '#f1f5f9',
    hintBg:   '#ffffff',
    hintBorder: '#eef0f5',
    corrBg:   '#ffffff',
    corrBorder: '#fde68a',
    corrItem: '#fffbeb',
    corrItemBorder: '#fde68a',
    editInputBg: '#ffffff',
    editInputBorder: '#4f6ef7',
    editInputShadow: '0 0 0 3px rgba(79,110,247,0.12)',
    deleteCardBg: '#ffffff',
    deleteCardBorder: '#eef0f5',
    deleteCardShadow: '0 25px 60px rgba(0,0,0,0.15)',
    cancelBtn: { background: 'transparent', border: '1px solid #e2e8f0', color: '#475569' },
    cancelBtnHover: { background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b' },
  },
  dark: {
    bg: '#0c1220',
    card: {
      background: '#111827',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      boxShadow: 'none',
    },
    text:     '#f8fafc',
    textMuted: 'rgba(255,255,255,0.3)',
    textSub:  'rgba(255,255,255,0.5)',
    divider:  'rgba(255,255,255,0.05)',
    topbar:   'rgba(12,18,32,0.9)',
    topbarBorder: 'rgba(255,255,255,0.07)',
    rowEven:  'rgba(255,255,255,0.02)',
    rowOdd:   'rgba(255,255,255,0.04)',
    rowHover: 'rgba(79,110,247,0.07)',
    rowBorder: 'rgba(255,255,255,0.05)',
    hintBg:   'rgba(255,255,255,0.03)',
    hintBorder: 'rgba(255,255,255,0.06)',
    corrBg:   '#111827',
    corrBorder: 'rgba(251,191,36,0.2)',
    corrItem: 'rgba(251,191,36,0.06)',
    corrItemBorder: 'rgba(251,191,36,0.1)',
    editInputBg: 'rgba(255,255,255,0.08)',
    editInputBorder: '#4f6ef7',
    editInputShadow: '0 0 0 3px rgba(79,110,247,0.15)',
    deleteCardBg: '#111827',
    deleteCardBorder: 'rgba(255,255,255,0.1)',
    deleteCardShadow: '0 25px 60px rgba(0,0,0,0.5)',
    cancelBtn: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' },
    cancelBtnHover: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' },
  },
}
