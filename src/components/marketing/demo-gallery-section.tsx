import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { DEMO_GALLERY_ITEMS } from "@/lib/marketing/demo-gallery";

const FOCUS =
  "rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--brand)]";

export function DemoGallerySection() {
  return (
    <section
      id="sites-demo"
      aria-labelledby="sites-demo-heading"
      className="demo-gallery-section mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:py-32"
    >
      <div className="max-w-2xl" data-reveal>
        <p className="text-sm font-semibold text-[var(--brand)]">Sites-demo prontos</p>
        <h2 id="sites-demo-heading" className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
          Três segmentos, três vitrines fictícias para apresentar ao lead.
        </h2>
        <p className="mt-5 max-w-xl text-base leading-7 text-[var(--text-3)]">
          Cada cartão abaixo é um exemplo de site montado para prospecção. Marcas, cidades e contatos são
          demonstrativos.
        </p>
      </div>

      <ul
        className="demo-gallery-grid mt-12 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3"
        role="list"
        aria-label="Galeria de sites demonstrativos"
      >
        {DEMO_GALLERY_ITEMS.map((item, index) => (
          <li
            key={item.slug}
            data-reveal
            className={`demo-gallery-card list-none reveal-delay-${Math.min(index + 1, 5)}`}
          >
            <article className="demo-gallery-card-inner flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)]">
              <div className="demo-gallery-media relative aspect-[16/10] w-full overflow-hidden bg-[var(--neu-bg-well)]">
                <Image
                  src={item.imageSrc}
                  alt={item.imageAlt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover object-top transition-transform duration-500 ease-[var(--ease-out)]"
                  priority={index === 0}
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-tint)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand)]">
                    <Sparkle size={14} weight="fill" aria-hidden />
                    {item.niche}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-3)]">
                    <MapPin size={14} weight="duotone" aria-hidden />
                    {item.city}
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-[var(--text)]">{item.businessName}</h3>
                <p className="text-xs font-medium text-[var(--text-4)]">Dados demonstrativos</p>
                <div className="mt-auto pt-2">
                  <Link
                    href={item.href}
                    className={`marketing-button marketing-button-secondary demo-gallery-cta inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold sm:w-auto ${FOCUS}`}
                  >
                    Ver demonstração
                    <ArrowRight size={17} weight="bold" className="marketing-arrow" aria-hidden />
                  </Link>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default DemoGallerySection;
