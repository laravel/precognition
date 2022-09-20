import { Poll } from './types'

export const poll = (callback: () => Promise<unknown>): Poll => {
    let polling = false
    let invocations = 0
    let timeoutID: NodeJS.Timeout|undefined
    let timeoutDuration = 60_000 // default: one minute

    const schedule = (): NodeJS.Timeout|undefined => {
        if (polling) {
            return setTimeout(() => callback().finally(() => {
                invocations++
                timeoutID = schedule()
            }), timeoutDuration)
        }
    }

    return {
        start() {
            if (polling) {
                return this
            }

            timeoutID = schedule()
            polling = true

            return this
        },
        stop() {
            if (! polling) {
                return this
            }

            clearTimeout(timeoutID)
            timeoutID = undefined
            polling = false

            return this
        },
        every(t) {
            timeoutDuration = (t.milliseconds ?? 0)
                + ((t.seconds ?? 0) * 1000)
                + ((t.minutes ?? 0) * 60000)
                + ((t.hours ?? 0) * 3600000)

            return this
        },
        polling: () => polling,
        invocations: () => invocations,
    }
}
