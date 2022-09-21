import { Poll as TPoll, PollCallback } from './types'

export const Poll = (callback: PollCallback): TPoll => {
    let polling = false
    let invocations = 0
    let timeoutID: NodeJS.Timeout|undefined
    let timeoutDuration = 60000 // default: one minute

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

            polling = true
            timeoutID = schedule()

            return this
        },
        stop() {
            if (! polling) {
                return this
            }

            polling = false
            clearTimeout(timeoutID)
            timeoutID = undefined

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
