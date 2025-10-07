export function transformVars(tx: number, ty: number, scale?: number, rotDeg?: number) {
  const style: any = {
    '--tx': `${tx}px`,
    '--ty': `${ty}px`,
  }
  if (typeof scale === 'number') style['--scale'] = String(scale)
  if (typeof rotDeg === 'number') style['--rot'] = `${rotDeg}deg`
  return style
}
