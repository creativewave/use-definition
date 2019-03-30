
import Maybe from 'folktale/maybe'
import { Point } from './types'
import getCubicFromArc from './getCubicFromArc'
import last from 'lodash/fp/last'
import mapValues from 'lodash/fp/mapValues'

/**
 * normalizePoints :: Number -> Definition -> Definition
 *
 * Definition => [Command]
 * Command => { type: String, points: [...Point] }
 * Point => [Group]
 * Group => { [Parameter]: Number }
 *
 * It should return a `Definition` with a total of `Point`s equal to the given
 * `Number` for its second `Command`, by adding (cloning its) `Point`s.
 *
 * It should evenly clone its `Point`s among the initial ones.
 *
 * It should clone a `Point` using the last position `Point`: x x a  ->  a a a.
 */
export const normalizePoints = minPoints => definition => {

    const [startCommand, drawCommand, endCommand] = definition

    if (drawCommand.points.length === minPoints) {
        return definition
    }

    while (drawCommand.points.length < minPoints) {

        const clones = minPoints - drawCommand.points.length
        const delta = Math.round(drawCommand.points.length / clones) * Point.c.length || Point.c.length
        const [startControlPoint, endControlPoint, ...rest] = drawCommand.points

        drawCommand.points = rest.reduce(
            (points, point, index) => {
                const isPointToClone = index % delta === 0 && points.length + 1 < minPoints
                if (isPointToClone) {
                    const clonedPoint = { ...point, clone: true }
                    points.push(point, clonedPoint, clonedPoint, clonedPoint)
                    return points
                }
                points.push(point)
                return points
            },
            [startControlPoint, endControlPoint])
    }

    return [startCommand, drawCommand, endCommand]
}

/**
 * normalizeCommand :: Group -> [...Point] -> Command -> [...Point]
 *
 * Definition => [Command]
 * Command => { type: String, points: [...Point] }
 * Point => [Group]
 * Group => { [Parameter]: Number }
 *
 * It should transform each `Point` from a `Command` of any type to a `C`ubic`
 * `Command` `Point`.
 *
 * Memo: specification for each transformation by `Command` type are described
 * in ./README.md.
 *
 * TODO(refactoring): with fresh eyes...
 */
export const normalizeCommand = startPoint => (points, command) => {

    if (command.type === 'C') {
        points.push(...command.points.map(mapValues(Number)))
        return points
    }

    const groups = []
    const GroupsLength = Point[command.type.toLowerCase()].length

    for (let pointIndex = 0; pointIndex < command.points.length; pointIndex++) {

        // (x, y) Last end position parameters aka. start point parameters (from current, previous, or start command)
        const { x, y } =  Maybe.fromNullable(last(groups))
            .orElse(() => Maybe.fromNullable(last(points)))
                               .getOrElse(startPoint)

        // (x2, y2) Last start control parameters (from current, previous, or last command)
        const startControl = Maybe
            .fromNullable(groups[groups.length - 2])
            .orElse(() => Maybe.fromNullable(points[points.length - 2]))
            // TODO(fix): it should fallback to the last end control parameters of the (normalized) path
            // but never to startPoint (the first position point of the path), ie:
            // .orElse(() => Maybe.Just(lastEndControlPoint))
            // Note: this confusion comes from line commands which should receive a start control === startPoint
            .map(({ x: startX = 0, y: startY = 0 }) => ({ x: (x * 2) - startX, y: (y * 2) - startY }))
            .getOrElse(startPoint)
            // .getOrElse('?')

        // First point of the current command
        const point = mapValues(Number, command.points[pointIndex])
        // Position point of the current command
        const position = mapValues(Number, command.points[pointIndex + GroupsLength - 1])

        switch (command.type) {
            case 'A':
                groups.push(...getCubicFromArc({ x, y }, point))
                break
            case 'a':
                groups.push(...getCubicFromArc({ x, y }, { ...point, x: point.x + x, y: point.y + y }))
                break
            case 'C':
            case 'L':
            case 'S':
                groups.push(startControl, point, position)
                break
            case 'c':
                groups.push(...[
                    point,
                    mapValues(Number, command.points[pointIndex + 1]),
                    position,
                ].map(p => ({ x: p.x + x, y: p.y + y })))
                break
            case 'l':
                groups.push({ x, y }, ...[point, position].map(p => ({ x: p.x + x, y: p.y + y })))
                break
            case 'H':
                groups.push({ x, y }, { ...point, y }, { ...position, y })
                break
            case 'h':
                groups.push({ x, y }, { x: point.x + x, y }, { x: position.x + x, y })
                break
            case 'Q':
                groups.push(
                    { x: x + (2 / 3 * (point.x - x)), y: y + (2 / 3 * (point.y - y)) },
                    { x: position.x + (2 / 3 * (point.x - position.x)), y: position.y + (2 / 3 * (point.y - position.y)) },
                    position)
                break
            case 'q':
                groups.push(
                    { x: x + (2 / 3 * point.x), y: y + (2 / 3 * point.y) },
                    { x: position.x + x + (2 / 3 * (point.x - position.x)), y: position.y + (y + (2 / 3 * (point.y - position.y))) },
                    { x: position.x + x, y: position.y + y })
                break
            case 'V':
                groups.push(startControl, { ...point, x }, { ...position, x })
                break
            case 'v':
                groups.push(startControl, { x, y: point.y + y }, { x, y: position.y + y })
                break
            case 's':
                groups.push(startControl, ...[point, position].map(p => ({ x: p.x + x, y: p.y + y })))
                break
            case 'T':
                groups.push(
                    startControl,
                    {
                        x: point.x > x ? point.x + (x - startControl.x) : point.x - (x - startControl.x),
                        y: point.y > y ? point.y + (y - startControl.y) : point.y - (y - startControl.y),
                    },
                    position)
                break
            case 't':
                groups.push(
                    startControl,
                    {
                        x: point.x + x > x ? point.x + x + (x - startControl.x) : point.x + x - (x - startControl.x),
                        y: point.y + y > y ? point.y + y + (y - startControl.y) : point.y + y - (y - startControl.y),
                    },
                    { x: position.x + x, y: position.y + y })
                break
        }
        pointIndex += GroupsLength - 1
        continue
    }
    points.push(...groups)

    return points
}

