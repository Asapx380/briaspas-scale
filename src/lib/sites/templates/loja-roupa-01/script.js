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
// ==================== NAVIGATION MENU ====================
const navMenu = document.getElementById('nav-menu');
const navToggle = document.getElementById('nav-toggle');
const navClose = document.getElementById('nav-close');
const navLinks = document.querySelectorAll('.nav__link');

// Show menu
if (navToggle) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.add('show-menu');
    });
}

// Hide menu
if (navClose) {
    navClose.addEventListener('click', () => {
        navMenu.classList.remove('show-menu');
    });
}

// Close menu when clicking on nav links
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('show-menu');
    });
});

// ==================== ACTIVE LINK ON SCROLL ====================
const sections = document.querySelectorAll('section[id]');

function scrollActive() {
    const scrollY = window.pageYOffset;

    sections.forEach(current => {
        const sectionHeight = current.offsetHeight;
        const sectionTop = current.offsetTop - 100;
        const sectionId = current.getAttribute('id');
        const link = document.querySelector('.nav__link[href*=' + sectionId + ']');

        if (link) {
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                link.classList.add('active-link');
            } else {
                link.classList.remove('active-link');
            }
        }
    });
}

window.addEventListener('scroll', scrollActive);

// ==================== HEADER SHADOW ON SCROLL ====================
function scrollHeader() {
    const header = document.getElementById('header');
    if (this.scrollY >= 50) {
        header.style.boxShadow = '0 4px 12px rgba(190, 24, 93, 0.1)';
    } else {
        header.style.boxShadow = '0 2px 8px rgba(190, 24, 93, 0.08)';
    }
}

window.addEventListener('scroll', scrollHeader);

// ==================== FAQ ACCORDION ====================
const faqItems = document.querySelectorAll('.faq__item');

faqItems.forEach(item => {
    const question = item.querySelector('.faq__question');

    question.addEventListener('click', () => {
        // Close all other items
        faqItems.forEach(otherItem => {
            if (otherItem !== item) {
                otherItem.classList.remove('active');
            }
        });

        // Toggle current item
        item.classList.toggle('active');
    });
});

// ==================== SCROLL TO TOP BUTTON ====================
const scrollTop = document.getElementById('scroll-top');

function toggleScrollTop() {
    if (this.scrollY >= 400) {
        scrollTop.classList.add('show');
    } else {
        scrollTop.classList.remove('show');
    }
}

window.addEventListener('scroll', toggleScrollTop);

scrollTop.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// ==================== SMOOTH SCROLL FOR ALL LINKS ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));

        if (target) {
            const headerOffset = 70;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ==================== ANIMATION ON SCROLL ====================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('aos-animate');
        }
    });
}, observerOptions);

// Observe all elements with data-aos attribute
const animatedElements = document.querySelectorAll('[data-aos]');
animatedElements.forEach(el => observer.observe(el));

// ==================== GALLERY MODAL ====================
const galleryItems = document.querySelectorAll('.galeria__item');

galleryItems.forEach(item => {
    item.addEventListener('click', () => {
        const img = item.querySelector('.galeria__img');
        if (img) {
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'gallery-modal';
            modal.innerHTML = `
                <div class="gallery-modal__overlay"></div>
                <div class="gallery-modal__content">
                    <button class="gallery-modal__close">
                        <i class="fas fa-times"></i>
                    </button>
                    <img src="${img.src}" alt="${img.alt}" class="gallery-modal__img">
                </div>
            `;

            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';

            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .gallery-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIn 0.3s ease;
                }

                .gallery-modal__overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.9);
                    cursor: pointer;
                }

                .gallery-modal__content {
                    position: relative;
                    max-width: 90%;
                    max-height: 90%;
                    z-index: 1001;
                }

                .gallery-modal__img {
                    max-width: 100%;
                    max-height: 90vh;
                    border-radius: 8px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                }

                .gallery-modal__close {
                    position: absolute;
                    top: -40px;
                    right: 0;
                    width: 40px;
                    height: 40px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 2px solid white;
                    border-radius: 50%;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .gallery-modal__close:hover {
                    background: #be185d;
                    transform: rotate(90deg);
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);

            // Close modal handlers
            const closeModal = () => {
                modal.remove();
                style.remove();
                document.body.style.overflow = '';
            };

            modal.querySelector('.gallery-modal__overlay').addEventListener('click', closeModal);
            modal.querySelector('.gallery-modal__close').addEventListener('click', closeModal);

            // Close on ESC key
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        }
    });
});

// ==================== COUNTER ANIMATION ====================
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);

    const updateCounter = () => {
        start += increment;
        if (start < target) {
            element.textContent = Math.ceil(start);
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target;
        }
    };

    updateCounter();
}

