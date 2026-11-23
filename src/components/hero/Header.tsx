import { header } from '@/content/home'
import { readOutline } from '@/lib/outline'

import s from './Header.module.css'

function Icon({ name }: { name: 'outline' | 'grid' | 'map' | 'mail' | 'search' }) {
  if (name === 'mail') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
        <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
      </svg>
    )
  }
  if (name === 'search') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="10.5" cy="10.5" r="6" />
        <path d="M15 15l5.5 5.5" />
      </svg>
    )
  }
  if (name === 'outline') {
    // The GMC boundary itself (assets/svg/gmc-outline.svg), drawn as a line icon.
    const outline = readOutline()
    return (
      <svg className={s.outlineIcon} viewBox={outline.viewBox} fill="none" aria-hidden>
        <path
          d={outline.boundary}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    )
  }
  if (name === 'map') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 6l6-2.5 6 2.5 6-2.5v14.5l-6 2.5-6-2.5-6 2.5z" />
        <path d="M9 3.5v14.5M15 6v14.5" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </svg>
  )
}

/** Both versions are in the page; the header's theme shows the white one on dark, the colour one on cream. */
function Logo() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={`${s.logo} ${s.logoLight}`} src={header.logo} alt="" width={240} height={240} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={`${s.logo} ${s.logoDark}`} src={header.logoOnLight} alt="" width={238} height={240} />
    </>
  )
}

export function Header() {
  return (
    <header className={s.header}>
      <nav className={s.navLeft} aria-label="Inquiry and search">
        {header.navLeft.map((item) => (
          <a key={item.label} className={s.cell} href={item.href}>
            <span>{item.label}</span>
            <Icon name={item.icon} />
          </a>
        ))}
      </nav>

      <a className={s.lockup} href="#top" aria-label={header.logoLabel}>
        <Logo />
      </a>

      <nav className={s.nav} aria-label="Primary">
        {header.nav.map((item) => (
          <a key={item.label} className={s.cell} href={item.href}>
            <span>{item.label}</span>
            <Icon name={item.icon} />
          </a>
        ))}
        {/* Opens the site menu (menu panel not built yet). */}
        <button type="button" className={s.menu} aria-label={header.menuLabel}>
          <span className={s.bars} aria-hidden>
            <span />
            <span />
          </span>
        </button>
      </nav>
    </header>
  )
}
