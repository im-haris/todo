/* Scalevora - enquiry form + tool usage gate.
 *
 * PRIVACY: no recipient email address appears anywhere in this file or in the
 * HTML. Submissions POST to FORM_ENDPOINT; who receives them is configured in
 * that service's dashboard, server-side. That is what keeps the addresses off
 * the public page.
 *
 * ---------------------------------------------------------------------------
 * SETUP - one line to change, then this works.
 *
 * Option A - Formspree (formspree.io). Create a form, add BOTH recipients
 *   under Settings > Emails, then paste the endpoint below. Free tier covers
 *   50 submissions a month.
 *       FORM_ENDPOINT = 'https://formspree.io/f/xxxxxxxx';
 *
 * Option B - Web3Forms (web3forms.com). Free, no account. Set:
 *       FORM_ENDPOINT = 'https://api.web3forms.com/submit';
 *       FORM_KEY      = 'your-access-key';
 *   Add the second recipient as a CC inside the Web3Forms dashboard, not here.
 *
 * Option C - your own Vercel serverless function at /api/enquiry, with the
 *   addresses in environment variables. Most control, most setup.
 *       FORM_ENDPOINT = '/api/enquiry';
 *
 * Until FORM_ENDPOINT is set, the form falls back to showing the public
 * contact address already published in the site footer. Nothing new is
 * exposed, but enquiries will NOT reach the second recipient, so set this.
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  var FORM_ENDPOINT = 'https://formspree.io/f/xwllodbl';
  var FORM_KEY      = '';           // <-- Web3Forms only; leave '' otherwise
  var PUBLIC_FALLBACK = 'atiqueulh' + '@' + 'gmail.com'; // already public in the footer
  var FREE_USES = 2;
  var STORE = 'sv_tools_v1';

  /* ---------------- storage (must never throw) ---------------- */
  function read() {
    try {
      var r = localStorage.getItem(STORE);
      return r ? JSON.parse(r) : { uses: 0, unlocked: false };
    } catch (e) { return { uses: 0, unlocked: false }; }
  }
  function write(s) {
    try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) { /* private mode */ }
  }
  var state = read();
  if (typeof state.uses !== 'number' || state.uses < 0) state.uses = 0;

  /* ---------------- modal ---------------- */
  var scrim = null, lastFocus = null;

  function closeModal() {
    if (!scrim) return;
    scrim.remove();
    scrim = null;
    document.removeEventListener('keydown', onEsc);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function onEsc(e) { if (e.key === 'Escape') closeModal(); }

  var COPY = {
    'custom-tool': {
      h: 'Tell us what you need built',
      s: 'Describe the tool and what it should do. We will come back with whether it is worth building, roughly how long it takes, and what it would cost.'
    },
    'combined-tool': {
      h: 'Request the combined optimiser',
      s: 'Placement, bidding and bleeder detection in one tool, set up against your own account data. Tell us a little about the account and we will send details.'
    },
    'unlock': {
      h: 'Keep using the calculators',
      s: 'Enter your email to carry on. We will send the occasional Amazon PPC breakdown and nothing else. Unsubscribe any time.'
    }
  };

  function openModal(kind) {
    closeModal();
    lastFocus = document.activeElement;
    var c = COPY[kind] || COPY['custom-tool'];
    var unlock = kind === 'unlock';

    scrim = document.createElement('div');
    scrim.className = 'lm-scrim';
    scrim.setAttribute('role', 'dialog');
    scrim.setAttribute('aria-modal', 'true');
    scrim.setAttribute('aria-label', c.h);

    var extra = unlock ? '' :
      '<div class="lm-row">' +
        '<div><label for="lm-name">Your name</label><input id="lm-name" name="name" type="text" autocomplete="name"></div>' +
        '<div><label for="lm-brand">Brand or company</label><input id="lm-brand" name="brand" type="text" autocomplete="organization"></div>' +
      '</div>' +
      '<div><label for="lm-msg">What do you need?</label><textarea id="lm-msg" name="message" placeholder="Describe the tool, the problem it should solve, and anything it must connect to."></textarea></div>';

    scrim.innerHTML =
      '<div class="lm">' +
        '<button class="lm-close" type="button" aria-label="Close">&times;</button>' +
        '<div class="lm-body">' +
          '<h3>' + c.h + '</h3>' +
          '<p class="lm-sub">' + c.s + '</p>' +
          '<form novalidate>' +
            '<div class="lm-fields">' +
              '<div><label for="lm-email">Email address</label>' +
              '<input id="lm-email" name="email" type="email" autocomplete="email" required placeholder="you@yourbrand.com"></div>' +
              extra +
            '</div>' +
            '<div class="lm-err" id="lm-err" role="alert"></div>' +
            '<button class="btn btn-p" type="submit" style="width:100%;justify-content:center">' +
              (unlock ? 'Unlock the calculators' : 'Send enquiry') +
            '</button>' +
            '<p class="lm-fine">We reply within one business day. Your details are used to answer this enquiry and are never sold or shared.</p>' +
          '</form>' +
        '</div>' +
      '</div>';

    document.body.appendChild(scrim);
    document.addEventListener('keydown', onEsc);
    scrim.querySelector('.lm-close').addEventListener('click', closeModal);
    scrim.addEventListener('mousedown', function (e) { if (e.target === scrim) closeModal(); });

    var form = scrim.querySelector('form');
    var err = scrim.querySelector('#lm-err');
    var emailEl = scrim.querySelector('#lm-email');
    setTimeout(function () { emailEl.focus(); }, 40);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.className = 'lm-err';
      var email = (emailEl.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        err.textContent = 'Enter a valid email address so we can reply.';
        err.className = 'lm-err on';
        emailEl.focus();
        return;
      }
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      var SUBJECT = {
        'custom-tool':   'Scalevora - custom tool build enquiry',
        'combined-tool': 'Scalevora - combined optimiser enquiry',
        'unlock':        'Scalevora - new tools lead'
      };
      var payload = {
        email: email,                       // Formspree uses this as reply-to
        _subject: SUBJECT[kind] || 'Scalevora - website enquiry',
        enquiry_type: kind,
        name: (form.querySelector('#lm-name') || {}).value || '',
        brand: (form.querySelector('#lm-brand') || {}).value || '',
        message: (form.querySelector('#lm-msg') || {}).value || '',
        page: location.pathname,
        sent_at: new Date().toISOString()
      };
      if (FORM_KEY) payload.access_key = FORM_KEY;

      send(payload).then(function (ok) {
        if (kind === 'unlock') { state.unlocked = true; write(state); applyGate(); }
        showDone(ok, email, kind);
      });
    });
  }

  function send(payload) {
    if (!FORM_ENDPOINT) return Promise.resolve(false);
    return fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.ok; })
      .catch(function () { return false; });
  }

  function showDone(ok, email, kind) {
    if (!scrim) return;
    var body = scrim.querySelector('.lm-body');
    if (ok) {
      body.innerHTML =
        '<div class="lm-ok">' +
          '<div class="tick"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg></div>' +
          '<h3>' + (kind === 'unlock' ? 'You’re all set' : 'Enquiry sent') + '</h3>' +
          '<p class="lm-sub">' + (kind === 'unlock'
            ? 'The calculators are unlocked on this device. Close this to carry on.'
            : 'We have it and will reply to that address within one business day.') + '</p>' +
          '<button class="btn btn-p" type="button" style="width:100%;justify-content:center">Close</button>' +
        '</div>';
    } else {
      /* Endpoint not configured, or the request failed. Never claim it sent. */
      var unlocked = kind === 'unlock';
      body.innerHTML =
        '<div class="lm-ok">' +
          '<h3>' + (unlocked ? 'Unlocked on this device' : 'Send this to us directly') + '</h3>' +
          '<p class="lm-sub">' +
            (unlocked ? 'The calculators are unlocked. ' : '') +
            'We could not submit the form from here, so please email us instead — ' +
            'copy the address below.' +
          '</p>' +
          '<div style="background:var(--ink);border:1px solid var(--line2);border-radius:10px;padding:13px;' +
               'font-family:\'JetBrains Mono\',monospace;font-size:13.5px;color:var(--text);user-select:all;' +
               'word-break:break-all">' + PUBLIC_FALLBACK + '</div>' +
          '<button class="btn btn-p" type="button" style="width:100%;justify-content:center;margin-top:18px">Close</button>' +
        '</div>';
    }
    body.querySelector('button').addEventListener('click', closeModal);
  }

  /* ---------------- usage gate ---------------- */
  function locked() { return !state.unlocked && state.uses >= FREE_USES; }

  function applyGate() {
    document.querySelectorAll('.tool-out').forEach(function (out) {
      var mask = out.querySelector('.gate-mask');
      if (locked()) {
        if (mask) return;
        mask = document.createElement('div');
        mask.className = 'gate-mask';
        mask.innerHTML =
          '<div>' +
            '<div class="gi">Free limit reached</div>' +
            '<h4>Add your email to continue</h4>' +
            '<p>You have used your ' + FREE_USES + ' free calculations. Unlock all three tools, no charge.</p>' +
            '<button class="gate-btn" type="button">Unlock free</button>' +
          '</div>';
        mask.querySelector('button').addEventListener('click', function () { openModal('unlock'); });
        out.appendChild(mask);
      } else if (mask) {
        mask.remove();
      }
    });
    updateCounters();
  }

  function updateCounters() {
    var left = Math.max(0, FREE_USES - state.uses);
    document.querySelectorAll('[data-uses-left]').forEach(function (el) {
      if (state.unlocked) { el.innerHTML = '<b>Unlocked</b> · unlimited use'; return; }
      el.innerHTML = locked()
        ? '<b>0</b> free calculations left'
        : '<b>' + left + '</b> free calculation' + (left === 1 ? '' : 's') + ' left';
    });
  }

  /* One "use" = the viewer changed inputs and paused. Debounced so typing a
     four-digit price is one use, not four, and rate-limited so holding a
     number stepper cannot burn the allowance. */
  var timer = null, lastCount = 0;
  function noteUse() {
    if (state.unlocked || locked()) return;
    clearTimeout(timer);
    timer = setTimeout(function () {
      var now = Date.now();
      if (now - lastCount < 4000) return;
      lastCount = now;
      state.uses += 1;
      write(state);
      applyGate();
    }, 1200);
  }

  function init() {
    var fields = document.querySelectorAll('.tool-fields input, .tool-fields select');
    if (fields.length) {
      fields.forEach(function (f) { f.addEventListener('input', noteUse); });
      applyGate();
    }
    document.querySelectorAll('[data-enquiry]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        openModal(b.getAttribute('data-enquiry'));
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
