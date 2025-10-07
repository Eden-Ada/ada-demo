export function commitEdit(draft: string, prevSaved: string) {
  const next = (draft ?? '').trim()
  return { isEditing: false as const, saved: next.length ? next : prevSaved }
}
