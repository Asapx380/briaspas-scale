import { Calculator, ChartLineUp, EnvelopeSimple, UsersThree } from "@phosphor-icons/react/dist/ssr";
import styles from "./norte-contabil-demo.module.css";

export function NorteContabilDemo() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>Norte Contábil</span>
        <span className={styles.chip}>Florianópolis, SC</span>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>Dados demonstrativos</p>
        <h2 className={styles.heroTitle}>Contabilidade clara para MEI, PME e profissionais liberais.</h2>
        <p className={styles.heroText}>
          Exemplo fictício de site institucional — indicadores e depoimentos abaixo não representam clientes reais.
        </p>
      </section>

      <section className={styles.stats} aria-label="Indicadores demonstrativos">
        <div>
          <ChartLineUp size={26} weight="duotone" aria-hidden />
          <strong>120+</strong>
          <span>Empresas fictícias atendidas</span>
        </div>
        <div>
          <UsersThree size={26} weight="duotone" aria-hidden />
          <strong>15</strong>
          <span>Anos de história simulada</span>
        </div>
        <div>
          <Calculator size={26} weight="duotone" aria-hidden />
          <strong>48h</strong>
          <span>Prazo ilustrativo de retorno</span>
        </div>
      </section>

      <section className={styles.services}>
        <h3 className={styles.sectionTitle}>Serviços</h3>
        <ul className={styles.list}>
          <li>Abertura e regularização de MEI</li>
          <li>Folha de pagamento e eSocial demonstrativo</li>
          <li>Planejamento tributário para PME</li>
        </ul>
      </section>

      <section className={styles.contact}>
        <div>
          <h3 className={styles.sectionTitle}>Fale conosco</h3>
          <p className={styles.contactText}>Formulário ilustrativo — nenhuma mensagem é enviada.</p>
        </div>
        <form className={styles.form} aria-label="Formulário demonstrativo">
          <label>
            Nome
            <input type="text" name="nome" autoComplete="off" placeholder="Exemplo Silva" readOnly />
          </label>
          <label>
            E-mail
            <input type="email" name="email" autoComplete="off" placeholder="contato@exemplo.com" readOnly />
          </label>
          <button type="button" className={styles.submit}>
            <EnvelopeSimple size={18} weight="bold" aria-hidden />
            Enviar (demonstração)
          </button>
        </form>
      </section>

      <footer className={styles.footer}>
        <p>Norte Contábil Assessoria · SC-401, km 0 (fictício) · (48) 3200-0000</p>
        <p className={styles.footerNote}>Conteúdo demonstrativo — não constitui serviço contábil real.</p>
      </footer>
    </div>
  );
}
