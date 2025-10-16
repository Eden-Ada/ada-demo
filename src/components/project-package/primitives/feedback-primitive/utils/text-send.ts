export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created: number
}

export function makeUserMessage(text: string): ChatMessage {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  return {
    id,
    role: 'user',
    content: text,
    created: Date.now(),
  }
}

export default makeUserMessage
