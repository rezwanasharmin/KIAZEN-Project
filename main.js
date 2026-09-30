/* ==========================================================================
   KAIZEN // 改善 — MAIN INTERACTIVE & ANIMATION ENGINE
   ========================================================================== */

import confetti from 'canvas-confetti';

// --------------------------------------------------------------------------
// 1. SOUND EFFECTS SYNTHESIZER (WEB AUDIO API)
// --------------------------------------------------------------------------
class CyberAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.init();
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playClick() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  }

  playAddToCart() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc1.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.08); // E5
      osc1.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.16); // G5
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);
      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 0.35);
      osc2.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }

  playSwoosh() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {}
  }
}

const sfx = new CyberAudioEngine();

// --------------------------------------------------------------------------
// 2. CURRENCY CONVERSION ENGINE
// --------------------------------------------------------------------------
const CURRENCY_RATES = {
  AUD: { rate: 1.0, symbol: '$', suffix: ' AUD' },
  USD: { rate: 0.65, symbol: '$', suffix: ' USD' },
  EUR: { rate: 0.60, symbol: '€', suffix: ' EUR' },
  JPY: { rate: 98.0, symbol: '¥', suffix: ' JPY' },
  GBP: { rate: 0.51, symbol: '£', suffix: ' GBP' }
};

let currentCurrency = 'AUD';

function formatPrice(audAmount) {
  const { rate, symbol, suffix } = CURRENCY_RATES[currentCurrency];
  const converted = audAmount * rate;
  if (currentCurrency === 'JPY') {
    return `${symbol}${Math.round(converted).toLocaleString()}${suffix}`;
  }
  return `${symbol}${converted.toFixed(2)}${suffix}`;
}

let cartInstance = null;

function updateAllPricesOnPage() {
  document.querySelectorAll('[data-aud]').forEach(el => {
    const audVal = parseFloat(el.getAttribute('data-aud'));
    if (!isNaN(audVal)) {
      el.textContent = formatPrice(audVal);
    }
  });
  if (cartInstance && typeof cartInstance.render === 'function') {
    cartInstance.render();
  }
}

// --------------------------------------------------------------------------
// 3. HERO CANVAS 3D STAGE & WALKING HUMAN MODEL SCRUBBER
// --------------------------------------------------------------------------
class HeroCanvasStageScrubber {
  constructor() {
    this.stage = document.getElementById('hero');
    this.stage3d = document.getElementById('hero-3d-stage');
    this.canvasWrap = document.getElementById('hero-canvas-wrap');
    this.canvas = document.getElementById('hero-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d', { alpha: false }) : null;
    this.exitOverlay = document.getElementById('hero-exit-overlay');
    this.groundShadow = document.querySelector('.hero-model-ground-shadow');
    this.floorReflection = document.querySelector('.hero-floor-reflection');
    this.copyWrapper = document.getElementById('hero-copy');
    this.scrubPercentEl = document.getElementById('hero-scrub-percent');
    this.frameCounterEl = document.getElementById('hero-frame-counter');
    this.scrollPctEl = document.getElementById('hero-scroll-pct');
    this.fpsCounterEl = document.getElementById('hud-fps');

    this.frameCount = 40;
    this.frames = [];
    this.loadedCount = 0;
    this.targetFrame = 0;
    this.currentFrame = 0;
    this.lastRenderedFrame = -1;

    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.scroll = { progress: 0, targetProgress: 0 };

    // FPS measurement
    this.lastFrameTime = performance.now();
    this.framesRendered = 0;

    if (!this.stage || !this.canvas) return;
    this.init();
  }

