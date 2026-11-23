import { explore } from '@/content/home'

import s from './ExplorePill.module.css'

/** Fixed bottom-right pill (image + yellow label), shown once the hero has scrolled away. */
export function ExplorePill() {
  return (
    <a className={s.pill} href={explore.href}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={explore.image} alt="" loading="lazy" />
      <span className={s.label}>{explore.label}</span>
    </a>
  )
}
