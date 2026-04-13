// Main JavaScript file for the academic website

// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    // Single source of truth for footer text across all pages.
    const FOOTER_OWNER = 'Muyi Zhu';
    const FOOTER_YEAR = '2026';

    function syncFooterCopyright() {
        const footerText = `© ${FOOTER_YEAR} ${FOOTER_OWNER}. All rights reserved.`;
        const footerParagraphs = document.querySelectorAll('.footer .footer-content p');
        footerParagraphs.forEach(p => {
            p.textContent = footerText;
        });
    }

    syncFooterCopyright();

    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });

        // Close mobile menu when clicking on a link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }

    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 100; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Scroll effects
    const sections = document.querySelectorAll('section');
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });

    // Tooltip functionality
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getAttribute('data-tooltip');
            document.body.appendChild(tooltip);

            const rect = this.getBoundingClientRect();
            tooltip.style.position = 'absolute';
            tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            tooltip.style.zIndex = '1000';
        });

        element.addEventListener('mouseleave', function() {
            const tooltips = document.querySelectorAll('.tooltip');
            tooltips.forEach(tooltip => tooltip.remove());
        });
    });

    // Contact info click-to-copy
    const contactLinks = document.querySelectorAll('.contact-link');
    contactLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.href.startsWith('mailto:')) {
                return; // Don't copy email links
            }
            
            e.preventDefault();
            const text = this.textContent;
            
            // Create temporary input to copy text
            const tempInput = document.createElement('input');
            tempInput.value = text;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            
            // Show feedback
            const originalText = this.textContent;
            this.textContent = 'Copied!';
            this.style.color = '#10b981';
            
            setTimeout(() => {
                this.textContent = originalText;
                this.style.color = '';
            }, 2000);
        });
    });

    // Counter animation for statistics
    const statNumbers = document.querySelectorAll('.stat-item h3');
    const statObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalNumber = parseInt(target.textContent);
                let currentNumber = 0;
                const increment = finalNumber / 50;
                
                const timer = setInterval(() => {
                    currentNumber += increment;
                    if (currentNumber >= finalNumber) {
                        target.textContent = finalNumber + '+';
                        clearInterval(timer);
                    } else {
                        target.textContent = Math.floor(currentNumber) + '+';
                    }
                }, 30);
                
                statObserver.unobserve(target);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(stat => {
        statObserver.observe(stat);
    });

    // Scroll to top button
    const scrollTopBtn = document.createElement('button');
    scrollTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    scrollTopBtn.className = 'scroll-top-btn';
    scrollTopBtn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: var(--theme-accent);
        color: var(--theme-primary-deep);
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        z-index: 1000;
    `;
    
    document.body.appendChild(scrollTopBtn);

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    scrollTopBtn.addEventListener('mouseenter', function() {
        this.style.background = 'var(--theme-accent-deep)';
        this.style.transform = 'scale(1.1)';
    });

    scrollTopBtn.addEventListener('mouseleave', function() {
        this.style.background = 'var(--theme-accent)';
        this.style.transform = 'scale(1)';
    });

    // Show/hide scroll to top button
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollTopBtn.style.display = 'flex';
        } else {
            scrollTopBtn.style.display = 'none';
        }
    });

    // Dynamically load News and Publications from separate pages so content stays in one place
    (function loadExternalSections() {
        // Helper to fetch HTML and parse. Use no-store + timestamp to avoid stale cache.
        async function fetchDocument(url) {
            const parser = new DOMParser();
            const resolvedUrl = new URL(url, window.location.href);
            const cacheBypassUrl = new URL(resolvedUrl.toString());
            cacheBypassUrl.searchParams.set('_ts', Date.now().toString());
            const candidates = [cacheBypassUrl.toString(), resolvedUrl.toString()];

            for (const candidate of candidates) {
                try {
                    const res = await fetch(candidate, {
                        credentials: 'same-origin',
                        cache: 'no-store'
                    });
                    if (!res.ok) continue;
                    const html = await res.text();
                    return parser.parseFromString(html, 'text/html');
                } catch (err) {
                    continue;
                }
            }

            return null;
        }

        // Load News: replace homepage .news-list with items from news.html .news-list
        const homeNewsList = document.querySelector('.news-section .news-list');
        if (homeNewsList) {
            fetchDocument('news.html').then(doc => {
                if (!doc) return;
                const sourceNewsList = doc.querySelector('.news-timeline .news-list') || doc.querySelector('.news-list');
                if (!sourceNewsList) return;
                const items = Array.from(sourceNewsList.querySelectorAll('.news-item'));
                // Keep top 6 items on homepage
                const topItems = items.slice(0, 6);
                if (!topItems.length) return;
                homeNewsList.innerHTML = '';
                topItems.forEach(item => homeNewsList.appendChild(item.cloneNode(true)));
            });
        }

        // Load Publications: take cards from publications.html and show top 3 (ongoing first)
        const homePubList = document.querySelector('.publications-section .publications-list');
        if (homePubList) {
            fetchDocument('publications.html').then(doc => {
                if (!doc) return;
                // Collect all publication cards across year sections
                const cards = Array.from(doc.querySelectorAll('.publication-card'));
                if (!cards.length) return;
                // Sort: ongoing (has data-status) first, then by data-date desc
                const sorted = cards.sort((a, b) => {
                    const aOngoing = a.hasAttribute('data-status');
                    const bOngoing = b.hasAttribute('data-status');
                    if (aOngoing && !bOngoing) return -1;
                    if (!aOngoing && bOngoing) return 1;
                    const aDate = a.getAttribute('data-date') || '0000.00.00';
                    const bDate = b.getAttribute('data-date') || '0000.00.00';
                    return bDate.localeCompare(aDate);
                });
                const top = sorted.slice(0, 3);
                if (!top.length) return;
                homePubList.innerHTML = '';
                top.forEach(card => homePubList.appendChild(card.cloneNode(true)));
            });
        }
    })();
});

// Add CSS for tooltip
const tooltipCSS = `
    .tooltip {
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.9rem;
        pointer-events: none;
        white-space: nowrap;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }
    
    .tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: #333 transparent transparent transparent;
    }
`;

// Inject tooltip CSS
if (!document.querySelector('#tooltip-styles')) {
    const style = document.createElement('style');
    style.id = 'tooltip-styles';
    style.textContent = tooltipCSS;
    document.head.appendChild(style);
}
