
import animate, { End } from '../animation'

import React from 'react'
import normalize from './normalize'
import parse from './parse'
import { parse as parseTimingFunction } from '../timing'
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
    x: (from.x + ((to.x - from.x) * timingFunction(time))).toFixed(2),
    y: (from.y + ((to.y - from.y) * timingFunction(time))).toFixed(2),
})

/**
 * useDefinition :: {
 *   definitions: [Definition],
 *   options?: Options,
 *   startIndex?: Number,  // Default to 0
 * }
 * -> [Definition, Function]
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
 * given a collection of `Definition`, and a `Function` to animate a transition
 * into a next `Definition` index.
 *
 * Memo: implementation is explained in ./README.md.
 */
const useDefinition = ({ definitions, options = {}, startIndex = 0 }) => {

    const defs = React.useMemo(() => setAnimations(normalize(parse(definitions)), options), [definitions, options])
    const [currentIndex, setCurrentIndex] = React.useState(startIndex)
    const [definition, setDefinition] = React.useState(serializeDefinition(defs[currentIndex]))
    const animation = React.useRef()

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
    const animateTo = React.useCallback((nextIndex, pointTimingFunction = 'easeOutCubic') => {

        const toIndex = typeof nextIndex === 'function' ? nextIndex(currentIndex) : nextIndex
        const from = defs[currentIndex]
        const to = defs[toIndex]
        const timingFunction = parseTimingFunction(pointTimingFunction)
        const timeFunction = time => {

            let hasRun = true
            setDefinition(serializeDefinition(from.map(({ points, type }, commandIndex) => ({
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
            }))))

            // TODO: either return End.of() or ...? Frame.of()?
            return hasRun ? End.of('animation is over') : { hasRun: false }
        }

        const sequence = animate(timeFunction)
            .map(() => setCurrentIndex(toIndex))
            .orElse(error => {
                setCurrentIndex(toIndex)
                /* eslint-disable no-console */
                console.error('use-definition-hook: unexpected error while running the given timeFunction (see output below). Recovering back...')
                console.error(error)
                /* eslint-enable no-console */
                return End.of(error)
            })
        const run = task => animation.current = task.run()

        return { run, sequence }

    }, [currentIndex, defs])

    // Cancel animation before component updates or unmounts
    React.useEffect(() => () => animation.current && animation.current.cancel(), [animation])

    return [definition, animateTo]
}

export default useDefinition
