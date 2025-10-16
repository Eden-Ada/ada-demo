export type ThreeWayAction = 'trash' | 'refresh' | 'check'

export type ThreeWayActionHandlers = {
  trash?: () => void
  refresh?: () => void
  check?: () => void
}

export const demoActions: Required<ThreeWayActionHandlers> = {
  trash: () => {
    // Demo: replace with real delete handler
    // eslint-disable-next-line no-console
    console.log('[three-way-bar] demo action: trash')
  },
  refresh: () => {
    // eslint-disable-next-line no-console
    console.log('[three-way-bar] demo action: refresh')
  },
  check: () => {
    // eslint-disable-next-line no-console
    console.log('[three-way-bar] demo action: check')
  },
}

export function performAction(
  action: ThreeWayAction,
  handlers?: ThreeWayActionHandlers
) {
  const table = { ...demoActions, ...(handlers || {}) }
  table[action]()
}
