
import setAnimations, { animate, logReject, transitionTo } from './animate'

import React from 'react'
import normalize from './normalize'
import parse from './parse'
import { parse as parseTimingFunction } from '../timing'
import { serializeDefinition } from './serialize'

const defaultOptions = {
    maxDelay: 1000,
    maxDuration: 4000,
    minDelay: 0,
    minDuration: 2000,
    precision: 2,
    startIndex: 0,
    timing: 'easeOutCubic',
}

/**
 * useDefinition :: [Definition] -> Options -> [Definition, Function, Reference]
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
 *   timing?: TimingFunction,
 * }
 * TimingFunction => String
 * TimingFunction :: (Number -> Number)
 * TimingFunction :: (Number -> [Group, Group] -> Number)
 * Reference => { current: { index: Number, isRunning: Boolean, task?: TaskExecution } }
 *
 * Given a collection of `Definition`, it should return:
 * - a normalized `Definition` at `startIndex`
 * - a `Function` to animate to a normalized `Definition` at a given index
 * - a reference object pointing to the current index, the current status of the
 * animation, and a task to control its execution
 *
 * Memo: implementation is explained in ./README.md.
 */
const useDefinition = (definitions, userOptions = {}) => {

    const { startIndex, ...globalOptions } = { ...defaultOptions, ...userOptions }
    const defs = React.useMemo(
        () => setAnimations(normalize(parse(definitions)), globalOptions),
        [definitions, globalOptions])
    const [definition, setDefinition] = React.useState(defs[startIndex])
    const animation = React.useRef({ index: startIndex, isRunning: false })

    /**
     * animateTo :: Number|String -> Options -> Future
     */
    const animateTo = (next, stepOptions = {}) => {

        const nextIndex = typeof next === 'string'
            ? animation.current.index === defs.length - 1 ? 0 : animation.current.index + 1
            : next
        const options = { ...globalOptions, ...stepOptions }
        const from = animation.current.isRunning ? definition : defs[animation.current.index]
        const to = defs[nextIndex]
        const timingFunction = parseTimingFunction(options.timing)
        const timeFunction = time => {

            let hasRun = true

            setDefinition(from.map(({ points, type }, commandIndex) => ({
                points: points.map((group, groupIndex) => {

                    const { delay = options.delay, duration = options.duration } = to[commandIndex].points[groupIndex]
                    const hasStarted = time > delay
                    const hasFrame = hasStarted && time < duration + delay

                    hasRun = hasRun && ((time - delay) >= duration)

                    // Return initial group
                    if (!hasStarted) {
                        return group
                    }
                    // Return intermediate group
                    if (hasFrame) {
                        const relativeTime = (time - delay) / duration
                        if (timingFunction.length === 1) {
                            return transitionTo(relativeTime, [group, to[commandIndex].points[groupIndex]], timingFunction, options.precision)
                        }
                        return timingFunction(relativeTime, [group, to[commandIndex].points[groupIndex]])
                    }
                    // Return final group
                    return to[commandIndex].points[groupIndex]
                }),
                type,
            })))

            return hasRun ? { hasRun: true } : { hasRun: false }
        }

        if (animation.current.isRunning) animation.current.task.cancel()
        animation.current.index = nextIndex
        animation.current.isRunning = true
        animation.current.task
            = animate(timeFunction)
                .map(() => {
                    animation.current.isRunning = false
                    return nextIndex
                })
                .orElse(logReject('[use-definition-hook]: error while running animation.'))
                .run()

        return animation.current.task.future()
    }

    // Cancel animation before component unmounts
    React.useEffect(() => () => animation.current.isRunning && animation.current.task.cancel(), [])

    return [serializeDefinition(definition), animateTo, animation]
}

export default useDefinition
