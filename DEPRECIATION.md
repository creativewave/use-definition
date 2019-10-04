
# Current problems

**1. Executing useState in requestAnimationFrame results to an update rate limited to 30 fps.**

`useState` will be executed asynchronously most of the time, therefore missing a frame to animate the definition.

```
Frame 0          | Frame 1            | Frame 2
---------------- | ------------------ | --------------------
> rAF 1 (wasted) | > rAF 2            | > rAF 3 (wasted)
                 | > setState (async) | > setState (batched)
                 |                    | > render
```

**2. animateTo() is updated on each definition's update, ie. on each render frame.**

How much does it costs? Is it related to the amount of data in scope? Its code length? Garbage collecting?

The main reason it's updated is that it depends on the current definition when it's triggered before the end of an animation. A dirty workaround would imply duplicating the current definition state in a ref, therefore increasing the amount of data in memory. Extending the `Animation` object returned by `animateTo()` to implement play/pause interfaces, makes this problem worse.

**3. animateTo() overlaps with the Web Animation API (WAPI)**

- it can already be used to animate a `d`efinition attribute
- it resolves current problems faced to implement play/pause interfaces as a facade of a Folktale's Future
- it might be even more performant due to its binding with the browser compositor
- it features time controls not available in CSS (playback rate, current time, etc...)
- it features a promising concept of event timing based animation
