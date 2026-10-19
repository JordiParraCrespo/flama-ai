// Apply the stored theme before first paint, so a dark-mode reader never sees
// a white flash when the popup opens. Mirrors the kit's ThemeProvider: light
// unless told otherwise. Every extension page shares one origin and so one
// localStorage, which is what makes a choice in the options page hold in the
// popup.
//
// A file rather than an inline block because Manifest V3 forbids inline
// script in extension pages outright — there is no hash or nonce to opt in
// with.
try {
  document.documentElement.classList.add(
    localStorage.getItem('theme') === 'dark' ? 'dark' : 'light',
  );
} catch {
  document.documentElement.classList.add('light');
}
