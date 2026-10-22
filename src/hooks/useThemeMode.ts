'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function useThemeMode() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Gunakan resolvedTheme agar tahu tema aktual (terang/gelap)
  const currentTheme = resolvedTheme || theme
  const isDark = currentTheme === 'dark'
  
  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return { isDark, toggleTheme, mounted }
}