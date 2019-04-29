
import round from '../round'

/**
 * Implementation based from SVGO (based from Snap.svg, based from the spec)
 * https://github.com/svg/svgo/blob/master/plugins/_path.js#L904
 *
 * Notice: the original file has been modified to
 *
 * 1. be annotated with the implementation notes from the specification to make
 * a "conversion from endpoint to center parameterization"
 * 2. receive the previous command position `Point` as a separate argument
 * 3. return cubic command `Point` as `{ x: Number, y: Number }` using absolute
 * values instead of `[Number, Number]` and relative values
 * 4. adapt coding style
 */

// 120° in radians: maximum angle of an arc's slice to handle in a single pass
const _120 = Math.PI * 120 / 180

/**
 * rotate<Axe> :: Number -> Number -> Number -> Number
 *
 * It should return the coordinates of a point on the path of the arc given an
 * initial `x` and `y` position and a rotation angle `φ` in radians.
 */
const rotateX = (x, y, phi) => (x * Math.cos(phi)) - (y * Math.sin(phi))
const rotateY = (x, y, phi) => (x * Math.sin(phi)) + (y * Math.cos(phi))

/**
 * getCubicFromArc :: Group -> [ArcPoint] -> [...Point]
 *
 * ArcPoint :: { [EndpointParameterName]: Number }
 * Point => [Group]
 * Group => { [Parameter]: Number }
 *
 * It should return the `Point`s of a `C`ubic `Command` given the previous end
 * position, ie. the previous `Group` of `Parameters`, aka. the start point, and
 * a collection of `ArcPoint`s, ie. the `Point`s of the current `A`rc `Command`
 * to draw. Those `Point`s have the following `Parameters`:
 *
 * - `x1`, `y1`: the the start point
 * - `x2`, `y2`: the end position
 * - `rx`, `ry`: the radii of the arc (ellipse)
 * - `largeArcFlag` (fA): `1` to draw an arc whose angle is `<= 180`, or `0`
 * - `sweepFlag` (fS): `1` to draw an arc by rotating clockwise, or `0`
 * - `angle`: the value in degrees used to distort the arc by rotating then
 * stretching it
 *
 * Specification: https://www.w3.org/TR/SVG11/implnote.html#ArcSyntax
 *
 * Memo: it's impossible to perfectly convert an arc to cubic curve(s). The
 * common approach used by vector graphic softwares is to:
 *
 * 1. decompose arc in slices going from angles of 0 to 90-120°
 * 2. compute the corresponding end/start control parameters of a cubic command,
 * which sould lie on one of the edge of the arc's bounding box
 * 3. compute next point(s) if arc slices > 1
 *
 * Literature on related maths for this task:
 *
 * - https://stackoverflow.com/questions/734076/how-to-best-approximate-a-geometrical-arc-with-a-bezier-curve/
 *
 * - https://pomax.github.io/bezierinfo/#circles_cubic (k === 0.55228...)
 * - http://www.whizkidtech.redprince.net/bezier/circle/ (k === 0.55228...)
 * - http://itc.ktu.lt/index.php/ITC/article/view/11812/6479 (k === 0.55191...)
 * - http://spencermortensen.com/articles/bezier-circle/ (k === 0.55191...)
 * - https://mortoray.com/2017/02/16/rendering-an-svg-elliptical-arc-as-bezier-curves/ (k === ?)
 *
 * The latter is based on notes from the specification about a "Conversion from
 * endpoint to center parameterization" (explained below), which are followed by
 * all of the following libraries/modules:
 *
 * SVGO: https://github.com/svg/svgo/blob/master/plugins/_path.js#L904
 * Last meaningfull update: never (created on 20141101)
 * Credits the author of Snap.svg
 * -----------------------------------------------------------------------------
 * SnapSVG: https://github.com/adobe-webplatform/Snap.svg/blob/master/src/path.js#L752
 * Owned by Adobe WebPlatform
 * Last meaningfull update: 20160801 ("Arc with zero radius proper conversion to curve")
 * References the specification as the origin of its math
 * -----------------------------------------------------------------------------
 * svg-arc-to-cubic-bezier: https://github.com/colinmeinke/svg-arc-to-cubic-bezier/
 * Last meaningfull update: 20190128 ("fix: make circle constant dependent on sign of ang2")
 * Credits SVG Path
 * References Spencer Mortensen (link above) to understand k === 0.55191...
 * Returns wrong numbers with multiple arc slices (somewhat related to inacurrate k or application of k)
 * -----------------------------------------------------------------------------
 * SVG Path: https://github.com/fontello/svgpath/blob/master/lib/a2c.js
 * Owned by Fontello
 * Last meaningfull update: 20161230 ("Simplify vector angle calculation")
 * References the specification to understand its math
 * References a Math StackExchange to understand the math for k
 *
 * "Conversion from endpoint to center parameterization"
 * https://www.w3.org/TR/SVG11/implnote.html#ArcConversionEndpointToCenter
 *
 * getArcCenter :: ArcSlicePoint => [Center, Angle, Angle]
 *
 * Center => { cx: Number, cy: Number }
 * Angle => { Number }
 *
 * It should return "`cx`, `cy`, `θ1`, `Δθ`" "given the following variables:
 * `x1`, `y1`, `x2`, `y2`, `fA`, `fS`, `rx`, `ry`, `φ`", ie. it shound return
 * the `Center` of the arc, its start `Angle` and the difference between its
 * start and end `Angle`s, given an `ArcSlicePoint`.
 *
 * TODO(refactoring): extract `getArcCenter` from this function.
 */
