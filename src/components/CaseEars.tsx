// HARO-PC's ears, for the cases drawn in HTML: the picture viewer and harogatOS. The 3D model has
// the same two, so a window that opens reads as the machine's own screen, not a modal. They sit on
// the case's top border and share its 4px ink line. See docs/ART_DIRECTION.md.

function Ear({ side }: { side: "left" | "right" }) {
  // The apex leans out a little, like the model's.
  const apex = side === "left" ? 22 : 42;
  return (
    <svg
      viewBox="0 0 64 44"
      className={`absolute bottom-full -mb-1 w-11 h-8 sm:w-16 sm:h-11 ${side === "left" ? "left-[12%]" : "right-[12%]"}`}
      aria-hidden="true"
    >
      <path d={`M2 44 L${apex} 4 L62 44 Z`} fill="#FDF7E7" />
      <path d={`M16 44 L${apex} 18 L48 44 Z`} fill="#FD8D75" />
      <path d={`M2 44 L${apex} 4 L62 44`} fill="none" stroke="#412C47" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

export default function CaseEars() {
  return (
    <>
      <Ear side="left" />
      <Ear side="right" />
    </>
  );
}
