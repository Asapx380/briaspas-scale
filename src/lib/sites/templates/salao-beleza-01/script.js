/* Briaspas Scale: executa antes do JavaScript legado. */
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const items = {{services_json_js}};
    document.querySelectorAll('[class*="stat"],[class*="numero"],[class*="number"],[class*="badge"],[class*="counter"]').forEach(function (element) { element.remove(); });
    const about = document.querySelector('#sobre,#about,[class~="sobre"],[class~="about"]');
    if (about) {
      const paragraphs = Array.from(about.querySelectorAll("p"));
      paragraphs.forEach(function (paragraph, index) { if (index === 0) paragraph.textContent = "{{about_text_js}}"; else paragraph.remove(); });
      about.querySelectorAll('ul,[class*="feature"],[class*="diferencial"],[class*="credential"],[class*="certific"],[class*="qualification"]').forEach(function (element) { element.remove(); });
    }
    const services = document.querySelector('#servicos,#services,[class~="servicos"],[class~="services"]');
    if (services) {
      const cards = Array.from(services.querySelectorAll('.servico-card,.service-card,.servico__card,.service__card'));
      cards.forEach(function (card, index) {
        const item = items[index]; if (!item) { card.remove(); return; }
        const title = card.querySelector('h3,h4,[class*="title"]'); const description = card.querySelector('p,[class*="description"]');
        if (title) title.textContent = item.nome; if (description) description.textContent = item.microbeneficio;
        card.querySelectorAll('ul,[class*="price"],[class*="preco"],[class*="preço"]').forEach(function (element) { element.remove(); });
        Array.from(card.querySelectorAll('*')).forEach(function (element) { if (!element.children.length && /R\$|a partir de|incluso no plano|garantid[oa]/i.test(element.textContent || "")) element.remove(); });
      });
    }
    document.querySelectorAll("h3,h4,strong").forEach(function (label) {
      const text = label.textContent || ""; const box = label.closest('[class*="detail"],[class*="item"],[class*="card"],li,div'); if (!box) return;
      if (/endereco|endereço|localização/i.test(text)) { const values = Array.from(box.querySelectorAll("p")); if (values[0]) values[0].textContent = "{{address_js}}"; values.slice(1).forEach(function (value) { value.remove(); }); }
      if (/horário|funcionamento/i.test(text)) box.remove();
    });
    document.querySelectorAll("img").forEach(function (image) { if (/images\.unsplash\.com/.test(image.src) && "{{hero_image_url_js}}") { image.src = "{{hero_image_url_js}}"; image.alt = "Imagem representativa de {{category_js}}"; } });
  });
})();
/**
 * =====================================================
 * STUDIO HAIR & BEAUTY - SALÃO DE BELEZA / BARBER SHOP
 * Script Principal
 * =====================================================
 *
 * Este arquivo contém todas as funcionalidades JavaScript
 * da landing page, incluindo:
 * - Menu mobile (hambúrguer)
 * - Scroll suave para âncoras
 * - Acordeão do FAQ
 * - Animações de scroll
 * - Integração com WhatsApp
 *
 * ÍNDICE:
 * 1. Menu Mobile
 * 2. Scroll Suave
 * 3. FAQ Acordeão
 * 4. Header Scroll Effect
 * 5. Animações de Entrada
 * 6. Link WhatsApp
 * 7. Mapa Placeholder
 *
 * =====================================================
 */

