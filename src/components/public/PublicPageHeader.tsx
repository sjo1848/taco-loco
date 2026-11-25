import Link from "next/link";

export function PublicPageHeader({ title, backHref, backLabel }: { title: string; backHref?: string; backLabel?: string }) {
  return <header className="public-page-header">
    {backHref && <Link className="public-page-header__back" href={backHref}><span aria-hidden="true">‹</span> {backLabel ?? "Volver"}</Link>}
    <h1>{title}</h1>
  </header>;
}
