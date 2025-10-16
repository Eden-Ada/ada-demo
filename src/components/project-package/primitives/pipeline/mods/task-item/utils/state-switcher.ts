/**
 * Generic conditional state switching utility for Eden Task Item modules.
 *
 * Features
 * - Strongly typed state keys (string literal unions)
 * - Top-down rule evaluation with priorities
 * - Optional `from` constraints (only transition from specific states)
 * - Async/sync conditions and guards
 * - Side effects on transition
 * - Small event system (change/progress) and a React hook
 */

export type StateKey = string
export type Context = Record<string, unknown>

export type ConditionFn<C extends Context = Context> = (ctx: C) => boolean | Promise<boolean>

export type Rule<S extends StateKey, C extends Context = Context> = {
  // Limit transition to run only when coming from one (or many) states
  from?: S | S[]
  // Target state
  to: S
  // Primary condition to allow the transition
  when?: ConditionFn<C>
  // Guard runs right before switching; if false, transition aborts
  guard?: ConditionFn<C>
  // Higher priority rules are evaluated first (default 0)
  priority?: number
  // Optional side-effect after transition
  effect?: (prev: S, next: S, ctx: C) => void | Promise<void>
}

export type SwitchEvent<S extends StateKey, C extends Context = Context> = {
  prev: S
  next: S
  context: C
  rule?: Rule<S, C>
}

// Minimal event bus built on EventTarget
class SwitcherEvents<S extends StateKey, C extends Context> {
  private target = new EventTarget()

  on(type: 'change' | 'evaluate', handler: (payload: SwitchEvent<S, C>) => void) {
    const wrapped = (ev: Event) => handler((ev as CustomEvent<SwitchEvent<S, C>>).detail)
    this.target.addEventListener(type, wrapped)
    return () => this.target.removeEventListener(type, wrapped)
  }

  emit(type: 'change' | 'evaluate', payload: SwitchEvent<S, C>) {
    this.target.dispatchEvent(new CustomEvent(type, { detail: payload }))
  }
}

export class StateSwitcher<S extends StateKey, C extends Context = Context> {
  private rules: Rule<S, C>[] = []
  private _state: S
  private _ctx: C
  private events = new SwitcherEvents<S, C>()

  constructor(initialState: S, initialContext: C, rules: Rule<S, C>[] = []) {
    this._state = initialState
    this._ctx = initialContext
    this.setRules(rules)
  }

  get state(): S { return this._state }
  get context(): C { return this._ctx }

  setContext(ctx: Partial<C>) {
    this._ctx = { ...this._ctx, ...ctx }
    // notify subscribers so UI layers can react to context-only changes
    this.events.emit('evaluate', { prev: this._state as S, next: this._state as S, context: this._ctx })
  }

  setRules(rules: Rule<S, C>[]) {
    // sort by priority desc; stable fallback to insertion order
    this.rules = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  }

  addRule(rule: Rule<S, C>) {
    this.rules.push(rule)
    this.setRules(this.rules)
  }

  on(type: 'change' | 'evaluate', handler: (payload: SwitchEvent<S, C>) => void) {
    return this.events.on(type, handler)
  }

  async evaluate(extraContext?: Partial<C>): Promise<S> {
    if (extraContext) this.setContext(extraContext)
    const prev = this._state

    for (const rule of this.rules) {
      // match `from` if provided
      if (rule.from) {
        const allowed = Array.isArray(rule.from) ? rule.from : [rule.from]
        if (!allowed.includes(prev)) continue
      }
      // evaluate condition
      const ok = rule.when ? await rule.when(this._ctx) : true
      if (!ok) continue
      // guard check
      const pass = rule.guard ? await rule.guard(this._ctx) : true
      if (!pass) continue

      // perform transition
      const next = rule.to
      if (next !== prev) {
        this._state = next
        const payload: SwitchEvent<S, C> = { prev, next, context: this._ctx, rule }
        this.events.emit('change', payload)
        if (rule.effect) await rule.effect(prev, next, this._ctx)
      } else {
        this.events.emit('evaluate', { prev, next, context: this._ctx, rule })
      }
      return this._state
    }

    // No rule fired; emit evaluate noop
    this.events.emit('evaluate', { prev, next: prev, context: this._ctx })
    return this._state
  }

  async goto(state: S, ctx?: Partial<C>) {
    if (ctx) this.setContext(ctx)
    const prev = this._state
    this._state = state
    this.events.emit('change', { prev, next: state, context: this._ctx })
  }
}

/**
 * Convenience factory
 */
export function createStateSwitcher<S extends StateKey, C extends Context = Context>(
  initialState: S,
  initialContext: C,
  rules: Rule<S, C>[] = [],
) {
  return new StateSwitcher<S, C>(initialState, initialContext, rules)
}

/**
 * React hook to bind a switcher to component state.
 */
import { useMemo, useRef, useSyncExternalStore } from 'react'

export function useStateSwitcher<S extends StateKey, C extends Context = Context>(
  initialState: S,
  initialContext: C,
  rules: Rule<S, C>[] = [],
) {
  const ref = useRef<StateSwitcher<S, C> | null>(null)
  if (!ref.current) ref.current = new StateSwitcher<S, C>(initialState, initialContext, rules)
  const switcher = ref.current

  // subscribe to external changes
  const subscribe = (onStoreChange: () => void) => {
    const off = switcher.on('change', () => onStoreChange())
    const offEval = switcher.on('evaluate', () => onStoreChange())
    return () => { off(); offEval() }
  }
  const getSnapshot = () => ({ state: switcher.state, context: switcher.context })
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return useMemo(() => ({
    state: switcher.state,
    context: switcher.context,
    evaluate: (ctx?: Partial<C>) => switcher.evaluate(ctx),
    goto: (s: S, ctx?: Partial<C>) => switcher.goto(s, ctx),
    setContext: (ctx: Partial<C>) => switcher.setContext(ctx),
    addRule: (r: Rule<S, C>) => switcher.addRule(r),
    on: (t: 'change' | 'evaluate', h: (p: SwitchEvent<S, C>) => void) => switcher.on(t, h),
    instance: switcher,
  }), [switcher])
}
