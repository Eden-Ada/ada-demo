export function updateDraft(input: string) {
  // Mirror current behavior: trim only leading whitespace; keep user spacing after first char
  return (input ?? '').trimStart()
}
