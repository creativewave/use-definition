
import normalizeDefinitions, { normalizeCommands } from '../src/definition/normalize'

import { Point } from '../src/definition/types'
import assert from 'assert'
import { parseDefinition } from '../src/definition/parse'
import { serializeDefinition } from '../src/definition/serialize'
import setAnimations from '../src/definition/animate'
import uniqWith from 'lodash/fp/uniqWith'

/* eslint-disable array-element-newline */
const commands = {
    // Debug it with: <svg viewBox="0 0 10 10"><path d="M0 5..." /></svg>
    A: {
        normalized: {
            points: [
                { x: 0, y: 8.85 }, { x: 4.17, y: 11.25 }, { x: 7.5, y: 9.33 },
                { x: 9.05, y: 8.44 }, { x: 10, y: 6.79 }, { x: 10, y: 5 },
                { x: 10, y: 1.15 }, { x: 5.83, y: -1.25 }, { x: 2.5, y: 0.67 },
                { x: 0.95, y: 1.56 }, { x: 0, y: 3.21 }, { x: 0, y: 5 },
            ],
            type: 'C',
        },
        parsed: {
            points: [
                { angle: '0', fA: '1', fS: '0', rx: '5', ry: '5', x: '10', y: '5' },
                { angle: '0', fA: '1', fS: '0', rx: '5', ry: '5', x: '0', y: '5' },
            ],
            type: 'A',
        },
        raw: 'A5 5 0 1 0 10 5 5 5 0 1 0 0 5',
    },
    // Debug it with: <svg viewBox="0 0 4 4"><path d="M0 2..."></svg>
    C: {
        normalized: {
            points: [
                { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 0 },
                { x: 3, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 },
                { x: 4, y: 2 }, { x: 0, y: 2 }, { x: 0, y: 2 },
            ],
            type: 'C',
        },
        parsed: {
            points: [
                { x: '0', y: '1' }, { x: '1', y: '0' }, { x: '2', y: '0' },
                { x: '3', y: '0' }, { x: '4', y: '1' }, { x: '4', y: '2' },
            ],
            type: 'C',
        },
        raw: 'C0 1 1 0 2 0 3 0 4 1 4 2',
    },
    // Debug it with: <svg viewBox="0 0 2 0"><path d="M0 0..."></svg>
    H: {
        normalized: {
            points: [
                { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0 },
                { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 0 },
                { x: 2, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
            ],
            type: 'C',
        },
        parsed: {
            points: [{ x: '1' }, { x: '2' }],
            type: 'H',
        },
        raw: 'H1 2',
    },
    // Debug it with: <svg viewBox="0 0 1 1"><path d="M0 0..."></svg>
    L: {
        normalized: {
            points: [
                { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0 },
                { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 1 },
                { x: 1, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 0 },
            ],
            type: 'C',
        },
        parsed: {
            points: [{ x: '1', y: '0' }, { x: '1', y: '1' }],
            type: 'L',
        },
        raw: 'L1 0 1 1',
    },
    M: {
        normalized: { points: [{ x: 0, y: 0 }], type: 'M' },
        parsed: { points: [{ x: '0', y: '0' }], type: 'M' },
        raw: 'M0 0',
    },
    // Debug it with: <svg viewBox="0 0 4 1"><path ="M0 1..." /></svg>
    Q: {
        normalized: {
            points: [
                { x: 0 + ((2 / 3) * (1 - 0)), y: 1 + ((2 / 3) * (0 - 1)) },
                { x: 2 + ((2 / 3) * (1 - 2)), y: 1 + ((2 / 3) * (0 - 1)) },
                { x: 2, y: 1 },
                { x: 2 + ((2 / 3) * (3 - 2)), y: 1 + ((2 / 3) * (0 - 1)) },
                { x: 4 + ((2 / 3) * (3 - 4)), y: 1 + ((2 / 3) * (0 - 1)) },
                { x: 4, y: 1 },
                { x: 4, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 1 },
            ],
            type: 'C',
        },
        parsed: { points: [{ x: '1', y: '0' }, { x: '2', y: '1' }, { x: '3', y: '0' }, { x: '4', y: '1' }], type: 'Q' },
        raw: 'Q1 0 2 1 3 0 4 1',
    },
    // Debug it with: <svg viewBox="0 0 2 1"><path d="M0 1..." /></svg>
    S: {
        normalized: {
            points: [
                { x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 },
                { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 1 },
                { x: 2, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 1 },
            ],
            type: 'C',
        },
        parsed: {
            points: [{ x: '0', y: '0' }, { x: '1', y: '0' }, { x: '2', y: '1' }, { x: '2', y: '1' }],
            type: 'S',
        },
        raw: 'S0 0 1 0 2 1 2 1',
    },
    // Debug it with: see test cases
    T: {
        parsed: { points: [{ x: '1', y: '1' }, { x: '2', y: '2' }], type: 'T' },
        raw: 'T1 1 2 2',
    },
    // Debug it with: <svg viewBox="0 0 0 2"><path d="M0 0..."></svg>
    V: {
        normalized: {
            points: [
                { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 1 },
                { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 2 },
                { x: 0, y: 2 }, { x: 0, y: 0 }, { x: 0, y: 0 },
            ],
            type: 'C',
        },
        parsed: {
            points: [{ y: '1' }, { y: '2' }],
            type: 'V',
        },
        raw: 'V1 2',
    },
    z: {
        normalized: { points: [], type: 'z' },
        parsed: { points: [], type: 'z' },
        raw: 'z',
    },
}
const shapes = {
    // 10 position points
    clover: {
        normalized: [
            { points: [{ x: 8, y: 5 }], type: 'M' },
            {
                points: [
                    { x: 9.32, y: 4.22 }, { x: 9.3, y: 2.29 }, { x: 7.96, y: 1.54 },
                    { x: 6.73, y: 0.85 }, { x: 5.2, y: 1.61 }, { x: 5, y: 3 },
                    { x: 5, y: 1.46 }, { x: 3.33, y: 0.5 }, { x: 2, y: 1.27 },
                    { x: 0.67, y: 2.04 }, { x: 0.67, y: 3.96 }, { x: 2, y: 4.73 },
                    { x: 2.3, y: 4.91 }, { x: 2.65, y: 5 }, { x: 3, y: 5 },
                    { x: 0.82, y: 4.23 }, { x: -1.37, y: 6.11 }, { x: -0.94, y: 8.38 },
                    { x: -0.52, y: 10.65 }, { x: 2.21, y: 11.61 }, { x: 3.96, y: 10.11 },
                    { x: 4.58, y: 9.58 }, { x: 4.95, y: 8.81 }, { x: 5, y: 8 },
                    { x: 6.15, y: 9.15 }, { x: 8.13, y: 8.63 }, { x: 8.55, y: 7.05 },
                    { x: 8.75, y: 6.32 }, { x: 8.54, y: 5.54 }, { x: 8, y: 5 },
                ],
                type: 'C',
            },
            { points: [], type: 'z' },
        ],
        parsed: [
            { points: [{ x: '8', y: '5' }], type: 'M' },
            {
                points: [
                    { angle: '0', fA: '1', fS: '0', rx: '2', ry: '2', x: '-3', y: '-2' },
                    { angle: '0', fA: '1', fS: '0', rx: '2', ry: '2', x: '-2', y: '2' },
                    { angle: '0', fA: '1', fS: '0', rx: '3', ry: '3', x: '2', y: '3' },
                    { angle: '0', fA: '1', fS: '0', rx: '2', ry: '2', x: '3', y: '-3' },
                ],
                type: 'a',
            },
            { points: [], type: 'z' },
        ],
        raw: 'M8 5a2 2 0 1 0-3-2 2 2 0 1 0-2 2 3 3 0 1 0 2 3 2 2 0 1 0 3-3z',
    },
    // 8 position points (including 1 implicite closing line command)
    hexagon: {
        normalized: [
            { points: [{ x: 3, y: 10 }], type: 'M' },
            {
                points: [
                    { x: 3, y: 10 }, { x: 0, y: 7 }, { x: 0, y: 7 },
                    { clone: true, x: 0, y: 7 }, { clone: true, x: 0, y: 7 }, { clone: true, x: 0, y: 7 },
                    { x: 0, y: 7 }, { x: 0, y: 3 }, { x: 0, y: 3 },
                    { x: 0, y: 3 }, { x: 3, y: 0 }, { x: 3, y: 0 },
                    { x: 3, y: 0 }, { x: 7, y: 0 }, { x: 7, y: 0 },
                    { x: 7, y: 0 }, { x: 10, y: 3 }, { x: 10, y: 3 },
                    { clone: true, x: 10, y: 3 }, { clone: true, x: 10, y: 3 }, { clone: true, x: 10, y: 3 },
                    { x: 10, y: 3 }, { x: 10, y: 7 }, { x: 10, y: 7 },
                    { x: 10, y: 7 }, { x: 7, y: 10 }, { x: 7, y: 10 },
                    { x: 7, y: 10 }, { x: 3, y: 10 }, { x: 3, y: 10 },
                ],
                type: 'C',
            },
            { points: [], type: 'z' },
        ],
        parsed: [
            { points: [{ x: '3', y: '10' }], type: 'M' },
            { points: [{ x: '0', y: '7' }], type: 'L' },
            { points: [{ y: '3' }], type: 'V' },
            { points: [{ x: '3', y: '-3' }], type: 'l' },
            { points: [{ x: '4' }], type: 'h' },
            { points: [{ x: '3', y: '3' }], type: 'l' },
            { points: [{ y: '4' }], type: 'v' },
            { points: [{ x: '-3', y: '3' }], type: 'l' },
            { points: [], type: 'z' },
        ],
        raw: 'M3 10L0 7V3l3-3h4l3 3v4l-3 3z',
    },
    // 10 position points (including 1 implicite closing line command)
    star: {
        normalized: [
            { points: [{ x: 5, y: 0 }], type: 'M' },
            {
                points: [
                    { x: 5, y: 0 }, { x: 7, y: 3 }, { x: 7, y: 3 },
                    { x: 7, y: 3 }, { x: 10, y: 4 }, { x: 10, y: 4 },
                    { x: 10, y: 4 }, { x: 7, y: 6 }, { x: 7, y: 6 },
                    { x: 7, y: 6 }, { x: 8, y: 10 }, { x: 8, y: 10 },
                    { x: 8, y: 10 }, { x: 5, y: 8 }, { x: 5, y: 8 },
                    { x: 5, y: 8 }, { x: 2, y: 10 }, { x: 2, y: 10 },
                    { x: 2, y: 10 }, { x: 3, y: 6 }, { x: 3, y: 6 },
                    { x: 3, y: 6 }, { x: 0, y: 4 }, { x: 0, y: 4 },
                    { x: 0, y: 4 }, { x: 3, y: 3 }, { x: 3, y: 3 },
                    { x: 3, y: 3 }, { x: 5, y: 0 }, { x: 5, y: 0 },
                ],
                type: 'C',
            },
            { points: [], type: 'z' },
        ],
        parsed: [
            { points: [{ x: '5', y: '0' }], type: 'M' },
            {
                points: [
                    { x: '2', y: '3' }, { x: '3', y: '1' }, { x: '-3', y: '2' },
                    { x: '1', y: '4' }, { x: '-3', y: '-2' }, { x: '-3', y: '2' },
                    { x: '1', y: '-4' }, { x: '-3', y: '-2' }, { x: '3', y: '-1' },
                ],
                type: 'l',
            },
            { points: [], type: 'z' },
        ],
        raw: 'M5 0l2 3 3 1-3 2 1 4-3-2-3 2 1-4-3-2 3-1z',
    },
    // 3 position points (including 1 implicite closing line command)
    triangle: {
        explicited: [
            { points: [{ x: 0, y: 0 }], type: 'M' },
            {
                points: [
                    { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 1 },
                    { x: 1, y: 1 }, { x: 2, y: 0 }, { x: 2, y: 0 },
                    { x: 2, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
                ],
                type: 'C',
            },
            { points: [], type: 'z' },
        ],
        normalized: [
            { points: [{ x: 0, y: 0 }], type: 'M' },
            {
                points: [
                    { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 1 },
                    { clone: true, x: 1, y: 1 }, { clone: true, x: 1, y: 1 }, { clone: true, x: 1, y: 1 },
                    { clone: true, x: 1, y: 1 }, { clone: true, x: 1, y: 1 }, { clone: true, x: 1, y: 1 },
                    { clone: true, x: 1, y: 1 }, { clone: true, x: 1, y: 1 }, { clone: true, x: 1, y: 1 },
                    { x: 1, y: 1 }, { x: 2, y: 0 }, { x: 2, y: 0 },
                    { clone: true, x: 2, y: 0 }, { clone: true, x: 2, y: 0 }, { clone: true, x: 2, y: 0 },
                    { clone: true, x: 2, y: 0 }, { clone: true, x: 2, y: 0 }, { clone: true, x: 2, y: 0 },
                    { x: 2, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
                    { clone: true, x: 0, y: 0 }, { clone: true, x: 0, y: 0 }, { clone: true, x: 0, y: 0 },
                    { clone: true, x: 0, y: 0 }, { clone: true, x: 0, y: 0 }, { clone: true, x: 0, y: 0 },
                ],
                type: 'C',
            },
            { points: [], type: 'z' },
        ],
        parsed: [
            { points: [{ x: '0', y: '0' }], type: 'M' },
            { points: [{ x: '1', y: '1' }], type: 'L' },
            { points: [{ x: '2', y: '0' }], type: 'L' },
            { points: [], type: 'z' },
        ],
        raw: 'M0 0L1 1L2 0z',
    },
}
/* eslint-enable array-element-newline */

describe('definition#parse()', () => {
    it('should parse a command type L', () => {

        const actual = parseDefinition(commands.L.raw)
        const expected = [commands.L.parsed]

        assert.deepStrictEqual(actual, expected)
    })
    it('should parse a command type H', () => {

        const actual = parseDefinition(commands.H.raw)
        const expected = [commands.H.parsed]

        assert.deepStrictEqual(actual, expected)
    })
    it('should parse a command type V', () => {

        const actual = parseDefinition(commands.V.raw)
        const expected = [commands.V.parsed]

        assert.deepStrictEqual(actual, expected)
    })
    it('should parse a command type C', () => {

        const actual = parseDefinition(commands.C.raw)
        const expected = [commands.C.parsed]

        assert.deepStrictEqual(actual, expected)
    })
    it('should parse a command type S', () => {

        const actual = parseDefinition(commands.S.raw)
        const expected = [commands.S.parsed]

        assert.deepStrictEqual(actual, expected)
    })
    it('should parse a command type Q', () => {

        const actual = parseDefinition(commands.Q.raw)
        const expected = [commands.Q.parsed]

        assert.deepStrictEqual(actual, expected)
    })
    it('should parse a command type T', () => {

        const actual = parseDefinition(commands.T.raw)
        const expected = [commands.T.parsed]

        assert.deepStrictEqual(actual, expected)
    })
    it('should parse a command type A', () => {

        const actual = parseDefinition(commands.A.raw)
        const expected = [commands.A.parsed]

        assert.deepStrictEqual(actual, expected)
    })
    it('should parse a <path> definition', () => {

        const actual = parseDefinition(shapes.clover.raw)
        const expected = shapes.clover.parsed

        assert.deepStrictEqual(actual, expected)
    })
    it('should parse a <path> definition containing implicit 0 (eg. "1.2.3")', () => {

        const actual = parseDefinition('L1.2.3')
        const expected = [{ points: [{ x: '1.2', y: '0.3' }], type: 'L' }]

        assert.deepStrictEqual(actual, expected)
    })
})

describe('definition#normalize()', () => {
    it('should normalize command type L -> C', () => {

        const actual = normalizeCommands([commands.M.parsed, commands.L.parsed, commands.z.parsed])
        const expected = [commands.M.normalized, commands.L.normalized, commands.z.normalized]

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize command type l -> C', () => {

        const actual = normalizeCommands([
            commands.M.parsed,
            { points: [{ x: '1', y: '0' }, { x: '0', y: '1' }], type: 'l' },
            commands.z.parsed,
        ])
        const expected = [commands.M.normalized, commands.L.normalized, commands.z.normalized]

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize command type H -> C', () => {

        const actual = normalizeCommands([commands.M.parsed, commands.H.parsed, commands.z.parsed])
        const expected = [commands.M.normalized, commands.H.normalized, commands.z.normalized]

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize command type h -> C', () => {

        const actual = normalizeCommands([
            commands.M.parsed,
            { points: [{ x: '1' }, { x: '1' }], type: 'h' },
            commands.z.parsed,
        ])
        const expected = [commands.M.normalized, commands.H.normalized, commands.z.normalized]

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize command type V -> C', () => {

        const actual = normalizeCommands([commands.M.parsed, commands.V.parsed, commands.z.parsed])
        const expected = [commands.M.normalized, commands.V.normalized, commands.z.normalized]

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize command type v -> C', () => {

        const actual = normalizeCommands([
            commands.M.parsed,
            { points: [{ y: '1' }, { y: '1' }], type: 'v' },
            commands.z.parsed,
        ])
        const expected = [commands.M.normalized, commands.V.normalized, commands.z.normalized]

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize command type c -> C', () => {

        const actual = normalizeCommands([
            { points: [{ x: '0', y: '2' }], type: 'M' },
            {
                points: [
                    { x: '0', y: '-1' },
                    { x: '1', y: '-2' },
                    { x: '2', y: '-2' },
                    { x: '1', y: '0' },
                    { x: '2', y: '1' },
                    { x: '2', y: '2' },
                ],
                type: 'c',
            },
            commands.z.parsed,
        ])
        const expected = [{ points: [{ x: 0, y: 2 }], type: 'M' }, commands.C.normalized, commands.z.normalized]

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize command type S -> C', () => {

        const actual = normalizeCommands([
            { points: [{ x: '0', y: '1' }], type: 'M' },
            commands.S.parsed,
            commands.z.parsed,
        ])
        const expected = [{ points: [{ x: 0, y: 1 }], type: 'M' }, commands.S.normalized, commands.z.normalized]

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize command type s -> C', () => {

        const actual = normalizeCommands([
            { points: [{ x: '0', y: '1' }], type: 'M' },
            { points: [{ x: '0', y: '-1' }, { x: '1', y: '-1' }, { x: '1', y: '1' }, { x: '1', y: '1' }], type: 's' },
            commands.z.parsed,
        ])
        const expected = [{ points: [{ x: 0, y: 1 }], type: 'M' }, commands.S.normalized, commands.z.normalized]

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize command type Q -> C', () => {

        const actual = normalizeCommands([
            { points: [{ x: '0', y: '1' }], type: 'M' },
            commands.Q.parsed,
            commands.z.parsed,
        ])
        const expected = [{ points: [{ x: 0, y: 1 }], type: 'M' }, commands.Q.normalized, commands.z.normalized]

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize command type q -> C', () => {

        const actual = normalizeCommands([
            { points: [{ x: '0', y: '1' }], type: 'M' },
            { points: [{ x: '1', y: '-1' }, { x: '2', y: '0' }, { x: '1', y: '-1' }, { x: '2', y: '0' }], type: 'q' },
            commands.z.parsed,
        ])
        const expected = [{ points: [{ x: 0, y: 1 }], type: 'M' }, commands.Q.normalized, commands.z.normalized]

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize command type T -> C', () => {

        // TODO: find or search for the "official" maths to convert T to C

        // <svg viewBox="0 0 6 6">
        //     <path d="M 0 3
        //             Q 1 0  2 3
        //             T 4 3  6 3" fill="#ff000066" />
        //     <path d="M 0 3
        //             C 0.67 1  1.33 1  2 3
        //             C 2.67 5  3.33 5  4 3
        //             C 4.67 1  5.33 1  6 3" fill="#ff000066" />
        const actual = normalizeCommands([
            { points: [{ x: '0', y: '3' }], type: 'M' },
            { points: [{ x: '0.67', y: '1' }, { x: '1.33', y: '1' }, { x: '2', y: '3' }], type: 'C' },
            { points: [{ x: '4', y: '3' }, { x: '6', y: '3' }], type: 'T' },
            { points: [], type: 'z' },
        ])
        const expected = [
            { points: [{ x: 0, y: 3 }], type: 'M' },
            {
                points: [
                    { x: 0.67, y: 1 },
                    { x: 1.33, y: 1 },
                    { x: 2, y: 3 },
                    { x: 2.67, y: 5 },
                    { x: 3.33, y: 5 },
                    { x: 4, y: 3 },
                    { x: 4.67, y: 1 },
                    { x: 5.33, y: 1 },
                    { x: 6, y: 3 },
                    { x: 6, y: 3 },
                    { x: 0, y: 3 },
                    { x: 0, y: 3 },
                ],
                type: 'C',
            },
            { points: [], type: 'z' },
        ]

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize command type t -> C', () => {

        // TODO: see previous test case.

        // <svg viewBox="0 0 6 6">
        //     <path d="M 0 3
        //             C 0.67 1  1.33 1  2 3     // -> Q 1 0  2 3
        //             t 2 0  2 0" fill="#ff000066" />
        //     <path d="M 0 3
        //             C 0.67 1  1.33 1  2 3
        //             C 2.67 5  3.33 5  4 3
        //             C 4.67 1  5.33 1  6 3" fill="#ff000066" />
        const actual = normalizeCommands([
            { points: [{ x: '0', y: '3' }], type: 'M' },
            { points: [{ x: '0.67', y: '1' }, { x: '1.33', y: '1' }, { x: '2', y: '3' }], type: 'C' },
            { points: [{ x: '2', y: '0' }, { x: '2', y: '0' }], type: 't' },
            { points: [], type: 'z' },
        ])
        const expected = [
            { points: [{ x: 0, y: 3 }], type: 'M' },
            {
                points: [
                    { x: 0.67, y: 1 },
                    { x: 1.33, y: 1 },
                    { x: 2, y: 3 },
                    { x: 2.67, y: 5 },
                    { x: 3.33, y: 5 },
                    { x: 4, y: 3 },
                    { x: 4.67, y: 1 },
                    { x: 5.33, y: 1 },
                    { x: 6, y: 3 },
                    { x: 6, y: 3 },
                    { x: 0, y: 3 },
                    { x: 0, y: 3 },
                ],
                type: 'C',
            },
            { points: [], type: 'z' },
        ]

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize command type A -> C', () => {

        const actual = normalizeCommands([
            { points: [{ x: '0', y: '5' }], type: 'M' },
            commands.A.parsed,
            commands.z.parsed,
        ])
        const expected = [{ points: [{ x: 0, y: 5 }], type: 'M' }, commands.A.normalized, commands.z.normalized]

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize command type a -> C', () => {

        const actual = normalizeCommands([
            { points: [{ x: '0', y: '5' }], type: 'M' },
            {
                points: [
                    { angle: '0', fA: '1', fS: '0', rx: '5', ry: '5', x: '10', y: '0' },
                    { angle: '0', fA: '1', fS: '0', rx: '5', ry: '5', x: '-10', y: '0' },
                ],
                type: 'a',
            },
            commands.z.parsed,
        ])
        const expected = [{ points: [{ x: 0, y: 5 }], type: 'M' }, commands.A.normalized, commands.z.normalized]

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize a <path> definition', () => {

        const actual = normalizeCommands(shapes.clover.parsed)
        const expected = shapes.clover.normalized

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize a <path> definition closing with an implicit line command', () => {

        const actual = normalizeCommands(shapes.triangle.parsed)
        const expected = shapes.triangle.explicited

        assert.deepStrictEqual(actual, expected)
    })
    it('should normalize a collection of <path> definitions', () => {

        const actual = normalizeDefinitions(Object.values(shapes).map(shape => shape.parsed))

        Object.keys(shapes).forEach((name, shape) => {
            assert.deepStrictEqual(actual[shape], shapes[name].normalized)
            assert.strictEqual(actual[shape][1].points.length, shapes[name].normalized[1].points.length)
        })
    })
})

describe('definition#setAnimation()', () => {

    /**
     * assertHasExpectedProps :: Expected -> Definition -> void
     *
     * Expected => { [Prop]: Rule }
     * Rule => { min: Number, max: Number }
     * Definition => [Command]
     * Command => { type: String, points: [...Point] }
     * Point => [Group]
     * Group => { [Parameter]: Number }
     *
     * (1) It should set the `Expected` `Prop`s on each `Group` from the same
     * `Point`, with a `Number` between `min` and `max` defined in `Rule`.
     *
     * (2) It should set the same `Prop`s values to each `Group` from the same
     * `Point` (start/end control and end position `Parameter`s), and to each
     * `Group` with the same `Parameter`s values at a respective `Point` index.
     */
    const assertHasExpectedProps = props => {

        const collectRandomValues = ([{ points: [startPoint] }, { points: drawPoints }]) =>
            [startPoint, ...drawPoints].reduce(
                (values, { clone, delay, duration }) =>
                    clone ? values : [...values, { delay, duration }],
                [])

        const hasUniqueRandomValue = (prevPoint, point) => Object.keys(props).reduce(
            (isUnique, option) => isUnique || prevPoint[option] === point[option], false)

        return actual => {
            // (1)
            actual.forEach(command => command.points.forEach((point, index) =>
                Object.entries(props).forEach(([prop, { min, max }]) => {
                    assert.ok(typeof point[prop] === 'number', `${prop} should be a number in point at index ${index}`)
                    assert.ok(point[prop] >= min && point[prop] <= max, `Out of range value in point at index ${index}`)
                })))
            // (2)
            const actualRandomValues = collectRandomValues(actual)
            const actualUniqueRandomValues = uniqWith(hasUniqueRandomValue, actualRandomValues)
            const expectedUniqueRandomValuesLength = (actualRandomValues.length - 1) / Point.c.length

            assert.strictEqual(actualUniqueRandomValues.length, expectedUniqueRandomValuesLength)
        }
    }

    it('should set animation props/values to each point based from defined rules', () => {

        // TODO (fix false negative test result): there's a small chance that
        // two points get the same values applied, but it seems that it happens
        // more often than expected.

        // Those rules are:
        // (1) It should set required props with a value between a `min` and
        // `max` `Number`, based from arguments given to `setAnimations()`
        // (2) It should set the same props values to each `Point` with the same
        // `[Point]`s values, and to the `Points` of the same `Group`,
        // ie. consecutive start/end control and position parameters.

        // Expected => { [Prop]: Rule }
        // Rule => { min: Number, max: Number }
        const expected = {
            delay: { max: 1000, min: 0 },
            duration: { max: 5000, min: 3000 },
        }
        const actual = setAnimations(
            Object.values(shapes).map(shape => shape.normalized),
            {
                maxDelay: expected.delay.max,
                maxDuration: expected.duration.max,
                minDelay: expected.delay.min,
                minDuration: expected.duration.min,
            })

        actual.forEach(assertHasExpectedProps(expected))
    })
})

describe('definition#serialize()', () => {
    it('should return a definition String given a definition [Command]', () => {

        const actual = serializeDefinition(shapes.clover.normalized)
        const expected = 'M8 5C9.32 4.22 9.3 2.29 7.96 1.54 6.73 0.85 5.2 1.61 5 3 5 1.46 3.33 0.5 2 1.27 0.67 2.04 0.67 3.96 2 4.73 2.3 4.91 2.65 5 3 5 0.82 4.23-1.37 6.11-0.94 8.38-0.52 10.65 2.21 11.61 3.96 10.11 4.58 9.58 4.95 8.81 5 8 6.15 9.15 8.13 8.63 8.55 7.05 8.75 6.32 8.54 5.54 8 5z'

        assert.deepStrictEqual(actual, expected)
    })
})
