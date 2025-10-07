export function wiggleVars(ms: number, deg: number) {
  // Provide CSS custom properties for wiggle timing and angle.
  // These override defaults declared in vision-primitive.css
  return {
    '--wiggle-ms': `${ms}ms`,
    '--wiggle-deg': `${deg}deg`,
  } as React.CSSProperties
}