const getCubicFromArc = ({ x: x1, y: y1 }, { angle, fA, fS, recursive, rx, ry, x: x2, y: y2 }) => {

    // Rotation angle (φ) in radians
    const phi = Math.PI * (+angle || 0) / 180

    let nextCubicPoints = []

    let cx
    let cy
    let f1
    let f2

    let df
    let x1p
    let y1p

    if (recursive) {
        [f1, f2, cx, cy] = recursive
    } else {

        // Step 1: compute (x1′, y1′)
        x1p = rotateX(x1, y1, -phi)
        y1p = rotateY(x1, y1, -phi)
        x2 = rotateX(x2, y2, -phi)
        y2 = rotateY(x2, y2, -phi)

        const x = (x1p - x2) / 2
        const y = (y1p - y2) / 2

        // Step 2: compute (cx′, cy′)
        // Step 3: Compute (cx, cy) from (cx′, cy′)
        let h = ((x * x) / (rx * rx)) + ((y * y) / (ry * ry))
        if (h > 1) {
            h = Math.sqrt(h)
            rx *= h
            ry *= h
        }

        const rx2 = rx * rx
        const ry2 = ry * ry
        const k = (fA == fS ? -1 : 1)
                * Math.sqrt(Math.abs(((rx2 * ry2) - (rx2 * y * y) - (ry2 * x * x)) / ((rx2 * y * y) + (ry2 * x * x))))
        // (cos φ - sin φ) . (cxp) + ((x1 + x2) / 2)
        // (cos φ - sin φ) . (cyp) + ((y1 + y2) / 2)
        cx = (k * rx * y / ry) + ((x1 + x2) / 2)
        cy = (k * -ry * x / rx) + ((y1 + y2) / 2)

        // Step 4: compute θ1 and Δθ
        f1 = Math.asin(((y1p - cy) / ry).toFixed(9))
        f2 = Math.asin(((y2 - cy) / ry).toFixed(9))
        if (x1p < cx) {
            f1 = Math.PI - f1
        }
        if (x2 < cx) {
            f2 = Math.PI - f2
        }
        if (f1 < 0) {
            f1 = (Math.PI * 2) + f1
        }
        if (f2 < 0) {
            f2 = (Math.PI * 2) + f2
        }
        if (fS && f1 > f2) {
            f1 -= Math.PI * 2
        }
        if (!fS && f2 > f1) {
            f2 -= Math.PI * 2
        }
    }

    df = f2 - f1
    if (Math.abs(df) > _120) {

        const f2old = f2
        const x2old = x2
        const y2old = y2

        f2 = f1 + (_120 * (fS && f2 > f1 ? 1 : -1))
        x2 = cx + (rx * Math.cos(f2))
        y2 = cy + (ry * Math.sin(f2))

        nextCubicPoints = getCubicFromArc(
            { x: x2, y: y2 },
            { angle, fA: 0, fS, recursive: [f2, f2old, cx, cy], rx, ry, x: x2old, y: y2old })
    }
    df = f2 - f1

    const c1 = Math.cos(f1)
    const s1 = Math.sin(f1)
    const c2 = Math.cos(f2)
    const s2 = Math.sin(f2)
    const t = Math.tan(df / 4)
    const hx = 4 / 3 * rx * t
    const hy = 4 / 3 * ry * t
    const firstCubicPoints = [
        x1 + (-hx * s1),
        y1 + (hy * c1),
        x2 + (hx * s2),
        y2 - (hy * c2),
        x2,
        y2,
    ]

    if (recursive) {
        return firstCubicPoints.concat(nextCubicPoints)
    }

    return firstCubicPoints.concat(nextCubicPoints).reduce(
        (cubicPoints, parameter, index, parameters) => {
            if (index % 2) {
                cubicPoints[cubicPoints.length - 1].y = round(2, rotateY(parameters[index - 1], parameter, phi))
                return cubicPoints
            }
            cubicPoints.push({ x: round(2, rotateX(parameter, parameters[index + 1], phi)) })
            return cubicPoints
        },
        [])
}

export default getCubicFromArc
