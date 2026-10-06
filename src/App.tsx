import { PhoneFrame } from './components/Chrome'
import Home from './screens/Home'
import Search from './screens/Search'
import Transcript from './screens/Transcript'
import { MeetingDetail, MemoDetail } from './screens/Details'
import { useRoute } from './router'

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
  return <PhoneFrame><Routes /></PhoneFrame>
}
