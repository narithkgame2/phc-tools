import re

with open('phc-tools/telegram-bot-staging/studio/canvas.html', 'r', encoding='utf-8') as f:
    content = f.read()

# HTML for the two new views
new_views = '''    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- VIEW 4: DEVELOPER UNITS & PRICE SHEET MANAGER -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div id="view-developer-units" class="hidden space-y-6 max-w-6xl mx-auto">
      
      <!-- Top Action Bar -->
      <div class="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/30">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">Developer Registry</span>
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              🏢 Time Square 7 · Duplex Unit Registry & Pricing
            </h2>
          </div>
          <p class="text-xs text-slate-400 mt-1">
            Toggle availability (Available vs Sold) in real-time, inspect promotional pricing (12% + $3k), or import developer Excel/CSV price sheets.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button onclick="openCsvModal()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 text-xs font-bold border border-amber-500/30 shadow-md flex items-center gap-1.5 transition-all">
            📥 Import CSV / Price Sheet
          </button>
          <button onclick="loadDeveloperUnits()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-[#cc9d4d] to-[#e8c47a] text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all">
            🔄 Refresh Registry
          </button>
        </div>
      </div>

      <!-- Quick Metrics -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div class="text-[11px] font-mono text-slate-400 uppercase">Total Units</div>
          <div id="stat-total-units" class="text-xl font-bold text-white">48</div>
          <div class="text-[10px] text-slate-500">Duplexes (Floors 38–45AF)</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div class="text-[11px] font-mono text-emerald-400 uppercase">Available Units</div>
          <div id="stat-avail-units" class="text-xl font-bold text-emerald-400">--</div>
          <div class="text-[10px] text-emerald-500/80">Ready for Client Quotations</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div class="text-[11px] font-mono text-red-400 uppercase">Sold Units</div>
          <div id="stat-sold-units" class="text-xl font-bold text-red-400">--</div>
          <div class="text-[10px] text-red-400/80">Triggers Floor Proximity</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div class="text-[11px] font-mono text-amber-400 uppercase">Promotion</div>
          <div class="text-xs font-bold text-amber-300">12% Off + $3,000</div>
          <div class="text-[10px] text-slate-400">Handover: Q3 2028</div>
        </div>
      </div>

      <!-- Units Data Table -->
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800 text-xs">
          <div class="flex items-center gap-2">
            <span class="font-bold text-white">Unit Roster</span>
            <span class="text-slate-500">|</span>
            <input type="text" id="unit-search-input" oninput="filterUnitsTable(this.value)" placeholder="Search unit (e.g. 38C1, outer, 42)..." class="p-1.5 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs w-60">
          </div>
          <div class="flex items-center gap-2">
            <button onclick="filterUnitsByStatus('all')" class="px-2.5 py-1 rounded-md text-[11px] bg-slate-800 text-slate-200 hover:bg-slate-700">All</button>
            <button onclick="filterUnitsByStatus('available')" class="px-2.5 py-1 rounded-md text-[11px] bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">Available Only</button>
            <button onclick="filterUnitsByStatus('sold')" class="px-2.5 py-1 rounded-md text-[11px] bg-red-950/60 text-red-300 border border-red-500/30">Sold Only</button>
          </div>
        </div>

        <div class="overflow-x-auto custom-scroll">
          <table class="w-full text-left text-xs font-mono">
            <thead>
              <tr class="text-slate-400 border-b border-slate-800 text-[11px]">
                <th class="py-2.5 px-3">Unit</th>
                <th class="py-2.5 px-3">Floor</th>
                <th class="py-2.5 px-3">Orientation</th>
                <th class="py-2.5 px-3">List Price</th>
                <th class="py-2.5 px-3">Promo Net Price</th>
                <th class="py-2.5 px-3">Price / sqm</th>
                <th class="py-2.5 px-3">Status</th>
                <th class="py-2.5 px-3 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody id="units-table-body" class="divide-y divide-slate-800/60">
              <tr>
                <td colspan="8" class="py-8 text-center text-slate-500">Loading verified units...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- VIEW 5: 5-CHANNEL SYNC & INVENTORY MANAGER -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div id="view-channels-manager" class="hidden space-y-6 max-w-6xl mx-auto">
      
      <!-- Top Action Bar -->
      <div class="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/30">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">Multi-Channel Intake</span>
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              📡 Telegram Channel Scraper & Clean Catalog
            </h2>
          </div>
          <p class="text-xs text-slate-400 mt-1">
            Aggregates listings from 5 verified channels every 30 mins, strips corrupted characters, and standardizes filters.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div id="sync-spinner" class="hidden items-center gap-2 text-xs font-mono text-emerald-400">
            <span class="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
            Scraping live channels...
          </div>
          <button onclick="triggerChannelSync()" id="btn-sync-channels" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all">
            ⚡ 1-Click Channel Re-Sync Now
          </button>
        </div>
      </div>

      <!-- Channel Grid -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs font-mono">
        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div class="text-emerald-400 font-bold">@malaynopsale</div>
          <div class="text-[10px] text-slate-400">Sale & Resale Condos</div>
          <div class="text-[10px] text-slate-500">Sync: 30 mins</div>
        </div>
        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div class="text-blue-400 font-bold">@malaynoprental</div>
          <div class="text-[10px] text-slate-400">Expat Prime Rentals</div>
          <div class="text-[10px] text-slate-500">Sync: 30 mins</div>
        </div>
        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div class="text-purple-400 font-bold">@penghuothproperty</div>
          <div class="text-[10px] text-slate-400">Landed Borey Villas</div>
          <div class="text-[10px] text-slate-500">Sync: 30 mins</div>
        </div>
        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div class="text-amber-400 font-bold">@RealEstateInfo...</div>
          <div class="text-[10px] text-slate-400">Market Feed & Resales</div>
          <div class="text-[10px] text-slate-500">Sync: 30 mins</div>
        </div>
        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div class="text-pink-400 font-bold">@NickREAKH</div>
          <div class="text-[10px] text-slate-400">VIP Private Listings</div>
          <div class="text-[10px] text-slate-500">Sync: 30 mins</div>
        </div>
      </div>

      <!-- Scraped Catalog Table -->
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800 text-xs">
          <div class="flex items-center gap-2">
            <span class="font-bold text-white">Active Scraped Listings (<span id="channel-listings-count">--</span>)</span>
            <span class="text-slate-500">|</span>
            <input type="text" id="channel-search-input" oninput="filterChannelTable(this.value)" placeholder="Search title, building, or location..." class="p-1.5 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs w-64">
          </div>
          <div class="text-[11px] text-emerald-400 font-mono">
            Zero corrupted surrogates · Clean UTF-8
          </div>
        </div>

        <div class="overflow-x-auto custom-scroll">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <th class="py-2.5 px-3">Channel</th>
                <th class="py-2.5 px-3">Type</th>
                <th class="py-2.5 px-3">Listing Title / Building</th>
                <th class="py-2.5 px-3">District</th>
                <th class="py-2.5 px-3">Price</th>
                <th class="py-2.5 px-3">Specs</th>
                <th class="py-2.5 px-3 text-right">Channel Link</th>
              </tr>
            </thead>
            <tbody id="channel-table-body" class="divide-y divide-slate-800/60 font-mono">
              <tr>
                <td colspan="7" class="py-8 text-center text-slate-500">Loading channel catalog...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- CSV UPLOAD MODAL -->
    <div id="csv-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            📥 Import Developer Price Sheet (CSV / Excel Text)
          </h3>
          <button onclick="closeCsvModal()" class="text-slate-400 hover:text-white">✕</button>
        </div>
        
        <p class="text-xs text-slate-300">
          Paste your CSV text below or drop your export from Google Sheets / Excel. Columns supported: <code class="text-amber-300">UnitCode, Floor, Stack, ListPrice, NetPrice, Orientation, Status</code>
        </p>

        <textarea id="csv-input-text" rows="8" placeholder="UnitCode,Floor,ListPrice,Status&#10;38C1,38,95813,available&#10;38C2,38,89500,sold" class="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"></textarea>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button onclick="closeCsvModal()" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">Cancel</button>
          <button onclick="submitCsvImport()" class="px-5 py-2 rounded-xl bg-gradient-to-r from-[#cc9d4d] to-[#e8c47a] text-slate-950 font-bold text-xs">Ingest Price Sheet</button>
        </div>
      </div>
    </div>
'''

