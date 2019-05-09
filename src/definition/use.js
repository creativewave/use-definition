
import setAnimations, { animate, logReject, transitionTo } from './animate'

import React from 'react'
import normalize from './normalize'
import parse from './parse'
import { parse as parseTimingFunction } from '../timing'
import { serializeDefinition } from './serialize'

const defaultOptions = {
    maxDelay: 1000,
    maxDuration: 5000,
    minDelay: 0,
    minDuration: 3000,
    precision: 2,
    startIndex: 0,
}

/**
 * useDefinition :: {
 *   definitions: [Definition],
 *   options?: Options,
 * }
 * -> [Definition, Function, Number]
 *
 * Definition => String
 * Options => {
 *   delay?: Number,
 *   duration?: Number,
 *   minDelay?: Number,
 *   minDuration?: Number,
 *   maxDelay?: Number,
 *   maxDuration?: Number,
 *   precision?: Number,
 *   startIndex?: Number,
 * }
 *
 * It should return a normalized value of the `d`efinition attribute a `<path>`
 * given a collection of `Definition`, a `Function` to animate a transition into
 * a next `Definition` index, and current index of the rendered `Definition`.
 *
 * Memo: implementation is explained in ./README.md.
 */
const useDefinition = ({ definitions, options: userOptions = {} }) => {

    const { startIndex, ...options } = { ...defaultOptions, ...userOptions }
    const defs = React.useMemo(() => setAnimations(normalize(parse(definitions)), options), [definitions, options])
    const [currentIndex, setCurrentIndex] = React.useState(startIndex)
    const [definition, setDefinition] = React.useState(defs[currentIndex])
    const animation = React.useRef()
    const status = React.useRef()

    /**
     * animateTo :: NextIndex -> TimingFunction -> {
     *   sequence: Task,
     *   run: Frame -> TaskExecution,
     * }
     *
     * NextIndex :: (Number -> Number) | Number
     * TimingFunction :: (Number -> Number) | String
     *                :: (Number -> [Point] -> Number) | String
     */
    const animateTo = (nextIndex, pointTimingFunction = 'easeOutCubic') => {

        const next = typeof nextIndex === 'string'
            ? animation.current.index === defs.length - 1 ? 0 : animation.current.index + 1
            : nextIndex
        const to = defs[next]
        const timingFunction = parseTimingFunction(pointTimingFunction)
        const timeFunction = time => {

            let hasRun = true

            setDefinition(definition.map(({ points, type }, commandIndex) => ({
                points: points.map((point, pointIndex) => {

                    const { delay, duration } = to[commandIndex].points[pointIndex]
                    const hasStarted = time > delay
                    const hasFrame = hasStarted && time < duration + delay

                    hasRun = hasRun && ((time - delay) >= duration)

                    // Return initial point
                    if (!hasStarted) {
                        return point
                    }
                    // Return intermediate point
                    if (hasFrame) {
                        const relativeTime = (time - delay) / duration
                        if (timingFunction.length === 1) {
                            return transitionTo(relativeTime, [point, to[commandIndex].points[pointIndex]], timingFunction, options.precision)
                        }
                        return timingFunction(relativeTime, [point, to[commandIndex].points[pointIndex]])
                    }
                    // Return final point
                    return to[commandIndex].points[pointIndex]
                }),
                type,
            })))

            return hasRun ? { hasRun: true } : { hasRun: false }
        }

        return {
            run(task) {
                status.current === 'running' ? animation.current.cancel() : status.current = 'running'
                animation.current = task.run()
                setCurrentIndex(next)
            },
            sequence: animate(timeFunction)
                .map(() => status.current = 'end')
                .orElse(logReject('[use-definition-hook]: error while running animation.')),
        }
    }

    // Cancel animation before component updates or unmounts
    React.useEffect(() => () => status.current === 'running' && animation.current.cancel(), [])

    return [serializeDefinition(definition), animateTo, currentIndex]
}

export default useDefinition
