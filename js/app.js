(function () {
	'use strict';

	var root = document.documentElement;
	var body = document.body;
	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

	var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
	var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

	/* ---------- Loader + hero intro ---------- */
	function ready() {
		var loader = $('#loader');
		if (loader) loader.classList.add('is-hidden');
		body.classList.remove('is-loading');
		requestAnimationFrame(function () { body.classList.add('is-ready'); });
		startTyping();
	}
	if (document.readyState === 'complete') ready();
	else window.addEventListener('load', ready);
	// Never keep the visitor waiting on slow assets
	setTimeout(function () { if (!body.classList.contains('is-ready')) ready(); }, 2500);

	/* ---------- Theme toggle ---------- */
	var themeToggle = $('#themeToggle');
	var themeMeta = $('meta[name="theme-color"]');
	function syncThemeMeta() {
		if (themeMeta) themeMeta.setAttribute('content', root.getAttribute('data-theme') === 'light' ? '#f6f7fb' : '#0b0d17');
	}
	syncThemeMeta();
	themeToggle.addEventListener('click', function () {
		var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
		root.setAttribute('data-theme', next);
		syncThemeMeta();
		try { localStorage.setItem('theme', next); } catch (e) { }
	});

	/* ---------- Typing effect ---------- */
	var typingStarted = false;
	function startTyping() {
		var el = $('#typed');
		if (!el || typingStarted) return;
		typingStarted = true;
		var words;
		try { words = JSON.parse(el.getAttribute('data-words')); } catch (e) { return; }
		if (reduceMotion || !words.length) return;

		var w = 0, i = words[0].length, deleting = true;
		(function tick() {
			var word = words[w];
			el.textContent = word.slice(0, i);
			var delay = deleting ? 45 : 95;

			if (!deleting && i === word.length) { deleting = true; delay = 1800; }
			else if (deleting && i === 0) { deleting = false; w = (w + 1) % words.length; delay = 350; }
			else i += deleting ? -1 : 1;

			setTimeout(tick, delay);
		})();
	}

	/* ---------- Navbar: scrolled / hide on scroll down / mobile menu ---------- */
	var nav = $('#nav');
	var burger = $('#burger');
	function closeMenu() {
		nav.classList.remove('is-open');
		burger.setAttribute('aria-expanded', 'false');
		burger.setAttribute('aria-label', 'Open menu');
	}
	burger.addEventListener('click', function () {
		var open = nav.classList.toggle('is-open');
		burger.setAttribute('aria-expanded', String(open));
		burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
	});
	$$('#navLinks a').forEach(function (a) { a.addEventListener('click', closeMenu); });
	document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

	/* ---------- Scroll-driven effects (single rAF loop) ---------- */
	var progress = $('#scrollProgress');
	var toTop = $('#toTop');
	var timeline = $('#timeline');
	var timelineProgress = $('#timelineProgress');
	var parallaxEls = reduceMotion ? [] : $$('[data-parallax]');
	var lastY = window.scrollY;
	var ticking = false;

	function onScroll() {
		var y = window.scrollY;
		var max = document.documentElement.scrollHeight - window.innerHeight;
		var vh = window.innerHeight;

		progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
		nav.classList.toggle('is-scrolled', y > 40);
		if (!nav.classList.contains('is-open')) nav.classList.toggle('is-hidden', y > lastY && y > 500);
		toTop.classList.toggle('is-visible', y > 600);

		if (timeline) {
			var r = timeline.getBoundingClientRect();
			var p = Math.min(Math.max((vh * 0.65 - r.top) / r.height, 0), 1);
			timelineProgress.style.transform = 'scaleY(' + p + ')';
		}

		if (y < vh) {
			parallaxEls.forEach(function (el) {
				el.style.translate = '0 ' + (y * parseFloat(el.getAttribute('data-parallax'))) + 'px';
			});
		}

		lastY = y;
		ticking = false;
	}
	window.addEventListener('scroll', function () {
		if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
	}, { passive: true });
	onScroll();

	toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });

	/* ---------- Active nav link ---------- */
	var navLinks = $$('.nav__link');
	if ('IntersectionObserver' in window) {
		var spy = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (!entry.isIntersecting) return;
				navLinks.forEach(function (l) {
					l.classList.toggle('is-active', l.getAttribute('href') === '#' + entry.target.id);
				});
			});
		}, { rootMargin: '-45% 0px -50% 0px' });
		$$('main section[id]').forEach(function (s) { spy.observe(s); });
	}

	/* ---------- Counters ---------- */
	function countUp(el) {
		var target = parseInt(el.getAttribute('data-count'), 10);
		var suffix = el.getAttribute('data-suffix') || '';
		if (reduceMotion) { el.textContent = target + suffix; return; }
		var start = null, dur = 1600;
		(function step(ts) {
			if (!start) start = ts;
			var t = Math.min((ts - start) / dur, 1);
			var eased = 1 - Math.pow(1 - t, 4);
			el.textContent = Math.round(target * eased) + suffix;
			if (t < 1) requestAnimationFrame(step);
		})(performance.now());
	}

	/* ---------- Reveal on scroll ---------- */
	function reveal(el) {
		el.classList.add('is-visible');
		$$('[data-count]', el).concat(el.hasAttribute('data-count') ? [el] : []).forEach(countUp);
		$$('.skill__bar', el).forEach(function (bar) { bar.style.width = bar.getAttribute('data-width') + '%'; });

		// Hand transitions back to the element's own hover styles once revealed
		var delay = parseFloat(getComputedStyle(el).transitionDelay) || 0;
		setTimeout(function () {
			el.removeAttribute('data-reveal');
			el.classList.remove('is-visible');
		}, 1000 + delay * 1000 + 50);
	}

	var revealEls = $$('[data-reveal]');
	if ('IntersectionObserver' in window && !reduceMotion) {
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					reveal(entry.target);
					io.unobserve(entry.target);
				}
			});
		}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
		revealEls.forEach(function (el) { io.observe(el); });
	} else {
		revealEls.forEach(reveal);
	}

	/* ---------- Project filters ---------- */
	var filters = $$('.filter');
	var projects = $$('.project');
	filters.forEach(function (btn) {
		btn.addEventListener('click', function () {
			var f = btn.getAttribute('data-filter');
			filters.forEach(function (b) { b.classList.toggle('is-active', b === btn); });

			projects.forEach(function (p) {
				var show = f === 'all' || p.getAttribute('data-cat').split(' ').indexOf(f) > -1;
				if (show) {
					p.hidden = false;
					requestAnimationFrame(function () {
						requestAnimationFrame(function () { p.classList.remove('is-filtered-out'); });
					});
				} else {
					p.classList.add('is-filtered-out');
					setTimeout(function () { if (p.classList.contains('is-filtered-out')) p.hidden = true; }, 400);
				}
			});
			// Featured (wide) card only when it can sit on its own row
			projects[0].classList.toggle('project--featured', f === 'all');
		});
	});

	/* ---------- Pointer effects (desktop only) ---------- */
	if (finePointer && !reduceMotion) {
		// Cursor glow
		var glow = $('#cursorGlow');
		var gx = 0, gy = 0, tx = 0, ty = 0, glowRunning = false;
		function glowLoop() {
			gx += (tx - gx) * 0.12;
			gy += (ty - gy) * 0.12;
			glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px)';
			if (Math.abs(tx - gx) > 0.5 || Math.abs(ty - gy) > 0.5) requestAnimationFrame(glowLoop);
			else glowRunning = false;
		}
		window.addEventListener('pointermove', function (e) {
			tx = e.clientX; ty = e.clientY;
			body.classList.add('has-pointer');
			if (!glowRunning) { glowRunning = true; requestAnimationFrame(glowLoop); }
		}, { passive: true });
		document.addEventListener('pointerleave', function () { body.classList.remove('has-pointer'); });

		// Magnetic buttons
		$$('.magnetic').forEach(function (el) {
			el.addEventListener('pointermove', function (e) {
				var r = el.getBoundingClientRect();
				var x = e.clientX - r.left - r.width / 2;
				var y = e.clientY - r.top - r.height / 2;
				el.style.transform = 'translate(' + x * 0.25 + 'px,' + y * 0.35 + 'px)';
			});
			el.addEventListener('pointerleave', function () { el.style.transform = ''; });
		});

		// 3D tilt on project cards
		$$('.tilt').forEach(function (card) {
			card.addEventListener('pointermove', function (e) {
				if (card.hasAttribute('data-reveal')) return;
				var r = card.getBoundingClientRect();
				var px = (e.clientX - r.left) / r.width - 0.5;
				var py = (e.clientY - r.top) / r.height - 0.5;
				card.style.transform = 'perspective(900px) rotateX(' + (-py * 6) + 'deg) rotateY(' + (px * 8) + 'deg) translateY(-6px)';
			});
			card.addEventListener('pointerleave', function () { card.style.transform = ''; });
		});

		// Hero photo follows the pointer slightly
		var visual = $('.hero__photo');
		var hero = $('#home');
		hero.addEventListener('pointermove', function (e) {
			var x = (e.clientX / window.innerWidth - 0.5) * 18;
			var y = (e.clientY / window.innerHeight - 0.5) * 12;
			visual.style.translate = x + 'px ' + y + 'px';
		});
		hero.addEventListener('pointerleave', function () { visual.style.translate = ''; });
	}

	/* ---------- Contact form → mail client ---------- */
	var form = $('#contactForm');
	var note = $('#formNote');
	form.addEventListener('submit', function (e) {
		e.preventDefault();
		var field = function (n) { return form.elements.namedItem(n).value.trim(); };
		var name = field('name');
		var email = field('email');
		var subject = field('subject');
		var message = field('message');

		if (!name || !message || !/^\S+@\S+\.\S+$/.test(email)) {
			note.textContent = 'Please fill in your name, a valid email and a message.';
			form.animate && !reduceMotion && form.animate(
				[{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }],
				{ duration: 350 }
			);
			return;
		}

		var bodyText = message + '\n\n— ' + name + ' (' + email + ')';
		window.location.href = 'mailto:dodm773@gmail.com'
			+ '?subject=' + encodeURIComponent(subject || 'Portfolio contact from ' + name)
			+ '&body=' + encodeURIComponent(bodyText);
		note.textContent = 'Opening your email app… Thanks for reaching out!';
		form.reset();
	});

	/* ---------- Footer year ---------- */
	$('#year').textContent = new Date().getFullYear();
})();
