
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

/* eslint-disable sort-keys */
const timing = {
    linear: t => t,
    easeInSin: t => 1 - Math.cos(Math.PI / 2 * t),
    easeInQuad: t => Math.pow(t, 2),
    easeInCubic: t => Math.pow(t, 3),
    easeInQuart: t => Math.pow(t, 4),
    easeInQuint: t => Math.pow(t, 5),
    easeInArc: t => 1 - Math.sin(Math.acos(t)),
    easeInBounce: t => 1 - bounce(1 - t),
    easeOutSin: t => Math.sin(Math.PI / 2 * t),
    easeOutCubic: t => ((--t) * Math.pow(t, 2)) + 1,
    easeOutQuad: t => t * (2 - t),
    easeOutQuart: t => 1 - ((--t) * Math.pow(t, 3)),
    easeOutQuint: t => 1 + ((--t) * Math.pow(t, 4)),
    easeOutArc: t => Math.sin(Math.acos(1 - t)),
    easeOutBackSin: t => t + (t * Math.cos(Math.PI / 2 * t)),
    easeOutBounce: bounce,
    easeOutBackBounce: t => ((0.04 - (0.04 / t)) * Math.sin(25 * t)) + 1,
    easeInOutSin: t => -(Math.cos(Math.PI * t) - 1) / 2,
    easeInOutCubic: t => t < 0.5 ? 2 * Math.pow(t, 2) : -1 + ((4 - (2 * t)) * t),
    easeInOutQuad: t => t < 0.5 ? 4 * Math.pow(t, 3) : ((t - 1) * ((2 * t) - 2) * ((2 * t) - 2)) + 1,
    easeInOutQuart: t => t < 0.5 ? 8 * Math.pow(t, 4) : 1 - (8 * (--t) * Math.pow(t, 3)),
    easeInOutQuint: t => t < 0.5 ? 16 * Math.pow(t, 5) : 1 + (16 * (--t) * Math.pow(t, 4)),
    easeInOutBounce: t => t < 0.5 ? (1 - bounce(1 - (2 * t))) / 2 : (1 + bounce((2 * t) - 1)) / 2,
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
