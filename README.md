[![CircleCI](https://circleci.com/gh/creativewave/use-definition.svg?style=svg)](https://circleci.com/gh/creativewave/use-definition)

# use-definition

1. [About](#about)
2. [Installation](#installation)
3. [Example](#example)
4. [API](#API)

## About

`use-definition` abstracts animating the `d`efinition attribute of an SVG `<path>` in a React component.

It receives a collection of definitions, and returns a normalized value to render and a function to trigger a transition to another definition from the given collection.

**Demo:** [CodePen](https://codepen.io/creative-wave/pen/QPxLXm).

Features:

- [x] support of any command type in the definition
- [x] transformation between `<path>`s with different numbers of points
- [x] individual transformation of each point's parameters over time
- [x] chaining animations
- [ ] render in a `<canvas>`
- [ ] render in a static CSS file as CSS keyframes

This package has been created to overcome the limitations of the existing SVG animation libraries for this specific need. It's an alternative to [GreenSock morphSVG plugin](https://greensock.com/morphSVG), which is not free and "React plug and play ready", but has some extra features, probably a better support for old browsers, and higher performances.

This package has no external dependency like [SVGO](https://github.com/svg/svgo) to parse or normalize definitions, in order to avoid extra iterations on each definition and optimize performances.

## Installation

```shell
  npm i @cdoublev/use-definition
```

**Note on browsers support:** this package doesn't include a polyfill of `requestAnimationFrame`, which is required for IE < 10. You should [include it](https://gist.github.com/paulirish/1579671) [yourself](https://hackernoon.com/polyfills-everything-you-ever-wanted-to-know-or-maybe-a-bit-less-7c8de164e423).

## Example

```js
    import useDefinition from '@cdoublev/use-definition'
    import React from 'react'
    import ReactDOM from 'react-dom'

    const MorphingPath = ({ definitions }) => {

        const [definition, animateTo] = useDefinition({ definitions })
        const handleClick = () => {
            const { run, sequence } = animateTo(currentIndex => currentIndex === 1 ? 0 : 1)
            run(sequence)
        }

        return (
            <a onClick={handleClick}>
                <svg viewBox='0 0 100 150'>
                    <path d={definition} fill='#0e1539' />
                </svg>
            </a>
        )
    }
    // "blob" shapes
    const definitions = [
        'M84 19c8 25-27 7-27 51s39 29 23 54S32 138 22 128S3 89 3 68s7-37 18-46S75-6 84 19z',
        'M82 22c11 25-33 36-11 71s-3 57-33 46S5 74 13 40 71-2 82 22z',
    ]

    ReactDOM.render(<MorphingPath definitions={definitions} />, document.getElementById('app'))
```

## API

```js
    import useDefinition, { timing } from '@cdoublev/use-definition`
```

### `useDefinition`

`useDefinition` is the default export of this package. It's a React hook which has the following signature:

`useDefinition :: { definitions: [Definition], options?: Options, startIndex?: Number } -> [Definition, Function]`

#### Arguments

##### `definitions` (required)

`definitions` should be assigned with a collection of `d`efinition attributes of multiple SVG `<path>`s.

All command types are supported – `m`, `l`, `h`, `v`, `s`, `c`, `q`, `t`, `a`, `z` – either using relative or absolute values. The only rule is that each `<path>` should not include a moving command (`m` or `M`) that is not the first command of the definition.

##### `options` (optional)

Default: `{ minDelay: 0, maxDelay: 1000, minDuration: 3000, maxDuration: 5000 }`

`options` can be set to configure the animation of a point:

- `minDelay`, `maxDelay`: minimum and maximum delay in ms before starting the animation
- `minDuration`, `maxDuration`: minimum and maximum duration in ms of an animation

Each point will receive random values between the given minimum and maximum of the corresponding option, and will apply them to its parameters. Points with the same parameters values will also have the same option values applied.

##### `startIndex` (optional)

Default: `0`

`startIndex` can be used to configure the first definition to render using its index in the giving collection of `definitions`.

#### Return values

##### `definition`

The `String` returned by `useDefinition` can be named `definition` and should be used as the `d`efinition attribute value of the SVG `<path>` to render.

It will be automatically updated while transitionning to another definition.

##### `animateTo`

The `Function` returned by `useDefinition` can be named `animateTo` and has the following signature:

`animateTo :: (NextIndex, TimingFunction?) -> { sequence: Frame, run: Frame -> TaskExecution }`

- `NextIndex :: Number`
- `NextIndex :: Number -> Number`
- `TimingFunction :: String`
- `TimingFunction :: Number -> Number`
- `TimingFunction :: (Number, [Point, Point]) -> Point`

##### Expected arguments:

`animateTo` should receive `NextIndex` and a `TimingFunction`. It the latter is not provided, it will default to `'easeOutCubic'`.

`NextIndex` should be either an index `Number` of the next definition to transition to, or a function receiving the current index and returning the next index.

`TimingFunction` should be either an alias of an [available timing function](#timing), or a custom timing function called that will be called at each frame. It will receive a time value relative to the duration (between `0` and `1`), and a collection containing a parameter from the initial definition and its corresponding parameter from the definition to transition to. The behavior of this function should vary depending on its parameters length:

- if it uses time as its sole argument, it should return a value relative to the intermediate value (between `0` and `1`) that a parameter should have at the corresponding relative time
- otherwise, it should return the new parameter directly

For example, a linear timing function that receive parameters going from `{ x: 0, y: 0 }` to `{ x: 100, y: 100 }`, should return `0.75` when time is `0.75` when using time as its sole argument, or `{ x: 75, y: 75 }` when using the second argument.

##### Return value:

`animateTo` will return an object with the following properties:

- `sequence`: a `Frame` object wrapping a [Folktale's `Task`](https://folktale.origamitower.com/api/v2.3.0/en/folktale.concurrency.task._task._task.html) internally, that can be used to chain consecutive(s) animation(s)
- `run`: a function to run the sequence of animation(s)

The latter is a dirty trick to automatically cancel the animation when the component has its definition animated while it is either updated or unmounted.

**Using Folktale Task's interface**

Executing a callback after an animation ends:

```js
    const { run, sequence } = animateTo(2).map(() => console.log('transition to index 2: done'))
    run(sequence)
```

Chaining multiple animation:

```js
    const { run, sequence } =
        animateTo(2)
            .map(() => console.log('transition to index 2: done'))
            .chain(animateTo(3).map(() => console.log('transition to index 3: done')))
            .map(() => console.log('all transitions: done'))
    run(sequence)
```

Running a parrallel computation (not implemented yet):

```js
    const { run, sequence } =
        animateTo(2).and(End(console.log('transition to index 2: starting')))
            .map(() => console.log('transition to index 2: done'))
    run(sequence)
```

### `timing`

`timing` is a collection of popular timing functions such as *ease*, *ease-in*, *ease-out*, etc...

**Visualisations:** [CodePen](https://codepen.io/creative-wave/pen/vMrXJa).

Medium to heavy motion design projects usually involve custom timing functions. This collection is only meant for demonstration purpose. Replacing CSS with JavaScript to transition between two paths using a linear or a cubic bezier function is non-sense (do it directly with CSS).

## TODO

- Performances: measure performances of each processing task
- Performances: use a transducer to parse, normalize, and configure each command/point of a path
- Performances: consider rendering in a canvas
- Feature: export definitions as static CSS keyframes
