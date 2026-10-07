import { Button } from '../Atoms'
import { copy } from '../../content/handoff-copy'
import { categoryById, type Classification } from '../../lib/capability'

/**
 * Shown in search when the request goes beyond the on-device model (D86): what Nexo can't do here, what
 * Claude can, one primary and one secondary action. Same card shape as the transcript cards.
 */
export function HandoffCard({ verdict, hasSources, onContinue, onDismiss }: {
  verdict: Classification; hasSources: boolean; onContinue: () => void; onDismiss: () => void
}) {
  const category = categoryById(verdict.category)
  return (
    <section data-testid="handoff-card" data-category={verdict.category} aria-labelledby="handoff-card-title"
      className="flex flex-col gap-3 rounded-hit border border-gray-200 bg-white p-[19px]">
      <h2 id="handoff-card-title" className="text-heading-s leading-[1.24] tracking-heading text-gray-975">{copy.card.title}</h2>
      <p className="text-body-m leading-[1.4] text-gray-800">
        {category?.cantLocal} {hasSources ? copy.card.claudeCan : copy.card.noSources}
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        <Button data-testid="handoff-continue" onClick={onContinue}>{copy.card.primary}</Button>
        <Button variant="secondary" data-testid="handoff-dismiss" onClick={onDismiss}>{copy.card.secondary}</Button>
      </div>
    </section>
  )
}
