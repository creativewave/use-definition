
/**
 * round :: Number -> Number -> Number
 *
 * It should round numbers to the given precision if required, eg.:
 *
 *   round()(1)     -> 1
 *   round(1)(1)    -> 1
 *   round(1)(1.15) -> 1.2
 *
 * Memo: unary `+` operator coerces the `String` returned by `toFixed`.
 * Memo: this function exists to avoid false negative unit tests.
 *
 * TODO(refactoring): check how to run this operation only while running tests.
 */
const round = (precision = 0, n) => +n.toFixed(precision)

export default round