// Aguarda o DOM estar completamente carregado
document.addEventListener('DOMContentLoaded', function() {

    /* =====================================================
       1. MENU MOBILE (HAMBÚRGUER)
       =====================================================
       Controla a abertura e fechamento do menu em dispositivos móveis.
       O menu é ativado ao clicar no botão hambúrguer.
    */

    // Seleciona os elementos do menu
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    // Verifica se os elementos existem antes de adicionar eventos
    if (navToggle && navMenu) {

        // Toggle do menu ao clicar no hambúrguer
        navToggle.addEventListener('click', function() {
            // Adiciona/remove a classe 'active' em ambos os elementos
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Fecha o menu ao clicar em qualquer link
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        // Fecha o menu ao clicar fora dele
        document.addEventListener('click', function(e) {
            // Verifica se o clique foi fora do menu e do botão
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }

    /* =====================================================
       2. SCROLL SUAVE
       =====================================================
       Implementa rolagem suave ao clicar em links de âncora.
       Leva em conta a altura do header fixo.
    */

    // Seleciona todos os links que começam com #
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // Ignora links que são apenas "#"
            if (href !== '#') {
                e.preventDefault();

                // Encontra o elemento alvo
                const target = document.querySelector(href);

                if (target) {
                    // Calcula a altura do header para compensar
                    const headerHeight = document.querySelector('.header').offsetHeight;

                    // Calcula a posição final (posição do elemento - altura do header)
                    const targetPosition = target.offsetTop - headerHeight;

                    // Executa o scroll suave
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    /* =====================================================
       3. FAQ ACORDEÃO
       =====================================================
       Controla a expansão/colapso das perguntas frequentes.
       Apenas uma pergunta pode estar aberta por vez.
    */

    // Seleciona todos os itens do FAQ
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        // Seleciona o botão da pergunta dentro do item
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', function() {
            // Verifica se este item já está ativo
            const isActive = item.classList.contains('active');

            // Fecha todos os outros itens primeiro
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });

            // Se não estava ativo, abre este item
            // Se já estava ativo, fica fechado (pois foi removido acima)
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    /* =====================================================
       4. HEADER SCROLL EFFECT
       =====================================================
       Adiciona efeito de sombra no header ao rolar a página.
       Cria sensação de profundidade e destaca o header.
    */

    const header = document.getElementById('header');
    let lastScroll = 0;

    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;

        // Aumenta a sombra quando rola mais de 100px
        if (currentScroll > 100) {
            header.style.boxShadow = '0 4px 20px rgba(212, 175, 55, 0.25)';
        } else {
            header.style.boxShadow = '0 4px 20px rgba(212, 175, 55, 0.15)';
        }

        lastScroll = currentScroll;
    });

    /* =====================================================
       5. ANIMAÇÕES DE ENTRADA (SCROLL)
       =====================================================
       Anima elementos quando entram na viewport durante o scroll.
       Usa Intersection Observer para performance otimizada.
    */

    // Configurações do Intersection Observer
    const observerOptions = {
        root: null,           // Usa a viewport como root
        rootMargin: '0px',    // Sem margem adicional
        threshold: 0.1        // Dispara quando 10% do elemento está visível
    };

    // Cria o observer
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            // Adiciona classe quando o elemento entra na viewport
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
            }
        });
    }, observerOptions);

    // Seleciona todos os elementos que devem ser animados
    const animateElements = document.querySelectorAll(
        '.servico-card, .destaque-card, .beneficio-card, .depoimento-card, .faq-item, .feature'
    );

    // Configura os estilos iniciais e observa cada elemento
    animateElements.forEach(el => {
        // Estado inicial: invisível e deslocado para baixo
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';

        // Registra o elemento no observer
        observer.observe(el);
    });

    // Aplica a animação quando o elemento recebe a classe 'in-view'
    document.addEventListener('scroll', function() {
        animateElements.forEach(el => {
            if (el.classList.contains('in-view')) {
                // Estado final: visível e na posição correta
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }
        });
    });

    // Dispara um scroll inicial para animar elementos já visíveis
    setTimeout(() => {
        window.dispatchEvent(new Event('scroll'));
    }, 100);

    /* =====================================================
       6. LINK WHATSAPP COM MENSAGEM PADRÃO
       =====================================================
       Adiciona automaticamente uma mensagem padrão aos links
       do WhatsApp, facilitando o primeiro contato.
    */

    // EDITÁVEL: Altere a mensagem padrão aqui
    const whatsappLinks = document.querySelectorAll('a[href*="wa.me"]');
    const defaultMessage = encodeURIComponent(
        'Olá! Gostaria de agendar um horário no Studio Hair & Beauty.'
    );

    // Adiciona a mensagem padrão se não houver uma
    whatsappLinks.forEach(link => {
        const currentHref = link.getAttribute('href');
        if (!currentHref.includes('text=')) {
            link.setAttribute('href', `${currentHref}?text=${defaultMessage}`);
        }
    });

    /* =====================================================
       7. MAPA PLACEHOLDER CLICK
       =====================================================
       Abre o Google Maps ao clicar no placeholder do mapa.
       EDITÁVEL: Altere o endereço na URL abaixo.
    */

    const mapaPlaceholder = document.querySelector('.mapa-placeholder');

    if (mapaPlaceholder) {
        mapaPlaceholder.addEventListener('click', function() {
            // EDITÁVEL: Altere o endereço aqui
            const mapsUrl = '{{google_maps_url_js}}';
            window.open(mapsUrl, '_blank');
        });
    }

});

