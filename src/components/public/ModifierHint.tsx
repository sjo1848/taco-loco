export function ModifierHint({ modifier }: { modifier: { name: string; required: boolean; minSelections: number | null; options: string[] } }) {
  const cardinality = modifier.minSelections === 1 ? "1" : modifier.minSelections ? `${modifier.minSelections}` : "";
  const label = cardinality ? `${cardinality} ${modifier.name.toLowerCase()}` : modifier.name;
  return <span className="modifier-hint">{label}{modifier.options.length > 0 ? ` · ${modifier.options.join(" · ")}` : ""}</span>;
}
