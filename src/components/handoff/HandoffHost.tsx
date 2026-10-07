import { useEffect } from 'react'
import { HandoffSheet } from './HandoffSheet'
import { SimulatedChat } from './SimulatedChat'
import { toast } from '../Toast'
import { copy } from '../../content/handoff-copy'
import { closeHandoff, useHandoff } from '../../lib/handoff/store'
import { consumeReturn } from '../../lib/handoff/strategies'

/**
 * Renders the handoff sheet and the simulated chat above every screen, inside the phone frame, and greets
 * the user calmly when they come back from Claude (D86): back to this tab, back from the Claude app, or a
 * reload of the page they left.
 */
export function HandoffHost() {
  const { sheet, chat } = useHandoff()
  useEffect(() => {
    const welcome = () => { if (consumeReturn()) { closeHandoff(); toast(copy.toast.welcomeBack) } }
    welcome()
    const onVisible = () => { if (document.visibilityState === 'visible') welcome() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', welcome)
    return () => { document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('pageshow', welcome) }
  }, [])
  return (
    <>
      {sheet && <HandoffSheet key={`${sheet.request}|${sheet.sources.map((s) => s.item.id).join(',')}`} req={sheet} />}
      {chat && <SimulatedChat payload={chat} />}
    </>
  )
}