// Animate stats when they come into view
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumber = entry.target.querySelector('.hero__stat-number');
            const text = statNumber.textContent;
            const number = parseInt(text.replace(/\D/g, ''));

            if (number && !entry.target.dataset.animated) {
                entry.target.dataset.animated = 'true';
                const suffix = text.includes('+') ? '+' : (text.includes('%') ? '%' : '');

                let counter = 0;
                const duration = 2000;
                const increment = number / (duration / 16);

                const updateCounter = () => {
                    counter += increment;
                    if (counter < number) {
                        statNumber.textContent = Math.ceil(counter) + suffix;
                        requestAnimationFrame(updateCounter);
                    } else {
                        statNumber.textContent = number + suffix;
                    }
                };

                updateCounter();
            }
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.hero__stat').forEach(stat => {
    statsObserver.observe(stat);
});

// ==================== LOADING ANIMATION ====================
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});

// ==================== CATEGORY CARD TILT EFFECT ====================
const categoryCards = document.querySelectorAll('.categoria__card');

categoryCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transition = 'transform 0.1s ease';
    });

    card.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;

        this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', function() {
        this.style.transition = 'transform 0.3s ease';
        this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
});

// ==================== TESTIMONIAL CARDS HOVER EFFECT ====================
const testimonialCards = document.querySelectorAll('.depoimento__card');

testimonialCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        testimonialCards.forEach(otherCard => {
            if (otherCard !== card) {
                otherCard.style.opacity = '0.7';
                otherCard.style.transform = 'scale(0.95)';
            }
        });
    });

    card.addEventListener('mouseleave', function() {
        testimonialCards.forEach(otherCard => {
            otherCard.style.opacity = '1';
            otherCard.style.transform = 'scale(1)';
        });
    });
});

// ==================== PARALLAX EFFECT ON HERO ====================
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');

    if (hero && scrolled < window.innerHeight) {
        hero.style.backgroundPositionY = scrolled * 0.5 + 'px';
    }
});

// ==================== ADD HOVER SOUND EFFECT (OPTIONAL) ====================
function addHoverEffect() {
    const interactiveElements = document.querySelectorAll('.btn, .categoria__card, .diferencial__card, .nav__link');

    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
    });
}

addHoverEffect();

// ==================== PREVENT ORPHAN WORDS IN TITLES ====================
function preventOrphans() {
    const titles = document.querySelectorAll('h1, h2, h3, .hero__title, .section__title');

    titles.forEach(title => {
        const words = title.innerHTML.split(' ');
        if (words.length > 2) {
            const lastTwoWords = words.slice(-2).join('&nbsp;');
            const firstWords = words.slice(0, -2).join(' ');
            title.innerHTML = firstWords + ' ' + lastTwoWords;
        }
    });
}

preventOrphans();

// ==================== LAZY LOADING OPTIMIZATION ====================
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.style.opacity = '0';
                img.style.transition = 'opacity 0.5s ease';

                if (img.complete) {
                    img.style.opacity = '1';
                } else {
                    img.addEventListener('load', () => {
                        img.style.opacity = '1';
                    });
                }

                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img').forEach(img => {
        imageObserver.observe(img);
    });
}

// ==================== CONSOLE MESSAGE ====================
console.log('%c✨ Bella Moda - Boutique de Moda Feminina ✨', 'color: #be185d; font-size: 20px; font-weight: bold;');
console.log('%cSite desenvolvido com carinho e atenção aos detalhes.', 'color: #6b7280; font-size: 12px;');

// ==================== ACCESSIBILITY IMPROVEMENTS ====================
// Add keyboard navigation for FAQ
faqItems.forEach((item, index) => {
    const question = item.querySelector('.faq__question');
    question.setAttribute('role', 'button');
    question.setAttribute('aria-expanded', 'false');
    question.setAttribute('tabindex', '0');

    question.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            question.click();
            question.setAttribute('aria-expanded', item.classList.contains('active'));
        }
    });
});

// Add aria labels to social links
document.querySelectorAll('.footer__social-link, .contato__social-link').forEach(link => {
    const icon = link.querySelector('i');
    if (icon) {
        const platform = icon.className.split('fa-')[1];
        link.setAttribute('aria-label', `Visite nosso ${platform}`);
    }
});

// ==================== PERFORMANCE MONITORING ====================
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('⚡ Performance:', {
                'Tempo de carregamento': (perfData.loadEventEnd - perfData.fetchStart).toFixed(0) + 'ms',
                'DOM pronto': (perfData.domContentLoadedEventEnd - perfData.fetchStart).toFixed(0) + 'ms'
            });
        }, 0);
    });
}

/* Briaspas Scale: adapta dados verificados sem alterar os arquivos originais. */
(function () {
  const data = {
    name: "{{business_name_js}}", category: "{{category_js}}", headline: "{{headline_js}}",
    summary: "{{subheadline_js}}", about: "{{about_text_js}}", address: "{{address_js}}",
    phone: "{{phone_display_js}}", whatsapp: "{{whatsapp_url_js}}", maps: "{{google_maps_url_js}}",
    heroImage: "{{hero_image_url_js}}", aliases: ["Bella Moda","BellaModa"]
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
