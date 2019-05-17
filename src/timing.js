
/**
 * sinBounce :: Number -> Number -> Number
 *
 * Definition of a "standard" sinusoïdal function:
 *
 * `const sin = time => amplitude * Math.sin(Math.PI * ((time * frequency * time) + phase))`
 * `const sin = time => amplitude * Math.sin((angularFrequency * time) + phase)`
 *
 * (Ordinary) `frequency` is the number of cycles (bounces) per second set in
 * the angular frequency defined with `Math.PI * 2 * frequency * time`.
 *
 * `phase` is an angular value (`0.5` represents `90` degrees) of a translation
 * of the cycles on axe `x` (default to `0`). Therefore, `phase` is a deviation
 * of time that can be used to delay/advance the start of the cycles.
 *
 * `amplitude` is a value (default to `0`) of a translation of the cycles on axe
 * `y`. It can be used to `constrain` (or extend) the values on axe `y`, ie. to
 * decrease or increase bounce height, by dividing or multiplying them, or by
 * adding/substracting a time based value to "push" them vertically.
 *
 * Fourier series composes sin functions by transforming `amplitude` using a sin
 * function with a `frequency` related to the main sin function.
 *
 * Related:
 * - https://en.wikipedia.org/wiki/Sine_wave
 * - https://en.wikipedia.org/wiki/Fourier_series
 */
const sinBounce = (bounces = 1, maxHeight = 1.5) => time => { // eslint-disable-line no-unused-vars
    const frequency = (2 * bounces) + 0.5
    const phase = 0
    const amplitude = (1 - time) * (time - (1 / bounces))
    const constraint = 2 - ((1 - time) * maxHeight)
    return (amplitude + Math.sin(Math.PI * ((time * frequency) + phase))) / constraint
}

// https://github.com/ai/easings.net/blob/master/src/easings/easingsFunctions.ts
const bounce = t => {

    const n1 = 7.5625
    const d1 = 2.75

    if (t < (1 / d1)) {
        return n1 * t * t
    } else if (t < (2 / d1)) {
        return (n1 * (t -= (1.5 / d1)) * t) + 0.75
    } else if (t < (2.5 / d1)) {
        return (n1 * (t -= (2.25 / d1)) * t) + 0.9375
    }
    return (n1 * (t -= (2.625 / d1)) * t) + 0.984375
}

// https://css-tricks.com/emulating-css-timing-functions-javascript/#bouncing-transitions
const back = ({ end = 0, start = 0 }) => time => {
    if (start === 0) {
        return Math.sin(Math.PI * time * end) / Math.sin(Math.PI * end)
    } else if (end === 0) {
        return 1 - (Math.sin(Math.PI * ((1 - time) * start)) / Math.sin(Math.PI * start))
    }
    return (Math.sin(Math.PI * ((time * (end - start)) + start)) - Math.sin(Math.PI * start))
         / (Math.sin(Math.PI * end) - Math.sin(Math.PI * start))
}

/* eslint-disable sort-keys */
const timing = {
    bounceBackIn: t => back({ start: -0.7 })(t),
    bounceBackOut: t => back({ end: 0.7 })(t),
    bounceBackInOut: t => back({ end: 0.7, start: -0.7 })(t),
    bounceBackEaseOut: t => ((0.04 - (0.04 / t)) * Math.sin(25 * t)) + 1,
    bounceInBackOut: t => Math.abs(back({ end: 0.7, start: -0.7 })(t)),
    bounceInEaseIn: t => 1 - bounce(1 - t),
    bounceInEaseOut: bounce,
    bounceInEaseInOut: t => t < 0.5 ? (1 - bounce(1 - (2 * t))) / 2 : (1 + bounce((2 * t) - 1)) / 2,
    easeInSin: t => 1 + Math.sin(Math.PI * ((t / 2) - 0.5)),
    easeInQuad: t => Math.pow(t, 2),
    easeInCubic: t => Math.pow(t, 3),
    easeInQuart: t => Math.pow(t, 4),
    easeInQuint: t => Math.pow(t, 5),
    easeInArc: t => 1 - Math.sin(Math.acos(t)),
    easeOutSin: t => Math.sin(Math.PI * t / 2),
    easeOutCubic: t => ((--t) * Math.pow(t, 2)) + 1,
    easeOutQuad: t => t * (2 - t),
    easeOutQuart: t => 1 - ((--t) * Math.pow(t, 3)),
    easeOutQuint: t => 1 + ((--t) * Math.pow(t, 4)),
    easeOutArc: t => Math.sin(Math.acos(1 - t)),
    easeInOutSin: t => (1 + Math.sin(Math.PI * (t - 0.5))) / 2,
    easeInOutCubic: t => t < 0.5 ? 2 * Math.pow(t, 2) : -1 + ((4 - (2 * t)) * t),
    easeInOutQuad: t => t < 0.5 ? 4 * Math.pow(t, 3) : ((t - 1) * ((2 * t) - 2) * ((2 * t) - 2)) + 1,
    easeInOutQuart: t => t < 0.5 ? 8 * Math.pow(t, 4) : 1 - (8 * (--t) * Math.pow(t, 3)),
    easeInOutQuint: t => t < 0.5 ? 16 * Math.pow(t, 5) : 1 + (16 * (--t) * Math.pow(t, 4)),
    linear: t => t,
}
/* eslint-enable sort-keys */

export const parse = timingFunction => {
    if (typeof timingFunction === 'undefined') {
        return timing.easeOutCubic
    }
    if (typeof timingFunction === 'function') {
        return timingFunction
    }
    if (typeof timingFunction === 'string' && timing[timingFunction]) {
        return timing[timingFunction]
    }
    throw Error('Unexpected timing function: ', timingFunction)
}

export default timing
