
import { of, task } from 'folktale/concurrency/task'

/**
 * Animation
 *
 * Animation is a data type that abstracts running an animation, ie. calling the
 * same function with a time value as argument over and over until the animation
 * is done. It's close to monad types such as `Promise` and `Stream`, and also
 * to coproduct functors such as `Either`: either an `Animation` has a `Frame`,
 * or it's `End`ed.
 *
 * It also abstracts using `requestAnimationFrame` and `cancelAnimationFrame`,
 * and handling a time variable.
 *
 * A new animation should be created using `animate(timingFunction)`. It returns
 * an object wrapping a Folktale's `Task` internally, and with an interface to
 * control the execution of the animation using the `Task` interface:
 *
 * - `orElse()`: to handle and recover from an error while runing animation
 * - `map()`: to run a function after the animation end
 * - `chain()`: to run another animation after the animation end
 * - `and()`: to run a parallel animation
 * - `run()`: to run the sequence of animation(s)
 *
 * It can also be created using `Animation.of(value)`, where `value` should be
 * considered as the return value from the last call of a `timingFunction` of an
 * animation that has already run.
 *
 * An animation should be run with `run()`, which returns a `TaskExecution` with
 * `promise()` and `future()` interfaces. `future()` returns a kind of `Promise`
 * with a `cancel()` interface to cancel the animation (its `Task`), cancel the
 * animation frame (using `cancelAnimationFrame`).
 *
 * Requirements: either the timing function should return:
 *
 * - Implementation 1: a "protocol" object `{ hasRun: Boolean }`
 * - Implementation 2: either `Frame` or `End` type, which inherits `Animation`
 *
 * See also: https://github.com/react-spring/react-spring
 */
export class Animation {
    /**
     * of :: a -> Animation End(a)
     */
    static of(animated) {
        return new End(of(animated))
    }
    /**
     * Animation :: TaskComputation Error a -> Animation End(a) Frame
     */
    constructor(task) {
        this.animationTask = task
    }
    /**
     * run :: void -> TaskExecution
     */
    run() {
        return this.animationTask.run()
    }
    /**
     * and :: Animation End(b) Frame -> Animation End([a, b]) Frame
     *
     * TODO(implement): implement this method (not very usefull).
     */
    and(/*fn*/) {
        throw Error('Not implemented yet')
    }
    /**
     * map :: a -> b -> Animation End(b) Frame
     */
    map(fn) {
        // Or just: this.animationTask = this.animationTask.map(fn); return this
        return new Animation(this.animationTask.map(fn))
    }
    /**
     * join :: void -> Animation
     */
    join() {
        return this.animationTask
    }
    /**
     * chain :: (a -> Animation End(b) Frame) -> Animation End(b) Frame
     */
    chain(fn) {
        // Or just: this.animationTask = this.map(fn).join(); return this
        return new Animation(this.map(fn).join())
    }
    /**
     * orElse :: (Error -> Animation End(b) Frame) -> Animation End(b) Frame
     */
    orElse(fn) {
        // Or just: this.animationTask = this.animationTask.orElse(fn); return this
        return new Animation(this.animationTask.orElse(fn))
    }
}

/**
 * Frame
 *
 * Frame is a data type that abstracts an animation that has not run yet.
 */
export class Frame extends Animation {
    /**
     * Frame :: Number -> void -> Animation End(a) Frame
     */
    constructor(timeFunction) {

        super(task(resolver => {

            let startTime = 0
            let timerId

            const run = timestamp => {

                if (startTime === 0) {
                    startTime = timestamp
                }
                const time = timestamp - startTime

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
            resolver.onCancelled(() => cancelAnimationFrame(timerId))
        }))
    }
    /**
     * hasRun => Boolean
     */
    get hasRun() {
        return false
    }
}

/**
 * End
 *
 * End is a data type that abstracts an animation that has already run.
 */
export class End extends Animation {
    /**
     * hasRun => Boolean
     */
    get hasRun() {
        return true
    }
}

/**
 * logEnd :: String -> Error -> End(Error)
 */
export const logEnd = message => error =>
    // eslint-disable-next-line no-console
    End.of(console.error(message, error) || error)

/**
 * animate :: (Number -> Animation End(a) Frame) -> Frame
 */
const animate = timingFunction => new Frame(timingFunction)

export default animate
