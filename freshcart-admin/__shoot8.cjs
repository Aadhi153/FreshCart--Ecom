const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const outDir = 'C:/Users/AADHI_~1/AppData/Local/Temp/claude/E--New-folder-1/1f367f8a-0222-4afa-b35d-2e2ff33c54dd/scratchpad';

  await page.goto('http://localhost:5174/auth', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('.auth-card', { timeout: 15000 });

  const html = `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-sidebar-header">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <div style="width:36px;height:36px;border-radius:10px;background:var(--primary);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">F</div>
            <div><h2 style="margin:0;font-size:1.1rem;color:var(--primary);font-family:var(--font-display);">FreshCart</h2></div>
          </div>
        </div>
        <nav class="admin-nav">
          <a class="admin-nav-item">Dashboard</a>
          <a class="admin-nav-item active">Promotions</a>
        </nav>
      </aside>
      <main class="admin-main">
        <header class="admin-topbar"><h2 style="margin:0;font-size:1.05rem;font-weight:700;color:var(--text-primary);">Promotions</h2></header>
        <div class="admin-content">
          <div class="modal-overlay">
            <div class="modal-content spatial-card">
              <div class="modal-header">
                <h2 style="margin:0;font-size:1.25rem;">Add New Promotion</h2>
                <button class="modal-close-btn">X</button>
              </div>
              <div class="modal-body">
                <form id="promotion-form">
                  <div class="form-section">
                    <p class="form-section-label">Basic Info</p>
                    <div class="form-group" style="display:flex;gap:0.5rem;">
                      <button type="button" class="btn-primary" style="flex:1;">Coupon</button>
                      <button type="button" class="btn-secondary" style="flex:1;">Auto-Offer</button>
                    </div>
                    <div class="form-group"><label>Name *</label><input class="form-input" placeholder="e.g. Dairy Week Sale" /></div>
                    <div class="form-group"><label>Coupon Code *</label><input class="form-input" placeholder="e.g. WELCOME10" /></div>
                  </div>
                  <div class="form-section">
                    <p class="form-section-label">Discount Rules</p>
                    <div class="form-grid-2">
                      <div class="form-group"><label>Discount Type *</label><input class="form-input" value="Percentage (%)" /></div>
                      <div class="form-group"><label>Discount Value *</label><input class="form-input" value="0" /></div>
                    </div>
                    <div class="form-grid-2">
                      <div class="form-group"><label>Minimum Order Value</label><input class="form-input" placeholder="No minimum" /></div>
                      <div class="form-group"><label>Max Discount Cap</label><input class="form-input" placeholder="No cap" /></div>
                    </div>
                  </div>
                  <div class="form-section">
                    <p class="form-section-label">Usage Limits</p>
                    <div class="form-grid-2">
                      <div class="form-group"><label>Usage Limit (total)</label><input class="form-input" placeholder="Unlimited" /></div>
                      <div class="form-group"><label>Usage Limit (per user)</label><input class="form-input" placeholder="Unlimited" /></div>
                    </div>
                  </div>
                  <div class="form-section">
                    <p class="form-section-label">Schedule</p>
                    <div class="form-grid-2">
                      <div class="form-group"><label>Start Date</label><input type="date" class="form-input" value="2026-07-29" /></div>
                      <div class="form-group"><label>End Date</label><input type="date" class="form-input" placeholder="No expiry" /></div>
                    </div>
                    <div class="form-group" style="display:flex;flex-direction:row;align-items:center;gap:0.5rem;">
                      <input type="checkbox" id="active" checked />
                      <label for="active" style="margin:0;">Active</label>
                    </div>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn-secondary">Cancel</button>
                <button type="submit" form="promotion-form" class="btn-primary" disabled>Create Promotion</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  await page.evaluate((h) => {
    document.body.className = 'theme-admin theme-dark';
    document.body.innerHTML = h;
  }, html);
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: outDir + '/promo-form-dark.png' });

  await page.evaluate(() => { document.body.className = 'theme-admin theme-light'; });
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: outDir + '/promo-form-light.png' });

  console.log('DONE');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