  async init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Mouse movement for 3D stage depth tilt
    window.addEventListener('mousemove', (e) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      this.mouse.targetX = (e.clientX - halfW) / halfW;
      this.mouse.targetY = (e.clientY - halfH) / halfH;
    }, { passive: true });

    // Touch support for mobile 3D tilt
    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const halfW = window.innerWidth / 2;
        const halfH = window.innerHeight / 2;
        this.mouse.targetX = (touch.clientX - halfW) / halfW;
        this.mouse.targetY = (touch.clientY - halfH) / halfH;
      }
    }, { passive: true });

    // Load initial first frame immediately
    await this.loadFrame(0);
    this.renderFrame(0);

    // Preload remaining frames with priority milestones
    this.loadAllFrames();

    // Start 60fps render loop
    this.startLoop();
  }

  resizeCanvas() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.canvas.parentElement.clientWidth;
    const height = this.canvas.parentElement.clientHeight;

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.lastRenderedFrame = -1; // force redraw
    if (this.frames[Math.round(this.currentFrame)]) {
      this.renderFrame(Math.round(this.currentFrame));
    }
  }

  loadFrame(index) {
    return new Promise((resolve) => {
      const img = new Image();
      const numStr = String(index).padStart(3, '0');
      img.src = `/assets/hero-stage/f-${numStr}.webp`;
      img.onload = () => {
        this.frames[index] = img;
        this.loadedCount++;
        resolve(img);
      };
      img.onerror = () => {
        resolve(null);
      };
    });
  }

  async loadAllFrames() {
    // Milestones first for immediate responsiveness
    const milestones = [10, 20, 30, 39];
    for (const m of milestones) {
      if (!this.frames[m]) await this.loadFrame(m);
    }
    // Then rest in parallel chunks
    const batchSize = 6;
    for (let i = 1; i < this.frameCount; i += batchSize) {
      const batch = [];
      for (let j = i; j < i + batchSize && j < this.frameCount; j++) {
        if (!this.frames[j]) batch.push(this.loadFrame(j));
      }
      await Promise.all(batch);
    }
  }

  startLoop() {
    const loop = (timestamp) => {
      this.update(timestamp);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(timestamp) {
    if (!this.stage) return;

    // Calculate scroll progress through hero stage
    const rect = this.stage.getBoundingClientRect();
    const scrollDistance = rect.height - window.innerHeight;
    let progress = 0;
    if (scrollDistance > 0) {
      progress = Math.min(1, Math.max(0, -rect.top / scrollDistance));
    }
    this.scroll.targetProgress = progress;

    // Ultra-smooth Lerp for scroll & mouse
    this.scroll.progress += (this.scroll.targetProgress - this.scroll.progress) * 0.12;
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

    const p = this.scroll.progress;
    const mx = this.mouse.x;
    const my = this.mouse.y;

    // Frame mapping: 0 to 39 with smooth sub-frame lerp
    this.targetFrame = Math.min(this.frameCount - 1, Math.max(0, p * (this.frameCount - 1)));
    this.currentFrame += (this.targetFrame - this.currentFrame) * 0.14;
    const frameToDraw = Math.min(this.frameCount - 1, Math.max(0, Math.round(this.currentFrame)));

    if (frameToDraw !== this.lastRenderedFrame) {
      this.renderFrame(frameToDraw);
      this.lastRenderedFrame = frameToDraw;

      if (this.frameCounterEl) {
        this.frameCounterEl.textContent = `FRAME: ${frameToDraw.toString().padStart(2, '0')} / 39`;
      }
    }

    // 1. 3D Spatial Parallax Camera Push
    // As the human model walks forward, the 3D camera subtly pushes in
    if (this.canvasWrap) {
      const cameraDolly = 1 + p * 0.04;
      const rotY = mx * 4.5;
      const rotX = -my * 3.5;
      const transZ = p * 40;
      this.canvasWrap.style.transform = `
        perspective(1200px)
        rotateY(${rotY.toFixed(2)}deg)
        rotateX(${rotX.toFixed(2)}deg)
        translateZ(${transZ.toFixed(1)}px)
        scale(${cameraDolly.toFixed(3)})
      `;
    }

    // 2. 3D Stage Background Opposing Parallax
    if (this.stage3d) {
      this.stage3d.style.transform = `
        translate3d(${(-mx * 16).toFixed(1)}px, ${(-my * 8).toFixed(1)}px, -30px)
        rotateY(${(mx * 2.5).toFixed(2)}deg)
      `;
    }

    // 3. Dynamic Ground Shadow & Specular Floor Reflection
    if (this.groundShadow) {
      const stepOsc = Math.cos(p * Math.PI * 12);
      const shadowScale = 1 + p * 0.2 + stepOsc * 0.08;
      this.groundShadow.style.transform = `translateX(-50%) scaleX(${shadowScale.toFixed(2)})`;
      this.groundShadow.style.opacity = (0.75 + p * 0.25).toFixed(2);
    }
    if (this.floorReflection) {
      this.floorReflection.style.opacity = (0.5 + p * 0.4).toFixed(2);
    }

    // 4. Finishing Exit Transition into Next Section (#drop-reveal)
    // Between progress 0.80 and 1.0, smoothly fade in the exit vignette
    if (this.exitOverlay) {
      const exitProgress = Math.min(1, Math.max(0, (p - 0.80) / 0.20));
      this.exitOverlay.style.opacity = (exitProgress * 0.95).toFixed(3);
    }

    // 5. Update HUD Indicators
    const pctStr = `${Math.round(p * 100).toString().padStart(2, '0')}%`;
    if (this.scrubPercentEl) {
      this.scrubPercentEl.textContent = pctStr;
    }
    if (this.scrollPctEl) {
      this.scrollPctEl.textContent = `SCROLL: ${pctStr}`;
    }

    // 6. Dynamic Hero Copy Fade & Parallax
    if (this.copyWrapper) {
      const textProgress = Math.min(1, p / 0.42);
      const opacity = 1 - textProgress;
      const translateY = -textProgress * 55;
      const scale = 1 - textProgress * 0.08;
      this.copyWrapper.style.opacity = Math.max(0, opacity).toFixed(3);
      this.copyWrapper.style.transform = `translateY(${translateY.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      this.copyWrapper.style.pointerEvents = opacity < 0.2 ? 'none' : 'auto';
    }

    // Measure FPS
    this.framesRendered++;
    if (timestamp - this.lastFrameTime >= 1000) {
      if (this.fpsCounterEl) {
        this.fpsCounterEl.textContent = this.framesRendered;
      }
      this.framesRendered = 0;
      this.lastFrameTime = timestamp;
    }
  }

  renderFrame(index) {
    let img = this.frames[index];
    if (!img) {
      for (let offset = 1; offset < this.frameCount; offset++) {
        if (index - offset >= 0 && this.frames[index - offset]) {
          img = this.frames[index - offset];
          break;
        }
        if (index + offset < this.frameCount && this.frames[index + offset]) {
          img = this.frames[index + offset];
          break;
        }
      }
    }
    if (!img || !this.ctx || !this.canvas) return;

    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    // Aspect Cover positioning
    const scale = Math.max(cw / iw, ch / ih);
    const renderW = iw * scale;
    const renderH = ih * scale;
    const offsetX = (cw - renderW) / 2;
    const offsetY = (ch - renderH) * 0.4; // Center bias for walking human model

    this.ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
  }
}

// --------------------------------------------------------------------------
// 4. CIRCULAR ROTATING TEXT BADGE ("scroll text circule round all")
// --------------------------------------------------------------------------
class CircularScrollBadge {
  constructor() {
    this.badge = document.getElementById('circular-badge');
    this.svgWrap = this.badge ? this.badge.querySelector('.circular-badge__svg-wrap') : null;
    this.lastScrollY = window.scrollY;
    this.rotationAngle = 0;
    this.velocity = 0;

    if (!this.badge || !this.svgWrap) return;

    this.init();
  }

  init() {
    // Scroll velocity tracking loop
    const onScrollTick = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - this.lastScrollY;
      this.lastScrollY = currentScrollY;

      // Accelerate rotation proportional to scroll speed
      this.velocity += delta * 0.28;

      // Friction damping
      this.velocity *= 0.92;
      this.rotationAngle += this.velocity;

      // Apply transform smoothly on top of ambient CSS spin
      this.svgWrap.style.transform = `rotate(${this.rotationAngle.toFixed(2)}deg)`;

      requestAnimationFrame(onScrollTick);
    };
    requestAnimationFrame(onScrollTick);

    // Interactive Click: Smooth scroll to drops
    this.badge.addEventListener('click', () => {
      sfx.playSwoosh();
      const dropsSection = document.getElementById('drops-slider');
      if (dropsSection) {
        dropsSection.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // Hover sound
    this.badge.addEventListener('mouseenter', () => {
      sfx.playClick();
    });
  }
}

// --------------------------------------------------------------------------
// 5. HORIZONTAL DRAGGABLE PRODUCT SLIDER ("slider scroll imge change")
// --------------------------------------------------------------------------
class ProductSlider {
  constructor() {
    this.viewport = document.getElementById('slider-viewport');
    this.track = document.getElementById('slider-track');
    this.progressBar = document.getElementById('slider-progress-bar');
    this.prevBtn = document.getElementById('slider-prev-btn');
    this.nextBtn = document.getElementById('slider-next-btn');
    this.filterTabs = document.querySelectorAll('.filter-tab');

    if (!this.viewport) return;

    this.isDown = false;
    this.startX = 0;
    this.scrollLeft = 0;
    this.velocity = 0;

    this.init();
  }

  init() {
    // Mouse drag handling
    this.viewport.addEventListener('mousedown', (e) => {
      this.isDown = true;
      this.viewport.classList.add('is-dragging');
      this.startX = e.pageX - this.viewport.offsetLeft;
      this.scrollLeft = this.viewport.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
      this.isDown = false;
      this.viewport.classList.remove('is-dragging');
    });

    this.viewport.addEventListener('mousemove', (e) => {
      if (!this.isDown) return;
      e.preventDefault();
      const x = e.pageX - this.viewport.offsetLeft;
      const walk = (x - this.startX) * 1.6; // Scroll speed multiplier
      this.viewport.scrollLeft = this.scrollLeft - walk;
      this.updateProgress();
    });

    // Scroll progress update
    this.viewport.addEventListener('scroll', () => {
      this.updateProgress();
    });

    // Nav Arrows
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        sfx.playClick();
        this.viewport.scrollBy({ left: -340, behavior: 'smooth' });
      });
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        sfx.playClick();
        this.viewport.scrollBy({ left: 340, behavior: 'smooth' });
      });
    }

    // Category Filtering
    this.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        sfx.playClick();
        this.filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const filter = tab.dataset.filter;
        const cards = this.track.querySelectorAll('.product-card');

        cards.forEach(card => {
          if (filter === 'all' || card.dataset.category === filter) {
            card.style.display = 'flex';
            card.style.animation = 'fadeInCard 0.4s ease forwards';
          } else {
            card.style.display = 'none';
          }
        });

        this.updateProgress();
      });
    });

    // Card Hover audio & Size Pills
    this.track.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        sfx.playClick();
      });

      // Size selection on card
      const pills = card.querySelectorAll('.size-pill');
      pills.forEach(pill => {
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          if (pill.classList.contains('disabled')) return;
          sfx.playClick();
          pills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
        });
      });
    });
  }

  updateProgress() {
    const maxScroll = this.viewport.scrollWidth - this.viewport.clientWidth;
    if (maxScroll <= 0) {
      this.progressBar.style.width = '100%';
      return;
    }
    const percent = Math.min(100, Math.max(10, (this.viewport.scrollLeft / maxScroll) * 100));
    this.progressBar.style.width = `${percent}%`;
  }
}

// --------------------------------------------------------------------------
// 6. PINNED CARD SCROLL STACK ("scroll imge change")
// --------------------------------------------------------------------------
class PinnedCardStack {
  constructor() {
    this.deck = document.getElementById('scroll-stack-deck');
    this.slots = this.deck ? this.deck.querySelectorAll('.stack-card-slot') : [];

    if (!this.deck || this.slots.length === 0) return;

    this.init();
  }

  init() {
    const updateStackTransforms = () => {
      const vh = window.innerHeight;

      this.slots.forEach((slot, idx) => {
        const rect = slot.getBoundingClientRect();
        const card = slot.querySelector('.stack-card');
        if (!card) return;

        // Check if card has scrolled above sticky pin position
        const stickyTop = vh * 0.15;
        const diff = stickyTop - rect.top;

        if (diff > 0) {
          // As card scrolls past sticky pin, scale down and dim
          const progress = Math.min(1, diff / (vh * 0.6));
          const scale = 1 - (progress * 0.08); // 1.0 -> 0.92
          const brightness = 1 - (progress * 0.35); // 1.0 -> 0.65
          const translateY = -progress * 15;

          card.style.transform = `scale(${scale.toFixed(3)}) translateY(${translateY.toFixed(1)}px)`;
          card.style.filter = `brightness(${brightness.toFixed(2)})`;
        } else {
          card.style.transform = 'scale(1) translateY(0)';
          card.style.filter = 'brightness(1)';
        }
      });
    };

    window.addEventListener('scroll', updateStackTransforms, { passive: true });
    updateStackTransforms();
  }
}

// --------------------------------------------------------------------------
// 7. ARC LORE INTERACTIVE TABS
// --------------------------------------------------------------------------
class LoreArcExplorer {
  constructor() {
    this.buttons = document.querySelectorAll('.arc-btn');
    this.contents = document.querySelectorAll('.arc-content');

    if (!this.buttons.length) return;

    this.init();
  }

  init() {
    this.buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        sfx.playClick();
        const arcIndex = btn.dataset.arc;

        this.buttons.forEach(b => b.classList.remove('active'));
        this.contents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const activeContent = document.getElementById(`arc-content-${arcIndex}`);
        if (activeContent) {
          activeContent.classList.add('active');
        }
      });
    });
  }
}

// --------------------------------------------------------------------------
// 8. SHOPPING CART & E-COMMERCE SYSTEM
// --------------------------------------------------------------------------
class ShoppingCart {
  constructor() {
    cartInstance = this;
    this.items = [];
    this.discount = 0; // percentage
    this.freeShippingThreshold = 100.0; // AUD

    // DOM Elements
    this.overlay = document.getElementById('cart-drawer-overlay');
    this.drawer = document.getElementById('cart-drawer');
    this.openBtn = document.getElementById('open-cart-btn');
    this.closeBtn = document.getElementById('close-cart-btn');
    this.badge = document.getElementById('cart-badge-count');
    this.itemsBadge = document.getElementById('cart-items-count-badge');
    this.itemsList = document.getElementById('cart-items-list');
    this.emptyState = document.getElementById('cart-empty-state');
    this.subtotalDisplay = document.getElementById('cart-subtotal-display');
    this.checkoutBtn = document.getElementById('checkout-btn');
    this.promoInput = document.getElementById('promo-input');
    this.applyPromoBtn = document.getElementById('apply-promo-btn');
    this.promoMessage = document.getElementById('promo-message');
    this.shippingDiffEl = document.getElementById('shipping-diff-amount');
    this.shippingPercentEl = document.getElementById('shipping-percent-text');
    this.shippingBarEl = document.getElementById('shipping-fill-bar');

    this.init();
  }

  init() {
    // Open/Close Drawer
    if (this.openBtn) {
      this.openBtn.addEventListener('click', () => this.open());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });
    }

    const emptyShopBtn = document.getElementById('empty-shop-now-btn');
    if (emptyShopBtn) {
      emptyShopBtn.addEventListener('click', () => {
        this.close();
        document.getElementById('drops-slider')?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Promo code apply
    if (this.applyPromoBtn) {
      this.applyPromoBtn.addEventListener('click', () => {
        const code = this.promoInput.value.trim().toUpperCase();
        if (code === 'ZEN10' || code === 'KAIZEN10') {
          this.discount = 0.10;
          this.promoMessage.textContent = '✓ 10% ARCHIVE DISCOUNT APPLIED!';
          this.promoMessage.style.color = '#00ff66';
          sfx.playAddToCart();
        } else {
          this.promoMessage.textContent = '✕ INVALID PROMO CODE';
          this.promoMessage.style.color = '#ff334b';
          sfx.playClick();
        }
        this.render();
      });
    }

    // Checkout button with Confetti!
    if (this.checkoutBtn) {
      this.checkoutBtn.addEventListener('click', () => {
        if (this.items.length === 0) return;
        sfx.playAddToCart();
        
        // Confetti explosion celebration!
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#e60026', '#ffffff', '#ffb800', '#111116']
        });

        alert(`🎉 ORDER CONFIRMED!\n\nThank you for claiming from KAIZEN Drop 04.\nYour shipment is queued for dispatch from Sydney/Tokyo hub.\n\nTotal Paid: ${this.subtotalDisplay.textContent}`);
        this.items = [];
        this.discount = 0;
        if (this.promoInput) this.promoInput.value = '';
        if (this.promoMessage) this.promoMessage.textContent = '';
        this.render();
        this.close();
      });
    }

    // Hook up all Quick-Add buttons on cards and stack cards
    document.querySelectorAll('.quick-add-btn, .stack-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const productId = btn.dataset.product;
        const card = btn.closest('.product-card') || btn.closest('.stack-card');
        
        let size = 'M';
        if (card) {
          const activePill = card.querySelector('.size-pill.active');
          if (activePill) size = activePill.dataset.size;
        }

        this.addProductById(productId, size);
      });
    });

    this.render();
  }

  open() {
    sfx.playClick();
    this.overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  close() {
    sfx.playClick();
    this.overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  addProductById(productId, size = 'M', quantity = 1) {
    const productData = PRODUCT_CATALOG[productId];
    if (!productData) return;

    const existingIndex = this.items.findIndex(item => item.id === productId && item.size === size);

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += quantity;
    } else {
      this.items.push({
        id: productId,
        name: productData.name,
        priceAud: productData.priceAud,
        size: size,
        image: productData.images[0],
        quantity: quantity
      });
    }

    sfx.playAddToCart();
    this.render();
    this.open();
    showToast(`ADDED: ${productData.name}`, `SIZE [${size}] x ${quantity}`);
  }

  updateQuantity(index, delta) {
    sfx.playClick();
    this.items[index].quantity += delta;
    if (this.items[index].quantity <= 0) {
      this.items.splice(index, 1);
    }
    this.render();
  }

  removeItem(index) {
    sfx.playClick();
    this.items.splice(index, 1);
    this.render();
  }

  render() {
    const totalCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
    let subtotalAud = this.items.reduce((sum, item) => sum + (item.priceAud * item.quantity), 0);
    
    // Apply discount
    if (this.discount > 0) {
      subtotalAud = subtotalAud * (1 - this.discount);
    }

    // Update Badges
    if (this.badge) {
      this.badge.textContent = totalCount;
      this.badge.style.transform = 'scale(1.35)';
      setTimeout(() => { if (this.badge) this.badge.style.transform = 'scale(1)'; }, 200);
    }
    if (this.itemsBadge) {
      this.itemsBadge.textContent = `[${totalCount} ITEM${totalCount === 1 ? '' : 'S'}]`;
    }

    // Shipping threshold
    const diff = Math.max(0, this.freeShippingThreshold - subtotalAud);
    const shippingPercent = Math.min(100, Math.round((subtotalAud / this.freeShippingThreshold) * 100));

    if (this.shippingBarEl) this.shippingBarEl.style.width = `${shippingPercent}%`;
    if (this.shippingPercentEl) this.shippingPercentEl.textContent = `${shippingPercent}%`;
    if (this.shippingDiffEl) {
      if (diff === 0) {
        this.shippingDiffEl.parentElement.innerHTML = '🎉 You unlocked <strong>FREE EXPRESS SHIPPING</strong>!';
      } else {
        this.shippingDiffEl.textContent = formatPrice(diff);
      }
    }

    // Render Items
    if (totalCount === 0) {
      this.itemsList.innerHTML = `
        <div class="cart-empty-state">
          <div class="empty-icon">⛩</div>
          <p class="empty-title">YOUR BAG IS EMPTY</p>
          <p class="empty-sub">Explore the drop and claim your limited shonen piece before it's archived.</p>
          <button class="btn btn-primary" id="empty-shop-now-btn">EXPLORE DROPS</button>
        </div>
      `;
      const btn = this.itemsList.querySelector('#empty-shop-now-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          this.close();
          document.getElementById('drops-slider')?.scrollIntoView({ behavior: 'smooth' });
        });
      }
      this.checkoutBtn.disabled = true;
      this.subtotalDisplay.textContent = formatPrice(0);
    } else {
      this.checkoutBtn.disabled = false;
      this.subtotalDisplay.textContent = formatPrice(subtotalAud);

      this.itemsList.innerHTML = this.items.map((item, idx) => `
        <div class="cart-item-row">
          <img src="${item.image}" alt="${item.name}" class="cart-item-img">
          <div class="cart-item-info">
            <span class="cart-item-name">${item.name}</span>
            <span class="cart-item-size">SIZE: ${item.size} // 240GSM</span>
            <span class="cart-item-price">${formatPrice(item.priceAud)}</span>
          </div>
          <div class="cart-item-actions">
            <div class="cart-item-stepper">
              <button class="cart-stepper-btn" data-action="minus" data-index="${idx}">−</button>
              <span class="cart-stepper-qty">${item.quantity}</span>
              <button class="cart-stepper-btn" data-action="plus" data-index="${idx}">+</button>
            </div>
            <button class="cart-item-remove-btn" data-action="remove" data-index="${idx}">REMOVE</button>
          </div>
        </div>
      `).join('');

      // Add item event listeners
      this.itemsList.querySelectorAll('.cart-stepper-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          const idx = parseInt(btn.dataset.index, 10);
          this.updateQuantity(idx, action === 'plus' ? 1 : -1);
        });
      });

      this.itemsList.querySelectorAll('.cart-item-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index, 10);
          this.removeItem(idx);
        });
      });
    }
  }
}

// --------------------------------------------------------------------------
// 9. PRODUCT CATALOG DATA & QUICK VIEW MODAL
// --------------------------------------------------------------------------
const PRODUCT_CATALOG = {
  'warrior-spirit': {
    name: 'WARRIOR SPIRIT TEE',
    dropId: 'ARC_01 // BUSHIDO',
    priceAud: 33.99,
    originalAud: 39.99,
    desc: 'Heavyweight 240GSM combed cotton tee featuring Japanese rōnin calligraphy and high-density chest print. Pre-shrunk with boxy drop-shoulder cut.',
    images: ['/assets/products/warrior-2.webp', '/assets/products/warrior-1.webp', '/assets/products/warrior-5.webp']
  },
  'blue-flame': {
    name: 'BLUE FLAME TEE',
    dropId: 'ARC_02 // AZURE',
    priceAud: 33.99,
    originalAud: 39.99,
    desc: 'Cursed azure hellfire graphics spanning across upper spine and chest. Crafted from 240GSM cotton with tight collar ribbing that never bacon-necks.',
    images: ['/assets/products/blue-flame-2.webp', '/assets/products/blue-flame-1.webp', '/assets/products/blue-flame-4.webp']
  },
  'demon-blood': {
    name: 'DEMON BLOOD TEE',
    dropId: 'ARC_03 // ONI',
    priceAud: 33.99,
    originalAud: 39.99,
    desc: 'Demon slayer and oni inspiration with distressed blood-red inks and kanji markings. Hand-printed in limited batches of 50.',
    images: ['/assets/products/demon-blood-2.webp', '/assets/products/demon-blood-1.webp', '/assets/products/demon-blood-4.webp']
  },
  'domain-expansion': {
    name: 'DOMAIN EXPANSION TEE',
    dropId: 'ARC_04 // VOID',
    priceAud: 39.99,
    originalAud: 39.99,
    desc: 'Infinite void typography with clean minimalist layout. Streetwear cut designed to pair effortlessly with cargo pants or work trousers.',
    images: ['/assets/products/domain-2.webp', '/assets/products/domain-1.webp']
  },
  'water-breathing': {
    name: 'WATER BREATHING TEE',
    dropId: 'ARC_05 // TIDE',
    priceAud: 39.99,
    originalAud: 39.99,
    desc: 'Flowing tidal wave kanji graphics rendered in crisp cyan inks. Garment enzyme washed for an ultra-soft vintage touch with heavy drape.',
    images: ['/assets/products/water-model.webp', '/assets/products/water-1.webp']
  },
  'will-of-the-sun': {
    name: 'WILL OF THE SUN TEE',
    dropId: 'ARC_06 // SOLAR',
    priceAud: 33.99,
    originalAud: 39.99,
    desc: 'Sun breathing arc tribute featuring vibrant solar gradients and heat-cured metallic gold pigment accents. Permanent archive item once sold out.',
    images: ['/assets/products/sun-4.webp', '/assets/products/sun-1.webp']
  },
  'limitless': {
    name: 'LIMITLESS TEE',
    dropId: 'ARC_07 // INFINITY',
    priceAud: 39.99,
    originalAud: 39.99,
    desc: 'Geometric cursed technique seal and bold monochrome shonen aesthetic. Heavyweight 240gsm jersey cotton.',
    images: ['/assets/products/limitless-2.webp', '/assets/products/limitless-1.webp']
  },
  'bushido': {
    name: 'BUSHIDO TEE',
    dropId: 'ARC_08 // KATANA',
    priceAud: 39.99,
    originalAud: 39.99,
    desc: 'Classic katana code silhouette with dual-sleeve kanji prints. High-density plastisol screenprint that resists wear and fading.',
    images: ['/assets/products/bushido-2.webp', '/assets/products/bushido-1.webp']
  }
};

class QuickViewModal {
  constructor(cart) {
    this.cart = cart;
    this.modal = document.getElementById('quick-view-modal');
    this.closeBtn = document.getElementById('close-modal-btn');
    this.mainImg = document.getElementById('modal-active-img');
    this.thumbsContainer = document.getElementById('modal-thumbs');
    this.title = document.getElementById('modal-product-name');
    this.dropId = document.getElementById('modal-drop-id');
    this.priceCurrent = document.getElementById('modal-price-current');
    this.priceOriginal = document.getElementById('modal-price-original');
    this.desc = document.getElementById('modal-desc');
    this.sizesGroup = document.getElementById('modal-sizes-group');
    this.qtyDisplay = document.getElementById('qty-count-display');
    this.minusBtn = document.getElementById('qty-minus-btn');
    this.plusBtn = document.getElementById('qty-plus-btn');
    this.addBtn = document.getElementById('modal-add-to-bag-btn');
    this.btnPrice = document.getElementById('modal-btn-price');

    this.activeProductId = null;
    this.selectedSize = 'M';
    this.quantity = 1;

    this.init();
  }

  init() {
    // Open triggers
    document.querySelectorAll('.quick-view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pId = btn.dataset.product;
        this.open(pId);
      });
    });

    // Close triggers
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    // Size selection
    if (this.sizesGroup) {
      this.sizesGroup.querySelectorAll('.size-choice').forEach(choice => {
        choice.addEventListener('click', () => {
          sfx.playClick();
          this.sizesGroup.querySelectorAll('.size-choice').forEach(c => c.classList.remove('active'));
          choice.classList.add('active');
          this.selectedSize = choice.dataset.size;
        });
      });
    }

    // Quantity stepper
    if (this.minusBtn) {
      this.minusBtn.addEventListener('click', () => {
        if (this.quantity > 1) {
          sfx.playClick();
          this.quantity--;
          this.updateQtyDisplay();
        }
      });
    }
    if (this.plusBtn) {
      this.plusBtn.addEventListener('click', () => {
        sfx.playClick();
        this.quantity++;
        this.updateQtyDisplay();
      });
    }

    // Add to cart from modal
    if (this.addBtn) {
      this.addBtn.addEventListener('click', () => {
        if (!this.activeProductId) return;
        this.cart.addProductById(this.activeProductId, this.selectedSize, this.quantity);
        this.close();
      });
    }
  }

  updateQtyDisplay() {
    if (this.qtyDisplay) this.qtyDisplay.textContent = this.quantity;
    if (this.activeProductId && this.btnPrice) {
      const data = PRODUCT_CATALOG[this.activeProductId];
      this.btnPrice.textContent = formatPrice(data.priceAud * this.quantity);
    }
  }

  open(productId) {
    const data = PRODUCT_CATALOG[productId];
    if (!data) return;

    this.activeProductId = productId;
    this.selectedSize = 'M';
    this.quantity = 1;
    this.updateQtyDisplay();

    sfx.playClick();

    // Populate data
    this.title.textContent = data.name;
    this.dropId.textContent = data.dropId;
    this.desc.textContent = data.desc;
    this.priceCurrent.textContent = formatPrice(data.priceAud);
    this.priceOriginal.textContent = formatPrice(data.originalAud);
    this.mainImg.src = data.images[0];

    // Thumbnails
    this.thumbsContainer.innerHTML = data.images.map((src, i) => `
      <img src="${src}" alt="Thumb ${i}" class="modal-thumb ${i === 0 ? 'active' : ''}" data-src="${src}">
    `).join('');

    this.thumbsContainer.querySelectorAll('.modal-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        sfx.playClick();
        this.thumbsContainer.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        this.mainImg.src = thumb.dataset.src;
      });
    });

    this.modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  close() {
    sfx.playClick();
    this.modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// --------------------------------------------------------------------------
// 10. TOAST NOTIFICATION UTILITY
// --------------------------------------------------------------------------
let toastTimeout;
function showToast(title, message) {
  const toast = document.getElementById('toast-notification');
  const titleEl = document.getElementById('toast-title');
  const msgEl = document.getElementById('toast-message');

  if (!toast || !titleEl || !msgEl) return;

  titleEl.textContent = title;
  msgEl.textContent = message;

  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// --------------------------------------------------------------------------
// 11. GENERAL UI INITIALIZATION
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Sound Effects HUD Pill
  const audioPill = document.getElementById('audio-pill');
  const audioLabel = document.getElementById('audio-label');
  if (audioPill) {
    audioPill.addEventListener('click', () => {
      const active = sfx.toggle();
      audioPill.classList.toggle('active', active);
      audioLabel.textContent = active ? 'SFX: ON' : 'SFX: OFF';
      if (active) sfx.playAddToCart();
    });
  }

  // Initialize Currency Selector
  const currencySelect = document.getElementById('currency-select');
  if (currencySelect) {
    currencySelect.addEventListener('change', (e) => {
      sfx.playClick();
      currentCurrency = e.target.value;
      updateAllPricesOnPage();
    });
  }

  // Initialize Mobile Menu
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      sfx.playClick();
      mobileMenu.classList.toggle('open');
    });
    mobileMenu.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
      });
    });
  }

  // Newsletter form
  const newsletterForm = document.getElementById('newsletter-form');
  const newsletterStatus = document.getElementById('newsletter-status');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sfx.playAddToCart();
      newsletterStatus.textContent = '✓ ACCESS GRANTED. YOU WILL RECEIVE VIP DISPATCH CODES.';
      newsletterForm.reset();
    });
  }

  // --------------------------------------------------------------------------
  // 12. DROP-REVEAL ANIMATOR: "THE / ORIGIN" SCROLL-DRIVEN SECTION
  // --------------------------------------------------------------------------
  const dropReveal = new DropRevealAnimator();

  // --------------------------------------------------------------------------
  // 13. CRAFT // 240GSM SPLIT PANEL ANIMATOR
  // --------------------------------------------------------------------------
  const craftReveal = new CraftRevealAnimator();

  // --------------------------------------------------------------------------
  // 14. THE ARC NEVER DIES — MANIFESTO ANIMATOR
  // --------------------------------------------------------------------------
  const manifesto = new ManifestoAnimator();

  // --------------------------------------------------------------------------
  // 15. ARCHIVE STATS — NUMBER COUNTER
  // --------------------------------------------------------------------------
  const statsCounter = new StatsCounterAnimator();

  // Initialize Main Components
  const cart = new ShoppingCart();
  const quickView = new QuickViewModal(cart);
  const heroScrubber = new HeroCanvasStageScrubber();
  const circularBadge = new CircularScrollBadge();
  const slider = new ProductSlider();
  const cardStack = new PinnedCardStack();
  const loreExplorer = new LoreArcExplorer();

  // Initial Price Format
  updateAllPricesOnPage();
});

// ==========================================================================
// DROP-REVEAL ANIMATOR CLASS
// Scroll-driven "THE / ORIGIN" two-phase word reveal, inspired by zenji.shop.
// Phase 1 (p 0.0 → 0.55): Container scales 0.55 → 1.0 — words zoom in centered.
// Phase 2 (p 0.55 → 1.0): "THE" flies UP-LEFT, "ORIGIN" flies DOWN-RIGHT,
//                          background product image fades in.
// ==========================================================================
class DropRevealAnimator {
  constructor() {
    this.section      = document.getElementById('drop-reveal');
    this.sticky       = document.getElementById('drop-reveal-sticky');
    this.wordsWrap    = document.getElementById('drop-reveal-words');
    this.wordThe      = document.getElementById('drw-the');
    this.wordOrigin   = document.getElementById('drw-origin');
    this.bgPanel      = document.getElementById('drop-reveal-bg');
    this.productLabel = document.getElementById('drop-reveal-product-label');
    this.pctEl        = document.getElementById('drop-reveal-pct');
    this.barEl        = document.getElementById('drop-reveal-bar');

    // Animation config
    this.PHASE1_END   = 0.55;   // Phase 1 ends at 55% scroll progress
    this.SCALE_START  = 0.52;   // initial scale
    this.SCALE_END    = 1.0;    // final scale at end of Phase 1

    // Word fly-out maximums (viewport-relative)
    this.THE_MAX_X    = -38;    // %vw left
    this.THE_MAX_Y    = -40;    // %vh up
    this.ORI_MAX_X    = 38;     // %vw right
    this.ORI_MAX_Y    = 40;     // %vh down

    this.rawP         = 0;
    this.smoothP      = 0;

    if (!this.section || !this.sticky) return;
    this.init();
  }

  init() {
    // Trigger rules-in class when section enters viewport
    const rulesObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          this.sticky.classList.add('rules-in');
        } else {
          this.sticky.classList.remove('rules-in');
        }
      });
    }, { threshold: 0.05 });
    rulesObserver.observe(this.section);

    // rAF scroll loop
    const tick = () => {
      this.update();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Smooth linear easing helper
  static lerp(a, b, t) { return a + (b - a) * t; }

  // Clamp to [0, 1]
  static clamp01(v) { return Math.min(1, Math.max(0, v)); }

  // Map value from one range to [0,1]
  static norm(v, min, max) {
    if (max === min) return 0;
    return DropRevealAnimator.clamp01((v - min) / (max - min));
  }

  // Ease-in-out cubic
  static easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Ease-out exponential
  static easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  update() {
    if (!this.section) return;

    const rect = this.section.getBoundingClientRect();
    const trackH = rect.height - window.innerHeight;
    if (trackH <= 0) return;

    // Smooth Lerp progress through the scroll track for fluid easing
    const targetP = DropRevealAnimator.clamp01(-rect.top / trackH);
    this.smoothP += (targetP - this.smoothP) * 0.12;
    const rawP = this.smoothP;

    // Update corner progress display
    if (this.pctEl) this.pctEl.textContent = `${Math.round(rawP * 100).toString().padStart(2, '0')}%`;
    if (this.barEl) this.barEl.style.width = `${rawP * 100}%`;

    // ---------- PHASE 1: Scale-in (rawP 0 → PHASE1_END) ----------
    const p1 = DropRevealAnimator.norm(rawP, 0, this.PHASE1_END);
    const p1eased = DropRevealAnimator.easeInOutCubic(p1);
    const containerScale = DropRevealAnimator.lerp(this.SCALE_START, this.SCALE_END, p1eased);

    // Apply container scale to word wrapper
    if (this.wordsWrap) {
      this.wordsWrap.style.transform = `scale(${containerScale.toFixed(4)})`;
    }

    // ---------- PHASE 2: Words fly apart (rawP PHASE1_END → 1.0) ----------
    const p2raw = DropRevealAnimator.norm(rawP, this.PHASE1_END, 1.0);
    const p2 = DropRevealAnimator.easeOutExpo(p2raw);

    // "THE" word: translate UP-LEFT
    if (this.wordThe) {
      const tx = p2 * this.THE_MAX_X;
      const ty = p2 * this.THE_MAX_Y;
      const opacity = p2raw > 0.90 ? 1 - DropRevealAnimator.norm(p2raw, 0.90, 1.0) : 1;
      this.wordThe.style.transform = `translate(${tx.toFixed(2)}vw, ${ty.toFixed(2)}vh)`;
      this.wordThe.style.opacity = opacity.toFixed(3);
    }

    // "ORIGIN" word: translate DOWN-RIGHT
    if (this.wordOrigin) {
      const tx = p2 * this.ORI_MAX_X;
      const ty = p2 * this.ORI_MAX_Y;
      const opacity = p2raw > 0.90 ? 1 - DropRevealAnimator.norm(p2raw, 0.90, 1.0) : 1;
      this.wordOrigin.style.transform = `translate(${tx.toFixed(2)}vw, ${ty.toFixed(2)}vh)`;
      this.wordOrigin.style.opacity = opacity.toFixed(3);
    }

    // Background image opacity: starts at Phase2 20%, fully visible at 75%
    if (this.bgPanel) {
      const bgOpacity = DropRevealAnimator.norm(p2raw, 0.2, 0.75);
      this.bgPanel.style.opacity = bgOpacity.toFixed(3);
    }

    // Product label: slide up from bottom at Phase2 55%+
    if (this.productLabel) {
      const labelP = DropRevealAnimator.norm(p2raw, 0.55, 0.85);
      const labelEased = DropRevealAnimator.easeOutExpo(labelP);
      if (labelP > 0) {
        this.productLabel.style.opacity = labelEased.toFixed(3);
        this.productLabel.style.transform =
          `translateX(-50%) translateY(${(1 - labelEased) * 28}px)`;
        this.productLabel.style.pointerEvents = labelP > 0.5 ? 'auto' : 'none';
      } else {
        this.productLabel.style.opacity = '0';
        this.productLabel.style.transform = 'translateX(-50%) translateY(28px)';
        this.productLabel.style.pointerEvents = 'none';
      }
    }
  }
}

// ==========================================================================
// CRAFT REVEAL ANIMATOR CLASS
// Phase 1 (p 0→0.52): Left panel slides ← , right panel slides →
// Phase 2 (p 0.52→1): Center product image + spec table fades in
// ==========================================================================
class CraftRevealAnimator {
  constructor() {
    this.section      = document.getElementById('craft-reveal');
    this.panelLeft    = document.getElementById('craft-panel-left');
    this.panelRight   = document.getElementById('craft-panel-right');
    this.centerReveal = document.getElementById('craft-center-reveal');
    this.pctEl        = document.getElementById('craft-pct');
    this.barEl        = document.getElementById('craft-progress-bar');
    this.PANEL_MAX    = 52;
    this.PHASE1_END   = 0.52;
    this.smoothP      = 0;
    if (!this.section || !this.panelLeft) return;
    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }
  _tick() { this._update(); requestAnimationFrame(this._tick); }
  static clamp01(v) { return Math.min(1, Math.max(0, v)); }
  static norm(v,a,b) { return b===a?0:CraftRevealAnimator.clamp01((v-a)/(b-a)); }
  static easeInOutCubic(t) { return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }
  static easeOutExpo(t) { return t===1?1:1-Math.pow(2,-10*t); }
  _update() {
    if (!this.section) return;
    const rect   = this.section.getBoundingClientRect();
    const trackH = rect.height - window.innerHeight;
    if (trackH <= 0) return;
    const targetP = CraftRevealAnimator.clamp01(-rect.top / trackH);
    this.smoothP += (targetP - this.smoothP) * 0.12;
    const rawP = this.smoothP;
    if (this.pctEl) this.pctEl.textContent = String(Math.round(rawP*100)).padStart(2,'0') + '%';
    if (this.barEl) this.barEl.style.width = (rawP*100) + '%';
    const p1e    = CraftRevealAnimator.easeInOutCubic(CraftRevealAnimator.norm(rawP, 0, this.PHASE1_END));
    const travel = (p1e * this.PANEL_MAX).toFixed(2);
    if (this.panelLeft)  this.panelLeft.style.transform  = 'translateX(-' + travel + 'vw)';
    if (this.panelRight) this.panelRight.style.transform = 'translateX(' + travel + 'vw)';
    const p2e = CraftRevealAnimator.easeOutExpo(CraftRevealAnimator.norm(rawP, this.PHASE1_END, 1.0));
    if (this.centerReveal) {
      this.centerReveal.style.opacity       = p2e.toFixed(3);
      this.centerReveal.style.pointerEvents = p2e > 0.3 ? 'auto' : 'none';
    }
  }
}

// ==========================================================================
// MANIFESTO ANIMATOR CLASS
// 6 manifesto lines slide in from left/right as scroll progress hits threshold.
// Background pulses dark red at midpoint. Scan line sweeps down.
// ==========================================================================
class ManifestoAnimator {
  constructor() {
    this.section     = document.getElementById('manifesto');
    this.bg          = document.getElementById('manifesto-bg');
    this.scan        = document.getElementById('manifesto-scan');
    this.sideBar     = document.getElementById('manifesto-side-bar-fill');
    this.ctaEl       = document.getElementById('manifesto-cta');
    this.lines       = Array.from(document.querySelectorAll('.mline'));
    this._lineStates = this.lines.map(() => false);
    if (!this.section) return;
    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }
  _tick() { this._update(); requestAnimationFrame(this._tick); }
  static clamp01(v)  { return Math.min(1, Math.max(0, v)); }
  static norm(v,a,b) { return b===a?0:ManifestoAnimator.clamp01((v-a)/(b-a)); }
  static lerp(a,b,t) { return a+(b-a)*t; }
  _update() {
    if (!this.section) return;
    const rect   = this.section.getBoundingClientRect();
    const trackH = rect.height - window.innerHeight;
    if (trackH <= 0) return;
    const rawP = ManifestoAnimator.clamp01(-rect.top / trackH);

    if (this.sideBar) this.sideBar.style.height = (rawP*100) + '%';
    if (this.scan)    this.scan.style.top        = (rawP*100) + '%';

    if (this.bg) {
      const mid = 1 - Math.abs(rawP - 0.5) * 2;
      const r   = Math.round(ManifestoAnimator.lerp(5, 30, mid));
      const g   = Math.round(ManifestoAnimator.lerp(5,  2, mid));
      const b   = Math.round(ManifestoAnimator.lerp(8,  5, mid));
      this.bg.style.backgroundColor = 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    this.lines.forEach((line, i) => {
      const threshold = parseFloat(line.dataset.threshold || '0.1');
      const isIn      = rawP >= threshold;
      if (isIn && !this._lineStates[i]) {
        this._lineStates[i] = true;
        const textSpan  = line.querySelector('.mline-text');
        const kanjiSpan = line.querySelector('.mline-kanji');
        if (textSpan) {
          textSpan.style.transition = 'transform 0.85s cubic-bezier(0.16,1,0.3,1), opacity 0.6s ease';
          textSpan.style.transform  = 'translateX(0)';
          textSpan.style.opacity    = '1';
        }
        if (kanjiSpan) kanjiSpan.classList.add('visible');
      } else if (!isIn && this._lineStates[i]) {
        this._lineStates[i] = false;
        const textSpan  = line.querySelector('.mline-text');
        const kanjiSpan = line.querySelector('.mline-kanji');
        const fromRight = textSpan && textSpan.classList.contains('mline-from-right');
        if (textSpan) {
          textSpan.style.transition = 'transform 0.5s ease, opacity 0.4s ease';
          textSpan.style.transform  = fromRight ? 'translateX(100vw)' : 'translateX(-100vw)';
          textSpan.style.opacity    = '0';
        }
        if (kanjiSpan) kanjiSpan.classList.remove('visible');
      }
    });

    if (this.ctaEl) {
      rawP >= 0.88
        ? this.ctaEl.classList.add('visible')
        : this.ctaEl.classList.remove('visible');
    }
  }
}

// ==========================================================================
// STATS COUNTER ANIMATOR CLASS
// IntersectionObserver fires when #archive-stats enters viewport.
// Each .stat-block fades up; its number counts from 0→target; bar fills.
// ==========================================================================
class StatsCounterAnimator {
  constructor() {
    this.section = document.getElementById('archive-stats');
    this.blocks  = Array.from(document.querySelectorAll('#archive-stats .stat-block'));
    this._done   = false;
    this._statDefs = [
      { elId: 'stat-gsm',      target: 240, duration: 1600, barId: 'stat-bar-0', barWidth: 100 },
      { elId: 'stat-pcs',      target: 50,  duration: 1200, barId: 'stat-bar-1', barWidth: 100 },
      { elId: 'stat-restocks', target: 0,   duration:  800, barId: 'stat-bar-2', barWidth:   0 },
      { elId: 'stat-hours',    target: 24,  duration: 1000, barId: 'stat-bar-3', barWidth: 100 },
    ];
    if (!this.section) return;
    this._observe();
  }
  _observe() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !this._done) {
          this._done = true;
          this._run();
          io.disconnect();
        }
      });
    }, { threshold: 0.15 });
    io.observe(this.section);
  }
  _run() {
    this.blocks.forEach((block, i) => {
      setTimeout(() => block.classList.add('visible'), i * 140);
    });
    this._statDefs.forEach((def, i) => {
      const el  = document.getElementById(def.elId);
      const bar = document.getElementById(def.barId);
      if (bar) setTimeout(() => { bar.style.width = def.barWidth + '%'; }, i * 150 + 200);
      if (!el) return;
      if (def.target === 0) { el.textContent = '0'; return; }
      this._countUp(el, def.target, def.duration, i * 150);
    });
  }
  _countUp(el, target, duration, delay) {
    setTimeout(() => {
      const padLen = String(target).length;
      const start  = performance.now();
      const step   = (now) => {
        const t       = Math.min((now - start) / duration, 1);
        const eased   = 1 - Math.pow(1 - t, 3);
        const current = Math.round(eased * target);
        el.textContent = String(current).padStart(padLen, '0');
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = String(target);
      };
      requestAnimationFrame(step);
    }, delay);
  }
}
