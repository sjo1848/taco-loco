import Image from "next/image";

export function BrandHeader({ businessName }: { businessName: string }) {
  return <header className="brand-header"><Image className="brand-logo" src="/brand/logo-taco-loco.jpg" alt="Logo de Taco Loco" width={68} height={68} priority /><div><p className="brand-name"><span className="brand-name__text">{businessName}</span><span className="brand-name__cheese" aria-hidden="true"><i /><i /><i /></span></p><p className="brand-tagline"><span className="brand-tagline__spark" aria-hidden="true">✦</span><span>Sabor que te vuelve loco</span><span className="brand-tagline__spark" aria-hidden="true">✦</span></p></div></header>;
}
