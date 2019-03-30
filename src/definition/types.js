
/**
 * Group[Type] => [Parameter]
 */
export const Group = {
    a: ['rx', 'ry', 'angle', 'fA', 'fS', 'x', 'y'],
    c: ['x', 'y'],
    h: ['x'],
    l: ['x', 'y'],
    m: ['x', 'y'],
    q: ['x', 'y'],
    s: ['x', 'y'],
    t: ['x', 'y'],
    v: ['y'],
    z: [],
}

/**
 * Point[Type] => [Group]
 */
export const Point = {
    a: ['arc'],
    c: ['start control', 'end control', 'end position'],
    h: ['horizontal translation'],
    l: ['end position'],
    m: ['end position'],
    q: ['control', 'end position'],
    s: ['end control', 'end position'],
    t: ['end position'],
    v: ['vertical translation'],
    z: [],
}