/* =====================================================
   FIM DO SCRIPT
   =====================================================

   DICAS PARA EDIÇÃO:

   1. Para alterar o número do WhatsApp, edite no HTML
      os links que contêm "{{whatsapp_url_js}}"

   2. Para alterar a mensagem padrão do WhatsApp,
      modifique a variável 'defaultMessage' na seção 6

   3. Para alterar o endereço do mapa, modifique
      a variável 'mapsUrl' na seção 7

   4. Para adicionar mais animações, adicione
      seletores na seção 5 (animateElements)

   ===================================================== */


/* Briaspas Scale: adapta dados verificados sem alterar os arquivos originais. */
(function () {
  const data = {
    name: "{{business_name_js}}", category: "{{category_js}}", headline: "{{headline_js}}",
    summary: "{{subheadline_js}}", about: "{{about_text_js}}", address: "{{address_js}}",
    phone: "{{phone_display_js}}", whatsapp: "{{whatsapp_url_js}}", maps: "{{google_maps_url_js}}",
    heroImage: "{{hero_image_url_js}}", aliases: ["Studio Hair & Beauty","Studio Hair"]
  };
  function applyVerifiedData() {
    document.title = data.name + " | " + data.category;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      let value = node.nodeValue || "";
      data.aliases.forEach(function (alias) { value = value.replace(new RegExp(alias.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&"), "gi"), data.name); });
      value = value.replace(/\(?\d{2}\)?\s*\d{4,5}[\s-]?\d{4}/g, data.phone);
      node.nodeValue = value;
    });
    const h1 = document.querySelector("h1"); if (h1) h1.textContent = data.headline;
    document.querySelectorAll('a[href*="wa.me"], a[href^="tel:"]').forEach(function (link) { link.href = data.whatsapp; link.target = "_blank"; link.rel = "noopener noreferrer"; });
    document.querySelectorAll("form").forEach(function (form) { form.addEventListener("submit", function (event) { event.preventDefault(); window.open(data.whatsapp, "_blank", "noopener"); }, true); });
    document.querySelectorAll('[class*="address"], [class*="endereco"], [class*="endereço"]').forEach(function (element) {
      const text = element.textContent || ""; if (/Rua|Avenida|Av\.|Endereço|Localização/i.test(text) && element.children.length < 2) element.textContent = data.address;
    });
    const hero = document.querySelector('[class*="hero"], #inicio, #home');
    if (hero && data.heroImage) {
      const image = hero.querySelector("img"); if (image) { image.src = data.heroImage; image.alt = data.name + " - imagem representativa de " + data.category; }
      const background = hero.querySelector('[style*="background-image"]'); if (background) background.style.backgroundImage = 'url("' + data.heroImage + '")';
    }
    const services = document.querySelector('#servicos, #services, [class~="servicos"], [class~="services"]');
    if (services && !services.querySelector(".briaspas-service-note")) { const note = document.createElement("p"); note.className = "briaspas-service-note"; note.textContent = "Serviços apresentados como possibilidades. Confirme disponibilidade diretamente pelo WhatsApp."; services.insertBefore(note, services.children[1] || null); }
    document.querySelectorAll('[class*="mapa-placeholder"], [class*="map-placeholder"], [class*="mapa__"]').forEach(function (map) { map.addEventListener("click", function (event) { event.preventDefault(); event.stopImmediatePropagation(); window.open(data.maps, "_blank", "noopener"); }, true); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyVerifiedData); else applyVerifiedData();
})();

(function () {
  function fixContactDetails() {
    document.querySelectorAll("h3,h4,strong").forEach(function (label) {
      const text = (label.textContent || "").trim();
      const box = label.closest('[class*="detail"], [class*="item"], [class*="card"], li, div');
      if (!box) return;
      if (/endereço|localização/i.test(text)) { const value = box.querySelector("p,span"); if (value && value !== label) value.textContent = "{{address_js}}"; }
      if (/horário/i.test(text)) box.remove();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fixContactDetails); else fixContactDetails();
})();

(function () {
  function removeUnverifiedClaims() {
    document.querySelectorAll('[class*="stat"], [class*="numero"], [class*="number"], [class*="badge"], [class*="counter"]').forEach(function (element) { element.remove(); });
    const about = document.querySelector('#sobre, #about, [class~="sobre"], [class~="about"]');
    if (about) { const paragraphs = Array.from(about.querySelectorAll("p")); paragraphs.forEach(function (paragraph, index) { if (index === 0) paragraph.textContent = "{{about_text_js}}"; else paragraph.remove(); }); }
    const contact = document.querySelector('#contato, #contact, [class~="contato"], [class~="contact"]');
    if (contact) { const intro = contact.querySelector("p"); if (intro) intro.textContent = "Use os dados verificados abaixo e confirme disponibilidade diretamente pelo WhatsApp."; }
    const footerDescription = document.querySelector('[class*="footer"][class*="description"], .footer-description');
    if (footerDescription) footerDescription.textContent = "Informações e contato de {{business_name_js}} em um só lugar.";
    document.querySelectorAll("img").forEach(function (image) { if (/images\.unsplash\.com/.test(image.src) && "{{hero_image_url_js}}") { image.src = "{{hero_image_url_js}}"; image.alt = "Imagem representativa de {{category_js}}"; } });
    document.querySelectorAll("body *").forEach(function (element) {
      if (element.children.length) return;
      if (/desconto|gr[aá]tis|gratuita|promo[cç][aã]o|casos resolvidos|taxa de sucesso|anos de experiência|clientes satisfeitos/i.test(element.textContent || "")) element.textContent = "Consulte condições pelo WhatsApp";
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", removeUnverifiedClaims); else removeUnverifiedClaims();
})();

(function () {
  function hardenTemplateContent() {
    const services = document.querySelector('#servicos, #services, [class~="servicos"], [class~="services"]');
    const items = {{services_json_js}};
    if (services) {
      const cards = Array.from(services.querySelectorAll('.servico-card,.service-card,.servico__card,.service__card'));
      cards.forEach(function (card, index) {
        const item = items[index];
        if (!item) { card.remove(); return; }
        const title = card.querySelector('h3,h4,[class*="title"]');
        const description = card.querySelector('p,[class*="description"]');
        if (title) title.textContent = item.nome;
        if (description) description.textContent = item.microbeneficio;
        card.querySelectorAll('ul,[class*="price"],[class*="preco"],[class*="preço"]').forEach(function (element) { element.remove(); });
        Array.from(card.querySelectorAll('*')).forEach(function (element) {
          if (!element.children.length && /R\$|a partir de|incluso no plano|garantid[oa]|\d+\s*(?:aulas?|dias?|meses?|anos?)/i.test(element.textContent || "")) element.remove();
        });
      });
    }
    const about = document.querySelector('#sobre, #about, [class~="sobre"], [class~="about"]');
    if (about) about.querySelectorAll('[class*="feature"],[class*="diferencial"],[class*="credential"],[class*="certific"],[class*="qualification"],[class*="stat"]').forEach(function (element) { element.remove(); });
    document.querySelectorAll('body *').forEach(function (element) {
      if (element.children.length) return;
      if (/CRO-|CRN-|CREF:|desde\s+\d{4}|há mais de \d+ anos/i.test(element.textContent || "")) element.textContent = "";
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hardenTemplateContent); else hardenTemplateContent();
})();
