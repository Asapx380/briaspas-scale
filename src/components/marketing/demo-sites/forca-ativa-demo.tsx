import { Barbell, CalendarCheck, Lightning } from "@phosphor-icons/react/dist/ssr";
import styles from "./forca-ativa-demo.module.css";

const plans = [
  ["Plano Flex", "3x por semana · turmas demonstrativas"],
  ["Plano Total", "Musculação + funcional · horários estendidos"],
  ["Plano Família", "2 titulares · dependentes fictícios"],
];

export function ForcaAtivaDemo() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>Força Ativa</span>
        <span className={styles.chip}>Joinville, SC</span>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>Dados demonstrativos</p>
        <h2 className={styles.heroTitle}>Treino guiado, ambiente acolhedor, resultados no seu ritmo.</h2>
        <p className={styles.heroText}>
          Layout de exemplo para academias locais — horários, planos e modalidades são fictícios.
        </p>
        <a className={styles.cta} href="#planos">
          <CalendarCheck size={20} weight="bold" aria-hidden />
          Reservar aula experimental
        </a>
      </section>

      <section className={styles.modalities}>
        <h3 className={styles.sectionTitle}>Modalidades</h3>
        <ul className={styles.pills}>
          <li>
            <Barbell size={22} weight="duotone" aria-hidden />
            Musculação
          </li>
          <li>
            <Lightning size={22} weight="duotone" aria-hidden />
            HIIT
          </li>
          <li>Pilates</li>
          <li>Spinning</li>
        </ul>
      </section>

      <section className={styles.plans} id="planos">
        <h3 className={styles.sectionTitle}>Planos ilustrativos</h3>
        <ul className={styles.planGrid}>
          {plans.map(([name, desc]) => (
            <li key={name}>
              <strong>{name}</strong>
              <span>{desc}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className={styles.footer}>
        <p>Força Ativa Fitness · Rua Modelo, 450 · (47) 3100-0000</p>
        <p className={styles.footerNote}>Marca e endereço fictícios — apenas demonstração comercial.</p>
      </footer>
    </div>
  );
}
