export function enterEdit(_savedText: string) {
  // Always start with an empty draft when entering edit mode
  return { isEditing: true as const, draft: '' }
}
