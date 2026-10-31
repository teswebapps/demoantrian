'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle2, HelpCircle, X } from 'lucide-react'

interface CustomModalProps {
  isOpen: boolean
  type?: 'confirm' | 'alert' | 'success' | 'error'
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onClose: () => void
}

export function CustomModal({
  isOpen,
  type = 'confirm',
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Batal',
  onConfirm,
  onClose
}: CustomModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center relative overflow-hidden"
        >
          {/* Ikon Header Modal Berdasarkan Tipe */}
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-secondary">
            {type === 'success' && <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
            {type === 'error' && <AlertCircle className="w-8 h-8 text-rose-500" />}
            {type === 'alert' && <AlertCircle className="w-8 h-8 text-amber-500" />}
            {type === 'confirm' && <HelpCircle className="w-8 h-8 text-primary" />}
          </div>

          <h3 className="text-base font-black mb-2 text-foreground uppercase tracking-tight">{title}</h3>
          <p className="text-xs text-muted-foreground mb-6 leading-relaxed px-2">{message}</p>

          <div className="flex gap-2.5">
            {type === 'confirm' && (
              <button 
                onClick={onClose}
                className="flex-1 py-3 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold rounded-xl transition"
              >
                {cancelText}
              </button>
            )}
            <button 
              onClick={() => { onConfirm(); onClose(); }}
              className={`flex-1 py-3 text-xs font-black rounded-xl text-white shadow-lg transition active:scale-95 ${
                type === 'error' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20' :
                type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' :
                'bg-primary hover:bg-primary/90 shadow-primary/20 text-primary-foreground'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}