target = '    <!-- ═══════════════════════════════════════════════════════════════ -->\n    <!-- VIEW 3: BACKEND ARCHITECTURE & DATA PIPELINES -->'

if target in content:
    content = content.replace(target, new_views + '\n' + target)
    print('Injected new views successfully!')
else:
    print('Warning: target view 3 not found!')

# Now add JS functions for loading and managing Developer Units and Channels
js_target = '    function switchTab(tab) {'
new_js = '''    let allProjectUnits = [];
    let allChannelListings = [];

    async function loadDeveloperUnits() {
      try {
        const res = await fetch('/api/project/units');
        if (res.ok) {
          const data = await res.json();
          allProjectUnits = data.units || [];
          document.getElementById('stat-total-units').innerText = data.totalUnits;
          document.getElementById('stat-avail-units').innerText = data.availableCount;
          document.getElementById('stat-sold-units').innerText = data.soldCount;
          renderUnitsTable(allProjectUnits);
        }
      } catch (e) {
        console.error('Failed to load developer units:', e);
      }
    }

    function renderUnitsTable(units) {
      const tbody = document.getElementById('units-table-body');
      if (!units || units.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-slate-500">No units match filter.</td></tr>`;
        return;
      }

      tbody.innerHTML = units.map(u => {
        const isSold = u.status === 'sold';
        const statusBadge = isSold 
          ? `<span class="px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-500/30 text-[10px] font-bold">🔴 SOLD</span>`
          : `<span class="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">🟢 AVAILABLE</span>`;

        const isOuter = (u.orientation || '').toLowerCase().includes('outer') || (u.unitCode && u.unitCode.endsWith('1'));
        const oriBadge = isOuter
          ? `<span class="text-blue-300">Outer (Skyline)</span>`
          : `<span class="text-amber-300">Inner (Courtyard)</span>`;

        const pSqm = u.netPrice ? Math.round(u.netPrice / 65) : 0;

        return `
          <tr class="hover:bg-slate-800/40 transition-all">
            <td class="py-2.5 px-3 font-bold text-white">${escapeHtml(u.unitCode)}</td>
            <td class="py-2.5 px-3 text-slate-400">${u.floor}F</td>
            <td class="py-2.5 px-3">${oriBadge}</td>
            <td class="py-2.5 px-3 text-slate-400">$${(u.listPrice || 0).toLocaleString()}</td>
            <td class="py-2.5 px-3 font-bold text-amber-300">$${(u.netPrice || 0).toLocaleString()}</td>
            <td class="py-2.5 px-3 text-slate-400">$${pSqm}/m²</td>
            <td class="py-2.5 px-3">${statusBadge}</td>
            <td class="py-2.5 px-3 text-right">
              <button onclick="toggleUnitStatus('${escapeHtml(u.unitCode)}', '${isSold ? 'available' : 'sold'}')" class="px-2.5 py-1 rounded text-[11px] font-semibold ${
                isSold 
                  ? 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40' 
                  : 'bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-500/40'
              }">
                ${isSold ? 'Mark Available' : 'Mark Sold'}
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    async function toggleUnitStatus(unitCode, newStatus) {
      try {
        const res = await fetch('/api/project/toggle-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: 'time-square-7', unitCode, status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
          loadDeveloperUnits();
        } else {
          alert('Error: ' + data.error);
        }
      } catch (e) {
        alert('Network error: ' + e.message);
      }
    }

    function filterUnitsTable(val) {
      const q = val.toLowerCase().trim();
      const filtered = allProjectUnits.filter(u => {
        return u.unitCode.toLowerCase().includes(q) ||
               String(u.floor).includes(q) ||
               (u.orientation || '').toLowerCase().includes(q);
      });
      renderUnitsTable(filtered);
    }

    function filterUnitsByStatus(status) {
      if (status === 'all') renderUnitsTable(allProjectUnits);
      else renderUnitsTable(allProjectUnits.filter(u => u.status === status));
    }

    function openCsvModal() {
      document.getElementById('csv-modal').classList.remove('hidden');
    }

    function closeCsvModal() {
      document.getElementById('csv-modal').classList.add('hidden');
    }

    async function submitCsvImport() {
      const text = document.getElementById('csv-input-text').value.trim();
      if (!text) {
        alert('Please paste CSV text first.');
        return;
      }
      try {
        const res = await fetch('/api/project/upload-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: 'time-square-7', csvContent: text })
        });
        const data = await res.json();
        if (data.success) {
          alert('✅ ' + data.message);
          closeCsvModal();
          loadDeveloperUnits();
        } else {
          alert('Import Error: ' + data.error);
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
    }

    async function loadChannelCatalog() {
      try {
        const res = await fetch('/api/inventory');
        if (res.ok) {
          const data = await res.json();
          allChannelListings = data.listings || [];
          document.getElementById('channel-listings-count').innerText = allChannelListings.length;
          renderChannelTable(allChannelListings);
        }
      } catch (e) {
        console.error('Failed to load channel catalog:', e);
      }
    }

    function renderChannelTable(listings) {
      const tbody = document.getElementById('channel-table-body');
      if (!listings || listings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-500">No active listings found.</td></tr>`;
        return;
      }

      tbody.innerHTML = listings.slice(0, 100).map(l => {
        const typeBadge = l.type === 'Rent'
          ? `<span class="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-500/30 text-[10px]">Rent</span>`
          : `<span class="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[10px]">Sale</span>`;

        const priceStr = l.priceFormatted || (l.price ? `$${l.price.toLocaleString()}` : 'Inquire');

        return `
          <tr class="hover:bg-slate-800/40 transition-all">
            <td class="py-2 px-3 text-slate-400 font-bold">${escapeHtml(l.channel || '')}</td>
            <td class="py-2 px-3">${typeBadge}</td>
            <td class="py-2 px-3 font-medium text-white max-w-xs truncate" title="${escapeHtml(l.title || '')}">${escapeHtml(l.title || 'Phnom Penh Property')}</td>
            <td class="py-2 px-3 text-slate-400">${escapeHtml(l.location || 'Phnom Penh')}</td>
            <td class="py-2 px-3 font-bold text-amber-300">${escapeHtml(priceStr)}</td>
            <td class="py-2 px-3 text-slate-400">${escapeHtml(l.beds || '')}</td>
            <td class="py-2 px-3 text-right">
              <a href="${escapeHtml(l.link || '#')}" target="_blank" class="text-blue-400 hover:underline">View Post ↗</a>
            </td>
          </tr>
        `;
      }).join('');
    }

    function filterChannelTable(val) {
      const q = val.toLowerCase().trim();
      const filtered = allChannelListings.filter(l => {
        const text = `${l.title} ${l.snippet} ${l.location} ${l.channel}`.toLowerCase();
        return text.includes(q);
      });
      renderChannelTable(filtered);
    }

    async function triggerChannelSync() {
      const btn = document.getElementById('btn-sync-channels');
      const spinner = document.getElementById('sync-spinner');
      btn.disabled = true;
      btn.classList.add('opacity-50');
      spinner.classList.remove('hidden');

      try {
        const res = await fetch('/api/channels/sync', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert('✅ ' + data.message);
          loadChannelCatalog();
        } else {
          alert('Sync Error: ' + (data.error || 'Failed to sync'));
        }
      } catch (e) {
        alert('Network Error: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-50');
        spinner.classList.add('hidden');
      }
    }
'''

