'use client';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);

  // Effect 1: flip mounted → tells React to render the HTML shell client-side only.
  // Returning null until mounted means server and initial client renders both
  // produce nothing — no hydration mismatch possible.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Effect 2: runs only after mounted=true (HTML is now in the DOM).
  // Inject CSS and JS so the prototype script can find its DOM elements.
  useEffect(() => {
    if (!mounted) return;

    // CSS — safe to re-inject on each mount
    if (!document.getElementById('membership-proto-css')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/membership-proto.css';
      link.id = 'membership-proto-css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('membership-proto-js')) {
      // First load: inject the script — it calls renderAll() when it executes.
      const script = document.createElement('script');
      script.src = '/membership-proto.js';
      script.id = 'membership-proto-js';
      document.body.appendChild(script);
    } else {
      // Script already in the DOM (React Strict Mode re-mount, or the user
      // navigated away and back). The const/let declarations from the first
      // load still live in global scope, so re-injecting would throw a
      // re-declaration error. Instead, just re-run the initializers directly.
      (window as any).renderAll?.();
      (window as any).renderCompare?.();
    }

    return () => {
      document.getElementById('membership-proto-css')?.remove();
      // Intentionally do NOT remove the script: its global-scope declarations
      // (const icons, etc.) persist after the element is removed, so
      // re-injecting would throw. Leaving it avoids the re-declaration error.
    };
  }, [mounted]);

  // Skip server render (and initial client render) entirely to avoid hydration
  // mismatches — the prototype is 100% client-side DOM manipulation.
  if (!mounted) return null;

  return (
    <>
      {/* Layout helpers so the prototype flex-column scroll structure works
          inside the Next.js app shell without body overflow:hidden */}
      <style dangerouslySetInnerHTML={{ __html: `
        .app-main {
          flex: 1; min-width: 0; display: flex; flex-direction: column;
          height: 100%; overflow: hidden; position: relative;
        }
        .app-main-profile {
          flex: 1; overflow: hidden; display: flex; flex-direction: column;
        }
        #__next-membership-proto {
          display: flex;
          flex-direction: column;
          height: 100vh;
          font-family: 'Barlow', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
          color: #212529;
        }
      `}} />
      <div
        id="__next-membership-proto"
        dangerouslySetInnerHTML={{ __html: PROTO_HTML }}
      />
    </>
  );
}

