import { Screen, anticipateKeyboard } from '../components/Chrome'
import { Chip, SectionLabel } from '../components/Atoms'
import { RecordingCard } from '../components/Cards'
import { TabBar } from '../components/Dock'
import { initials, data, isNew, recordings } from '../data'
import { navigate } from '../router'

const CHIPS = [{ id: 'all', label: 'All' }, { id: 'folders', label: 'Folders' }, { id: 'people', label: 'People' }]

export default function Home() {
  const fresh = recordings.filter((r) => isNew(r.date))
  const earlier = recordings.filter((r) => !isNew(r.date))

  return (
    <Screen dock={<TabBar active="recordings" onSearch={() => { anticipateKeyboard(); document.getElementById('kb-proxy')?.focus(); navigate('/search') }} />}>
      <header className="flex flex-col gap-5 px-4 pt-[10px] pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-heading-xl leading-[1.2] tracking-heading">Recordings</h1>
          <span className="flex size-[46px] items-center justify-center rounded-pill bg-gray-975 text-heading-s font-bold tracking-[0.06em] text-gray-50">
            {initials(data.user.id)}
          </span>
        </div>
        <div className="flex items-end gap-1" role="tablist">
          {/* Folders and People are placeholders, as in Figma. */}
          {CHIPS.map((c) => <Chip key={c.id} label={c.label} selected={c.id === 'all'} dot={c.id === 'all' && fresh.length > 0} />)}
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-[130px]">
        {fresh.length > 0 && <SectionLabel>New</SectionLabel>}
        {fresh.map((r) => <RecordingCard key={r.item.id} rec={r} showNew />)}
        {earlier.length > 0 && <div className="mt-4"><SectionLabel>Earlier</SectionLabel></div>}
        {earlier.map((r) => <RecordingCard key={r.item.id} rec={r} />)}
      </main>
    </Screen>
  )
}
