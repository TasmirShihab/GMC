import type { ReactNode } from 'react'

import s from './PillButton.module.css'

interface PillButtonProps {
  href: string
  children: ReactNode
  /** primary: solid yellow · secondary: outlined, for use over photos and video */
  variant?: 'primary' | 'secondary'
  icon?: 'play' | 'arrow'
  className?: string
}

/** The house button: a pill with heavy caps and a thin ring standing just off it. */
export function PillButton({ href, children, variant = 'primary', icon, className }: PillButtonProps) {
  return (
    <a href={href} className={[s.btn, s[variant], className].filter(Boolean).join(' ')}>
      {icon === 'play' && (
        <span className={s.icon} aria-hidden>
          <svg viewBox="0 0 12 12">
            <path d="M4 2.6v6.8L9.6 6z" fill="currentColor" />
          </svg>
        </span>
      )}
      <span>{children}</span>
      {icon === 'arrow' && (
        <svg className={s.arrow} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      )}
    </a>
  )
}
