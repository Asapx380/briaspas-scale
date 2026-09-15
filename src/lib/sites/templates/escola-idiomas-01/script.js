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
// ========== MOBILE MENU TOGGLE ==========
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Fechar menu ao clicar em um link
const navLinks = document.querySelectorAll('.nav-menu a');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// ========== HEADER SHADOW ON SCROLL ==========
const header = document.getElementById('header');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// ========== ACTIVE NAV LINK ON SCROLL ==========
const sections = document.querySelectorAll('section[id]');

function activateNavLink() {
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-menu a[href="#${sectionId}"]`);

        if (navLink) {
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLink.classList.add('active');
            } else {
                navLink.classList.remove('active');
            }
        }
    });
}

window.addEventListener('scroll', activateNavLink);

// ========== SMOOTH SCROLL NAVIGATION ==========
const scrollLinks = document.querySelectorAll('a[href^="#"]');

scrollLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');

        // Ignorar links vazios ou que não são âncoras de seção
        if (href === '#' || href === '#privacidade' || href === '#termos') {
            return;
        }

        e.preventDefault();

        const targetId = href.substring(1);
        const targetSection = document.getElementById(targetId);

        if (targetSection) {
            const headerHeight = header.offsetHeight;
            const targetPosition = targetSection.offsetTop - headerHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ========== FAQ ACCORDION ==========
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    question.addEventListener('click', () => {
        // Fechar outros itens
        faqItems.forEach(otherItem => {
            if (otherItem !== item && otherItem.classList.contains('active')) {
                otherItem.classList.remove('active');
            }
        });

        // Toggle item atual
        item.classList.toggle('active');
    });
});

// ========== SCROLL TO TOP BUTTON ==========
const scrollTopBtn = document.getElementById('scrollTop');

window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
        scrollTopBtn.classList.add('visible');
    } else {
        scrollTopBtn.classList.remove('visible');
    }
});

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// ========== COUNTER ANIMATION FOR STATS ==========
const statNumbers = document.querySelectorAll('.stat-number[data-target]');
let countersActivated = false;

function animateCounters() {
    if (countersActivated) return;

    const firstStat = statNumbers[0];
    const statPosition = firstStat.getBoundingClientRect().top;
    const screenPosition = window.innerHeight;

    if (statPosition < screenPosition) {
        countersActivated = true;

        statNumbers.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'));
            const duration = 2000; // 2 segundos
            const increment = target / (duration / 16); // 60 FPS
            let current = 0;

            const updateCounter = () => {
                current += increment;

                if (current < target) {
                    stat.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    stat.textContent = target;
                }
            };

            updateCounter();
        });
    }
}

window.addEventListener('scroll', animateCounters);
window.addEventListener('load', animateCounters);

// ========== INTERSECTION OBSERVER FOR ANIMATIONS ==========
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Elementos para animar
const animatedElements = document.querySelectorAll(`
    .servico-card,
    .destaque-card,
    .beneficio-card,
    .depoimento-card,
    .galeria-item,
    .sobre-content > *,
    .info-item
`);

animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// ========== PARALLAX EFFECT ON HERO ==========
const heroBackground = document.querySelector('.hero-background');

window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallaxSpeed = 0.5;

    if (heroBackground && scrolled < window.innerHeight) {
        heroBackground.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
    }
});

// ========== LAZY LOADING IMAGES ==========
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;

                // Se a imagem tiver data-src, carregá-la
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }

                imageObserver.unobserve(img);
            }
        });
    });

    // Observar todas as imagens
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));
}

// ========== ADD ANIMATION TO ELEMENTS ON LOAD ==========
window.addEventListener('load', () => {
    // Remover preloader se existir
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 300);
    }

    // Ativar animações iniciais
    document.body.classList.add('loaded');
});

// ========== PREVENT SCROLL RESTORATION ON PAGE RELOAD ==========
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// ========== ADICIONAR EFEITO DE HOVER NOS CARDS ==========
const cards = document.querySelectorAll('.servico-card, .destaque-card, .beneficio-card, .depoimento-card');

cards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transition = 'all 0.3s ease';
    });
});

// ========== ANALYTICS E TRACKING (PLACEHOLDER) ==========
// Aqui você pode adicionar código para Google Analytics, Facebook Pixel, etc.
// Exemplo:
// gtag('config', 'GA_MEASUREMENT_ID');

// ========== CONSOLE INFO ==========
console.log('%c🌍 Global Languages - Escola de Idiomas', 'color: #1e3a5f; font-size: 20px; font-weight: bold;');
console.log('%cDesenvolvido com dedicação para transformar vidas através dos idiomas', 'color: #f59e0b; font-size: 14px;');
console.log('%cVisite-nos: Av. Paulista, 1234 - São Paulo/SP', 'color: #64748b; font-size: 12px;');

// ========== SERVICE WORKER (OPCIONAL - PWA) ==========
// Descomente para adicionar suporte PWA
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registrado:', registration);
            })
            .catch(error => {
                console.log('Erro ao registrar Service Worker:', error);
            });
    });
}
*/

// ========== DARK MODE TOGGLE (OPCIONAL) ==========
// Descomente para adicionar suporte a modo escuro
/*
const darkModeToggle = document.getElementById('darkModeToggle');

if (darkModeToggle) {
    // Verificar preferência salva
    const darkMode = localStorage.getItem('darkMode');

    if (darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');

        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'enabled');
        } else {
            localStorage.setItem('darkMode', null);
        }
    });
}
*/

// ========== EASTER EGG ==========
// Pequeno easter egg para desenvolvedores curiosos
let konamiCode = [];
const konamiPattern = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

window.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);

    if (konamiCode.join(',') === konamiPattern.join(',')) {
        console.log('%c🎉 Você encontrou o Easter Egg!', 'color: #f59e0b; font-size: 24px; font-weight: bold;');
        console.log('%c🌍 Continue explorando e aprendendo idiomas!', 'color: #1e3a5f; font-size: 16px;');

        // Adicionar confetti ou algum efeito visual
        document.body.style.animation = 'rainbow 2s infinite';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 3000);
    }
});


/* Briaspas Scale: adapta dados verificados sem alterar os arquivos originais. */
(function () {
  const data = {
    name: "{{business_name_js}}", category: "{{category_js}}", headline: "{{headline_js}}",
    summary: "{{subheadline_js}}", about: "{{about_text_js}}", address: "{{address_js}}",
    phone: "{{phone_display_js}}", whatsapp: "{{whatsapp_url_js}}", maps: "{{google_maps_url_js}}",
    heroImage: "{{hero_image_url_js}}", aliases: ["Global Languages"]
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
