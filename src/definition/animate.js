
import { rejected, task } from 'folktale/concurrency/task'

import memoize from 'lodash/memoize'
import random from 'lodash/fp/random'
import round from '../round'

/**
 * logReject :: String -> Error -> Task Error
 */
export const logReject = message => error =>
    rejected(console.error(message, error) || error)

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
export const transitionTo = (time, [from, to], timingFunction, precision) => ({
    x: round(precision, from.x + ((to.x - from.x) * timingFunction(time))),
    y: round(precision, from.y + ((to.y - from.y) * timingFunction(time))),
})

/**
 * animate :: (Number -> Protocol) -> Options -> Task Error Number
 *
 * Protocol => { hasRun: Boolean }
 *
 * `animate` abstracts running an animation, ie. calling the same function with
 * a time value as argument over and over, until the animation is done, by using
 * a Folktale `Task`, which is close to monads such as `Promise` and `Stream`,
 * and to coproduct functors such as `Either`, and which gives control on the
 * execution of the animation.
 *
 * It also abstracts using `requestAnimationFrame` and `cancelAnimationFrame`,
 * and handling a time variable.
 *
 * Note: `Protocol` can be used as a free data transport between sequences.
 */
export const animate = (timeFunction, { offset = 0, onCancel = () => {} }) => task(resolver => {

    let startTime = 0
    let time
    let timerId

    const run = timestamp => {

        if (startTime === 0) {
            startTime = timestamp
        }
        time = timestamp - startTime + offset

        let animation

        if (resolver.isCancelled) {
            return
        }
        try {
            animation = timeFunction(time)
        } catch (error) {
            return resolver.reject(error)
        }
        if (animation.hasRun) {
            return resolver.resolve(animation)
        }
        timerId = requestAnimationFrame(run)
    }
    timerId = requestAnimationFrame(run)
    resolver.onCancelled(() => {
        onCancel(time)
        cancelAnimationFrame(timerId)
    })
})

/**
 * getGroupOptions :: String -> Options -> GroupOptions
 *
 * Options => {
 *   delay?: Number,
 *   duration?: Number,
 *   minDelay?: Number,
 *   minDuration?: Number,
 *   maxDelay?: Number,
 *   maxDuration?: Number,
 *   precision: Number,
 * }
 * GroupOptions => {
 *   delay: Number,
 *   duration: Number,
 * }
 *
 * Memo: the end position parameters of a `Group` is used to memoize and return
 * the same `GroupOptions` when given the same parameters.
 */
const getGroupOptions = memoize(
    (group, { delay, duration, maxDelay, maxDuration, minDelay, minDuration }) => ({
        delay: typeof delay === 'undefined' ? random(minDelay, maxDelay) : delay,
        duration: typeof duration === 'undefined' ? random(minDuration, maxDuration) : duration,
    }),
    (group, { precision }) => `${round(precision, group.x)}${round(precision, group.y)}`)

/**
 * setAnimation :: Options -> Definition -> Definition
 *
 * Options => {
 *   minDelay: Number,
 *   minDuration: Number,
 *   maxDelay: Number,
 *   maxDuration: Number,
 *   precision: Number,
 * }
 * Definition => [Command]
 * Command => { type: String, points: [...Point] }
 * Point => [Group]
 * Group => { [Parameter]: Number, [Option]: Number }
 *
 * It should set `Option`s on each `Group` using corresponding `min` and `max`
 * values defined for each required `Options`.
 *
 * It should set the same `Option` values to each `Group` from the same `Point`,
 * and to each `Group` with the same `Parameter` values at a respective `Point`
 * index.
 *
 * TODO(refactoring): transfom it into a transducer function.
 */
export const setAnimation = options => ([startCommand, drawCommand, endCommand]) => [
    { ...startCommand, points: [{ ...startCommand.points[0], ...getGroupOptions(startCommand.points[0], options) }] },
    {
        ...drawCommand,
        points: drawCommand.points.map((point, index) => {
            let positionPoint
            switch (index % 3) {
                case 0:
                    positionPoint = drawCommand.points[index - 1] || startCommand.points[0]
                    break
                case 1:
                    positionPoint = drawCommand.points[index + 1]
                    break
                default:
                    positionPoint = point
                    break
            }
            return { ...point, ...getGroupOptions(positionPoint, options) }
        }),
    },
    endCommand,
]

/**
 * setAnimations :: [Definition] -> Options -> [Definition]
 *
 * Options => {
 *   minDelay: Number,
 *   minDuration: Number,
 *   maxDelay: Number,
 *   maxDuration: Number,
 * }
 */
const setAnimations = (definitions, options) => definitions.map(setAnimation(options))

export default setAnimations
