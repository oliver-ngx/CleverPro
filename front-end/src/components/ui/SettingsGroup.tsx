import type { ReactNode } from 'react'

interface SettingsGroupProps {
  /** Small grey caption above the card. The last group in the source has none. */
  label?: string
  children: ReactNode
}

/**
 * Ported from the design system's `surfaces/SettingsGroup`: a grey caption over a
 * flat card. The caption is inset further than the card so it lines up with the row
 * labels inside it rather than with the card's edge.
 */
export function SettingsGroup({ label, children }: SettingsGroupProps) {
  return (
    <div>
      {label !== undefined && (
        <div className="mb-[8px] ml-[22px] text-[12px] font-medium text-cs-text-section">
          {label}
        </div>
      )}
      <div className="rounded-cs-panel bg-cs-card py-[9px]">{children}</div>
    </div>
  )
}
