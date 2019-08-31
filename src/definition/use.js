
import setAnimations, { animate, logReject, transitionTo } from './animate'
import Maybe from 'folktale/maybe'
import React from 'react'
import normalize from './normalize'
import parse from './parse'
import { parse as parseTimingFunction } from '../timing'
import { serializeDefinition } from './serialize'
import { useGatherMemo } from '@cdoublev/react-utils'

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
 * getIndex :: String|Number -> Number -> { length: Number } -> Number
 */
const getIndex = (flag, currentIndex, collection) => {
    if (flag === 'prev') {
        if (currentIndex === 0) return collection.length - 1
        return currentIndex - 1
    }
    if (flag === 'next') {
        if (currentIndex === collection.length - 1) return 0
        return currentIndex + 1
    }
    return flag
}

/**
 * reducer :: State -> Action -> State
 *
 * State => { currentIndex: Number, isAnimated: Boolean, nextIndex: Number }
 * Action -> { type: String, payload: State }
 */
const reducer = (state, action) => {
    switch (action.type) {
        case 'TOGGLE':
            return { ...state, isAnimated: !state.isAnimated }
        case 'END':
            return { currentIndex: state.nextIndex, isAnimated: false }
        case 'NEXT':
            return {
                currentIndex: state.nextIndex || state.currentIndex,
                isAnimated: true,
                nextIndex: action.payload.nextIndex,
            }
        default:
            throw Error(`Unexpected action of type \`${action.type}\``)
    }
}

/**
 * useDefinition :: [Definition] -> Options -> [Definition, Function, State]
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
 * State => { currentIndex: Number, isAnimated: Boolean }
 *
 * Given a collection of `Definition`, it should return:
 * - a normalized `Definition` at `startIndex`
 * - a `Function` to animate to a normalized `Definition` at a given index
 * - the current state of the animation
 *
 * Memo: implementation is explained in ./README.md.
 */
const useDefinition = (definitions, userOptions = {}) => {

    const [startIndex, globalOptions] = useGatherMemo({ ...defaultOptions, ...userOptions }, 'startIndex')
    const defs = React.useMemo(
        () => setAnimations(normalize(parse(definitions)), globalOptions),
        [definitions, globalOptions])
    const [definition, setDefinition] = React.useState(defs[startIndex])
    const [state, dispatch] = React.useReducer(reducer, { currentIndex: startIndex, isAnimated: false })
    const animation = React.useRef(state)
    const setTime = React.useCallback(time => animation.current.time = time, [animation])

    /**
     * animateTo :: Number|String -> Options -> Future
     */
    const animateTo = (next, stepOptions) => {

        const options = stepOptions ? { ...defaultOptions, ...stepOptions } : globalOptions
        const nextIndex = getIndex(next, animation.current.currentIndex, defs)
        const from = animation.current.isAnimated ? definition : defs[animation.current.currentIndex]
        const to = defs[nextIndex]
        const timingFunction = parseTimingFunction(options.timing)
        const timeFunction = time => {

            let hasRun = true

            setDefinition(from.map(({ points, type }, commandIndex) => ({
                points: points.map((group, groupIndex) => {

                    const delay = Maybe.fromNullable(options.delay).getOrElse(to[commandIndex].points[groupIndex].delay)
                    const duration = Maybe.fromNullable(options.duration).getOrElse(to[commandIndex].points[groupIndex].duration)
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

            return { hasRun, time }
        }

        /**
         * Experimental
         *
         * Related:
         * - https://github.com/origamitower/folktale/issues/224
         * - https://github.com/tc39/proposal-cancelable-promises
         * - https://developer.mozilla.org/en-US/docs/Web/API/Animation
         */
        const extendFuture = future => {

            future.to = (index, options, callback) => extendFuture(
                future.chain(() => {
                    if (typeof options === 'function') {
                        return animateTo(index).map(callback)
                    }
                    if (typeof callback === 'function') {
                        return animateTo(index, options).map(callback)
                    }
                    return animateTo(index, options)
                }))

            future.pause = () => {

                animation.current.task.cancel()
                animation.current.isAnimated = false
                dispatch({ type: 'TOGGLE' })

                return future
            }

            future.resume = () => {
                const offset = animation.current.time
                animation.current.time = 0
                return extendFuture(animation.current.task =
                    animate(timeFunction, { offset, onCancel: setTime })
                        .map(() => {
                            dispatch({ type: 'END' })
                            animation.current.isAnimated = false
                            return nextIndex
                        })
                        .orElse(logReject('[use-definition-hook]: error while running animation.'))
                        .run())
            }

            return future
        }

        if (animation.current.isAnimated) animation.current.task.cancel()
        dispatch({ payload: { nextIndex }, type: 'NEXT' })

        animation.current.currentIndex = nextIndex
        animation.current.isAnimated = true
        animation.current.task =
            animate(timeFunction, { onCancel: setTime })
                .map(() => {
                    dispatch({ type: 'END' })
                    animation.current.isAnimated = false
                    return nextIndex
                })
                .orElse(logReject('[use-definition-hook]: error while running animation.'))
                .run()

        return extendFuture(animation.current.task.future())
    }

    // Cancel animation before component unmounts
    React.useEffect(() => () => animation.current.isAnimated && animation.current.task.cancel(), [])

    return [serializeDefinition(definition), animateTo, state]
}

export default useDefinition
