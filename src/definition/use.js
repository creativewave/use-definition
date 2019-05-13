
import setAnimations, { animate, logReject, transitionTo } from './animate'

import React from 'react'
import Task from 'folktale/concurrency/task'
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
 * useDefinition :: { definitions: [Definition], options?: Options }
 *               -> [Definition, Function, Reference]
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
 * Reference => { current: { index: Number, isRunning: Boolean, task: TaskExecution } }
 *
 * Given a collection of `Definition`, it should return:
 * - a normalized `d`efinition
 * - a `Function` to animate a transition into a next `Definition` index
 * - the index of the `Definition` that is currently rendered
 *
 * Memo: implementation is explained in ./README.md.
 */
const useDefinition = ({ definitions, options: userOptions = {} }) => {

    const { startIndex, ...globalOptions } = { ...defaultOptions, ...userOptions }
    const defs = React.useMemo(
        () => setAnimations(normalize(parse(definitions)), globalOptions),
        [definitions, globalOptions])
    const [definition, setDefinition] = React.useState(defs[startIndex])
    const animation = React.useRef({ index: startIndex, isRunning: false })

    /**
     * animateTo :: NextIndex -> TimingFunction -> { sequence: Task, run: Frame -> TaskExecution }
     *
     * NextIndex => Number|String
     * TimingFunction => String
     * TimingFunction :: (Number -> Number)
     * TimingFunction :: (Number -> [Group, Group] -> Number)
     *
     * Memo: the task is returned then received back and run here, in order to
     * automatically cancel it when component unmounts.
     *
     * Memo: the scoped `definition` will be stale right after animation starts.
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

        return {
            run(task) {
                if (animation.current.isRunning) animation.current.task.cancel()
                animation.current.task = task.run()
            },
            sequence: animate(timeFunction)
                .and(Task.of().map(() => {
                    animation.current.isRunning = true
                    animation.current.index = nextIndex
                }))
                .map(() => {
                    animation.current.isRunning = false
                    return nextIndex
                })
                .orElse(logReject('[use-definition-hook]: error while running animation.')),
        }
    }

    // Cancel animation before component unmounts
    React.useEffect(() => () => animation.current.isRunning && animation.current.task.cancel(), [])

    return [serializeDefinition(definition), animateTo, animation]
}

export default useDefinition
