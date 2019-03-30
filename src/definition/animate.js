
import memoize from 'lodash/fp/memoize'
import random from 'lodash/fp/random'

/**
 * getGroupOptions :: String -> Options -> GroupOptions
 *
 * Options => {
 *   minDelay: Number,
 *   minDuration: Number,
 *   maxDelay: Number,
 *   maxDuration: Number,
 * }
 * GroupOptions => {
 *   delay: Number,
 *   duration: Number,
 * }
 *
 * Memo: the end position parameters of a `Group` is used to memoize and return
 * the same `GroupOptions` when given the same parameters.
 */
const getGroupOptions = memoize((group, options) => ({
    delay: random(options.minDelay, options.maxDelay),
    duration: random(options.minDuration, options.maxDuration),
}))

/**
 * setAnimation :: Options -> Definition -> Definition
 *
 * Options => {
 *   minDelay: Number,
 *   minDuration: Number,
 *   maxDelay: Number,
 *   maxDuration: Number,
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
    {
        ...startCommand,
        points: [{
            ...startCommand.points[0],
            ...getGroupOptions(`${startCommand.points[0].x}${startCommand.points[0].y}`, options),
        }],
    },
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
            return { ...point, ...getGroupOptions(`${positionPoint.x}${positionPoint.y}`, options) }
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
const setAnimations = (definitions, { maxDelay = 1000, maxDuration = 5000, minDelay = 0, minDuration = 3000 }) =>
    definitions.map(setAnimation({ maxDelay, maxDuration, minDelay, minDuration }))

export default setAnimations
