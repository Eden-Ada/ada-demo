import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react'

export type Dir = 'left' | 'right' | null

export interface CarouselParams {
  actionRef: MutableRefObject<number>
  getIndex: () => number
  setIndex: Dispatch<SetStateAction<number>>
  setPrevIdx: Dispatch<SetStateAction<number | null>>
  setDir: Dispatch<SetStateAction<Dir>>
  setPrevToken: Dispatch<SetStateAction<number | null>>
  setCurToken: Dispatch<SetStateAction<number>>
  leftRef: RefObject<HTMLButtonElement | null>
  rightRef: RefObject<HTMLButtonElement | null>
  length: number
}

function pulse(el: HTMLElement | null | undefined) {
  if (!el) return
  el.classList.remove('pulse')
  // force reflow to restart the animation
  void (el as HTMLElement).offsetWidth
  el.classList.add('pulse')
  el.addEventListener('animationend', () => el.classList.remove('pulse'), { once: true })
}

export function createCarouselController({
  actionRef,
  getIndex,
  setIndex,
  setPrevIdx,
  setDir,
  setPrevToken,
  setCurToken,
  leftRef,
  rightRef,
  length,
}: CarouselParams) {
  const prev = () => {
    pulse(leftRef.current || undefined)
    const token = ++actionRef.current
    setDir('left')
    setPrevIdx(getIndex())
    setPrevToken(token)
    setCurToken(token)
    setIndex((i) => (i - 1 + length) % length)
  }

  const next = () => {
    pulse(rightRef.current || undefined)
    const token = ++actionRef.current
    setDir('right')
    setPrevIdx(getIndex())
    setPrevToken(token)
    setCurToken(token)
    setIndex((i) => (i + 1) % length)
  }

  return { prev, next }
}
