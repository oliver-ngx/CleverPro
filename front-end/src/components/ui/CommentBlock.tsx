import { Icon } from './Icon'

interface CommentBlockProps {
  /** Name only; the block writes the "by". */
  author: string
  items: string[]
}

/**
 * Ported from the design system's `data/CommentBlock`: a teammate's note beneath a
 * diff — the comment glyph, an attribution line, then the bullets.
 *
 * The frame sets the bullets at 20px rather than the spec's 16, and draws the glyph
 * a little larger; both follow the frame.
 */
export function CommentBlock({ author, items }: CommentBlockProps) {
  return (
    <div>
      <div className="mb-[8px] flex items-center gap-[15px]">
        <Icon name="comment" className="h-[15px] w-[16px] shrink-0 opacity-45" />
        <span className="text-[11px] font-normal text-cp-text-tertiary">by {author}</span>
      </div>
      <ul className="m-0 list-disc pl-[19px] text-[13px]/[130%] font-normal text-cp-text-primary">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
