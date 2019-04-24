
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
export const normalizeCommand = startPoint => (points, command, commandIndex, commands) => {

    if (command.type === 'C') {
        points.push(...command.points.map(mapValues(Number)))
        return points
    }

    const type = command.type.toLowerCase()
    const groups = []
    const GroupsLength = Point[type].length

    for (let pointIndex = 0; pointIndex < command.points.length; pointIndex++) {

        // (x, y) Last end position parameters aka. start point parameters (from current, previous, or start command)
        const { x, y } =  Maybe.fromNullable(last(groups))
            .orElse(() => Maybe.fromNullable(last(points)))
                               .getOrElse(startPoint)
        // (x2, y2) Last end control parameters (from current, previous, or last command)
        const startControl = Maybe
            .fromNullable(groups[groups.length - 2])
            .orElse(() => Maybe.fromNullable(commands[commandIndex - 1])
                .chain(({ type: previousType }) => {
                    // See ./README.md for the special case handled here.
                    switch (previousType) {
                        case 'C':
                        case 'c':
                        case 'S':
                        case 's':
                            return type === 's'
                                ? Maybe.fromNullable(points[points.length - 2])
                                : Maybe.Nothing()
                        case 'Q':
                        case 'q':
                        case 'T':
                        case 't':
                            return type === 't'
                                ? Maybe.fromNullable(points[points.length - 2])
                                : Maybe.Nothing()
                        default:
                            return Maybe.Nothing()
                    }
                }))
            .map(({ x: x2, y: y2 }) => ({ x: (x * 2) - x2, y: (y * 2) - y2 }))
            .getOrElse({ x, y })

        // First group of parameters the current command
        const group = mapValues(Number, command.points[pointIndex])
        // Last group of parameters (end position) of the current command
        const position = mapValues(Number, command.points[pointIndex + GroupsLength - 1])

        switch (command.type) {
            case 'A':
                groups.push(...getCubicFromArc({ x, y }, group))
                break
            case 'a':
                groups.push(...getCubicFromArc({ x, y }, { ...group, x: group.x + x, y: group.y + y }))
                break
            case 'c':
                groups.push(...[
                    group,
                    mapValues(Number, command.points[pointIndex + 1]),
                    position,
                ].map(p => ({ x: p.x + x, y: p.y + y })))
                break
            case 'L':
                groups.push({ x, y }, group, position)
                break
            case 'l':
                groups.push({ x, y }, ...[group, position].map(p => ({ x: p.x + x, y: p.y + y })))
                break
            case 'H':
                groups.push({ x, y }, { ...group, y }, { ...position, y })
                break
            case 'h':
                groups.push({ x, y }, { x: group.x + x, y }, { x: position.x + x, y })
                break
            case 'Q':
                groups.push(
                    { x: x + (2 / 3 * (group.x - x)), y: y + (2 / 3 * (group.y - y)) },
                    { x: position.x + (2 / 3 * (group.x - position.x)), y: position.y + (2 / 3 * (group.y - position.y)) },
                    position)
                break
            case 'q':
                groups.push(
                    { x: x + (2 / 3 * group.x), y: y + (2 / 3 * group.y) },
                    { x: position.x + x + (2 / 3 * (group.x - position.x)), y: position.y + (y + (2 / 3 * (group.y - position.y))) },
                    { x: position.x + x, y: position.y + y })
                break
            case 'V':
                groups.push({ x, y }, { ...group, x }, { ...position, x })
                break
            case 'v':
                groups.push({ x, y }, { x, y: group.y + y }, { x, y: position.y + y })
                break
            case 'S':
                groups.push(startControl, group, position)
                break
            case 's':
                groups.push(startControl, ...[group, position].map(p => ({ x: p.x + x, y: p.y + y })))
                break
            case 'T':
                groups.push(
                    startControl,
                    {
                        x: group.x > x ? group.x + (x - startControl.x) : group.x - (x - startControl.x),
                        y: group.y > y ? group.y + (y - startControl.y) : group.y - (y - startControl.y),
                    },
                    position)
                break
            case 't':
                groups.push(
                    startControl,
                    {
                        x: group.x + x > x ? group.x + x + (x - startControl.x) : group.x + x - (x - startControl.x),
                        y: group.y + y > y ? group.y + y + (y - startControl.y) : group.y + y - (y - startControl.y),
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
