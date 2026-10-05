// Detects tab switch / Alt+Tab / Win key / Esc / fullscreen exit. Returns a stop() function.
export function startSecurity(onViolation) {
  const onVisibility = () => document.hidden && onViolation('tab-switch')
  const onBlur = () => onViolation('window-blur')
  const onFullscreen = () => !document.fullscreenElement && onViolation('fullscreen-exit')

  const onKey = (e) => {
    const k = e.key
    if (k === 'Meta' || k === 'Escape' || (e.altKey && k === 'Tab')) {
      e.preventDefault()
      onViolation('key:' + (e.altKey ? 'Alt+' : '') + k)
    }
    const devtools =
      k === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(k.toUpperCase())) ||
      (e.ctrlKey && k.toLowerCase() === 'u')
    if (devtools) e.preventDefault()
  }
  const noMenu = (e) => e.preventDefault()
  const beforeUnload = (e) => {
    e.preventDefault()
    e.returnValue = ''
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('blur', onBlur)
  document.addEventListener('fullscreenchange', onFullscreen)
  window.addEventListener('keydown', onKey, true)
  document.addEventListener('contextmenu', noMenu)
  window.addEventListener('beforeunload', beforeUnload)
  // Chrome/Edge: lets us receive Esc in fullscreen instead of exiting silently
  navigator.keyboard?.lock?.(['Escape']).catch(() => {})

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('blur', onBlur)
    document.removeEventListener('fullscreenchange', onFullscreen)
    window.removeEventListener('keydown', onKey, true)
    document.removeEventListener('contextmenu', noMenu)
    window.removeEventListener('beforeunload', beforeUnload)
    navigator.keyboard?.unlock?.()
  }
}