import { Poll } from './types'

const createPoll = (callback: () => Promise<unknown>): Poll => {
    let polling = false
    let timeoutID: NodeJS.Timeout|undefined
    let timeoutDuration = 60_000 // default: one minute

    const schedule = (): NodeJS.Timeout|undefined => {
        if (polling) {
            return setTimeout(() => callback().finally(() => timeoutID = schedule()), timeoutDuration)
        }
    }

    return {
        every(t) {
            timeoutDuration = (t.milliseconds ?? 0)
                + ((t.seconds ?? 0) * 1000)
                + ((t.minutes ?? 0) * 60000)
                + ((t.hours ?? 0) * 3600000)

            return this
        },
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
        polling: () => polling,
    }
}

export { createPoll }
