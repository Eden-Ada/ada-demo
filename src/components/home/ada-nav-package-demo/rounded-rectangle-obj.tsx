import React from 'react';

export type RoundedRectangleObjProps = {
  width: number; // px within the pill foreignObject
  height: number; // px within the pill foreignObject
  radius?: number; // corner radius px (default 32)
  bottomOffset?: number; // distance from pill bottom, px (default 28)
  blur?: number; // blur in px (default 40)
  frostAlpha?: number; // 0..1 frost overlay (default 0.14)
  zIndex?: number; // stacking within the foreignObject (default 1)
  style?: React.CSSProperties; // extra styles if needed
  topPx?: number; // absolute top in px relative to pill (overrides bottomOffset)
  leftPx?: number; // absolute left in px relative to pill (overrides centering)
};

// Generic rounded-rect blur overlay meant to be rendered INSIDE the pill foreignObject
// It clips strictly to its rounded bounds (overflow hidden) so the blur is confined.
const RoundedRectangleObj: React.FC<RoundedRectangleObjProps> = ({
  width,
  height,
  radius = 32,
  bottomOffset = 28,
  blur = 40,
  frostAlpha = 0.14,
  zIndex = 1,
  style = {},
  topPx,
  leftPx,
}) => {
  const wrapper: React.CSSProperties = {
    position: 'absolute',
    left: leftPx !== undefined ? `${leftPx}px` : `calc(50% - ${width / 2}px)`,
    top: topPx !== undefined ? `${topPx}px` : `calc(100% - ${bottomOffset + height}px)`,
    width: `${width}px`,
    height: `${height}px`,
    borderRadius: `${radius}px`,
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex,
    ...style,
  };

  const blurLayer: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    WebkitBackdropFilter: `blur(${blur}px) saturate(140%) contrast(105%)`,
    backdropFilter: `blur(${blur}px) saturate(140%) contrast(105%)`,
    background: `rgba(255,255,255,${frostAlpha})`,
    borderRadius: 'inherit',
    pointerEvents: 'none',
  };
  const shadeLayer: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    // Figma inner shadows (SS1-SS4):
    // 1) X 3, Y 3, Blur 0.5, Spread -3.5, Color #FFFFFF @ 50%
    // 2) X 2, Y 2, Blur 1,   Spread -2,   Color #B3B3B3 @ 100%
    // 3) X -2, Y -2, Blur 1, Spread -2,   Color #B3B3B3 @ 100%
    // 4) X 0, Y 0,   Blur 22, Spread 0,   Color #F2F2F2 @ 50%
    boxShadow: [
      'inset 3px 3px 0.5px -3.5px rgba(255,255,255,0.5)',
      'inset 2px 2px 1px -2px #B3B3B3',
      'inset -2px -2px 1px -2px #B3B3B3',
      'inset 0 0 22px 0 rgba(242,242,242,0.5)'
    ].join(', '),
  };

  return (
    <div style={wrapper} aria-hidden>
      <div style={blurLayer} />
      <div style={shadeLayer} />
    </div>
  );
};

export default RoundedRectangleObj;
