import { PhoneFrame } from './components/Chrome'
import Home from './screens/Home'
import Search from './screens/Search'
import Transcript from './screens/Transcript'
import { MeetingDetail, MemoDetail } from './screens/Details'
import { useRoute } from './router'
import Gate, { isUnlocked } from './screens/Gate'
import { useState } from 'react'

function Routes() {
  const [screen, id] = useRoute().segments
  switch (screen) {
    case 'search': return <Search />
    case 'meeting': return <MeetingDetail id={id} />
    case 'memo': return <MemoDetail id={id} />
    case 'transcript': return <Transcript key={id} id={id} />
    default: return <Home />
  }
}

export default function App() {
  const [unlocked, setUnlocked] = useState(isUnlocked)
  if (!unlocked) return <PhoneFrame><Gate onUnlock={() => setUnlocked(true)} /></PhoneFrame>
  return (
    <PhoneFrame>
      {/* iOS only opens the keyboard for focus() called inside a tap. The Search screen mounts later
          (hashchange), so the tap focuses this proxy and the real field takes focus over on mount. */}
      <input id="kb-proxy" aria-hidden="true" tabIndex={-1} readOnly={false}
        className="pointer-events-none fixed top-0 left-0 size-px opacity-0" />
      <Routes />
    </PhoneFrame>
  )
}
