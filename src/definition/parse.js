
import { Group } from './types'
import Maybe from 'folktale/maybe'
import last from 'lodash/fp/last'

/**
 * parseDefinition :: String -> Definition
 *
 * Definition => [Command]
 * Command => { type: String, points: [...Point] }
 * Point => [Group]
 * Group => { [Parameter]: String }
 *
 * It should return a collection of `Command`s given a `d`efinition attribute
 * `String` of an SVG `<path>`.
 *
 * It should remove any space from a `Parameter`'s value that is not required,
 * ie. between two characters representing a number or a letter.
 *
 * It should explicit an implicit `0` as the first character of a `Parameter`,
 * eg. `1.5.3` should be parsed into `1.5` and `0.3`.
 *
 * TODO(refactoring): transfom it into a transducer function.
 */
export const parseDefinition = definition => [...definition].reduce(
    (commands, char) => {
        // New command
        if (/[a-z]/i.test(char)) {
            commands.push({ points: [], type: char })
            return commands
        }
        const command = last(commands)
        const group = last(command.points)
        const Params = Group[command.type.toLowerCase()]
        const { currentParam, fixedChar, isNewGroupChar, isNewParamChar, nextParam } = Maybe
            .fromNullable(group)
            .map(group => {
                const currentParamsLength = Object.keys(group).length
                const currentParamIndex = currentParamsLength - 1
                const [isNewParamChar, fixedChar] = [char].map(char => {
                    switch (char) {
                        case ' ':
                        case ',':
                            return [true, '']
                        case '-':
                            return [true, '-']
                        case '.':
                            return group[Params[currentParamIndex]].includes('.')
                                ? [true, '0.']
                                : [false, char]
                        default:
                            return [false, char]
                    }
                }).flat()
                return {
                    currentParam: Params[currentParamIndex],
                    fixedChar,
                    isNewGroupChar: isNewParamChar && currentParamsLength % Params.length === 0,
                    isNewParamChar,
                    nextParam: Params[currentParamIndex + 1],
                }
            })
            .getOrElse({ currentParam: Params[0], fixedChar: char, isNewGroupChar: true, isNewParamChar: false })
        // New group (set char as the first character of the first parameter of a new group)
        if (isNewGroupChar) {
            command.points.push({ [Params[0]]: fixedChar })
            return commands
        }
        // New parameter (set char as the first character of the next parameter of the current group)
        if (isNewParamChar) {
            group[nextParam] = fixedChar
            return commands
        }
        // New character (concat the next character of the current parameter of the current group)
        group[currentParam] += char
        return commands
    },
    [])

/**
 * parseDefinitions :: [String] -> [Definition]
 */
const parseDefinitions = definitions => definitions.map(parseDefinition)

export default parseDefinitions
