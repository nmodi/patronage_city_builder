const VARIANT_CLASSES = {
  offer: "h-14 w-10 object-cover shadow-sm shadow-black/20",
  gallery: "h-16 w-12 shadow-md shadow-black/30",
} as const;

export function ArtworkThumbnail({
  title,
  variant,
}: {
  title: string;
  variant: keyof typeof VARIANT_CLASSES;
}) {
  return (
    <img
      src="/art-placeholder.svg"
      alt={title}
      className={`shrink-0 rounded-sm border border-wood/50 ${VARIANT_CLASSES[variant]}`}
    />
  );
}