/**
 * normalizeCommands :: Definition -> Definition
 *
 * Definition => [Command]
 * Command => { type: String, points: [...Point] }
 * Point => [Group]
 * Group => { [Parameter]: Number }
 *
 * It should return a `Definition` containing its first `Command` (type `M`), a
 * `C`ubic `Command` resulting from the transformation of its initial drawing
 * `Command`s (of any type), and a `Command` with a type `z`.
 *
 * It should append a `Command` with type `z` as a last `Command` when missing.
 *
 * It should append any line `Command` that is implicitly closing the path, ie:
 *   M 0 0, H 1, V 1, z  ->  M 0 0, H 1, V 1, L 0 0, z
 */
export const normalizeCommands = ([startCommand, ...drawCommands]) => {

    const commands = []
    const startPoint = mapValues(Number, startCommand.points[0])

    if (last(drawCommands).type !== 'z') {
        drawCommands.push({ points: [], type: 'z' })
    }

    const drawPoints = drawCommands.slice(0, drawCommands.length - 1).reduce(normalizeCommand(startPoint), [])
    const lastPoint = last(drawPoints)

    if (lastPoint.x !== startPoint.x || lastPoint.y !== startPoint.y) {
        drawPoints.push(lastPoint, startPoint, startPoint)
    }

    commands.push({ points: [startPoint], type: 'M' })
    commands.push({ points: drawPoints, type: 'C' })
    commands.push({ points: [], type: 'z' })

    return commands
}

/**
 * normalizeDefinitions :: [Definition] -> [Definition]
 *
 * Definition => [Command]
 * Command => { type: String, points: [...Point] }
 * Point => [Group]
 * Group => { [Parameter]: String }
 *
 * It should return a collection of `Definition`s with the same `Point`s count.
 * It should return a collection of `Definition`s with the same `Command` type
 * at respective indexes.
 *
 * The first `Command` is presumed to have a type `M` and a single `Point`.
 * The last `Command` is presumed to have a type `z` and no `Point`.
 *
 * Memo: the most efficient way to fullfill those requirements is to normalize
 * each `Command` to a single `C`ubic `Command` first (except the last and first
 * `Command`), then to normalize each `Definition` with the same `Point`s count.
 * GreenSock seems to apply the same steps: https://greensock.com/morphSVG
 *
 * TODO(refactoring): make it a transducer function.
 */
const normalizeDefinitions = definitions => {
    // Step 1 (normalize commands types) + a little bit of step 2 (find max total of points)
    const { definitions: normalized, minPoints } = definitions.reduce(
        ({ definitions, minPoints }, definition) => {
            const normalized = normalizeCommands(definition)
            const definitionPointsLength = normalized[1].points.length
            if (definitionPointsLength > minPoints) {
                minPoints = definitionPointsLength
            }
            definitions.push(normalized)
            return { definitions, minPoints }
        },
        { definitions: [], minPoints: 0 })
    // Step 2 (normalize total of points)
    return normalized.map(normalizePoints(minPoints))
}

export default normalizeDefinitions
