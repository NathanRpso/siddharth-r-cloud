  // ═════ HELPERS ═════
  // Wrap the cents portion of a price string in a <span class="cents">, so it
  // can be styled smaller and less prominent than the whole-dollar amount.
  // Handles inputs like "$399.99", "$49.99 / year", "$199.99 on 03/15/2027".
  function fmtPrice(s) {
    if (s == null) return '';
    return String(s).replace(/(\$[\d,]+)(\.\d{2})/, '$1<span class="cents">$2</span>');
  }
  window.fmtPrice = fmtPrice;

  // ═════ ICONS (Rapsodo style: thin stroke, rounded caps, 24x24) ═════
  const icons = {
    check:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>',
    checkSm:  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>',
    x:        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>',
    chevron:  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>',
    // Rapsodo-style mobile and PC icons (thin stroke, rounded line ends)
    mobile:   '<svg class="opt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11.5 18.25h1"/></svg>',
    pc:       '<svg class="opt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M8 20.5h8"/><path d="M12 16.5v4"/></svg>'
  };

  // ═════ DATA ═════
  const devices = [
    { id: 'mlm2pro', name: 'MLM2PRO or MLM2XPRO', desc: 'Portable launch monitor', img: './MLM2PRO_front-view.png' },
    { id: 'clmpro',  name: 'CLMPRO',  desc: 'Ceiling-mounted launch monitor',  img: './CLMPRO_Render1.png' }
  ];

  const setupOptions = [
    { id: 'outdoor', label: 'Outdoor only' },
    { id: 'indoor',  label: 'Indoor only' },
    { id: 'both',    label: 'Outdoor + Indoor' }
  ];

  const platformOptions = [
    { id: 'mobile', label: 'Mobile', icon: 'mobile' },
    { id: 'pc',     label: 'PC',     icon: 'pc' }
  ];

  const plans = {
    Core: {
      name: 'Core', price: '$199.99', period: '/ year',
      eyebrow: 'Mobile-first membership',
      summary: 'Everything you need for performance improvement and standard course simulation on mobile and PC.',
      cta: 'Activate Trial',
      note: '21-day free trial. Billed annually. Cancel any time.',
      features: [
        'Mobile + PC app access',
        'Driving Range + Target Range',
        'Bag Mapping + Wedge Matrix',
        'Combines and Skills Challenges',
        'Standard Course Simulation',
        '3rd Party App Compatibility'
      ]
    },
    Studios: {
      name: 'Studios', price: '$399.99', period: '/ year',
      eyebrow: 'Studio / simulator membership',
      summary: 'The complete Rapsodo experience &mdash; Core features plus Studios courses on PC. Requires a gaming PC or Laptop &mdash; review <a href="#" class="specs-link" onclick="openSpecsModal();return false;">specs</a>.',
      cta: 'Purchase Studios',
      note: 'Billed annually. Requires a gaming PC or laptop. Cancel any time.',
      features: [
        'Everything in Core',
        'Rapsodo Studios Courses (Premium 4K Realism)',
        'Community Courses (Built by the Rapsodo Course Builder Community)',
        'On Course Practice',
        'Expanded Family Profiles'
      ]
    }
  };

  const comparisonRows = [
    { group: 'Rapsodo Device Compatibility' },
    { label: 'MLM2PRO / MLM2XPRO',                                                                 core: true,  studios: true  },
    { label: 'CLMPRO',                                                                              core: false, studios: true  },
    { group: 'App Compatibility' },
    { label: 'Mobile App',                                                                          core: true,  studios: true  },
    { label: 'PC App',                                                                              core: true,  studios: true  },
    { group: 'Experience' },
    { label: 'Practice Features (Driving Range, Target Range)',                                     core: true,  studios: true  },
    { label: 'Combines, Drills, & Skill Challenges',                                                core: true,  studios: true  },
    { label: 'Bag Mapping & Wedge Matrix',                                                         core: true,  studios: true  },
    { label: 'Rapsodo Studios Course Simulation (Premium 4K Realism)',                              core: false, studios: true  },
    { label: 'Community Course Simulation (Built by the Rapsodo Course Builder Community)',        core: false, studios: true  },
    { label: 'Standard Course Simulation',                                                          core: true,  studios: true  },
    { label: 'On Course Practice',                                                                  core: false, studios: true  },
    { label: '3rd Party Apps — GSPro, Awesome Golf, E6 Connect, E6 Apex',                          core: true,  studios: true  }
  ];

  // ═════ STATE ═════
  const state = {
    devices: new Set(),
    setup: null,
    platforms: new Set()
  };

  // ═════ PROTOTYPE MODE ═════
  let protoMode   = 'normal'; // 'normal' | 'lifetime' | 'core-member' | 'studios-member' | 'additional-mlm-transfer'
  let scenario    = 0;        // 0=none, 1–12
  let refundMode  = false;    // true for scenarios 9 & 10
  let additionalDevicePurchased = false; // transient flag — true during purchase flow
  let additionalDeviceAdded = false;     // persistent within scenario — true after purchase complete
  let membershipCancelled = false;       // true after Cancel Membership confirmed
  let warrantyPurchased = null;          // null | '1-year' | '2-year' — set when warranty purchased in scenario 13

  // ═════ MEMBERSHIP DATA (per scenario) ═════
  const membershipData = {
    6:  { type: 'Core Membership', badge: 'Lifetime',  devices: [{type:'MLM2PRO',  serial:'M2P030686251'}], expiry: null,         nextBill: null,                          holder: {i:'EL',c:'#cd1b32'}, subs: [],                                                                           maxSubs: 1 },
    7:  { type: 'Core Membership', badge: null,         devices: [{type:'MLM2PRO',  serial:'M2P030686251'}], expiry: '03/15/2027', nextBill: '$199.99 on 03/15/2027',       holder: {i:'EL',c:'#cd1b32'}, subs: [{i:'JK',c:'#7c3aed'}],                                                  maxSubs: 1 },
    8:  { type: 'Studios Membership', badge: null,      devices: [{type:'MLM2PRO',  serial:'M2P030686251'}], expiry: '05/01/2027', nextBill: '$399.99 on 05/01/2027',       holder: {i:'EL',c:'#cd1b32'}, subs: [{i:'JK',c:'#7c3aed'},{i:'AL',c:'#0ea5e9'}],                             maxSubs: 3 },
    9:  { type: 'Core Membership', badge: null,         devices: [{type:'MLM2PRO',  serial:'M2P030686251'}], expiry: '03/15/2027', nextBill: '$199.99 on 03/15/2027',       holder: {i:'EL',c:'#cd1b32'}, subs: [{i:'JK',c:'#7c3aed'}],                                                  maxSubs: 1 },
    10: { type: 'Studios Membership', badge: null,      devices: [{type:'MLM2PRO',  serial:'M2P030686251'}], expiry: '05/01/2027', nextBill: '$399.99 on 05/01/2027',       holder: {i:'EL',c:'#cd1b32'}, subs: [{i:'JK',c:'#7c3aed'},{i:'AL',c:'#0ea5e9'}],                             maxSubs: 3 },
    11: { type: 'Core Membership', badge: null,         devices: [{type:'MLM2PRO',  serial:'M2P030686251'}], expiry: '06/20/2027', nextBill: '$199.99 on 06/20/2027',       holder: {i:'EL',c:'#cd1b32'}, subs: [],                                                                           maxSubs: 1 },
    12: { type: 'Core Membership', badge: null,         devices: [{type:'MLM2PRO',  serial:'M00054321098'}], expiry: '03/15/2027', nextBill: '$199.99 on 03/15/2027',       holder: {i:'EL',c:'#cd1b32'}, subs: [{i:'JK',c:'#7c3aed'}],                                                  maxSubs: 1 },
    13: { type: 'Core Membership', badge: null,         devices: [{type:'MLM2PRO',  serial:'M2P030686251'}], expiry: '03/15/2027', nextBill: '$199.99 on 03/15/2027',       holder: {i:'EL',c:'#cd1b32'}, subs: [{i:'JK',c:'#7c3aed'}],                                                  maxSubs: 1 },
  };

  // ═════ ELIGIBILITY ═════
  function isCoreEligible() {
    if (!state.setup || state.platforms.size === 0) return null;
    const pcOnly = state.platforms.has('pc') && !state.platforms.has('mobile');
    return !(pcOnly && state.setup === 'outdoor');
  }
  function isStudiosEligible() {
    if (!state.setup || state.platforms.size === 0) return null;
    return state.platforms.has('pc') && (state.setup === 'indoor' || state.setup === 'both');
  }
  function getRecommended() {
    if (isStudiosEligible() === true) return 'Studios';
    if (isCoreEligible() === true) return 'Core';
    return null;
  }

  // ═════ VIABILITY ═════
  // Holistic check across all selected devices, setup, and platforms together.
  // A combination is NOT supported if ANY of these rules trigger:
  //   1. Setup = Outdoor only AND platforms = {PC only}
  //   2. CLMPRO selected AND platforms = {Mobile only}
  //   3. CLMPRO selected AND Setup = Outdoor only
  //   4. CLMPRO selected AND Setup = Both AND MLM2PRO/MLM2XPRO NOT selected
  //   5. CLMPRO selected AND MLM2PRO/MLM2XPRO NOT selected AND Mobile in platforms
  function isCombinationViable(device, platform, setup) {
    // Per-pair check (kept for back-compat / future use). Holistic rules
    // below are what actually drive the warning.
    if (device === 'clmpro') {
      return platform === 'pc' && setup === 'indoor';
    }
    if (platform === 'pc' && setup === 'outdoor') return false;
    return true;
  }
  function checkViability() {
    if (state.devices.size === 0 || state.platforms.size === 0 || !state.setup) {
      return { status: 'incomplete', problems: [] };
    }
    const hasClmpro = state.devices.has('clmpro');
    const hasMlm    = state.devices.has('mlm2pro');
    const hasMobile = state.platforms.has('mobile');
    const hasPc     = state.platforms.has('pc');
    const setup     = state.setup;

    const problems = [];

    // Rule 1: Outdoor only + PC selected (regardless of Mobile)
    if (setup === 'outdoor' && hasPc) {
      problems.push({ rule: 1, reason: 'PC is only for indoor use &mdash; the PC platform is not compatible with an Outdoor-only setup' });
    }
    // Rule 3: CLMPRO + Outdoor only (regardless of MLM2PRO)
    if (hasClmpro && setup === 'outdoor') {
      problems.push({ rule: 3, reason: 'CLMPRO is built for indoor simulator bays only — Outdoor-only setup is not valid with CLMPRO selected' });
    }
    // Rule 4: CLMPRO + Both, no MLM2PRO
    if (hasClmpro && setup === 'both' && !hasMlm) {
      problems.push({ rule: 4, reason: 'CLMPRO alone can&rsquo;t cover outdoor use — add MLM2PRO/MLM2XPRO for Outdoor + Indoor setups' });
    }
    // Rule 2: CLMPRO + Mobile-only platforms
    if (hasClmpro && hasMobile && !hasPc) {
      problems.push({ rule: 2, reason: 'CLMPRO is a ceiling-mounted unit and requires the PC platform' });
    }
    // Rule 5: CLMPRO-only + Mobile in platforms (no MLM2PRO to use Mobile)
    if (hasClmpro && !hasMlm && hasMobile && hasPc) {
      problems.push({ rule: 5, reason: 'CLMPRO alone doesn&rsquo;t use the Mobile app — remove Mobile or add MLM2PRO/MLM2XPRO' });
    }

    return { status: problems.length === 0 ? 'ok' : 'problem', problems };
  }
  // ═════ STEP-GATED DISABLES ═════
  // Step order: Devices → Setup → Platforms.
  // A later-step option is DISABLED when an earlier-step selection makes it
  // structurally invalid. Disabled options are visually greyed-out, ignore
  // clicks, and any previously-selected value is auto-cleared so the user
  // never lands in an invalid state via the UI.
  function isSetupDisabled(setupId) {
    const hasClm = state.devices.has('clmpro');
    const hasMlm = state.devices.has('mlm2pro');
    // CLMPRO alone → only Indoor is valid. Outdoor / Both disabled.
    if (hasClm && !hasMlm && (setupId === 'outdoor' || setupId === 'both')) return true;
    return false;
  }
  function isPlatformDisabled(platformId) {
    const hasClm = state.devices.has('clmpro');
    const hasMlm = state.devices.has('mlm2pro');
    // CLMPRO alone → Mobile disabled (CLMPRO doesn't use the Mobile app).
    if (hasClm && !hasMlm && platformId === 'mobile') return true;
    // Outdoor only → PC disabled (PC is indoor-only).
    if (state.setup === 'outdoor' && platformId === 'pc') return true;
    return false;
  }
  // Auto-clear any state values that the current disables have made invalid.
  // Call after every state change so the UI never carries a now-disabled
  // selection forward into the next render.
  function clampStateToDisables() {
    if (state.setup && isSetupDisabled(state.setup)) state.setup = null;
    for (const p of [...state.platforms]) {
      if (isPlatformDisabled(p)) state.platforms.delete(p);
    }
  }

  function deviceLabel(id) {
    return ({ mlm2pro: 'MLM2PRO', clmpro: 'CLMPRO' })[id] || id;
  }
  function platformLabel(id) {
    return ({ mobile: 'Mobile', pc: 'PC' })[id] || id;
  }
  function setupLabel(id) {
    return ({ outdoor: 'Outdoor only', indoor: 'Indoor only', both: 'Outdoor + Indoor' })[id] || id;
  }

  // ═════ RENDERERS ═════
  function renderDevices() {
    const grid = document.getElementById('deviceGrid');
    grid.innerHTML = devices.map(d => {
      const selected = state.devices.has(d.id);
      return `
        <button class="device-card ${selected ? 'selected' : ''}" data-device="${d.id}" type="button">
          <div class="device-image-wrap">
            <img src="${d.img}" alt="${d.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
            <div class="img-fallback" style="display:none">${d.name}</div>
          </div>
          <div class="device-info">
            <h4>${d.name}</h4>
            <p>${d.desc}</p>
          </div>
          <span class="device-check">${icons.checkSm}</span>
        </button>
      `;
    }).join('');
    grid.querySelectorAll('[data-device]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.device;
        if (state.devices.has(id)) state.devices.delete(id); else state.devices.add(id);
        clampStateToDisables();
        renderAll();
      });
    });
  }

  function renderSetup() {
    const row = document.getElementById('setupRow');
    row.innerHTML = setupOptions.map(o => {
      const disabled = isSetupDisabled(o.id);
      return `
      <button class="option-btn ${state.setup === o.id ? 'selected' : ''} ${disabled ? 'is-disabled' : ''}"
              data-setup="${o.id}" type="button" ${disabled ? 'disabled aria-disabled="true"' : ''}>
        <span class="opt-check">${icons.checkSm}</span>${o.label}
      </button>
    `;
    }).join('');
    row.querySelectorAll('[data-setup]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled || btn.classList.contains('is-disabled')) return;
        state.setup = (state.setup === btn.dataset.setup) ? null : btn.dataset.setup;
        clampStateToDisables();
        renderAll();
      });
    });
  }

  function renderPlatforms() {
    const row = document.getElementById('platformRow');
    row.innerHTML = platformOptions.map(o => {
      const disabled = isPlatformDisabled(o.id);
      return `
      <button class="option-btn ${state.platforms.has(o.id) ? 'selected' : ''} ${disabled ? 'is-disabled' : ''}"
              data-platform="${o.id}" type="button" ${disabled ? 'disabled aria-disabled="true"' : ''}>
        ${icons[o.icon]}
        <span>${o.label}</span>
      </button>
    `;
    }).join('');
    row.querySelectorAll('[data-platform]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled || btn.classList.contains('is-disabled')) return;
        const id = btn.dataset.platform;
        if (state.platforms.has(id)) state.platforms.delete(id); else state.platforms.add(id);
        renderAll();
      });
    });
  }

  function reasonForIneligibility(planName) {
    if (planName === 'Core') {
      return 'Core requires either a Mobile platform or a setup that includes indoor use. Your current selections (PC only + Outdoor only) aren&rsquo;t supported.';
    }
    if (!state.platforms.has('pc')) {
      return 'Studios requires the PC platform. Add PC to your platform selection to unlock Studios.';
    }
    if (state.setup === 'outdoor') {
      return 'Studios is built for indoor simulator setups. Choose Indoor only or Outdoor + Indoor to unlock Studios.';
    }
    return 'Studios isn&rsquo;t available for your current setup.';
  }

  function renderPlans() {
    const recommended = getRecommended();
    const coreElig = isCoreEligible();
    const studiosElig = isStudiosEligible();

    const grid = document.getElementById('planGrid');

    // Scenarios 8, 10 & 13: Studios member — show only Studios as current plan
    if (protoMode === 'studios-member') {
      const plan = plans['Studios'];
      const cancelLabel = refundMode ? 'Request Refund' : 'Manage Membership';
      grid.innerHTML = `
        <article class="plan current-plan" style="max-width:480px">
          <div class="current-plan-badge">&#10003; Current Plan</div>
          <h3>${plan.name}</h3>
          <p class="plan-summary">${plan.summary}</p>
          <div class="price"><span class="amount">${fmtPrice(plan.price)}</span><span class="period">&nbsp;${plan.period}</span></div>
        </article>`;
      return;
    }

    grid.innerHTML = Object.values(plans).filter(plan => {
      // For lifetime and core-member modes, only show Core card
      if (protoMode === 'lifetime' || protoMode === 'core-member' || protoMode === 'additional-mlm-transfer') {
        return plan.name === 'Core';
      }
      return true;
    }).map(plan => {
      const elig = plan.name === 'Core' ? coreElig : studiosElig;
      const ineligible = elig === false;
      const isRec = recommended === plan.name && !ineligible;
      const reason = ineligible ? reasonForIneligibility(plan.name) : '';

      // ── Prototype mode overrides ─────────────────────────────
      let displayName  = plan.name + ' Membership';
      let displayPrice = plan.price;
      let displayCta   = plan.cta;
      let displayNote  = plan.note;
      let showPrice    = true;
      let showCta      = true;
      let subtitle     = null;
      let currentPlan    = false;
      let lifetimeNote   = false;
      let showBillingCta = false;

      if (protoMode === 'lifetime') {
        if (plan.name === 'Core') {
          subtitle     = 'Lifetime Membership';
          currentPlan  = true;
          showPrice    = false;
          showCta      = false;
          lifetimeNote = true;
          displayNote  = '';
        }
        if (plan.name === 'Studios') {
          displayName  = 'Studios Add-On';
          displayPrice = '$199.99';
          displayCta   = 'Purchase Studios Add-On';
        }
      }
      if (protoMode === 'core-member') {
        if (plan.name === 'Core') {
          currentPlan    = true;
          showCta        = false;
          showBillingCta = false;
          displayNote    = '';
        }
        if (plan.name === 'Studios') {
          displayCta = 'Upgrade to Studios';
        }
      }
      if (protoMode === 'additional-mlm-transfer') {
        if (plan.name === 'Core') {
          currentPlan    = true;
          showCta        = false;
          showBillingCta = false;
          displayNote    = '';
        }
      }
      // Scenario 5: Not Trial Eligible — Core shows "Purchase Core" instead of "Activate Trial"
      if (scenario === 5 && plan.name === 'Core') displayCta = 'Purchase Core';
      // ─────────────────────────────────────────────────────────

      const cancelBillingLabel = refundMode ? 'Request Refund' : 'Manage Membership';
      const ctaHtml = ineligible
        ? `<button class="cta" disabled>Unavailable</button>`
        : (showCta ? `<button class="cta" data-plan="${plan.name}" onclick="openStripeToast()">${displayCta}</button>` : '');

      return `
        <article class="plan ${isRec ? 'recommended' : ''} ${ineligible ? 'ineligible' : ''} ${currentPlan ? 'current-plan' : ''}">
          ${isRec       ? `<div class="rec-badge">&#9733; Recommended</div>` : ''}
          ${currentPlan ? `<div class="current-plan-badge">&#10003; Current Plan</div>` : ''}
          ${ineligible  ? `<div class="ineligible-banner">Not available for your setup</div>` : ''}
          <h3>${displayName}</h3>
          ${subtitle    ? `<p class="plan-subtitle">${subtitle}</p>` : ''}
          <p class="plan-summary">${plan.summary}</p>
          ${showPrice   ? `<div class="price"><span class="amount">${fmtPrice(displayPrice)}</span><span class="period">&nbsp;${plan.period}</span></div>` : ''}
          ${ineligible  ? `<div class="ineligible-reason">${reason}</div>` : ''}
          ${ctaHtml}
          <div class="includes">
            <p class="includes-title">Includes</p>
            <div class="feature-list">
              ${plan.features.map(f => `<div class="feature"><span class="small-check">${icons.checkSm}</span>${f}</div>`).join('')}
            </div>
          </div>
          ${lifetimeNote    ? `<div class="lifetime-note"><span>&#10003;</span> All Core features are included with your Lifetime membership.</div>` : ''}
          ${displayNote     ? `<p class="note">${displayNote}</p>` : ''}
          ${showBillingCta  ? `<div class="billing-btns"><button class="btn-secondary" type="button" onclick="openEditBilling()">Edit Billing</button><button class="btn-secondary" type="button" onclick="${refundMode ? `openCancelModal('${plan.name}',true)` : (plan.name==='Studios' ? 'openManageMembershipModal()' : `openCancelModal('${plan.name}',false)`)}">${cancelBillingLabel}</button></div>` : ''}
        </article>
      `;
    }).join('');
  }

  function renderCompare() {
    document.getElementById('compareChevron').innerHTML = icons.chevron;
    const body = document.getElementById('compareBody');
    body.innerHTML = `
      <div class="compare-head"><div></div><div>Core</div><div>Studios</div></div>
      ${comparisonRows.map(row => row.group ? `
        <div class="group-row">${row.group}</div>
      ` : `
        <div class="compare-row">
          <div><div class="row-label">${row.label}${!row.core && row.studios ? '<span class="studios-badge">Studios</span>' : ''}</div></div>
          <div class="cell-icon ${row.core ? '' : 'no'}">${row.core ? `<span class="small-check">${icons.checkSm}</span>` : icons.x}</div>
          <div class="cell-icon ${row.studios ? '' : 'no'}">${row.studios ? `<span class="small-check">${icons.checkSm}</span>` : icons.x}</div>
        </div>
      `).join('')}
    `;
  }

  function renderViability() {
    const result = checkViability();
    const warn = document.getElementById('viabilityWarning');
    const ok = document.getElementById('viabilityOk');
    const list = document.getElementById('viabilityList');
    if (result.status === 'incomplete') {
      warn.style.display = 'none'; ok.style.display = 'none'; return;
    }
    if (result.status === 'ok') {
      warn.style.display = 'none'; ok.style.display = 'flex'; return;
    }
    // problem
    ok.style.display = 'none';
    warn.style.display = 'flex';
    list.innerHTML = result.problems.map(p => {
      return `<li>&middot; ${p.reason}</li>`;
    }).join('');
  }

  function renderAll() {
    renderDevices();
    renderSetup();
    renderPlatforms();
    renderPlans();
    renderViability();
    renderYourMembership();
    renderOffers();
  }

  function renderYourMembership() {
    const section = document.getElementById('yourMembershipSection');
    const data    = membershipData[scenario];
    const isMemberScenario = scenario >= 6;

    if (!section) return;
    section.classList.toggle('visible', isMemberScenario && !!data);

    if (!data || !isMemberScenario) return;

    const isStudios = data.type === 'Studios Membership';
    const isRefund  = refundMode;

    // Determine "Manage Membership" fn for the main plan
    let mainManageFn = '';
    if (scenario === 6) {
      mainManageFn = ''; // Lifetime — no manage
    } else if (isStudios && !isRefund) {
      mainManageFn = `openManageMembershipModal()`;
    } else if (isRefund) {
      mainManageFn = `openCancelModal('${data.type.replace(' Membership','')}', true)`;
    } else {
      mainManageFn = `openCancelModal('${data.type.replace(' Membership','')}', false)`;
    }
    const mainManageLabel = isRefund ? 'Request Refund' : 'Manage Membership';

    // Profile bubbles
    const remaining = Math.max(0, data.maxSubs - data.subs.length);
    const bubbles = [
      `<span class="profile-bubble holder" title="Account holder">${data.holder.i}</span>`,
      ...data.subs.map((s, i) => `<span class="profile-bubble sub-${i}" style="background:${s.c}" title="Sub-account">${s.i}</span>`),
      ...(remaining > 0 ? [`<span class="profile-bubble remaining" title="${remaining} slot${remaining>1?'s':''} available">+${remaining}</span>`] : [])
    ].join('');

    // Device list with serial numbers
    const devicesLabel = data.devices.length > 1 ? 'Devices' : 'Device';
    const devicesHtml  = data.devices.map(d => `${d.type} (serial # ${d.serial})`).join(', ');

    // Billing / expiry line — varies by cancel state
    let billingHtml;
    if (membershipCancelled && data.expiry) {
      billingHtml = `Your membership will not renew after ${data.expiry}`;
    } else if (data.expiry) {
      billingHtml = `Expires: ${data.expiry}${data.nextBill ? ` &bull; Next bill: ${fmtPrice(data.nextBill)}` : ''}`;
    } else {
      billingHtml = 'Lifetime Membership &mdash; no renewal required.';
    }

    const badgeHtml = data.badge
      ? `<span style="display:inline-block;margin-left:10px;padding:2px 10px;background:#e4e5e9;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#5c616b;vertical-align:middle;">${data.badge}</span>`
      : '';

    // Manage Membership button hidden after cancellation
    const showManageBtn = mainManageFn && !membershipCancelled;

    // Main membership plan item
    const mainPlanItem = `
      <div class="ym-plan-item">
        <div class="ym-plan-header">
          <div class="ym-plan-info">
            <div class="ym-type">${data.type}${badgeHtml}</div>
            <div class="ym-device">${devicesLabel}: ${devicesHtml}</div>
            <div class="ym-billing" style="margin-bottom:12px;">${billingHtml}</div>
            <div class="ym-profiles-row">
              <span class="ym-profiles-label">Profiles</span>
              ${bubbles}
            </div>
          </div>
          ${showManageBtn ? `<button class="ym-plan-manage-btn" type="button" onclick="${mainManageFn}">${mainManageLabel}</button>` : ''}
        </div>
      </div>`;

    // Purchased Extended Warranty item (scenario 13 only, shown after purchase)
    const warrantyLabel = warrantyPurchased === '1-year' ? '1-Year Extended Warranty'
                        : warrantyPurchased === '2-year' ? '2-Year Extended Warranty'
                        : '';
    const warrantyItem = (scenario === 13 && warrantyPurchased) ? `
      <div class="ym-plan-item">
        <div class="ym-plan-header">
          <div class="ym-plan-info">
            <div class="ym-type">${warrantyLabel}</div>
            <div class="ym-device">${devicesLabel}: ${devicesHtml}</div>
          </div>
        </div>
      </div>` : '';

    // Additional Device plan item (shown after purchase in scenario 12)
    const additionalDeviceItem = additionalDeviceAdded ? `
      <div class="ym-plan-item">
        <div class="ym-plan-header">
          <div class="ym-plan-info">
            <div class="ym-type">Additional Device Membership</div>
            <div class="ym-device">MLM2PRO (serial # M00012345678)</div>
            <div class="ym-billing">${fmtPrice('$49.99')} / year &bull; Renews with Core membership on 03/15/2027</div>
          </div>
          ${!membershipCancelled ? `<button class="ym-plan-manage-btn" type="button" onclick="openCancelModal('Core', false)">Manage Membership</button>` : ''}
        </div>
      </div>` : '';

    section.innerHTML = `
      <div class="your-membership-card" id="yourMembershipCard">
        <div class="ym-top">
          <div class="ym-eyebrow" style="font-size:18px;font-weight:600;letter-spacing:-.18px;line-height:155%;text-transform:uppercase;color:#111;margin-bottom:16px;">Your Membership &amp; Purchases</div>
          <div class="ym-plans-row">
            ${mainPlanItem}
            ${additionalDeviceItem}
            ${warrantyItem}
          </div>
        </div>
        <div class="ym-bottom">
          <button class="ym-quick-link" type="button" onclick="openEditBilling()">Edit Billing</button>
          <button class="ym-quick-link" type="button">Manage Profiles</button>
          <button class="ym-quick-link" type="button" onclick="openPurchaseHistory()">Purchase History</button>
        </div>
      </div>`;
  }

  // Initial render
  renderAll();
  renderCompare();

  // Help Me Choose toggle — collapsed by default
  document.getElementById('hmcChevron').innerHTML = icons.chevron;
  // (do NOT add 'open' — starts collapsed)
  document.getElementById('hmcToggle').addEventListener('click', () => {
    document.getElementById('helpMeChoose').classList.toggle('open');
  });

  // Clear Selections
  document.getElementById('hmcClearBtn').addEventListener('click', () => {
    state.devices.clear();
    state.setup = null;
    state.platforms.clear();
    renderAll();
  });

  // Compare toggle — open by default
  document.getElementById('compareChevron').innerHTML = icons.chevron;
  document.getElementById('compare').classList.add('open');
  document.getElementById('compareToggle').addEventListener('click', () => {
    document.getElementById('compare').classList.toggle('open');
  });

  // ═════ SCENARIO SYSTEM ═════
  function applyScenario(n) {
    scenario = n;
    document.body.dataset.scenario = n;
    // Always close any open cancel modals/screens when switching scenarios
    closeCancelModal();
    closeCancelScreen();
    closeManageMembershipModal();
    closeDowngradeConfirm();
    // Close new modals
    if (document.getElementById('studiosRequiredModal')) document.getElementById('studiosRequiredModal').style.display = 'none';
    if (document.getElementById('studiosNotNowModal')) document.getElementById('studiosNotNowModal').style.display = 'none';
    if (document.getElementById('mlmNotRegisteredModal')) document.getElementById('mlmNotRegisteredModal').style.display = 'none';
    if (document.getElementById('additionalDevicePurchaseBackdrop')) document.getElementById('additionalDevicePurchaseBackdrop').style.display = 'none';
    if (document.getElementById('refundRequestedBackdrop')) document.getElementById('refundRequestedBackdrop').style.display = 'none';
    if (document.getElementById('membershipUpdatedPopup')) document.getElementById('membershipUpdatedPopup').style.display = 'none';
    if (document.getElementById('membershipUpdatedBackdrop')) document.getElementById('membershipUpdatedBackdrop').style.display = 'none';
    // Reset per-scenario flags
    additionalDeviceAdded = false;
    additionalDevicePurchased = false;
    membershipCancelled = false;
    warrantyPurchased = null;

    // Update chip active states
    document.querySelectorAll('.scenario-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.scenario) === n);
    });

    const isOnboarding = n >= 1 && n <= 3;
    const profileEl = document.getElementById('appMainProfile');
    const overlayEl = document.getElementById('onboardingOverlay');
    const navEl     = document.querySelector('.app-nav');

    const navDefaultEl = document.getElementById('navLogoDefault');
    const navImgEl     = document.getElementById('navLogoImg');
    const useImgLogo   = n >= 4; // in-app scenarios only

    if (navDefaultEl) navDefaultEl.style.display = useImgLogo ? 'none' : '';
    if (navImgEl)     navImgEl.style.display      = useImgLogo ? 'block' : 'none';

    if (isOnboarding) {
      profileEl.style.display = 'none';
      overlayEl.style.display = 'flex';
      if (navEl) navEl.style.display = 'none';
      protoMode = 'normal';
      refundMode = false;
      renderOnboardingContent(n);
    } else {
      profileEl.style.display = '';
      overlayEl.style.display = 'none';
      if (navEl) navEl.style.display = '';

      // Set refund mode for scenarios 9 & 10
      refundMode = (n === 9 || n === 10);

      // Set protoMode for in-app scenarios
      if (n === 6)                        protoMode = 'lifetime';
      else if (n === 7 || n === 9)        protoMode = 'core-member';
      else if (n === 8 || n === 10)       protoMode = 'studios-member';
      else if (n === 11)                  protoMode = 'core-member';
      else if (n === 12)                  protoMode = 'core-member';
      else if (n === 13)                  protoMode = 'core-member';
      else                                protoMode = 'normal';

      // Hero title: "Manage" for members; "Choose" for free users.
      // Scenario 13 (warranty) hides the hero entirely — it adds no info over the YM section.
      const heroEl    = document.querySelector('.hero');
      const heroTitle = document.querySelector('.hero h2');
      if (heroEl)    heroEl.style.display    = (n === 13) ? 'none' : '';
      if (heroTitle) {
        const isManage = (n >= 6 && n <= 12); // member scenarios (not 13)
        heroTitle.textContent = isManage ? 'Manage Your Rapsodo Membership' : 'Choose Your Rapsodo Membership';
      }

      // Single-card flows: studios-member scenarios
      const studiosOnly = (n === 8 || n === 10);
      const singleCardFlow = studiosOnly;

      // HMC hidden for members and special flows
      const hideHMC = (n >= 6);
      document.getElementById('helpMeChoose').style.display     = hideHMC       ? 'none' : '';
      document.getElementById('compare').style.display          = singleCardFlow ? 'none' : '';
      document.getElementById('basicSection').style.display     = singleCardFlow ? 'none' : '';
      document.getElementById('billingActionBar').style.display = 'none';

      // Re-render with new mode
      renderAll();

      // Scenario 13: hide the plan cards grid (duplicates info already in YM section)
      var planGridEl = document.getElementById('planGrid');
      if (planGridEl) planGridEl.style.display = (n === 13) ? 'none' : '';

      // Scenario 11: show Studios Required modal after render
      if (n === 11) {
        openStudiosRequiredModal();
      }
      // Scenario 12: immediately show device choice modal after render
      if (n === 12) {
        openAdditionalMlmModal();
      }
      // Scenario 13: append warranty cards to the existing offer cards
      if (n === 13) {
        renderWarrantyOffers();
      }
    }
  }

  // Override getRecommended for onboarding scenarios (used by ob renderer)
  function getRecommendedForScenario(n) {
    if (n === 1) return 'Core';
    if (n === 2) return 'Studios';
    return null;
  }

  function renderOnboardingContent(n) {
    const upgradeWrap = document.getElementById('obUpgradeWrap');

    if (n === 3) {
      // CLMPRO PC user: Studios only + Bucket List upgrade
      upgradeWrap.style.display = 'flex';
      upgradeWrap.innerHTML = buildObBucketListCard();
    } else {
      upgradeWrap.style.display = 'none';
      upgradeWrap.innerHTML = '';
    }

    // Scenario 3 (CLMPRO): hide HMC, comparison, and basic — Studios is the only option
    const showObSections = (n !== 3);
    const obHmc = document.getElementById('obHelpMeChoose');
    const obCmp = document.getElementById('obCompare');
    const obBsc = document.getElementById('obBasicSection');
    if (obHmc) obHmc.style.display = showObSections ? '' : 'none';
    if (obCmp) obCmp.style.display = showObSections ? '' : 'none';
    if (obBsc) obBsc.style.display = showObSections ? '' : 'none';

    // Re-render the plan grid and all HMC elements for the new scenario
    renderObAll();
  }

  function buildObPlanCard(planName, isRec, ctaText) {
    const plan = plans[planName];
    return `
      <article class="plan ${isRec ? 'recommended' : ''}">
        ${isRec ? `<div class="rec-badge">&#9733; Recommended</div>` : ''}
        <h3>${plan.name} Membership</h3>
        <p class="plan-summary">${plan.summary}</p>
        <div class="price"><span class="amount">${fmtPrice(plan.price)}</span><span class="period">&nbsp;${plan.period}</span></div>
        <button class="cta" onclick="openStripeToast()">${ctaText}</button>
        <div class="includes">
          <p class="includes-title">Includes</p>
          <div class="feature-list">
            ${plan.features.map(f => `<div class="feature"><span class="small-check">${icons.checkSm}</span>${f}</div>`).join('')}
          </div>
        </div>
        <p class="note">${plan.note}</p>
      </article>`;
  }

  function buildObBucketListCard() {
    return `
      <div class="upgrade-card">
        <div class="upgrade-header">
          <div class="upgrade-name">Bucket List Course Pack</div>
          <div class="upgrade-price">${fmtPrice('$99.99')}<span class="upgrade-price-period"> / year</span></div>
        </div>
        <p class="upgrade-desc">Unlock an exclusive collection of iconic, bucket-list golf courses for play in the PC app&rsquo;s Rapsodo Studios experience.</p>
        <p class="upgrade-courses">Pebble Beach &bull; Spyglass Hill &bull; Links at Spanish Bay &bull; Del Monte &bull; The Hay</p>
        <span class="upgrade-eligibility">Studios members only</span>
        <button class="btn-upgrade" onclick="openStripeToast()">Purchase Upgrade</button>
      </div>`;
  }

  // ═════ ONBOARDING OVERLAY: HMC + COMPARE + BASIC RENDERERS ═════

  function renderObDevices() {
    const grid = document.getElementById('obDeviceGrid');
    if (!grid) return;
    grid.innerHTML = devices.map(d => {
      const selected = state.devices.has(d.id);
      return `
        <button class="device-card ${selected ? 'selected' : ''}" data-device="${d.id}" type="button">
          <div class="device-image-wrap">
            <img src="${d.img}" alt="${d.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
            <div class="img-fallback" style="display:none">${d.name}</div>
          </div>
          <div class="device-info"><h4>${d.name}</h4><p>${d.desc}</p></div>
          <span class="device-check">${icons.checkSm}</span>
        </button>`;
    }).join('');
    grid.querySelectorAll('[data-device]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.device;
        if (state.devices.has(id)) state.devices.delete(id); else state.devices.add(id);
        clampStateToDisables();
        renderObAll();
      });
    });
  }

  function renderObSetup() {
    const row = document.getElementById('obSetupRow');
    if (!row) return;
    row.innerHTML = setupOptions.map(o => {
      const disabled = isSetupDisabled(o.id);
      return `
      <button class="option-btn ${state.setup === o.id ? 'selected' : ''} ${disabled ? 'is-disabled' : ''}"
              data-setup="${o.id}" type="button" ${disabled ? 'disabled aria-disabled="true"' : ''}>
        <span class="opt-check">${icons.checkSm}</span>${o.label}
      </button>`;
    }).join('');
    row.querySelectorAll('[data-setup]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled || btn.classList.contains('is-disabled')) return;
        state.setup = (state.setup === btn.dataset.setup) ? null : btn.dataset.setup;
        clampStateToDisables();
        renderObAll();
      });
    });
  }

  function renderObPlatforms() {
    const row = document.getElementById('obPlatformRow');
    if (!row) return;
    row.innerHTML = platformOptions.map(o => {
      const disabled = isPlatformDisabled(o.id);
      return `
      <button class="option-btn ${state.platforms.has(o.id) ? 'selected' : ''} ${disabled ? 'is-disabled' : ''}"
              data-platform="${o.id}" type="button" ${disabled ? 'disabled aria-disabled="true"' : ''}>
        ${icons[o.icon]}<span>${o.label}</span>
      </button>`;
    }).join('');
    row.querySelectorAll('[data-platform]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled || btn.classList.contains('is-disabled')) return;
        const id = btn.dataset.platform;
        if (state.platforms.has(id)) state.platforms.delete(id); else state.platforms.add(id);
        renderObAll();
      });
    });
  }

  function renderObViability() {
    const warn = document.getElementById('obViabilityWarning');
    const ok   = document.getElementById('obViabilityOk');
    const list = document.getElementById('obViabilityList');
    if (!warn || !ok) return;
    const result = checkViability();
    if (result.status === 'incomplete') { warn.style.display = 'none'; ok.style.display = 'none'; return; }
    if (result.status === 'ok')         { warn.style.display = 'none'; ok.style.display = 'flex'; return; }
    ok.style.display = 'none';
    warn.style.display = 'flex';
    list.innerHTML = result.problems.map(p => `<li>&middot; ${p.reason}</li>`).join('');
  }

  function renderObPlanGrid() {
    const grid = document.getElementById('obPlanGrid');
    if (!grid) return;
    if (scenario === 3) {
      grid.classList.add('ob-single');
      grid.innerHTML = buildObPlanCard('Studios', false, 'Purchase Studios');
      return;
    }
    grid.classList.remove('ob-single');
    const stateRec = getRecommended();
    const rec = stateRec || getRecommendedForScenario(scenario);
    grid.innerHTML =
      buildObPlanCard('Core',    rec === 'Core',    'Activate Trial') +
      buildObPlanCard('Studios', rec === 'Studios', 'Purchase Studios');
  }

  function renderObAll() {
    renderObDevices();
    renderObSetup();
    renderObPlatforms();
    renderObViability();
    renderObPlanGrid();
  }

  function renderObCompare() {
    const chevron = document.getElementById('obCompareChevron');
    if (chevron) chevron.innerHTML = icons.chevron;
    const body = document.getElementById('obCompareBody');
    if (!body) return;
    body.innerHTML = `
      <div class="compare-head"><div></div><div>Core</div><div>Studios</div></div>
      ${comparisonRows.map(row => row.group ? `
        <div class="group-row">${row.group}</div>
      ` : `
        <div class="compare-row">
          <div><div class="row-label">${row.label}${!row.core && row.studios ? '<span class="studios-badge">Studios</span>' : ''}</div></div>
          <div class="cell-icon ${row.core ? '' : 'no'}">${row.core ? `<span class="small-check">${icons.checkSm}</span>` : icons.x}</div>
          <div class="cell-icon ${row.studios ? '' : 'no'}">${row.studios ? `<span class="small-check">${icons.checkSm}</span>` : icons.x}</div>
        </div>
      `).join('')}`;
  }

  // OB HMC toggle
  document.getElementById('obHmcChevron').innerHTML = icons.chevron;
  document.getElementById('obHmcToggle').addEventListener('click', () => {
    document.getElementById('obHelpMeChoose').classList.toggle('open');
  });

  // OB clear selections
  document.getElementById('obHmcClearBtn').addEventListener('click', () => {
    state.devices.clear(); state.setup = null; state.platforms.clear();
    renderObAll();
  });

  // OB compare toggle — open by default
  document.getElementById('obCompareChevron').innerHTML = icons.chevron;
  document.getElementById('obCompare').classList.add('open');
  document.getElementById('obCompareToggle').addEventListener('click', () => {
    document.getElementById('obCompare').classList.toggle('open');
  });

  // Render static ob compare once
  renderObCompare();
  // Initial ob HMC render
  renderObAll();

  // ═════ CANCELLATION FLOW ═════

  const cancelLoses = {
    'Core': [
      'Advanced shot metrics & ball flight analysis',
      'Mobile app access (iOS & Android)',
      'Session history & performance tracking',
      'Course Mode & virtual round play',
      'Priority customer support',
    ],
    'Studios': [
      'Virtual golf courses in the PC Simulator',
      'Advanced ball trajectory visualization',
      'Pebble Beach, Spyglass Hill & all Bucket List courses',
      'Rapsodo Studios simulator integration',
      'Exclusive Studios-only features & content',
    ],
  };

  let _cancelPlanName = '';
  let _isRefundMode   = false;

  function openCancelModal(planName, isRefund = false) {
    _cancelPlanName = planName;
    _isRefundMode   = isRefund;
    document.getElementById('cancelModalPlanName').textContent = planName;
    const list = document.getElementById('cancelModalLosesList');
    const items = cancelLoses[planName] || cancelLoses['Core'];
    list.innerHTML = items.map(i => `<li>${i}</li>`).join('');

    // Update title and confirm button based on refund vs cancel
    document.getElementById('cancelModalTitle').textContent =
      isRefund ? 'Request Refund' : 'Cancel Membership';
    document.getElementById('cancelModalConfirmBtn').textContent =
      isRefund ? 'YES, REQUEST REFUND' : 'YES, CANCEL MEMBERSHIP';
    document.getElementById('cancelMembershipBtn').textContent =
      isRefund ? 'Request Refund' : 'Cancel Membership';

    document.getElementById('cancelModalBackdrop').style.display = 'flex';
  }

  function closeCancelModal() {
    document.getElementById('cancelModalBackdrop').style.display = 'none';
  }

  function openCancelScreen() {
    closeCancelModal();
    // Reset the form
    document.getElementById('cancelReason').value = '';
    document.getElementById('cancelReason').classList.add('placeholder-shown');
    ['followupNoUse','followupCost','followupTechnical'].forEach(id => {
      document.getElementById(id).classList.remove('visible');
    });
    document.querySelectorAll('input[name="issueType"]').forEach(r => { r.checked = false; });
    document.querySelectorAll('.cancel-radio-label').forEach(l => l.classList.remove('selected'));
    document.getElementById('cancelTextCost').value = '';
    document.getElementById('cancelTextTech').value = '';
    document.getElementById('cancelTextCostCount').textContent = '0';
    document.getElementById('cancelTextTechCount').textContent = '0';
    const btn = document.getElementById('cancelMembershipBtn');
    btn.classList.remove('ready');
    btn.disabled = true;
    // Update title and submit button label
    const title = document.getElementById('cancelScreenTitle');
    if (title) title.textContent = _isRefundMode ? 'Request Refund' : 'Cancel Membership';
    btn.textContent = _isRefundMode ? 'Request Refund' : 'Cancel Membership';
    document.getElementById('cancelScreenBackdrop').style.display = 'flex';
  }

  function closeCancelScreen() {
    document.getElementById('cancelScreenBackdrop').style.display = 'none';
  }

  function validateCancelForm() {
    const reason = document.getElementById('cancelReason').value;
    let ready = false;
    if (reason === 'no-use') {
      // "Don't use enough" → needs free text
      ready = document.getElementById('cancelTextTech').value.trim().length > 0;
    } else if (reason === 'cost') {
      ready = document.getElementById('cancelTextCost').value.trim().length > 0;
    } else if (reason === 'technical') {
      // "Technical Concerns" → needs issue type radio
      ready = !!document.querySelector('input[name="issueType"]:checked');
    }
    const btn = document.getElementById('cancelMembershipBtn');
    btn.disabled = !ready;
    btn.classList.toggle('ready', ready);
  }

  function cancelMembershipSubmit() {
    const btn = document.getElementById('cancelMembershipBtn');
    if (!btn.classList.contains('ready')) return;
    closeCancelScreen();
    if (_isRefundMode) {
      openRefundRequestedModal();
    } else {
      showMembershipCancelled();
    }
  }

  function showMembershipCancelled() {
    const popup    = document.getElementById('membershipCancelledPopup');
    const backdrop = document.getElementById('membershipCancelledBackdrop');
    if (popup) popup.style.display = '';
    if (backdrop) backdrop.style.display = '';
    setTimeout(function() {
      if (popup) popup.style.display = 'none';
      if (backdrop) backdrop.style.display = 'none';
      membershipCancelled = true;
      renderAll();
    }, 3000);
  }

  // Cancellation reason dropdown
  // Cancel form handlers — defined as named functions so inline onchange/oninput attrs work
  // (the cancel modal HTML lives after the script tag, so addEventListener at parse time fails)
  function cancelReasonChanged(sel) {
    sel.classList.remove('placeholder-shown');
    const v = sel.value;
    document.getElementById('followupNoUse').classList.toggle('visible', v === 'no-use');
    document.getElementById('followupCost').classList.toggle('visible', v === 'cost');
    document.getElementById('followupTechnical').classList.toggle('visible', v === 'technical');
    document.querySelectorAll('input[name="issueType"]').forEach(r => { r.checked = false; });
    document.querySelectorAll('.cancel-radio-label').forEach(l => l.classList.remove('selected'));
    document.getElementById('cancelTextCost').value = '';
    document.getElementById('cancelTextTech').value = '';
    document.getElementById('cancelTextCostCount').textContent = '0';
    document.getElementById('cancelTextTechCount').textContent = '0';
    validateCancelForm();
  }
  function issueTypeChanged(radio) {
    document.querySelectorAll('.cancel-radio-label').forEach(l => {
      l.classList.toggle('selected', l.querySelector('input') === radio);
    });
    validateCancelForm();
  }
  function cancelTextInput(el, countId) {
    document.getElementById(countId).textContent = el.value.length;
    validateCancelForm();
  }

  // Cancel confirm modal backdrop click-away
  document.getElementById('cancelModalBackdrop').addEventListener('click', function(e) {
    if (e.target === this) closeCancelModal();
  });

  function cancelModalConfirmAction() {
    if (_isRefundMode) {
      closeCancelModal();
      openRefundRequestedModal();
    } else {
      openCancelScreen();
    }
  }

  // ── Scenario button handler (called via onclick attribute) ──
  function onScenarioClick(n) {
    applyScenario(scenario === n ? 0 : n); // click active scenario = reset to 0
  }

  // ── Stripe checkout toast ──
  function openStripeToast() {
    document.getElementById('stripeToastBackdrop').style.display = '';
    document.getElementById('stripeToast').style.display = '';
  }
  function closeStripeToast() {
    document.getElementById('stripeToastBackdrop').style.display = 'none';
    document.getElementById('stripeToast').style.display = 'none';
    if (additionalDevicePurchased) {
      additionalDevicePurchased = false;
      additionalDeviceAdded = true;
      protoMode = 'core-member';
      scenario = 12;
      document.body.dataset.scenario = 12;
      renderAll(); // renderYourMembership() inside will show the Additional Device row
    }
  }

  // ── Membership Updated popup (Change 3 / Change 8) ──
  function showMembershipUpdated() {
    const popup = document.getElementById('membershipUpdatedPopup');
    const backdrop = document.getElementById('membershipUpdatedBackdrop');
    if (popup) popup.style.display = '';
    if (backdrop) backdrop.style.display = '';
    setTimeout(function() {
      if (popup) popup.style.display = 'none';
      if (backdrop) backdrop.style.display = 'none';
      protoMode = 'core-member';
      scenario = 7;
      document.body.dataset.scenario = 7;
      renderAll();
    }, 3000);
  }

  // ── Refund Requested modal (Change 5) ──
  function openRefundRequestedModal() {
    document.getElementById('refundRequestedBackdrop').style.display = 'flex';
  }
  function closeRefundRequestedModal() {
    document.getElementById('refundRequestedBackdrop').style.display = 'none';
  }

  // ── Additional Device Purchase modal (Change 6) ──
  function openAdditionalDevicePurchaseModal() {
    document.getElementById('additionalDevicePurchaseBackdrop').style.display = 'flex';
  }
  function closeAdditionalDevicePurchaseModal() {
    document.getElementById('additionalDevicePurchaseBackdrop').style.display = 'none';
  }
  function purchaseAdditionalDevice() {
    closeAdditionalDevicePurchaseModal();
    additionalDevicePurchased = true;
    openStripeToast();
  }

  // ── Show Additional Device Upgrades section ──
  function showAdditionalDeviceUpgradesSection() {
    const section = document.getElementById('yourUpgradesSection');
    const card = document.getElementById('yourUpgradesCard');
    if (!section || !card) return;
    section.style.display = 'block';
    card.innerHTML = `
      <div style="background:#f2f3f5;border-radius:12px;border:1px solid #d3d5d9;overflow:hidden;">
        <div style="padding:20px 28px 16px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8d94a2;margin-bottom:8px;">Your Upgrades &amp; Purchases</div>
          <div style="font-size:18px;font-weight:700;color:#111;margin-bottom:4px;">Additional Device Membership</div>
          <div style="font-size:13px;color:#5c616b;margin-bottom:6px;">Device: MLM2PRO (serial # M00012345678)</div>
          <div style="font-size:13px;color:#5c616b;">${fmtPrice('$49.99')} / year &bull; Renews with Core membership on 03/15/2027</div>
        </div>
        <div style="background:#e8eaed;border-top:1px solid #d3d5d9;padding:12px 28px;display:flex;align-items:center;gap:8px;">
          <button class="ym-quick-link" type="button" onclick="openCancelModal('Core',false)">Manage Membership</button>
          <button class="ym-quick-link" type="button" onclick="openPurchaseHistory()">Purchase History</button>
        </div>
      </div>`;
  }

  // ── MLM Not Registered modal helpers ──
  function closeMlmNotRegisteredModal() {
    document.getElementById('mlmNotRegisteredModal').style.display = 'none';
  }
  function mlmGotItNotRegistered() {
    document.getElementById('mlmNotRegisteredModal').style.display = 'none';
    protoMode = 'additional-mlm-transfer';
    renderAll();
  }
  function mlmGoBackToTransfer() {
    document.getElementById('mlmNotRegisteredModal').style.display = 'none';
    document.getElementById('mlmTransferModal').style.display = 'flex';
  }

  // ── Studios Required modals (Change 7) ──
  function openStudiosRequiredModal() {
    document.getElementById('studiosRequiredModal').style.display = 'flex';
  }
  function closeStudiosRequiredModal() {
    document.getElementById('studiosRequiredModal').style.display = 'none';
  }
  function openStudiosNotNowModal() {
    closeStudiosRequiredModal();
    document.getElementById('studiosNotNowModal').style.display = 'flex';
  }
  function closeStudiosNotNowModal() {
    document.getElementById('studiosNotNowModal').style.display = 'none';
  }

  function toggleIncludes(btn) {
    const thisCollapsible = btn.parentElement;
    const upgradesGrid = thisCollapsible.closest('.upgrades-grid');
    if (upgradesGrid) {
      upgradesGrid.querySelectorAll('.offer-includes-collapsible').forEach(function(el) {
        if (el !== thisCollapsible) el.classList.remove('open');
      });
    }
    thisCollapsible.classList.toggle('open');
    if (upgradesGrid) {
      const openContent = upgradesGrid.querySelector('.offer-includes-collapsible.open .offer-includes-content');
      if (openContent) {
        // The #compare section has margin-top that collapses with the grid's
        // margin-bottom. To get exactly 40px between expanded-content-bottom
        // and compare-top, we need spacer = overflow + 40, where overflow is
        // how far the absolute content extends past the grid's own bottom edge.
        void upgradesGrid.offsetHeight;
        const contentBottom = openContent.getBoundingClientRect().bottom;
        const gridBottom = upgradesGrid.getBoundingClientRect().bottom;
        const overflow = Math.max(0, contentBottom - gridBottom);
        upgradesGrid.style.setProperty('--includes-expanded-spacer', (overflow + 40) + 'px');
      } else {
        upgradesGrid.style.removeProperty('--includes-expanded-spacer');
      }
    }
  }

  // ── renderOffers() — dynamically render Offers For You section ──
  function renderOffers() {
    const upgradesSection = document.querySelector('.upgrades');
    const grid = document.getElementById('upgradesSectionGrid');
    if (!upgradesSection || !grid) return;

    const addOnPill = '<span style="display:inline-block;margin-left:8px;padding:2px 8px;background:#e4e5e9;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#5c616b;vertical-align:middle;">Add-On</span>';

    function includesBlock(plan) {
      return `
        <div class="offer-includes-collapsible">
          <button class="offer-includes-toggle" type="button" onclick="toggleIncludes(this)">
            <span>Includes</span><span class="toggle-chevron">&#9660;</span>
          </button>
          <div class="offer-includes-content">
            <div class="feature-list">
              ${plan.features.map(f => `<div class="feature"><span class="small-check">${icons.checkSm}</span>${f}</div>`).join('')}
            </div>
          </div>
        </div>`;
    }

    // Helper: Studios plan card
    function studiosCard(label, price, ctaLabel) {
      const plan = plans['Studios'];
      // For active Core members (scenarios 7, 9, 12), Studios upgrade is
      // prorated against their existing Core term. Show explainer under price.
      const showProratedNote = protoMode === 'core-member' && !membershipCancelled;
      const proratedExplainer = showProratedNote ? `
        <div class="offer-price-explainer">
          <div>Today: pay only the prorated difference for the remainder of your Core term</div>
          <div>At renewal: $399.99/year &mdash; Studios replaces Core</div>
        </div>` : '';
      return `
        <article class="plan" style="margin-top:0;">
          <div class="offer-card-name">${label}</div>
          <p class="plan-summary">${plan.summary}</p>
          <div class="offer-price-solo"><span class="amount">${fmtPrice(price)}</span><span class="period">&nbsp;/ year</span>${proratedExplainer}</div>
          <button class="cta offer-cta" onclick="openStripeToast()">${ctaLabel}</button>
          ${includesBlock(plan)}
        </article>`;
    }

    // Helper: Core plan card (post-cancel)
    function coreCard() {
      const plan = plans['Core'];
      return `
        <article class="plan" style="margin-top:0;">
          <div class="offer-card-name">Core Membership</div>
          <p class="plan-summary">${plan.summary}</p>
          <div class="offer-price-solo"><span class="amount">${fmtPrice(plan.price)}</span><span class="period">&nbsp;/ year</span></div>
          <button class="cta offer-cta" onclick="openStripeToast()">Purchase Core Membership</button>
          ${includesBlock(plan)}
        </article>`;
    }

    // Helper: Additional Device upgrade card
    function additionalDeviceCard() {
      return `
        <div class="upgrade-card">
          <div class="offer-card-name">Additional Device ${addOnPill}</div>
          <p class="upgrade-desc">Add a second device &mdash; MLM2PRO or MLM2XPRO &mdash; to your Core subscription. Maximum one additional device per account.</p>
          <div class="offer-price-solo"><span class="amount">${fmtPrice('$49.99')}</span><span class="period">&nbsp;/ year</span></div>
          <button class="btn-upgrade offer-cta" onclick="openStripeToast()">Purchase Upgrade</button>
          <span class="upgrade-eligibility">Core members only &middot; Max 1 additional</span>
        </div>`;
    }

    // Helper: Bucket List upgrade card
    function bucketListCard() {
      return `
        <div class="upgrade-card">
          <div class="offer-card-name">Bucket List Course Pack ${addOnPill}</div>
          <div>
            <p class="upgrade-desc">Unlock an exclusive collection of iconic, bucket-list golf courses for play in the PC app&rsquo;s Rapsodo Studios experience.</p>
            <p class="upgrade-courses">Pebble Beach &bull; Spyglass Hill &bull; Links at Spanish Bay &bull; Del Monte &bull; The Hay</p>
          </div>
          <div class="offer-price-solo"><span class="amount">${fmtPrice('$99.99')}</span><span class="period">&nbsp;/ year</span></div>
          <button class="btn-upgrade offer-cta" onclick="openStripeToast()">Purchase Upgrade</button>
          <span class="upgrade-eligibility">Studios members only</span>
        </div>`;
    }

    // Post-cancel: show Core + Studios (not trial eligible)
    if (membershipCancelled) {
      upgradesSection.style.display = '';
      grid.innerHTML = coreCard() + studiosCard('Studios Membership', '$399.99', 'Purchase Studios Membership');
      return;
    }

    // Scenarios with no offers
    if ([0, 4, 5].indexOf(scenario) !== -1 || protoMode === 'normal') {
      upgradesSection.style.display = 'none';
      return;
    }
    // Scenario 12 initial core-member state (modal will handle): hide offers
    if (scenario === 12 && protoMode === 'core-member') {
      upgradesSection.style.display = 'none';
      return;
    }

    if (protoMode === 'lifetime') {
      upgradesSection.style.display = '';
      grid.innerHTML = studiosCard('Studios Add-On', '$199.99', 'Purchase Studios Add-On');
      return;
    }

    if (protoMode === 'core-member' && scenario !== 12) {
      upgradesSection.style.display = '';
      grid.innerHTML = studiosCard('Studios Membership', '$399.99', 'Purchase Studios') + additionalDeviceCard();
      return;
    }

    if (protoMode === 'studios-member') {
      upgradesSection.style.display = '';
      grid.innerHTML = bucketListCard();
      return;
    }

    if (protoMode === 'additional-mlm-transfer') {
      upgradesSection.style.display = '';
      grid.innerHTML = additionalDeviceCard();
      return;
    }

    upgradesSection.style.display = 'none';
  }

  // Wire CTA & upgrade buttons via delegation on document (handles dynamically rendered buttons)
  document.addEventListener('click', function(e) {
    // Plan card primary CTA buttons (.cta class)
    const cta = e.target.closest('.plan .cta:not([disabled])');
    if (cta) { openStripeToast(); return; }
    // Upgrade card purchase buttons (.btn-upgrade class)
    const upgrade = e.target.closest('.btn-upgrade');
    if (upgrade) { openStripeToast(); return; }
  });

  // ═════ ADDITIONAL MLM FLOW ═════
  function openAdditionalMlmModal() {
    document.getElementById('additionalMlmModal').style.display = 'flex';
  }
  function closeAdditionalMlmModal() {
    document.getElementById('additionalMlmModal').style.display = 'none';
  }

  function mlmChooseBoth() {
    closeAdditionalMlmModal();
    openAdditionalDevicePurchaseModal();
  }
  function mlmChooseTransfer() {
    closeAdditionalMlmModal();
    document.getElementById('mlmTransferModal').style.display = 'flex';
  }
  function mlmConfirmTransfer() {
    document.getElementById('mlmTransferModal').style.display = 'none';
    var popup = document.getElementById('transferCompletePopup');
    var backdrop = document.getElementById('transferCompleteBackdrop');
    if (popup) popup.style.display = '';
    if (backdrop) backdrop.style.display = '';
    setTimeout(function() {
      if (popup) popup.style.display = 'none';
      if (backdrop) backdrop.style.display = 'none';
    }, 3000);
  }
  function mlmNotNow() {
    document.getElementById('mlmTransferModal').style.display = 'none';
    document.getElementById('mlmNotRegisteredModal').style.display = 'flex';
  }
  function mlmCancelTransfer() {
    document.getElementById('mlmTransferModal').style.display = 'none';
  }

  // ═════ MANAGE MEMBERSHIP MODAL (Studios members) ═════
  function openManageMembershipModal() {
    // Update expiry in downgrade modal body from current scenario data
    const data = membershipData[scenario];
    if (data && data.expiry) {
      document.getElementById('downgradeExpiry').textContent = data.expiry;
    }
    document.getElementById('manageMembershipBackdrop').style.display = 'flex';
  }
  function closeManageMembershipModal() {
    document.getElementById('manageMembershipBackdrop').style.display = 'none';
  }
  function openDowngradeConfirm() {
    closeManageMembershipModal();
    document.getElementById('downgradeConfirmBackdrop').style.display = 'flex';
  }
  function closeDowngradeConfirm() {
    document.getElementById('downgradeConfirmBackdrop').style.display = 'none';
  }

  document.getElementById('downgradeConfirmBtn').addEventListener('click', function() {
    closeDowngradeConfirm();
    showMembershipUpdated();
  });
  document.getElementById('downgradeCancelBtn').addEventListener('click', closeDowngradeConfirm);

  // ═════ SPECS MODAL ═════
  function openSpecsModal() {
    document.getElementById('specsModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  function closeSpecsModal() {
    document.getElementById('specsModal').style.display = 'none';
    document.body.style.overflow = '';
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSpecsModal();
  });

  // ── Sub-panel navigation ──
  function openSubPanel(panelId) {
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById(panelId).style.display = 'block';
  }
  function closeSubPanel() {
    ['purchaseHistoryPanel', 'editBillingPanel'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    document.getElementById('mainContent').style.display = '';
  }
  function openPurchaseHistory() { openSubPanel('purchaseHistoryPanel'); }
  function openEditBilling()     { openSubPanel('editBillingPanel'); }

  // ── Update Payment Method modal ──
  function openUpdatePaymentModal() {
    // Reset all fields
    ['pmName','pmCardNo','pmExpiry','pmCvv','pmZip'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    var sel = document.getElementById('pmCountry');
    if (sel) { sel.value = ''; sel.classList.remove('has-value'); }
    var btn = document.getElementById('pmSubmitBtn');
    if (btn) { btn.classList.remove('pm-ready'); btn.disabled = true; }
    document.getElementById('updatePaymentBackdrop').style.display = 'flex';
  }
  function closeUpdatePaymentModal() {
    document.getElementById('updatePaymentBackdrop').style.display = 'none';
  }
  function validatePaymentForm() {
    var required = ['pmName','pmCardNo','pmExpiry','pmCvv'];
    var allFilled = required.every(function(id) {
      var el = document.getElementById(id);
      return el && el.value.trim().length > 0;
    });
    var btn = document.getElementById('pmSubmitBtn');
    if (allFilled) {
      btn.classList.add('pm-ready');
      btn.disabled = false;
    } else {
      btn.classList.remove('pm-ready');
      btn.disabled = true;
    }
  }
  function submitPaymentUpdate() {
    closeUpdatePaymentModal();
    var popup = document.getElementById('paymentUpdatedPopup');
    var backdrop = document.getElementById('paymentUpdatedBackdrop');
    if (popup) popup.style.display = '';
    if (backdrop) backdrop.style.display = '';
    setTimeout(function() {
      if (popup) popup.style.display = 'none';
      if (backdrop) backdrop.style.display = 'none';
    }, 3000);
  }

  // ── Extended Warranty (Scenario 13) ──────────────────────────────────────

  function warrantyCard(title, price, device, warrantyType) {
    const warrantyPill = '<span style="display:inline-block;margin-left:8px;padding:2px 8px;background:#e4e5e9;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#5c616b;vertical-align:middle;">Warranty</span>';
    return `
      <article class="plan warranty-card" style="margin-top:0;">
        <div class="offer-card-name">${title}${warrantyPill}</div>
        <p class="plan-summary">Peace of mind for your ${device}. One-time payment.</p>
        <div class="offer-price-solo">
          <span class="amount">${fmtPrice(price)}</span>
        </div>
        <button class="cta offer-cta" onclick="purchaseWarranty('${warrantyType}')">Purchase Now</button>
      </article>`;
  }

  function renderWarrantyOffers() {
    var grid = document.getElementById('upgradesSectionGrid');
    if (!grid) return;

    // Keep "Offers For You" title; hide the subtitle for this scenario
    var subtitle = document.getElementById('offersSectionSubtitle');
    if (subtitle) subtitle.style.display = 'none';

    // Once a warranty is purchased, no more warranty offers to show
    if (warrantyPurchased) return;

    // Append both warranty cards after the scenario-7-base offer cards
    grid.innerHTML += warrantyCard('1-Year Warranty Extension', '$59.99', 'MLM2PRO', '1-year')
                    + warrantyCard('2-Year Warranty Extension', '$99.99', 'MLM2PRO', '2-year');
  }

  function purchaseWarranty(type) {
    warrantyPurchased = type;
    // Re-render: YM section gains the warranty item, offers grid loses the warranty cards
    renderAll();
    renderWarrantyOffers();
    // Show the Stripe checkout toast
    openStripeToast();
  }

  // ── Default: open on scenario 4 (Free User – Trial Eligible) ─────────────
  applyScenario(4);
