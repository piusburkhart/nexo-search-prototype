import { Screen, anticipateKeyboard } from '../components/Chrome'
import { SectionLabel } from '../components/Atoms'
import { ActionPill } from '../components/Cards'
import { TabBar } from '../components/Dock'
import { actions } from '../data'
import { navigate } from '../router'

/** The Actions tab (Figma 77:4500): every action, newest meeting first. Actions belong to a meeting. */
export default function Actions() {
  return (
    <Screen dock={<TabBar active="actions" onSearch={() => { anticipateKeyboard(); document.getElementById('kb-proxy')?.focus(); navigate('/search') }} />}>
      <header className="px-4 pt-[10px] pb-4">
        <SectionLabel>Actions</SectionLabel>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-[130px]" data-testid="actions-list">
        {actions.map((a) => <ActionPill key={a.id} action={a} />)}
      </main>
    </Screen>
  )
}
