'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface Option {
  label: string
  value: string
}

interface CustomSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  icon?: React.ReactNode
}

export function CustomSelect({ options, value, onChange, placeholder = 'Pilih opsi...', icon }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)
  const displayLabel = selectedOption ? selectedOption.label : placeholder

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 pl-11 pr-10 text-xs font-medium text-foreground text-left focus:outline-none flex items-center justify-between shadow-sm transition-all hover:bg-slate-200/50 dark:hover:bg-secondary"
      >
        {icon && <span className="absolute left-4 text-muted-foreground">{icon}</span>}
        <span className={`truncate ${!value ? 'text-muted-foreground' : 'text-foreground font-bold uppercase'}`}>
          {displayLabel}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {options.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground text-center italic">Tidak ada pilihan</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-3 text-xs text-left font-medium uppercase transition-colors flex items-center justify-between hover:bg-primary/10 hover:text-primary ${
                  value === opt.value ? 'bg-primary/10 text-primary font-bold' : 'text-foreground'
                }`}
              >
                <span>{opt.label}</span>
                {value === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}