const PROTO_HTML = `
    <div class="proto-bar">
      <div class="proto-bar-inner">
        <span class="proto-bar-label">Prototype</span>
        <div class="scenario-groups">
          <div class="scenario-group">
            <span class="scenario-group-label">Onboarding</span>
            <button class="scenario-btn" data-scenario="1" type="button" onclick="onScenarioClick(1)">1 · Mobile · MLM2PRO</button>
            <button class="scenario-btn" data-scenario="2" type="button" onclick="onScenarioClick(2)">2 · PC · MLM2PRO</button>
            <button class="scenario-btn" data-scenario="3" type="button" onclick="onScenarioClick(3)">3 · PC · CLMPRO</button>
          </div>
          <div class="scenario-group">
            <span class="scenario-group-label">In-App — Free Users</span>
            <button class="scenario-btn" data-scenario="4" type="button" onclick="onScenarioClick(4)">4 · Free User – Trial Eligible</button>
            <button class="scenario-btn" data-scenario="5" type="button" onclick="onScenarioClick(5)">5 · Free User – Not Trial Eligible</button>
          </div>
          <div class="scenario-group">
            <span class="scenario-group-label">In-App — Members</span>
            <button class="scenario-btn" data-scenario="6" type="button" onclick="onScenarioClick(6)">6 · Lifetime Member</button>
            <button class="scenario-btn" data-scenario="7" type="button" onclick="onScenarioClick(7)">7 · Core Member</button>
            <button class="scenario-btn" data-scenario="8" type="button" onclick="onScenarioClick(8)">8 · Studios Member</button>
          </div>
          <div class="scenario-group">
            <span class="scenario-group-label">Refunds</span>
            <button class="scenario-btn" data-scenario="9" type="button" onclick="onScenarioClick(9)">9 · Core Member</button>
            <button class="scenario-btn" data-scenario="10" type="button" onclick="onScenarioClick(10)">10 · Studios Member</button>
          </div>
          <div class="scenario-group">
            <span class="scenario-group-label">Other Flows</span>
            <button class="scenario-btn" data-scenario="11" type="button" onclick="onScenarioClick(11)">11 · Upgrade to CLM</button>
            <button class="scenario-btn" data-scenario="12" type="button" onclick="onScenarioClick(12)">12 · Additional MLM</button>
            <button class="scenario-btn" data-scenario="13" type="button" onclick="onScenarioClick(13)">13 · Extended Warranty</button>
          </div>
        </div>
      </div>
    </div>

    <div class="app-main-profile" id="appMainProfile">

      <!-- ── Cancel Membership modal (converted from screen) ── -->
      <!-- (modal lives outside the sub-page for correct z-index stacking) -->

      <div class="profile-hdr">
        <h1 class="profile-hdr-title">Profile</h1>
        <div class="profile-hdr-sync">
          <span class="sync-dot"></span>
          Last Sync: April 28, 2026 at 08:10 PM
        </div>
      </div>
      <div class="profile-tabs">
        <button class="profile-tab active">Manage Membership</button>
        <button class="profile-tab">Personal Information</button>
        <button class="profile-tab">App Settings</button>
      </div>

      <div class="profile-tab-content">

        <div class="sub-page">

          <div id="mainContent">

          <!-- HERO -->
          <section class="hero">
            <h2>Choose Your Rapsodo Membership</h2>
            <p>Unlock the full potential of your Rapsodo device &mdash; on mobile and PC.</p>
          </section>

          <!-- YOUR MEMBERSHIP (shown for existing member scenarios) -->
          <div class="your-membership-section" id="yourMembershipSection">
            <div class="your-membership-card" id="yourMembershipCard">
              <!-- rendered by JS -->
            </div>
          </div>

          <!-- YOUR UPGRADES & PURCHASES (shown after additional device purchase) -->
          <div class="your-membership-section" id="yourUpgradesSection" style="display:none">
            <div id="yourUpgradesCard" style="margin-top:12px;"></div>
          </div>

          <!-- PLAN CARDS -->
          <div class="plan-grid" id="planGrid"></div>

          <!-- BILLING ACTION (scenarios 6 & 7) -->
          <div class="billing-action-bar" id="billingActionBar" style="display:none">
            <button class="btn-secondary" type="button">Edit Billing &amp; Renewal Options</button>
          </div>

          <!-- HELP ME CHOOSE (collapsible) -->
          <div class="help-me-choose" id="helpMeChoose">
            <button class="hmc-toggle" id="hmcToggle" type="button">
              <div>
                <span class="eyebrow">Personalize</span>
                <h3>Help Me Choose</h3>
              </div>
              <span class="hmc-chevron" id="hmcChevron"></span>
            </button>
            <div class="hmc-body">

              <div class="selector-section">
                <p class="selector-label"><strong>Select your Rapsodo Device(s)</strong> &middot; select all that apply</p>
                <div class="device-grid" id="deviceGrid"></div>
              </div>

              <div class="selector-section">
                <p class="selector-label"><strong>Select your setup</strong></p>
                <div class="option-row" id="setupRow"></div>
              </div>

              <div class="selector-section">
                <p class="selector-label"><strong>Select your platform(s)</strong> &middot; select all that apply</p>
                <div class="option-row" id="platformRow"></div>
              </div>

              <!-- Viability warning -->
              <div class="viability-warning" id="viabilityWarning" style="display:none">
                <div class="vw-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </div>
                <div class="vw-content">
                  <p class="vw-title">This combination isn&rsquo;t supported</p>
                  <ul class="vw-list" id="viabilityList"></ul>
                </div>
              </div>

              <!-- Viability OK indicator -->
              <div class="viability-ok" id="viabilityOk" style="display:none">
                <div class="vo-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <span>Supported combination &middot; see your recommended membership above</span>
              </div>

              <!-- Clear Selections -->
              <div class="hmc-clear-row">
                <button class="hmc-clear-btn" id="hmcClearBtn" type="button">Clear Selections</button>
              </div>

            </div>
          </div>

          <!-- OFFERS FOR YOU -->
          <section class="upgrades">
            <div class="section-header" id="offersHeader">
              <h2 class="section-title" id="offersSectionTitle">Offers For You</h2>
              <span class="section-subtitle" id="offersSectionSubtitle">Upgrades and add-ons available for your membership</span>
            </div>
            <div class="upgrades-grid" id="upgradesSectionGrid"></div>
          </section>

          <!-- FULL COMPARISON (collapsible) -->
          <div class="compare" id="compare">
            <button class="compare-toggle" id="compareToggle" type="button">
              <div>
                <span class="eyebrow">Full comparison</span>
                <h3>Compare features and compatibility</h3>
              </div>
              <span class="compare-chevron" id="compareChevron"></span>
            </button>
            <div class="compare-body" id="compareBody"></div>
          </div>

          <!-- BASIC MEMBERSHIP — deprioritized -->
          <div class="basic-section" id="basicSection">
            <div class="basic-head">
              <h3>Basic Membership <span class="basic-subhead">&bull; Get started with a basic experience at no cost</span></h3>
            </div>
            <ul class="basic-list">
              <li><strong>Includes:</strong> Mobile app access only for a single MLM2PRO or MLM2XPRO, Practice Mode, 11 Metrics, Activity History for the last session only</li>
              <li><strong>Does Not Include:</strong> PC App, Course Simulation, Shot Comparison, Multi-Angle Swing Video, Measured Spin Data, Club Data, Complete Activity History, R-Cloud Video Storage</li>
            </ul>
          </div>

          <!-- FOOTER -->
          <footer class="page-footer">
            <p class="footer-note">
              All prices in USD. Annual plans billed as a single yearly charge.<br>
              Device eligibility subject to registered hardware. Upgrades require an active base subscription.
            </p>
            <div class="footer-links">
              <a href="https://rapsodo.com/pages/terms-of-use" target="_blank" rel="noopener">Terms of Use</a>
              <a href="https://rapsodo.com/pages/rapsodo-privacy-policy" target="_blank" rel="noopener">Privacy Policy</a>
              <a href="https://rapsodo.com/pages/frequently-asked-golf-questions-faq" target="_blank" rel="noopener">Contact Support</a>
            </div>
          </footer>

          </div><!-- /mainContent -->

          <!-- PURCHASE HISTORY PANEL -->
          <div id="purchaseHistoryPanel" class="sub-panel">
            <div class="sub-panel-header">
              <button class="sub-panel-back" type="button" onclick="closeSubPanel()">&#8592; Back</button>
              <span class="sub-panel-title">Purchase History</span>
            </div>
            <div class="ph-table">
              <div class="ph-head">
                <div>Date</div><div>Description</div><div style="text-align:right">Amount</div>
              </div>
              <div class="ph-row"><div class="ph-date">03/15/2026</div><div class="ph-desc">Core Membership Renewal</div><div class="ph-amount">$199.99</div></div>
              <div class="ph-row"><div class="ph-date">09/04/2025</div><div class="ph-desc">Additional Device Upgrade</div><div class="ph-amount">$49.99</div></div>
              <div class="ph-row"><div class="ph-date">03/15/2025</div><div class="ph-desc">Core Membership Renewal</div><div class="ph-amount">$199.99</div></div>
              <div class="ph-row"><div class="ph-date">03/15/2024</div><div class="ph-desc">Core Membership Renewal</div><div class="ph-amount">$199.99</div></div>
              <div class="ph-row"><div class="ph-date">03/10/2023</div><div class="ph-desc">Core Membership</div><div class="ph-amount">$199.99</div></div>
            </div>
          </div>

          <!-- EDIT BILLING PANEL -->
          <div id="editBillingPanel" class="sub-panel">
            <div class="sub-panel-header">
              <button class="sub-panel-back" type="button" onclick="closeSubPanel()">&#8592; Back</button>
              <span class="sub-panel-title">Edit Billing</span>
            </div>
            <div class="eb-card">
              <div class="eb-pm-label">Current Payment Method</div>
              <div class="eb-pm-type">Visa card ending in 4242</div>
              <div class="eb-pm-exp">Expires 08/2027</div>
              <button class="eb-update-btn" type="button" onclick="openUpdatePaymentModal()">Update Payment Method</button>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ONBOARDING OVERLAY -->
    <div class="onboarding-overlay" id="onboardingOverlay" style="display:none">
      <div class="ob-corner ob-corner-tl"><img src="./ob-plus-grid.svg" alt="" /></div>
      <div class="ob-corner ob-corner-br"><img src="./ob-plus-grid.svg" alt="" /></div>
      <div class="ob-content">
        <img src="/design-system/assets/logos/rapsodo-golf-full-black-bg.png" class="ob-logo" alt="Rapsodo Golf" />
        <h2 class="ob-headline">Choose Your Rapsodo Membership</h2>
        <div class="ob-country">
          <label class="ob-country-label">Country</label>
          <div class="ob-country-select">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span>United States of America</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
        <div class="ob-plan-grid" id="obPlanGrid"></div>
        <div class="ob-upgrade-wrap" id="obUpgradeWrap" style="display:none"></div>

        <!-- OB: Help Me Choose (collapsible) -->
        <div class="help-me-choose ob-section" id="obHelpMeChoose">
          <button class="hmc-toggle" id="obHmcToggle" type="button">
            <div>
              <span class="eyebrow">Personalize</span>
              <h3>Help Me Choose</h3>
            </div>
            <span class="hmc-chevron" id="obHmcChevron"></span>
          </button>
          <div class="hmc-body">
            <div class="selector-section">
              <p class="selector-label"><strong>Select your Rapsodo Device(s)</strong> &middot; select all that apply</p>
              <div class="device-grid" id="obDeviceGrid"></div>
            </div>
            <div class="selector-section">
              <p class="selector-label"><strong>Select your setup</strong></p>
              <div class="option-row" id="obSetupRow"></div>
            </div>
            <div class="selector-section">
              <p class="selector-label"><strong>Select your platform(s)</strong> &middot; select all that apply</p>
              <div class="option-row" id="obPlatformRow"></div>
            </div>
            <div class="viability-warning" id="obViabilityWarning" style="display:none">
              <div class="vw-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              </div>
              <div class="vw-content">
                <p class="vw-title">This combination isn&rsquo;t supported</p>
                <ul class="vw-list" id="obViabilityList"></ul>
              </div>
            </div>
            <div class="viability-ok" id="obViabilityOk" style="display:none">
              <div class="vo-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </div>
              <span>Supported combination &middot; see your recommended membership above</span>
            </div>
            <div class="hmc-clear-row">
              <button class="hmc-clear-btn" id="obHmcClearBtn" type="button">Clear Selections</button>
            </div>
          </div>
        </div>

        <!-- OB: Full Comparison (collapsible, open by default) -->
        <div class="compare ob-section open" id="obCompare">
          <button class="compare-toggle" id="obCompareToggle" type="button">
            <div>
              <span class="eyebrow">Full comparison</span>
              <h3>Compare features and compatibility</h3>
            </div>
            <span class="compare-chevron" id="obCompareChevron"></span>
          </button>
          <div class="compare-body" id="obCompareBody"></div>
        </div>

        <!-- OB: Basic Membership -->
        <div class="basic-section ob-section" id="obBasicSection">
          <div class="basic-head">
            <h3>Basic Membership <span class="basic-subhead">&bull; Get started with a basic experience at no cost</span></h3>
          </div>
          <ul class="basic-list">
            <li><strong>Includes:</strong> Mobile app access only for a single MLM2PRO or MLM2XPRO, Practice Mode, 11 Metrics, Activity History for the last session only</li>
            <li><strong>Does Not Include:</strong> PC App, Course Simulation, Shot Comparison, Multi-Angle Swing Video, Measured Spin Data, Club Data, Complete Activity History, R-Cloud Video Storage</li>
          </ul>
        </div>

      </div>
    </div>

  </div>
</div>

<!-- ══ SYSTEM REQUIREMENTS MODAL ═════════════════════════════ -->
<div class="specs-modal" id="specsModal" style="display:none" role="dialog" aria-modal="true" aria-labelledby="specsModalTitle">
  <div class="specs-modal-overlay" onclick="closeSpecsModal()"></div>
  <div class="specs-modal-panel">
    <div class="specs-modal-head">
      <div>
        <h2 class="specs-modal-title" id="specsModalTitle">System Requirements</h2>
        <p class="specs-modal-sub">Recommended and Minimum specs for your gaming PC or laptop. Recommended specs will provide the optimal golf simulation experience with Rapsodo Studios courses.</p>
      </div>
      <button class="specs-modal-close" onclick="closeSpecsModal()" type="button" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
    <table class="specs-table">
      <thead>
        <tr>
          <th>Specification</th>
          <th>Recommended Requirements</th>
          <th>Minimum Requirements</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Hardware</td><td>Gaming PC</td><td>Gaming PC or Gaming Laptop</td></tr>
        <tr><td>Ethernet Port</td><td>1 Gbps (or better)</td><td>1 Gbps</td></tr>
        <tr><td>Operating System</td><td>Windows 11 (64-Bit)</td><td>Windows 10 (64-Bit)</td></tr>
        <tr><td>Processor</td><td>Intel I9 14900KS 3.2 GHz (or better)</td><td>Intel I7 11800H 2.3 GHz</td></tr>
        <tr><td>Memory</td><td>32 GB Ram (or better)</td><td>32 GB Ram</td></tr>
        <tr><td>Graphics Card</td><td>Nvidia RTX 4070 Ti Super (or better)</td><td>Nvidia RTX 3060</td></tr>
        <tr><td>Storage</td><td>2 TB SSD</td><td>1TB GB SSD</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- ── Additional MLM Choice Modal ── -->
<div class="cancel-modal-backdrop" id="additionalMlmModal" style="display:none">
  <div class="cancel-modal">
    <h2>New Device Detected</h2>
    <p class="cancel-modal-body">We noticed you registered a new <strong>MLM2PRO</strong> (serial # <strong>M00012345678</strong>). How would you like to handle your membership?</p>
    <div class="cancel-modal-actions">
      <button class="btn-danger" style="background:#111;" id="mlmUseBothBtn" type="button" onclick="mlmChooseBoth()">Use Both Devices</button>
      <button class="btn-back-modal" id="mlmTransferBtn" type="button" onclick="mlmChooseTransfer()">Use New Device Only</button>
    </div>
  </div>
</div>

<!-- ── MLM Transfer Confirmation Modal ── -->
<div class="cancel-modal-backdrop" id="mlmTransferModal" style="display:none">
  <div class="cancel-modal" role="dialog" aria-modal="true">
    <button class="cancel-modal-close" onclick="document.getElementById('mlmTransferModal').style.display='none'" type="button" aria-label="Close">&times;</button>
    <div class="cancel-modal-icon" style="background:#e8f4fd;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d6fa8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
    </div>
    <h2>Transfer Core Membership</h2>
    <p class="cancel-modal-body" style="text-align:left;">Transfer your Core membership to your new <strong>MLM2PRO</strong> device (serial # <strong>M00012345678</strong>).</p>
    <p class="cancel-modal-body" style="text-align:left;margin-top:6px;">No changes will be made to your existing subscription terms or billing.</p>
    <p class="cancel-modal-body" style="text-align:left;margin-top:6px;">Your old <strong>MLM2PRO</strong> device (serial # <strong>M00054321098</strong>) will no longer have access to Core membership features.</p>
    <div class="cancel-modal-actions">
      <button class="btn-danger" style="background:#111;" onclick="mlmConfirmTransfer()" type="button">Transfer Membership</button>
      <button class="btn-back-modal" onclick="mlmNotNow()" type="button">Not Now</button>
    </div>
  </div>
</div>


<!-- ── Manage Your Membership modal (Studios members) ── -->
<div class="cancel-modal-backdrop" id="manageMembershipBackdrop" style="display:none" onclick="if(event.target===this)closeManageMembershipModal()">
  <div class="manage-modal" role="dialog" aria-modal="true">
    <div class="manage-modal-head">
      <h2>Manage Your Membership</h2>
      <button class="manage-modal-close" onclick="closeManageMembershipModal()" type="button" aria-label="Close">&times;</button>
    </div>
    <div class="manage-modal-option">
      <div class="manage-modal-option-text">
        <h3>Switch to a Core Membership</h3>
        <p>You will lose access to Rapsodo Studios courses, tournaments, and more.</p>
      </div>
      <button class="manage-modal-option-btn btn-downgrade" type="button" onclick="openDowngradeConfirm()">Switch to Core</button>
    </div>
    <div class="manage-modal-option">
      <div class="manage-modal-option-text">
        <h3>Cancel Membership</h3>
        <p>Your access will continue until your current billing period ends.</p>
      </div>
      <button class="manage-modal-option-btn btn-cancel-red" type="button" onclick="closeManageMembershipModal();openCancelModal('Studios',false)">Cancel Membership</button>
    </div>
  </div>
</div>

<!-- ── Downgrade to Core confirmation modal ── -->
<div class="cancel-modal-backdrop" id="downgradeConfirmBackdrop" style="display:none">
  <div class="cancel-modal" role="dialog" aria-modal="true">
    <button class="cancel-modal-close" onclick="closeDowngradeConfirm()" type="button" aria-label="Close">&times;</button>
    <div class="cancel-modal-icon" style="background:#f0f4ff;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4361ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 16 8 12 12 8"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
    </div>
    <h2 id="downgradeModalTitle">Switch to Core Membership</h2>
    <p class="cancel-modal-body">Are you sure you want to switch from a Studios membership to a Core membership?</p>
    <p class="cancel-modal-body" id="downgradeModalBody" style="margin-top:-8px;">Your Studios Membership will continue until <strong id="downgradeExpiry">03/15/2027</strong>. On that date, your Core Membership will begin for <strong>$199.99</strong> with auto-renewal.</p>
    <div class="cancel-modal-loses">
      <h4>You'll Lose Access To</h4>
      <ul>
        <li>Rapsodo Studios Courses (Premium 4K Realism)</li>
        <li>Community Courses (Built by the Rapsodo Course Builder Community)</li>
        <li>On Course Practice</li>
        <li>Expanded Family Profiles</li>
      </ul>
    </div>
    <div class="cancel-modal-actions">
      <button class="btn-danger" style="background:#cd1b32;color:#fff;" id="downgradeConfirmBtn" type="button" onclick="closeDowngradeConfirm();showMembershipUpdated()">Confirm</button>
      <button class="btn-back-modal" id="downgradeCancelBtn" type="button" onclick="closeDowngradeConfirm()">No, Go Back</button>
    </div>
  </div>
</div>

<!-- ── Stripe checkout info toast ── -->
<div id="stripeToastBackdrop" class="stripe-toast-backdrop" style="display:none" onclick="closeStripeToast()"></div>
<div id="stripeToast" class="stripe-toast" style="display:none">
  <div class="stripe-toast-icon">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/><path d="M8 12l2.5 2.5L16 9"/></svg>
  </div>
  <h3>Proceeding to Checkout</h3>
  <p>User will be taken to the <strong>Stripe Checkout Page</strong> to complete their purchase.</p>
  <button class="stripe-toast-close" type="button" onclick="closeStripeToast()">Got It</button>
</div>

<!-- ── Membership Updated popup (Change 8) ── -->
<div id="membershipUpdatedBackdrop" class="stripe-toast-backdrop" style="display:none"></div>
<div id="membershipUpdatedPopup" class="stripe-toast" style="display:none">
  <div class="stripe-toast-icon">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/><path d="M8 12l2.5 2.5L16 9"/></svg>
  </div>
  <h3>Membership Updated</h3>
  <p>Your membership has been updated to Core.</p>
</div>

<div id="transferCompleteBackdrop" class="stripe-toast-backdrop" style="display:none"></div>
<div id="transferCompletePopup" class="stripe-toast" style="display:none">
  <div class="stripe-toast-icon">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/><path d="M8 12l2.5 2.5L16 9"/></svg>
  </div>
  <h3>Membership Transfer Complete</h3>
</div>

<div id="paymentUpdatedBackdrop" class="stripe-toast-backdrop" style="display:none"></div>
<div id="paymentUpdatedPopup" class="stripe-toast" style="display:none">
  <div class="stripe-toast-icon">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/><path d="M8 12l2.5 2.5L16 9"/></svg>
  </div>
  <h3>Payment Method Updated</h3>
</div>

<!-- ── Cancel Membership modal ── -->
<div class="cancel-modal-backdrop" id="cancelScreenBackdrop" style="display:none">
  <div class="cancel-modal cancel-modal-wide" role="dialog" aria-modal="true">
    <button class="cancel-modal-close" onclick="closeCancelScreen()" type="button" aria-label="Close">&times;</button>
    <h2 id="cancelScreenTitle">Cancel Membership</h2>
    <p class="cancel-screen-subtitle" style="margin-bottom:20px;">We are sad to see you go! Before you cancel, please tell us what made you cancel today.</p>

    <div class="cancel-form-group">
      <label class="cancel-form-label" for="cancelReason">Cancellation Reason <span style="color:#cd1b32">*</span></label>
      <select class="cancel-select placeholder-shown" id="cancelReason" onchange="cancelReasonChanged(this)">
        <option value="" disabled selected>Select subject</option>
        <option value="no-use">Don't use my launch monitor enough</option>
        <option value="cost">Cost / Value</option>
        <option value="technical">Technical Concerns</option>
      </select>
    </div>

    <!-- Follow-up: Don't use enough → free text -->
    <div class="cancel-followup" id="followupNoUse">
      <div class="cancel-form-group">
        <label class="cancel-form-label" for="cancelTextTech">What would you like to see added to make more use of your launch monitor?</label>
        <textarea class="cancel-textarea" id="cancelTextTech" maxlength="500" placeholder="Share your thoughts…" oninput="cancelTextInput(this,'cancelTextTechCount')"></textarea>
        <div class="cancel-char-count"><span id="cancelTextTechCount">0</span> / 500</div>
      </div>
    </div>

    <!-- Follow-up: Cost / Value → free text -->
    <div class="cancel-followup" id="followupCost">
      <div class="cancel-form-group">
        <label class="cancel-form-label" for="cancelTextCost">What would you see changed to add more value to the Membership?</label>
        <textarea class="cancel-textarea" id="cancelTextCost" maxlength="500" placeholder="Share your thoughts…" oninput="cancelTextInput(this,'cancelTextCostCount')"></textarea>
        <div class="cancel-char-count"><span id="cancelTextCostCount">0</span> / 500</div>
      </div>
    </div>

    <!-- Follow-up: Technical Concerns → Issue Type radios -->
    <div class="cancel-followup" id="followupTechnical">
      <div class="cancel-form-group">
        <label class="cancel-form-label">Issue Type <span style="color:#cd1b32">*</span></label>
        <div class="cancel-radio-group" id="issueTypeGroup">
          <label class="cancel-radio-label"><input type="radio" name="issueType" value="accuracy" onchange="issueTypeChanged(this)"> <span>Accuracy Concerns</span></label>
          <label class="cancel-radio-label"><input type="radio" name="issueType" value="connecting" onchange="issueTypeChanged(this)"> <span>Difficulty Connecting</span></label>
          <label class="cancel-radio-label"><input type="radio" name="issueType" value="disconnections" onchange="issueTypeChanged(this)"> <span>Disconnections</span></label>
          <label class="cancel-radio-label"><input type="radio" name="issueType" value="bugs" onchange="issueTypeChanged(this)"> <span>Bugs in App</span></label>
          <label class="cancel-radio-label"><input type="radio" name="issueType" value="other" onchange="issueTypeChanged(this)"> <span>Other</span></label>
        </div>
      </div>
    </div>

    <div class="cancel-screen-actions">
      <button class="btn-cancel-back" id="cancelScreenBackBtn" type="button" onclick="closeCancelScreen()">Go Back</button>
      <button class="btn-cancel-membership" id="cancelMembershipBtn" type="button" disabled onclick="cancelMembershipSubmit()">Cancel Membership</button>
    </div>
  </div>
</div>

<!-- ── Membership Cancelled confirmation popup ── -->
<div id="membershipCancelledBackdrop" class="stripe-toast-backdrop" style="display:none"></div>
<div id="membershipCancelledPopup" class="stripe-toast" style="display:none">
  <div class="stripe-toast-icon">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/><path d="M8 12l2.5 2.5L16 9"/></svg>
  </div>
  <h3>Membership Cancelled</h3>
  <p>Your membership has been cancelled.</p>
</div>

<!-- ── Refund Requested modal (Change 5) ── -->
<div class="cancel-modal-backdrop" id="refundRequestedBackdrop" style="display:none">
  <div class="cancel-modal" role="dialog" aria-modal="true">
    <div class="cancel-modal-icon" style="background:#f0fdf4;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/><path d="M8 12l2.5 2.5L16 9"/></svg>
    </div>
    <h2>Refund Requested</h2>
    <p class="cancel-modal-body">Your refund request was submitted. Please allow 3–5 business days for your request to be processed.</p>
    <div class="cancel-modal-actions">
      <button class="btn-danger" style="background:#16a34a;" onclick="closeRefundRequestedModal()" type="button">Got It</button>
    </div>
  </div>
</div>

<!-- ── Additional Device Purchase Modal (Change 6) ── -->
<div class="cancel-modal-backdrop" id="additionalDevicePurchaseBackdrop" style="display:none">
  <div class="cancel-modal" role="dialog" aria-modal="true">
    <button class="cancel-modal-close" onclick="closeAdditionalDevicePurchaseModal()" type="button" aria-label="Close">&times;</button>
    <div class="cancel-modal-icon" style="background:#e8f4fd;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d6fa8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
    </div>
    <h2>Purchase Additional Device Membership for $49.99 / year</h2>
    <p class="cancel-modal-body" style="text-align:left;">Add a second device to your Core membership: <strong>MLM2PRO</strong> device (serial # <strong>M00012345678</strong>).</p>
    <p class="cancel-modal-body" style="text-align:left;margin-top:8px;">Maximum one additional device per account. The Additional Device membership will be prorated to the existing term of your Core membership, and will renew annually at $49.99 at the same time as your Core membership.</p>
    <div class="cancel-modal-actions">
      <button class="btn-danger" onclick="purchaseAdditionalDevice()" type="button">Purchase Upgrade</button>
      <button class="btn-back-modal" onclick="closeAdditionalDevicePurchaseModal()" type="button">No, Go Back</button>
    </div>
  </div>
</div>

<!-- ── MLM "Not Registered" modal (Change 6) ── -->
<div class="cancel-modal-backdrop" id="mlmNotRegisteredModal" style="display:none">
  <div class="cancel-modal" role="dialog" aria-modal="true">
    <div class="cancel-modal-icon" style="background:#fff7ed;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    </div>
    <h2>New Device Not Registered</h2>
    <p class="cancel-modal-body">Your new <strong>MLM2PRO</strong> device (serial # <strong>M00012345678</strong>) will be un-registered, since you already have one device associated with your Core membership.</p>
    <div class="cancel-modal-actions">
      <button class="btn-danger" onclick="mlmGotItNotRegistered()" type="button">Got It</button>
      <button class="btn-back-modal" onclick="mlmGoBackToTransfer()" type="button">Go Back</button>
    </div>
  </div>
</div>

<!-- ── Studios Required modal (Change 7) ── -->
<div class="cancel-modal-backdrop" id="studiosRequiredModal" style="display:none">
  <div class="cancel-modal" role="dialog" aria-modal="true">
    <button class="cancel-modal-close" onclick="closeStudiosRequiredModal()" type="button" aria-label="Close">&times;</button>
    <div class="cancel-modal-icon" style="background:#fff7ed;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    </div>
    <h2>Studios Membership Required</h2>
    <p class="cancel-modal-body">A Studios Membership is required for your CLMPRO.</p>
    <div class="cancel-modal-actions">
      <button class="btn-danger" onclick="closeStudiosRequiredModal();openStripeToast()" type="button">Purchase Studios</button>
      <button class="btn-back-modal" onclick="openStudiosNotNowModal()" type="button">Not Now</button>
    </div>
  </div>
</div>

<!-- ── Studios "Are You Sure?" modal (Change 7) ── -->
<div class="cancel-modal-backdrop" id="studiosNotNowModal" style="display:none">
  <div class="cancel-modal" role="dialog" aria-modal="true">
    <button class="cancel-modal-close" onclick="closeStudiosNotNowModal()" type="button" aria-label="Close">&times;</button>
    <div class="cancel-modal-icon" style="background:#fff7ed;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    </div>
    <h2>Are You Sure?</h2>
    <p class="cancel-modal-body">A Studios membership is required to use your CLMPRO.</p>
    <div class="cancel-modal-actions">
      <button class="btn-danger" onclick="closeStudiosNotNowModal();openStripeToast()" type="button">Purchase Studios</button>
      <button class="btn-back-modal" onclick="closeStudiosNotNowModal()" type="button">Not Now</button>
    </div>
  </div>
</div>

<!-- ── Cancellation confirmation modal ── -->
<div class="cancel-modal-backdrop" id="cancelModalBackdrop" style="display:none">
  <div class="cancel-modal" role="dialog" aria-modal="true" aria-labelledby="cancelModalTitle">
    <button class="cancel-modal-close" id="cancelModalClose" aria-label="Close" onclick="closeCancelModal()">&times;</button>
    <div class="cancel-modal-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cd1b32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
    </div>
    <h2 id="cancelModalTitle">Cancel Membership</h2>
    <p class="cancel-modal-body">Are you sure you want to cancel your <strong id="cancelModalPlanName"></strong> membership?</p>
    <div class="cancel-modal-loses">
      <h4>You'll lose access to</h4>
      <ul id="cancelModalLosesList"></ul>
    </div>
    <div class="cancel-modal-actions">
      <button class="btn-danger" id="cancelModalConfirmBtn" type="button" onclick="cancelModalConfirmAction()">Yes, Cancel Membership</button>
      <button class="btn-back-modal" id="cancelModalBackBtn" type="button" onclick="closeCancelModal()">No, Go Back</button>
    </div>
  </div>
</div>

<!-- Update Payment Method modal -->
<div id="updatePaymentBackdrop" class="update-payment-backdrop" style="display:none">
  <div class="update-payment-modal" role="dialog" aria-modal="true">
    <h2>Update Payment Method</h2>
    <div class="pm-field">
      <label class="pm-label" for="pmName">Cardholder's Name <span class="req">*</span></label>
      <input class="pm-input" id="pmName" type="text" placeholder="Enter your cardholder's name" oninput="validatePaymentForm()">
    </div>
    <div class="pm-field">
      <label class="pm-label" for="pmCardNo">Card No <span class="req">*</span></label>
      <input class="pm-input" id="pmCardNo" type="text" placeholder="XXXX XXXX XXXX XXXX" oninput="validatePaymentForm()">
    </div>
    <div class="pm-field pm-row-2">
      <div>
        <label class="pm-label" for="pmExpiry">Expiry Date <span class="req">*</span></label>
        <input class="pm-input" id="pmExpiry" type="text" placeholder="mm/yy" oninput="validatePaymentForm()">
      </div>
      <div>
        <label class="pm-label" for="pmCvv">CVV <span class="req">*</span></label>
        <input class="pm-input" id="pmCvv" type="text" placeholder="CVV" oninput="validatePaymentForm()">
      </div>
    </div>
    <div class="pm-field pm-row-country">
      <div>
        <label class="pm-label" for="pmCountry">Country or Region</label>
        <select class="pm-select" id="pmCountry" onchange="this.classList.toggle('has-value', this.value !== '')">
          <option value="">Select country or region</option>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="GB">United Kingdom</option>
          <option value="AU">Australia</option>
          <option value="JP">Japan</option>
          <option value="KR">South Korea</option>
          <option value="DE">Germany</option>
          <option value="FR">France</option>
        </select>
      </div>
      <div>
        <label class="pm-label" for="pmZip">Zip Code</label>
        <input class="pm-input" id="pmZip" type="text" placeholder="XXXXX">
      </div>
    </div>
    <button class="pm-submit" id="pmSubmitBtn" type="button" disabled onclick="submitPaymentUpdate()">Update Payment Method</button>
    <button class="pm-cancel" type="button" onclick="closeUpdatePaymentModal()">Cancel</button>
  </div>
`;
