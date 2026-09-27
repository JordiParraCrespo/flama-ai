---
"@flama/web": patch
---

A signed-in device's "last seen" on the profile's Sessions pane moves on by itself: the row takes the time from `useNow` once a minute instead of reading `new Date()` in render, which the React Compiler cached until something unrelated changed.
