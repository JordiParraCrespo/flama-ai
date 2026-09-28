---
"@flama/web": patch
---

A signed-in device's "last seen" on the profile's Sessions pane moves on by itself: the session list reads the time from one `useNow` a minute and hands it to every row, instead of each row reading `new Date()` in render, which the React Compiler cached until something unrelated changed.
