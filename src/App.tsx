import { useEffect, useState } from 'react'
import { PhoneFrame } from './components/Chrome'
import Actions from './screens/Actions'
import Gate, { isUnlocked } from './screens/Gate'
import Home from './screens/Home'
import Search from './screens/Search'
import Settings from './screens/Settings'
import { Toaster } from './components/Toast'
import { HandoffHost } from './components/handoff/HandoffHost'
import { applyUrlMode } from './lib/handoff/settings'
import { useRoute } from './router'

function Routes() {
  const [screen] = useRoute().segments
  switch (screen) {
    case 'search': return <Search />
    case 'actions': return <Actions />
    case 'settings': return <Settings /> // hidden: long-press a screen title (D84)
    default: return <Home />
  }
}

export default function App() {
  const [unlocked, setUnlocked] = useState(isUnlocked)
  // ?handoff=… preconfigures the handoff mode for this device (D84).
  useEffect(() => {
    applyUrlMode()
    window.addEventListener('hashchange', applyUrlMode)
    return () => window.removeEventListener('hashchange', applyUrlMode)
  }, [])
  if (!unlocked) return <PhoneFrame><Gate onUnlock={() => setUnlocked(true)} /></PhoneFrame>
  return (
    <PhoneFrame>
      {/* iOS only opens the keyboard for focus() called inside a tap. The Search screen mounts later
          (hashchange), so the tap focuses this proxy and the real field takes focus over on mount. */}
      <input id="kb-proxy" aria-hidden="true" tabIndex={-1} readOnly={false}
        className="pointer-events-none fixed top-0 left-0 size-px opacity-0" />
      <Routes />
      <HandoffHost />
      <Toaster />
    </PhoneFrame>
  )
}
