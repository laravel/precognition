import { Poll, PollTimeout } from './types'

const createPoll = (callback: () => void): Poll => {
    let timeoutID: NodeJS.Timeout|null = null
    let timeout = 60000 // default: one minute

    const schedule = () => {
        if (timeout > 0) { // not tested
            timeoutID = setTimeout(() => {
                callback()
                schedule()
            }, timeout)
        }
    }

    return {
        every(t) {
            const prepared: Required<PollTimeout> = {
                ...{ milliseconds: 0, seconds: 0, minutes: 0, hours: 0 },
                ...t,
            }

            timeout = prepared.milliseconds
                + (prepared.seconds * 1000)
                + (prepared.minutes * 60000)
                + (prepared.hours * 3600000)

            return this
        },
        start() {
            if (timeoutID !== null) {
                console.error('Polling has already started. You should stop the poll before calling start().')
                return this
            }

            schedule()

            return this
        },
        stop() {
            if (timeoutID === null) {
                console.error('Polling has not yet started. You should start the poll before calling stop().')
                return this
            }

            clearTimeout(timeoutID)

            timeoutID = null

            return this
        },
    }
}

export { createPoll }
