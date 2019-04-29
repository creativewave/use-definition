
1. [Implementation of `useDefinition`](#implementation-of-useDefinition)
2. [Types and terminology](#types-and-terminology)
3. [Transforming a point to a cubic command point](#transforming-a-point-to-a-cubic-command-point)

# Implementation of `useDefinition`

**Why using `useState` to *save* a definition then *write* it as a definition attribute of an SVG `<path>`, instead of using `useRef` and *writing* it directly with `setAttributeNS()`?**

`useEffect`, `useState` and `requestAnimationFrame` make it cheap and easy to render an animation without blocking rendering or user interactions. Using `Definition` from state also allow this:

```jsx
    const higherOrderDefinition = ({ definition }) => `M0 0, H 100, V 100, H 0, z ${definition}`
```

While adding a frame (this is what the above code does) to a path is not very usefull, some use cases involving SVG `<mask>`s or `<clipPath>`s require this flexibility. Implementing this feature using `setAttributeNS()` would imply receiving a string to append and/or prepend, or inverting control to call a function that would return a transformed `Definition` to use in `setAttributeNS()`.

**How to cancel an animation before a component updates or unmounts?**

Related:

- https://overreacted.io/making-setinterval-declarative-with-react-hooks/
- https://overreacted.io/a-complete-guide-to-useeffect/
- https://overreacted.io/react-as-a-ui-runtime/

Using `requestAnimationFrame` and `cancelAnimationFrame` in hooks is a bit tricky. [Some](https://github.com/facebook/react/issues/14227#issuecomment-447627402) [people](https://github.com/streamich/react-use/blob/master/src/useRaf.ts) [claim](https://stackoverflow.com/questions/53781632/whats-useeffect-execution-order-and-its-internal-clean-up-logic-in-react-hooks) that `useLayoutEffect` should be used in place of `useEffect` to run `requestAnimationFrame(update)` (asynchronous `update` via `useState`, the effect function) and `cancelAnimationFrame` (synchronous cleanup function), to avoid an update on an unmounted component and the related error that is thrown even when calling `cancelAnimationFrame` in the cleanup function of `useEffect`.

> *Can't perform a React state update on an unmounted component. This is a no-op, but it indicates a memory leak in your application. To fix, cancel all subscriptions and asynchronous tasks in a useEffect cleanup function.*

When using `useEffect`, the runtime order is:

```
Render Element 1 ------------------> Render Element 2 --------->
> render 1                           > unmount 1  > render 2
  > useEffect                          > useEffect
                                         > cancelAnimationFrame
    > requestAnimationFrame(update)        > (failed) update
```

`useEffect` throws an error with the message from above.

When using `useLayoutEffect`, the runtime order is:

```
Render Element 1 ------------------> Render Element 2 --------->
  > render 1                             > unmount 1  > render 2
> useLayoutEffect                    > useLayoutEffect
                                       > cancelAnimationFrame
    > requestAnimationFrame(update)        > (failed) update
```

The `update` fails without throwing an error: React cancels all `update`s that were scheduled but couldn't have been run before the component unmounts.

**Note (not well documented):** before being unmounted, a parent component triggers the cleanup then the effect function of its child components from bottom to top then its own cleanup and effect functions, while `useLayoutEffect` triggers the cleanup functions from all child components then its own, and finally all effects and then its own.

Using `useLayoutEffect` also defeats the purpose of using `requestAnimationFrame`, which is to not block the main thread. Running `requestAnimationFrame` as an effect of `useLayoutEffect` almost entirely remove this inconvenience but it still feels wrong and according to Dan Abramov (React team member):

> *Using `useLayoutEffect` to avoid a warning is always a wrong fix*

Issue #14369: ([setState hook inside useEffect can cause unavoidable warning](https://github.com/facebook/react/issues/14369#issuecomment-457597993)).

*A much simpler solution* is to make the `update` (effect) function aware of the cancellation state ([reference](https://github.com/facebook/react/issues/14369#issuecomment-468267798)).

Here, the cancellation state is handled in `Animation.Frame`, which will `run()` the animation and return a reference to a `TaskExecution` with a `cancel()` method. Whenever a component using this hook unmounts or the `currentIndex` of the `Definition` to render updates before the previous `TaskExecution` resolves, the latter has to be `cancel()`ed in order to prevent asynchronous `update`s, ie. `setDefinitinion` (while the animation is running) or `setCurrentIndex` (after the animation has run).

It is done automatically by calling `TaskExecution.cancel()` in the cleanup function of `useEffet()`.

(2) See also how it is done using `useRef` and a custom interface in [React Spring](https://github.com/react-spring/react-spring/blob/master/src/useSprings.js).

# Types and terminology

**Command:** a definition of a movement on the SVG canvas.

**Command type:** a letter for the movement type, ie. either moving without drawing anything, drawing a line or a curve, or drawing a line to close the path.

**Command point:** a collection of grouped parameters describing one or multiple movements from a start point to an end point, ie. in vector graphic softwares for a cubic command, one or multiple points attached to a pair of curve handles.

**Command group:** a record of parameters gathered to ease the math to convert a command into a cubic command type, ie. `{ x: Number, y: Number }` for a parameter of a cubic command.

# Transforming a point to a cubic command point

Below is a list of `Group`ed (object) `Parameter`s (property names) sorted by `Command` type.

For clarity purpose, the type `Parameter => { a }` is replaced with `Parameter => [a]`.

| Type  | Point => [Group], Group => [Parameter] |
| ----- | -------------------------------------- |
| **L** | [Lx, Ly]                               |
| **l** | [lx, ly]                               |
| **H** | [Hx]                                   |
| **h** | [hx]                                   |
| **V** | [Vy]                                   |
| **v** | [vy]                                   |
| **S** | [Sx1, Sy1], [Sx2, Sy2]                 |
| **s** | [sx1, sy1], [sx2, sy2]                 |
| **c** | [cx1, cy1], [cx2, cy2], [cx3, cy3]     |
| **Q** | [Qx1, Qy1], [Qx2, Qy2]                 |
| **q** | [qx1, qy1], [qx2, qy2]                 |
| **T** | [Tx1, Ty1]                             |
| **t** | [tx1, ty1]                             |
| **A** | [Arx, Ary, Aa, Af1, Af2, Ax, Ay]       |
| **a** | [arx, ary, aa, af1, af2, ax, ay]       |

Below is a list of transformations for each `Point` by command type.

For clarity purpose, `P`revious is an alias to the previous point which has the type `Point => [x1, y1], [x2, y2], [x, y]`, where:

- `[x2, y2]` are the end control `Parameters` of the last (cubic) `Point`
- `[x, y]` are the end position `Parameters` of the last (cubic) `Point`

| Type  | Transformation from [P, Point[Type]] to [P, Point.C] |
| ----- | ---------------------------------------------------- |
| **L** | [P, [x, y], [Lx, Ly], [Lx, Ly]                       |
| **l** | [P, [x, y], [lx + x, ly + y], [lx + x, ly + y]]      |
| **H** | [P, [x, y], [Hx, y], [Hx, y]]                        |
| **h** | [P, [x, y], [hx + x, y], [hx + x, y]]                |
| **V** | [P, [x, y], [x, Vy], [x, Vy]]                        |
| **v** | [P, [x, y], [x, vy + y], [x, vy + y]]                |
| **S** | [P, [x, y]*, [Sx1, Sy1], [Sx2, Sy2]]                 |
| **s** | [P, [x, y]*, [sx1 + x, sy1 + y], [sx2 + x, sy2 + y]] |
| **c** | [P, [cx1 + x, cy1 + y], [cx2 + x, cy2 + y], [cx3 + x, cy3 + y]]       |
| **Q** | [P, [x + 2/3 * (Qx1 - x), y + 2/3 * (Qy1 - y)], [Qx2 + 2/3 * (Qx1 - Qx2), Qy2 + 2/3 * (Qy1 - Qy2)], [Qx2, Qy2]] |
| **q** | [P, [x + 2/3 * qx1, y + 2/3 * qy1], [qx2 + x + 2/3 * (qx1 - qx2), qy2 + y + 2/3 * (qy1 - qy2)], [qx2 + x, qy2 + y]] |
| **T** | [P, [x, y]*, [Tx > x ? Tx + (x - x2) : Tx - (x - x2), Ty > y ? Ty + (y - y2) : Ty - (y - y2)], [Tx, Ty]] |
| **t** | [P, [x, y]*, [Tx + x > x ? Tx + x + (x - x2) : Ty + y - (y - y2), Ty + y > y ? Ty + y + (y - y2) : Ty + y - (y - y2)], [tx + x, ty + y]] |
| **A** | [P, [?], [?], [Ax, Ay]]                              |
| **a** | [P, [?], [?], [ax + x, ay + y]]                      |

**(*) Special case:** consecutive points from command types `s|S` or `t|T` should use the previous end point parameters as their start control parameters if the last point is not from a cubic or a quadratic command, respectively. Otherwhise, its start control parameters should be a reflection of the previous end control parameters using the previous end point parameters as the anchor point of a symetric transformation:

| Type  | Transformation from [P, Point[Type]] to [P, Point.C] |
| ----- | ---------------------------------------------------- |
| **S** | [P, [x * 2 - x2, y * 2 - y2], ...                    |
| **s** | [P, [x * 2 - x2, y * 2 - y2], ...                    |
| **T** | [P, [x * 2 - x2, y * 2 - y2], ...                    |
| **t** | [P, [x * 2 - x2, y * 2 - y2], ...                    |

[Specification](https://www.w3.org/TR/SVG11/paths.html#PathDataCubicBezierCommands).
[Specification](https://www.w3.org/TR/SVG11/implnote.html#PathElementImplementationNotes).

The result of this behavior is that:

- if a command type `s|S` follows a command which has the same "parent" type, ie. a cubic bézier curve, it will get its path slightly shifted as its start control parameter will reflect the previous end control parameters instead of being "null", ie. at the previous end position
- if a command type `t|T` doesn't follow a command which has the same "parent" type, ie. a quadratic bézier curve, it will be rendered flat as it will only have its endpoint parameters, which is not enough to draw a curve

Another fact is that a `s|S` command type is usable independently but `t|T` is not.

Heuristic facts:

- total of transformed types: 15
- types using [x, y] for their start control point: 8/15 (uppercase or lowercase l, h, v, s*, t*)
- types using [draw.x ? draw.x + x : x, draw.y ? draw.y + y : y] for their end control point: 5/15 (l, h, v, s, c)
- types using [draw.x + x, draw.y + y] for their end position point: 6/15 (l, h, v, s, c, a)
