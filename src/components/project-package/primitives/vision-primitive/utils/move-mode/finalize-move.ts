export function finalizeMove(state: { tx: number; ty: number }) {
  // Finalize placement: stop dragging, exit move mode, and return the finalized vector
  return {
    tx: state.tx,
    ty: state.ty,
    dragging: false as const,
    isMoving: false as const,
  }
}
