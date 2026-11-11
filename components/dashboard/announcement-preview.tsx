const styles = {
  announcement: { label: "ANNOUNCEMENT", color: "#e2c27a" },
  update: { label: "UPDATE", color: "#70c4ba" },
  event: { label: "SERVER EVENT", color: "#7fe08a" },
  warning: { label: "WARNING", color: "#ce5c50" },
  maintenance: { label: "MAINTENANCE", color: "#e8a05a" },
} as const

type AnnouncementStyle = keyof typeof styles

export function AnnouncementPreview({
  type,
  title,
  message,
  owner,
  duration,
}: {
  type: AnnouncementStyle
  title: string
  message: string
  owner: string
  duration: number
}) {
  const style = styles[type]
  const color = style.color

  return (
    <section
      aria-label="In-game announcement preview"
      className="relative mx-auto w-full max-w-[540px] overflow-hidden border bg-[#17191e] px-6 py-5"
      style={{ borderColor: `${color}88`, backgroundImage: `linear-gradient(180deg, ${color}12, transparent 42%), linear-gradient(180deg, transparent, rgba(0,0,0,.22))` }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-[6px] border" style={{ borderColor: "rgba(86,79,67,.7)" }} />
      {[["left-1.5 top-1.5", ""], ["right-1.5 top-1.5", ""], ["bottom-1.5 left-1.5", ""], ["bottom-1.5 right-1.5", ""]].map(([position], index) => <span key={index} aria-hidden="true" className={`absolute ${position} size-[7px] rotate-45`} style={{ backgroundColor: color }} />)}
      <div className="relative flex flex-col gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[.16em]" style={{ color }}>{style.label}</p>
        <h3 className="font-serif text-[21px] font-bold leading-snug text-[#f2ecde]">{title.trim() || "Scuba Simulator"}</h3>
        <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${color}aa 15%, ${color}aa 85%, transparent)` }} />
        <p className="min-h-10 whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-[#f2ecde]">{message.trim() || "Your message will appear here as players see it in game."}</p>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#807a70]">FROM THE OWNER · {owner || "OWNER"}</p>
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: color, transformOrigin: "left", animation: `${duration}s linear infinite announcement-preview-timer` }} />
      <style jsx>{`@keyframes announcement-preview-timer { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
    </section>
  )
}
