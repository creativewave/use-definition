[![CircleCI](https://circleci.com/gh/creativewave/use-definition.svg?style=svg)](https://circleci.com/gh/creativewave/use-definition)

# use-definition

1. [About](#about)
2. [Installation](#installation)
3. [Example](#example)
4. [API](#API)

## About

`use-definition` abstracts animating the `d`efinition attribute of an SVG `<path>` in a React component.

It receives a collection of definitions, and returns a normalized value to render and a function to trigger a transition to another (normalized) definition from the given collection.

**Demo:** [CodePen](https://codepen.io/creative-wave/pen/QPxLXm).

**Features:**

- [x] support of any command type in the definition
- [x] transformation between `<path>`s with different numbers of points
- [x] individual transformation of each point's parameters over time
- [x] chaining animations
- [ ] render in a `<canvas>`
- [ ] render in a static CSS file as CSS keyframes

This package has been created to overcome the limitations of the existing SVG animation libraries for this specific need. It's an alternative to [GreenSock morphSVG plugin](https://greensock.com/morphSVG), which is not free and "React plug and play ready", but has some extra features, probably a better browsers support, and higher performances.

This package has no external dependency like [SVGO](https://github.com/svg/svgo) to parse or normalize definitions, in order to avoid extra iterations on each definition and to optimize performances.

## Installation

```shell
  npm i @cdoublev/use-definition
```

This package doesn't include a polyfill of `requestAnimationFrame`, which is required for IE < 10. You should [include it](https://gist.github.com/paulirish/1579671) [yourself](https://hackernoon.com/polyfills-everything-you-ever-wanted-to-know-or-maybe-a-bit-less-7c8de164e423).

## Example

```js
    import useDefinition from '@cdoublev/use-definition'
    import React from 'react'
    import ReactDOM from 'react-dom'

    const MorphingPath = ({ definitions }) => {

        const [definition, animateTo] = useDefinition({ definitions })
        const handleClick = () => {
            const { run, sequence } = animateTo('next')
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

`useDefinition` is the default export of this package. It's a React hook which has the following signature:

`useDefinition :: { definitions: [Definition], options?: Options } -> [Definition, Function, Reference]`

### Arguments

#### definitions (required)

`definitions` should be assigned with a collection of `d`efinition attributes of multiple SVG `<path>`s.

All command types are supported – `m`, `l`, `h`, `v`, `s`, `c`, `q`, `t`, `a`, `z` – either relative (lowercase) or absolute (uppercase). The only rule is that each `<path>` should not include a moving command (`m` or `M`) that is not the first command of the definition.

#### options (optional)

| **Options**   | **Description**                                               | **Default**    |
| ------------- | ------------------------------------------------------------- | -------------- |
| `delay`       | Delay (in ms) to wait before animating all points.            | `undefined`    |
| `duration`    | Duration (in ms) to animate all points.                       | `undefined`    |
| `minDelay`    | Random minimum delay (not processed if `delay` is set).       | `0`            |
| `maxDelay`    | Random maximum delay (not processed if `delay` is set).       | `1000`         |
| `minDuration` | Random minimum duration (not processed if `duration` is set). | `2000`         |
| `maxDuration` | Random maximum duration (not processed if `duration` is set). | `4000`         |
| `precision`   | Rounding precision.                                           | `2`            |
| `startIndex`  | Index of the first definition to render.                      | `0`            |
| `timing`      | Timing function used to animate the definition.               | `easeOutCubic` |

**Note**: `delay`, `duration` and `timing` can also be defined per animation when calling [`animateTo`](#animateTo).

When using a minimum and/or a maximum delay or duration, each point will be animated using a value between the given or the default value for the correspond option. The points with the same position will receive the same value.

When using `delay` and/or `duration`, random values will not be used for the corresponding option.

`timing` is a short word for timing function. It should be either a timing function or an alias to an available timing function (see the note below):

- `TimingFunction => String`
- `TimingFunction :: Number -> Number`
- `TimingFunction :: (Number, [Group, Group]) -> Group`

It will be called at each frame, and will receive:

- a relative time value (between `0` and `1`)
- a collection of two [groups of parameters](./src/definition/README.md#types-and-terminology): the first group belongs to the initial definition, and the second belongs to the corresponding group in the definition to transition to

The behavior of this timing function should vary depending on its parameters length:

- if it uses time as its sole argument, it should return a value relative to the intermediate value (between `0` and `1`) that a parameter should have at the corresponding relative time
- otherwise, it should directly return the intermediate group of parameters

For example, when time is `0.75`, a linear timing function that receive a group of parameters going from `{ x: 0, y: 0 }` to `{ x: 100, y: 100 }` should return `0.75` if it uses time as its sole argument, otherwise `{ x: 75, y: 75 }`.

**Note on available timing functions:**

This package has a `timing` named export that is a collection of popular timing functions such as *ease*, *ease-in*, *ease-out*, etc... Medium to heavy motion design projects usually involve custom timing functions. This collection exists for demonstration purpose. Replacing CSS with JavaScript to transition between paths using a linear or a cubic bezier function is non-sense (do it directly with CSS).

**Visualisations:** [Codepen](https://codepen.io/creative-wave/pen/vMrXJa).

### Return values

#### definition

The `String` returned by `useDefinition` can be named `definition` and should be used as the `d`efinition attribute value of the SVG `<path>` to render.

It will be automatically updated while transitionning to another definition.

#### animateTo

The `Function` returned by `useDefinition` can be named `animateTo` and has the following signature:

`animateTo :: (Number|String, Options?) -> { sequence: Task, run: Task -> TaskExecution }`

The first argument should be the index of the definition to transition to, or a convenient `'next'` alias that will be resolved to the next index after the current index, starting over at index `0` when required.

The second argument can be used to override some of the global `options` defined when calling `useDefinition`.

`animateTo` returns an object containing a `sequence`, which is a [Folktale's `Task`](https://folktale.origamitower.com/api/v2.3.0/en/folktale.concurrency.task._task._task.html) that can be used to chain consecutive(s) animation(s), and `run`, which is a function to run the sequence of animation(s).

The latter is a dirty trick to automatically cancel the animation before the component unmounts.

**Executing a callback after an animation ends:**

```js
    const { run, sequence } = animateTo(2)
    run(sequence.map(() => console.log('transition to index 2: done')))
```

**Running a parrallel task:**

```js
    const { run, sequence } = animateTo(2)
    run(sequence.and(Task.of('transition to index 2: started')))
```

**Chaining animations:**

```js
    const { run, sequence } = animateTo(2)
    const log = newIndex => console.log(`transition to ${newIndex}: done`)
    run(sequence
        .map(log)
        .chain(() => animateTo(3).sequence)
        .map(log)
```

#### animation

The React `Reference` returned by `useDefinition` can be named `animation` and has the following type:

`Reference => { current: { index: Number, isRunning: Boolean, task?: TaskExecution }}`

- `index` is the current index of the definition that is currently rendered
- `isRunning` is `true` when an animation is running, otherwise `false`
- `task` is a reference to the current `TaskExecution` that is either pending or completed

**Note:** `index` will be immediately updated after executing `run(sequence)`.

`isRunning` can be used eg. to prevent starting a new animation if the previous one is not over.

`task` can be used eg. to cancel the animation if a *pause* event has been fired.

## TODO

- Performances: measure performances of each processing task
- Performances: use a transducer to parse, normalize, and configure each command/point of a path
- Performances: consider rendering in a canvas
- Feature: export definitions as static CSS keyframes
