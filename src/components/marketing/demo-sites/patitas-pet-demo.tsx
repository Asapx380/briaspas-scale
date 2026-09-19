import { Dog, Heart, Scissors, ShoppingBag } from "@phosphor-icons/react/dist/ssr";
import styles from "./patitas-pet-demo.module.css";

export function PatitasPetDemo() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>Patitas</span>
        <nav aria-label="Navegação do site demonstrativo">
          <a href="#servicos">Serviços</a>
          <a href="#loja">Loja</a>
          <a href="#contato">Contato</a>
        </nav>
        <span className={styles.chip}>Vitória, ES</span>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>Dados demonstrativos</p>
        <h2 className={styles.heroTitle}>Cuidado completo para o seu pet, perto de você.</h2>
        <p className={styles.heroText}>
          Banho, tosa, consultório veterinário parceiro e produtos selecionados — exemplo fictício para prospecção.
        </p>
        <a className={styles.cta} href="#contato">
          Agendar banho e tosa
        </a>
      </section>

      <section className={styles.services} id="servicos">
        <h3 className={styles.sectionTitle}>Serviços</h3>
        <ul className={styles.grid}>
          <li>
            <Scissors size={28} weight="duotone" aria-hidden />
            <strong>Tosa premium</strong>
            <span>Agendamento com horários demonstrativos.</span>
          </li>
          <li>
            <Dog size={28} weight="duotone" aria-hidden />
            <strong>Day care</strong>
            <span>Monitoramento e brincadeiras supervisionadas.</span>
          </li>
          <li>
            <Heart size={28} weight="duotone" aria-hidden />
            <strong>Bem-estar</strong>
            <span>Checklist de pele, pelos e hidratação.</span>
          </li>
        </ul>
      </section>

      <section className={styles.store} id="loja">
        <div>
          <h3 className={styles.sectionTitle}>Loja demonstrativa</h3>
          <p className={styles.storeText}>Rações, brinquedos e acessórios — valores apenas ilustrativos.</p>
        </div>
        <ShoppingBag size={40} weight="duotone" className={styles.storeIcon} aria-hidden />
      </section>

      <footer className={styles.footer} id="contato">
        <p>Patitas Pet Shop · Av. Exemplo, 1200 · (27) 3000-0000</p>
        <p className={styles.footerNote}>Empresa fictícia para demonstração do produto Briaspas Scale.</p>
      </footer>
    </div>
  );
}