content = content.replace(js_target, new_js + '\n' + js_target)

# Update switchTab logic to handle all tabs
tab_switch_old = '''    function switchTab(tab) {
      document.getElementById('view-editor').classList.add('hidden');
      document.getElementById('view-tree').classList.add('hidden');
      document.getElementById('view-simulator').classList.add('hidden');
      document.getElementById('view-architecture').classList.add('hidden');

      document.getElementById('tab-editor').className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all";
      document.getElementById('tab-tree').className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all";
      document.getElementById('tab-simulator').className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all";
      document.getElementById('tab-architecture').className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all";

      document.getElementById('view-' + tab).classList.remove('hidden');
      document.getElementById('tab-' + tab).className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#cc9d4d] text-slate-950 transition-all shadow-sm";

      if (tab === 'simulator') {
        launchSim('start');
      } else if (tab === 'editor') {
        if (!treeConfig) loadTreeConfig();
      }
    }'''

tab_switch_new = '''    function switchTab(tab) {
      const views = ['editor', 'developer-units', 'channels-manager', 'tree', 'simulator', 'architecture'];
      views.forEach(v => {
        const el = document.getElementById('view-' + v);
        if (el) el.classList.add('hidden');
        const tabBtn = document.getElementById('tab-' + v);
        if (tabBtn) tabBtn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all";
      });

      const activeView = document.getElementById('view-' + tab);
      if (activeView) activeView.classList.remove('hidden');

      const activeTabBtn = document.getElementById('tab-' + tab);
      if (activeTabBtn) activeTabBtn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#cc9d4d] text-slate-950 transition-all shadow-sm";

      if (tab === 'simulator') {
        launchSim('start');
      } else if (tab === 'editor') {
        if (!treeConfig) loadTreeConfig();
      } else if (tab === 'developer-units') {
        loadDeveloperUnits();
      } else if (tab === 'channels-manager') {
        loadChannelCatalog();
      }
    }'''

if tab_switch_old in content:
    content = content.replace(tab_switch_old, tab_switch_new)
    print('Updated switchTab successfully!')
else:
    print('Warning: tab_switch_old not found!')

with open('phc-tools/telegram-bot-staging/studio/canvas.html', 'w', encoding='utf-8') as f:
    f.write(content)

# Also sync to brain artifact
with open('/Users/macbook/.gemini/antigravity/brain/e1026403-336c-464a-8ee4-0b1595eba513/phc-system-tree-canvas.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated canvas.html & brain artifact with Developer Units and Channel Manager!')
