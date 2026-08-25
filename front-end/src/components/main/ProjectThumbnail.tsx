interface ProjectThumbnailProps {
  name: string
  src: string
}

/** Project artwork with the wordmark set over it in Instrument Serif, always white. */
export function ProjectThumbnail({ name, src }: ProjectThumbnailProps) {
  return (
    <div
      role="img"
      aria-label={`${name} preview`}
      style={{ backgroundImage: `url(${src})` }}
      className="relative h-[78px] w-[104px] rounded-cs-thumb bg-cover bg-center bg-no-repeat"
    >
      <span className="absolute top-[26px] left-[14px] font-display text-[20px] text-cs-white">
        {name}
      </span>
    </div>
  )
}
