export function cancelEdit(savedText: string) {
  return { isEditing: false as const, draft: savedText }
}
