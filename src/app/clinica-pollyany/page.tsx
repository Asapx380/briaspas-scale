import Image from "next/image";
import { ArrowUpRight, CalendarBlank, CaretRight, MapPin, Phone, SealCheck, Sparkle, Tooth } from "@phosphor-icons/react/dist/ssr";
import styles from "./page.module.css";

const whatsapp = "https://wa.me/5519997916964?text=Ol%C3%A1%21%20Gostaria%20de%20agendar%20uma%20avalia%C3%A7%C3%A3o.";

const services = [
  ["Implantes", "Planejamento individualizado para recuperar função, conforto e confiança."],
  ["Alinhadores", "Uma alternativa discreta para alinhar o sorriso com acompanhamento profissional."],
  ["Estética", "Lentes, clareamento e tratamentos que respeitam as características do seu sorriso."],
  ["Clínica geral", "Prevenção, restaurações, próteses e tratamentos para a saúde bucal completa."],
];

export default function ClinicaPollyanyPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#inicio" aria-label="Clínica Pollyany Policarpo, início">
          <span className={styles.brandMark}>P</span>
          <span>Pollyany Policarpo<small>Odontologia</small></span>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#especialidades">Especialidades</a>
          <a href="#clinica">A clínica</a>
          <a href="#contato">Contato</a>
        </nav>
        <a className={styles.headerCta} href={whatsapp} target="_blank" rel="noreferrer">Agendar avaliação <ArrowUpRight size={17} weight="bold" /></a>
      </header>

      <section className={styles.hero} id="inicio">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}><Sparkle size={15} weight="fill" /> São Pedro, SP</p>
          <h1>Seu sorriso merece <em>cuidado</em> em cada detalhe.</h1>
          <p className={styles.heroText}>Odontologia humanizada, planejamento individual e tecnologia para você sorrir com segurança.</p>
          <a className={styles.primaryButton} href={whatsapp} target="_blank" rel="noreferrer"><CalendarBlank size={20} weight="bold" /> Agendar avaliação</a>
          <div className={styles.credentials}>
            <span><SealCheck size={23} weight="fill" /> CRO-SP 36541</span>
            <span>16 anos transformando sorrisos</span>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <Image src="/images/clinica-pollyany/fachada-purpura.jpg" alt="Logo da Clínica Pollyany Policarpo em parede roxa" fill preload quality={90} sizes="(max-width: 800px) 100vw, 52vw" />
          <div className={styles.heroOverlay} />
          <div className={styles.locationTag}><MapPin size={18} weight="fill" /><span>Rua José Estanislau de Oliveira, 926<br />Centro, São Pedro</span></div>
        </div>
      </section>

      <section className={styles.statement}>
        <p>Mais do que um procedimento, um plano de cuidado pensado para a sua história.</p>
        <Tooth size={42} weight="thin" aria-hidden="true" />
      </section>

      <section className={styles.services} id="especialidades">
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>Especialidades</p>
          <h2>Um cuidado completo para cada fase do seu sorriso.</h2>
        </div>
        <div className={styles.serviceGrid}>
          {services.map(([title, description], index) => <article className={styles.service} key={title}>
            <span>0{index + 1}</span><h3>{title}</h3><p>{description}</p><a href={whatsapp} target="_blank" rel="noreferrer" aria-label={`Agendar avaliação para ${title}`}><CaretRight size={20} weight="bold" /></a>
          </article>)}
        </div>
      </section>

      <section className={styles.about} id="clinica">
        <div className={styles.aboutImage}><Image src="/images/clinica-pollyany/dra-pollyany.jpg" alt="Dra. Pollyany Policarpo" fill quality={90} sizes="(max-width: 800px) 100vw, 42vw" /></div>
        <div className={styles.aboutCopy}>
          <p className={styles.kicker}>Dra. Pollyany Policarpo</p>
          <h2>Experiência que acolhe. Técnica que transmite segurança.</h2>
          <p>Cirurgiã-dentista especialista em Ortodontia e Implantodontia, com uma trajetória dedicada a transformar sorrisos com escuta, clareza e responsabilidade.</p>
          <a className={styles.textLink} href="https://www.instagram.com/clinicapollyanypolicarpo/" target="_blank" rel="noreferrer">Conheça a clínica no Instagram <ArrowUpRight size={18} weight="bold" /></a>
        </div>
      </section>

      <section className={styles.mosaic} aria-label="Clínica, tecnologia e cuidado">
        <div className={styles.mosaicImage}><Image src="/images/clinica-pollyany/procedimento.jpg" alt="Equipe realizando procedimento odontológico" fill quality={90} sizes="(max-width: 800px) 100vw, 50vw" /></div>
        <div className={styles.mosaicText}><p className={styles.kicker}>Cuidado que se percebe</p><h2>Ambiente preparado para receber você com tranquilidade.</h2><p>Da primeira conversa ao acompanhamento, cada etapa é explicada com atenção e respeito ao seu tempo.</p></div>
        <div className={styles.mosaicImage}><Image src="/images/clinica-pollyany/alinhadores.jpg" alt="Planejamento digital de alinhadores dentais" fill quality={90} sizes="(max-width: 800px) 100vw, 50vw" /></div>
      </section>

      <section className={styles.contact} id="contato">
        <div><p className={styles.kicker}>Vamos conversar?</p><h2>O primeiro passo para cuidar do seu sorriso começa aqui.</h2></div>
        <div className={styles.contactActions}><a className={styles.primaryButton} href={whatsapp} target="_blank" rel="noreferrer"><Phone size={20} weight="bold" /> Falar no WhatsApp</a><p>(19) 99791-6964<br />Rua José Estanislau de Oliveira, 926<br />Centro, São Pedro, SP</p></div>
      </section>

      <footer className={styles.footer}><span>Clínica Pollyany Policarpo · CRO-SP 36541</span><a href="https://www.instagram.com/clinicapollyanypolicarpo/" target="_blank" rel="noreferrer">@clinicapollyanypolicarpo</a></footer>
    </main>
  );
}
