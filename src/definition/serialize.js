
/**
 * serializeDefinition :: Definition -> String
 *
 * Definition => [Command]
 * Command => { type: String, points: [...Point] }
 * Point => [Group]
 * Group => { [Parameter]: Number }
 */
export const serializeDefinition = commands => commands
    .slice(0, commands.length - 1)
    .reduce((d, { type, points }) => {
        const firstPoint = `${points[0].x}${points[0].y < 0 ? '' : ' '}${points[0].y}`
        return `${d}${type}${points.slice(1).reduce(
            (point, { x, y }) =>
                `${point}${x < 0 ? '' : ' '}${x}${y < 0 ? '' : ' '}${y}`,
            `${firstPoint}`)}`
    }, '')
    .concat('z')

/**
 * serializeDefinitions :: [Definition] -> [String]
 */
const serializeDefinitions = definitions => definitions.map(serializeDefinition)

export default serializeDefinitions
