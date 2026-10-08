import { useEffect } from 'react'
import { SimulatedChat } from './SimulatedChat'
import { toast } from '../Toast'
import { copy } from '../../content/handoff-copy'
import { useChat } from '../../lib/handoff/store'
import { consumeReturn } from '../../lib/handoff/strategies'

/**
 * Renders the simulated chat above every screen, inside the phone frame, and greets the user calmly when
 * they come back from Claude (D86): back to this tab, back from the Claude app, or a reload.
 */
export function HandoffHost() {
  const chat = useChat()
  useEffect(() => {
    const welcome = () => { if (consumeReturn()) toast(copy.toast.welcomeBack) }
    welcome()
    const onVisible = () => { if (document.visibilityState === 'visible') welcome() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', welcome)
    return () => { document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('pageshow', welcome) }
  }, [])
  return chat ? <SimulatedChat payload={chat} /> : null
}
