// Hides the inline splash from index.html once the app is ready, keeping it up
// for at least MIN_MS so it reads as an app launch rather than a flicker.
const MIN_MS = 1600

declare global {
  interface Window {
    __splashStart?: number
  }
}

export function hideSplash() {
  const el = document.getElementById('splash')
  if (!el) return
  const shown = performance.now() - (window.__splashStart ?? 0)
  setTimeout(
    () => {
      el.classList.add('out')
      setTimeout(() => el.remove(), 500)
    },
    Math.max(0, MIN_MS - shown),
  )
}
