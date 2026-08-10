export default function SectionLabel({
  index,
  children,
}: {
  index: string;
  children: string;
}) {
  return (
    <p className="hud-label mb-2">
      // {index}: {children}
    </p>
  );
}
