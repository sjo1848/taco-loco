export function AvailabilityBadge({ available }: { available: boolean }) {
  return <span className={available ? "availability availability--available" : "availability availability--sold-out"} role="status">{available ? "Disponible" : "Agotado"}</span>;
}
