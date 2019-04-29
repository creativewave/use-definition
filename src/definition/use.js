
import animate, { End, logEnd } from '../animation'

import React from 'react'
import normalize from './normalize'
import parse from './parse'
import { parse as parseTimingFunction } from '../timing'
import round from '../round'
import { serializeDefinition } from './serialize'
import setAnimations from './animate'

/**
 * transitionTo :: Time -> [From, To] -> (Time -> Number) -> Group
 *
 * Time => Number
 * From, To => Group
 * Group => { [Parameter]: Number }
 *
 * It should return an intermediate `Group` between `From` and `To` relative to
 * the current relative `Time` of the animation, ie. a `Number` between 0 and 1.
 */
const transitionTo = (time, [from, to], timingFunction) => ({
    x: round(2, from.x + ((to.x - from.x) * timingFunction(time))),
    y: round(2, from.y + ((to.y - from.y) * timingFunction(time))),
})

/**
 * useDefinition :: {
 *   definitions: [Definition],
 *   options?: Options,
 *   startIndex?: Number,  // Default to 0
 * }
 * -> [Definition, Function, Number]
 *
 * Definition => String
 * Options => {
 *   minDelay?: Number,    // Default to 0
 *   minDuration?: Number, // Default to 3000
 *   maxDelay?: Number,    // Default to 1000
 *   maxDuration?: Number, // Default to 5000
 * }
 *
 * It should return a normalized value of the `d`efinition attribute a `<path>`
 * given a collection of `Definition`, a `Function` to animate a transition into
 * a next `Definition` index, and current index of the rendered `Definition`.
 *
 * Memo: implementation is explained in ./README.md.
 */
const useDefinition = ({ definitions, options = {}, startIndex = 0 }) => {

    const defs = React.useMemo(() => setAnimations(normalize(parse(definitions)), options), [definitions, options])
    const [currentIndex, setCurrentIndex] = React.useState(startIndex)
    const [definition, setDefinition] = React.useState(defs[currentIndex])
    const animation = React.useRef()
    const status = React.useRef()

    /**
     * animateTo :: NextIndex -> TimingFunction -> {
     *   sequence: Frame,
     *   run: Frame -> TaskExecution,
     * }
     *
     * NextIndex :: (Number -> Number) | Number
     * TimingFunction :: (Number -> Number) | String
     *                :: (Number -> [Point] -> Number) | String
     */
    const animateTo = (nextIndex, pointTimingFunction = 'easeOutCubic') => {

        const to = defs[nextIndex]
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
                            return transitionTo(relativeTime, [point, to[commandIndex].points[pointIndex]], timingFunction)
                        }
                        return timingFunction(relativeTime, [point, to[commandIndex].points[pointIndex]])
                    }
                    // Return final point
                    return to[commandIndex].points[pointIndex]
                }),
                type,
            })))

            // TODO: either return End.of() or ...? Frame.of()?
            return hasRun ? End.of('animation is over') : { hasRun: false }
        }

        return {
            run(task) {
                status.current === 'running' ? animation.current.cancel() : status.current = 'running'
                animation.current = task.run()
                setCurrentIndex(nextIndex)
            },
            sequence: animate(timeFunction)
                .map(() => status.current = 'end')
                .orElse(logEnd('[use-definition-hook]: unexpected error while running the given timeFunction (see output below).')),
        }
    }

    // Cancel animation before component updates or unmounts
    React.useEffect(() => () => status.current === 'running' && animation.current.cancel(), [])

    return [serializeDefinition(definition), animateTo, currentIndex]
}

export default useDefinition
