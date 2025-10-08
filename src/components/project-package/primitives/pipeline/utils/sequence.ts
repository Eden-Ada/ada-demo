import type { TaskEntry } from './types'

export function makeSequence(descriptors: string[]): TaskEntry[] {
  return descriptors.map((descriptor, i) => ({ id: `t${i + 1}`, descriptor }))
}

export function adjacentPairs<T>(arr: T[]): Array<[T, T]> {
  const out: Array<[T, T]> = []
  for (let i = 0; i < arr.length - 1; i++) out.push([arr[i], arr[i + 1]])
  return out
}
