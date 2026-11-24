import { gsap } from '@/lib/gsap'

/**
 * Hover tilt for cards and card images: the element leans toward the pointer in 3D and eases back flat
 * when it leaves. Only with a mouse (not touch) and not in reduced motion. Returns a cleanup function.
 */
export function tilt(elements: Element[], max = 8) {
  if (typeof window === 'undefined') return () => undefined
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!fine || reduced) return () => undefined

  const move = (e: Event) => {
    const el = e.currentTarget as HTMLElement
    const { clientX, clientY } = e as PointerEvent
    const r = el.getBoundingClientRect()
    const x = (clientX - r.left) / r.width - 0.5
    const y = (clientY - r.top) / r.height - 0.5
    gsap.to(el, {
      rotationY: x * max * 2,
      rotationX: -y * max * 2,
      transformPerspective: 900,
      duration: 0.4,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  }
  const leave = (e: Event) => {
    gsap.to(e.currentTarget as HTMLElement, { rotationX: 0, rotationY: 0, duration: 0.8, ease: 'power3.out', overwrite: 'auto' })
  }

  elements.forEach((el) => {
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
  })
  return () =>
    elements.forEach((el) => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    })
}
