import json
import re

with open('phc-tools/docs/phc-system-tree-canvas.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the tabs in header to include Editor Tab prominently
tab_needle = '''      <button onclick="switchTab('tree')" id="tab-tree" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#cc9d4d] text-slate-950 transition-all shadow-sm">
        🌳 Visual Chat Tree
      </button>
      <button onclick="switchTab('simulator')" id="tab-simulator" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all">
        📱 Live Mobile Simulator
      </button>'''

tab_replacement = '''      <button onclick="switchTab('editor')" id="tab-editor" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#cc9d4d] text-slate-950 transition-all shadow-sm flex items-center gap-1.5">
        ✏️ Canva Step Studio (Editor)
      </button>
      <button onclick="switchTab('tree')" id="tab-tree" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all">
        🌳 Visual Chat Tree Map
      </button>
      <button onclick="switchTab('simulator')" id="tab-simulator" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all">
        📱 Live Mobile Simulator
      </button>'''

if tab_needle in content:
    content = content.replace(tab_needle, tab_replacement)
else:
    print("Warning: tab_needle not found!")

# 2. Add the Editor Studio section right after <main class="p-6 max-w-[1700px] mx-auto">
main_needle = '<main class="p-6 max-w-[1700px] mx-auto">\n\n    <!-- ═══════════════════════════════════════════════════════════════ -->'

editor_section = '''<main class="p-6 max-w-[1700px] mx-auto">

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- VIEW 0: CANVA STEP & BUTTON STUDIO (LIVE EDITABLE DESIGNER) -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div id="view-editor" class="space-y-6">
      
      <!-- Studio Header & Action Bar -->
      <div class="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 border border-amber-500/30">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">Interactive Studio</span>
            <h2 class="text-base font-bold text-white">Canva Step Studio · Live Telegram Chat Tree Editor</h2>
          </div>
          <p class="text-xs text-slate-400 mt-1">
            Click any step to edit question texts, button wording, or row layouts. Changes preview live on the iPhone and save directly to your live Telegram bot!
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div id="save-status" class="text-xs font-mono text-emerald-400 hidden flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Saved to bot live!
          </div>
          <button onclick="revertConfig()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all">
            🔄 Reload Config
          </button>
          <button onclick="saveConfigToServer()" class="px-5 py-2 rounded-xl bg-gradient-to-r from-[#cc9d4d] to-[#e8c47a] hover:from-[#d8a957] hover:to-[#f3d492] text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all">
            💾 Save Changes to Bot
          </button>
        </div>
      </div>

      <!-- Studio Main Layout: Left = Step Navigation + Editor Form, Right = Real-Time Mobile Preview -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- Column 1: Step Navigator (3 cols) -->
        <div class="lg:col-span-3 space-y-2">
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Select Step to Edit</div>
          
          <div id="step-selector-list" class="space-y-1.5 font-mono text-xs">
            <!-- Dynamically populated -->
          </div>
        </div>

        <!-- Column 2: Step Editor Form (5 cols) -->
        <div class="lg:col-span-5 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span id="editor-step-id-badge" class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold uppercase">STEP CONFIG</span>
              <h3 id="editor-step-title" class="text-sm font-bold text-white mt-1">Editing Step</h3>
            </div>
            <span class="text-[11px] text-slate-400 font-mono">Live Sync</span>
          </div>

          <!-- Fields Container -->
          <div id="editor-fields-box" class="space-y-4 text-xs">
            <!-- Dynamically rendered based on selected step -->
          </div>

        </div>

        <!-- Column 3: Live iPhone Mockup (4 cols) -->
        <div class="lg:col-span-4 sticky top-20">
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2 flex items-center justify-between">
            <span>Live Telegram Screen</span>
            <span class="text-emerald-400 font-mono text-[10px] flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Real-Time</span>
          </div>

          <!-- Phone Frame -->
          <div class="w-full max-w-[340px] mx-auto bg-slate-950 rounded-[40px] p-4 border-4 border-slate-800 shadow-2xl relative">
            <!-- Dynamic Island -->
            <div class="w-28 h-4 bg-slate-900 rounded-full mx-auto mb-3 border border-slate-800 flex items-center justify-center">
              <div class="w-2 h-2 rounded-full bg-slate-800 ml-10"></div>
            </div>

            <!-- Bot Bar -->
            <div class="flex items-center gap-2.5 pb-2.5 border-b border-slate-800/80 px-1 text-white">
              <div class="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-[10px]">
                NR
              </div>
              <div>
                <div class="text-xs font-bold leading-tight">Nick_REAKH_Bot</div>
                <div class="text-[9px] text-slate-400">Property Concierge</div>
              </div>
            </div>

            <!-- Chat Preview Box -->
            <div id="editor-sim-screen" class="py-3 space-y-2.5 min-h-[460px] max-h-[500px] overflow-y-auto custom-scroll text-xs">
              <!-- Dynamically populated -->
            </div>

            <!-- Home indicator -->
            <div class="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-3"></div>
          </div>
        </div>

      </div>

    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->'''

content = content.replace(main_needle, editor_section)

# 3. Update switchTab function and add Editor Studio JS
script_needle = '    function switchTab(tab) {'
script_replacement = '''    let treeConfig = null;
    let currentSelectedStepId = 'step1_objective';

    async function loadTreeConfig() {
      try {
        const res = await fetch('/api/tree-config');
        if (res.ok) {
          treeConfig = await res.json();
          renderStepSelectorList();
          selectStepToEdit(currentSelectedStepId);
        }
      } catch (e) {
        console.warn('Could not load /api/tree-config:', e);
      }
    }

    function renderStepSelectorList() {
      if (!treeConfig || !treeConfig.steps) return;
      const list = document.getElementById('step-selector-list');
      list.innerHTML = '';

      const stepMeta = [
        { id: 'step1_objective', name: 'Step 1 · Objective', desc: 'Buy vs Rent', icon: '🏢' },
        { id: 'step2_buy_status', name: 'Step 2 · Buy Status', desc: 'Off-Plan vs Resale', icon: '🏗️' },
        { id: 'step2_rent_type', name: 'Step 2 · Rent Type', desc: 'Condo / Apt / Villa', icon: '🛋️' },
        { id: 'step3_buy_type', name: 'Step 3 · Buy Type', desc: 'Property Category', icon: '🏢' },
        { id: 'location_districts', name: 'Step 4 · Districts', desc: 'BKK1, TK, etc.', icon: '📍' },
        { id: 'budget_buy', name: 'Step 5 · Buy Budget', desc: 'Under $100k - $500k+', icon: '💰' },
        { id: 'budget_rent', name: 'Step 4 · Rent Budget', desc: 'Under $600 - $2,500+', icon: '💵' },
        { id: 'anchoring_framework', name: 'Anchoring Framework', desc: 'Sweet Spot / Luxury / Agile', icon: '⚓' }
      ];

      stepMeta.forEach(m => {
        const isActive = m.id === currentSelectedStepId;
        const btn = document.createElement('button');
        btn.onclick = () => selectStepToEdit(m.id);
        btn.className = `w-full p-2.5 rounded-xl text-left border transition-all flex items-center justify-between ${
          isActive 
            ? 'bg-amber-400/10 border-amber-400/40 text-amber-200' 
            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
        }`;
        btn.innerHTML = `
          <div>
            <div class="font-bold flex items-center gap-1.5">${m.icon} ${m.name}</div>
            <div class="text-[10px] text-slate-400">${m.desc}</div>
          </div>
          <span class="text-xs text-slate-500">❯</span>
        `;
        list.appendChild(btn);
      });
    }

    function selectStepToEdit(stepId) {
      currentSelectedStepId = stepId;
      renderStepSelectorList();
      renderStepEditorForm(stepId);
      renderEditorSimScreen(stepId);
    }

    function renderStepEditorForm(stepId) {
      const box = document.getElementById('editor-fields-box');
      if (!treeConfig || !treeConfig.steps || !treeConfig.steps[stepId]) {
        box.innerHTML = `<div class="text-slate-400 italic">No configuration found for this step.</div>`;
        return;
      }

      const s = treeConfig.steps[stepId];
      document.getElementById('editor-step-id-badge').innerText = stepId.toUpperCase();
      document.getElementById('editor-step-title').innerText = s.stepLabel || stepId;

      if (stepId === 'anchoring_framework') {
        // Special editor for anchoring framework
        box.innerHTML = `
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div class="font-bold text-amber-300">⭐️ Sweet Spot (Top Recommendation)</div>
            <div>
              <label class="text-[10px] text-slate-400 uppercase">Badge Label:</label>
              <input type="text" id="af_sweet_badge" value="${escapeHtml(s.sweetSpot.badge)}" oninput="updateAnchoringForm()" class="w-full mt-1 p-2 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs">
            </div>
            <div>
              <label class="text-[10px] text-slate-400 uppercase">Broker Advisory Rationale:</label>
              <input type="text" id="af_sweet_rat" value="${escapeHtml(s.sweetSpot.rationale)}" oninput="updateAnchoringForm()" class="w-full mt-1 p-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs">
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div class="font-bold text-blue-300">⚓ Luxury Anchor (Premier Benchmark)</div>
            <div>
              <label class="text-[10px] text-slate-400 uppercase">Badge Label:</label>
              <input type="text" id="af_lux_badge" value="${escapeHtml(s.luxuryAnchor.badge)}" oninput="updateAnchoringForm()" class="w-full mt-1 p-2 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs">
            </div>
            <div>
              <label class="text-[10px] text-slate-400 uppercase">Broker Advisory Rationale:</label>
              <input type="text" id="af_lux_rat" value="${escapeHtml(s.luxuryAnchor.rationale)}" oninput="updateAnchoringForm()" class="w-full mt-1 p-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs">
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div class="font-bold text-emerald-300">💡 Agile Alternative (Smart Value)</div>
            <div>
              <label class="text-[10px] text-slate-400 uppercase">Badge Label:</label>
              <input type="text" id="af_val_badge" value="${escapeHtml(s.smartValue.badge)}" oninput="updateAnchoringForm()" class="w-full mt-1 p-2 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs">
            </div>
            <div>
              <label class="text-[10px] text-slate-400 uppercase">Broker Advisory Rationale:</label>
              <input type="text" id="af_val_rat" value="${escapeHtml(s.smartValue.rationale)}" oninput="updateAnchoringForm()" class="w-full mt-1 p-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs">
            </div>
          </div>
        `;
        return;
      }

      // Standard Step Form
      let buttonsHtml = '';
      if (Array.isArray(s.buttons)) {
        s.buttons.forEach((b, idx) => {
          buttonsHtml += `
            <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800">
              <span class="text-[10px] font-mono text-slate-500 w-4">${idx + 1}</span>
              <input type="text" value="${escapeHtml(b.label)}" oninput="updateButtonLabel(${idx}, this.value)" class="flex-1 p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs">
              <button onclick="removeButton(${idx})" class="p-1 rounded text-red-400 hover:bg-red-950/50" title="Delete button">✕</button>
            </div>
          `;
        });
      }

      box.innerHTML = `
        <div>
          <label class="text-[10px] text-slate-400 uppercase font-bold">Header Title:</label>
          <input type="text" id="input_header" value="${escapeHtml(s.header || 'SEARCH CONCIERGE')}" oninput="onHeaderChange(this.value)" class="w-full mt-1 p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs">
        </div>

        <div>
          <label class="text-[10px] text-slate-400 uppercase font-bold">Step Subtitle / Counter:</label>
          <input type="text" id="input_steplabel" value="${escapeHtml(s.stepLabel || '')}" oninput="onStepLabelChange(this.value)" class="w-full mt-1 p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs">
        </div>

        <div>
          <label class="text-[10px] text-slate-400 uppercase font-bold">Question / Prompt:</label>
          <textarea id="input_prompt" rows="2" oninput="onPromptChange(this.value)" class="w-full mt-1 p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs">${escapeHtml(s.prompt || '')}</textarea>
        </div>

        <div class="pt-2 border-t border-slate-800">
          <label class="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Button Grid Layout:</label>
          <div class="grid grid-cols-2 gap-2">
            <button onclick="setButtonLayout('1_per_row')" class="p-2 rounded-lg text-xs font-semibold border ${
              s.layout === '1_per_row' ? 'bg-amber-400/20 border-amber-400 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-400'
            }">1 Per Row (Full-Width Pill)</button>
            <button onclick="setButtonLayout('2_per_row')" class="p-2 rounded-lg text-xs font-semibold border ${
              s.layout === '2_per_row' ? 'bg-amber-400/20 border-amber-400 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-400'
            }">2 Per Row (Compact Grid)</button>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-800">
          <div class="flex items-center justify-between mb-2">
            <label class="text-[10px] text-slate-400 uppercase font-bold">Buttons (${(s.buttons || []).length}):</label>
            <button onclick="addNewButton()" class="text-[10px] font-bold text-amber-300 hover:underline">+ Add Button</button>
          </div>
          <div class="space-y-1.5">
            ${buttonsHtml}
          </div>
        </div>
      `;
    }

    function onHeaderChange(val) {
      if (!treeConfig.steps[currentSelectedStepId]) return;
      treeConfig.steps[currentSelectedStepId].header = val;
      renderEditorSimScreen(currentSelectedStepId);
    }

    function onStepLabelChange(val) {
      if (!treeConfig.steps[currentSelectedStepId]) return;
      treeConfig.steps[currentSelectedStepId].stepLabel = val;
      renderEditorSimScreen(currentSelectedStepId);
    }

    function onPromptChange(val) {
      if (!treeConfig.steps[currentSelectedStepId]) return;
      treeConfig.steps[currentSelectedStepId].prompt = val;
      renderEditorSimScreen(currentSelectedStepId);
    }

    function setButtonLayout(layout) {
      if (!treeConfig.steps[currentSelectedStepId]) return;
      treeConfig.steps[currentSelectedStepId].layout = layout;
      renderStepEditorForm(currentSelectedStepId);
      renderEditorSimScreen(currentSelectedStepId);
    }

    function updateButtonLabel(idx, val) {
      if (!treeConfig.steps[currentSelectedStepId]) return;
      treeConfig.steps[currentSelectedStepId].buttons[idx].label = val;
      renderEditorSimScreen(currentSelectedStepId);
    }

    function removeButton(idx) {
      if (!treeConfig.steps[currentSelectedStepId]) return;
      treeConfig.steps[currentSelectedStepId].buttons.splice(idx, 1);
      renderStepEditorForm(currentSelectedStepId);
      renderEditorSimScreen(currentSelectedStepId);
    }

    function addNewButton() {
      if (!treeConfig.steps[currentSelectedStepId]) return;
      if (!Array.isArray(treeConfig.steps[currentSelectedStepId].buttons)) {
        treeConfig.steps[currentSelectedStepId].buttons = [];
      }
      treeConfig.steps[currentSelectedStepId].buttons.push({
        label: '✨ New Option',
        callback: 'srch_custom_' + Date.now()
      });
      renderStepEditorForm(currentSelectedStepId);
      renderEditorSimScreen(currentSelectedStepId);
    }

    function updateAnchoringForm() {
      const s = treeConfig.steps.anchoring_framework;
      s.sweetSpot.badge = document.getElementById('af_sweet_badge').value;
      s.sweetSpot.rationale = document.getElementById('af_sweet_rat').value;
      s.luxuryAnchor.badge = document.getElementById('af_lux_badge').value;
      s.luxuryAnchor.rationale = document.getElementById('af_lux_rat').value;
      s.smartValue.badge = document.getElementById('af_val_badge').value;
      s.smartValue.rationale = document.getElementById('af_val_rat').value;
      renderEditorSimScreen('anchoring_framework');
    }

    function renderEditorSimScreen(stepId) {
      const box = document.getElementById('editor-sim-screen');
      if (!treeConfig || !treeConfig.steps || !treeConfig.steps[stepId]) return;
      const s = treeConfig.steps[stepId];

      if (stepId === 'anchoring_framework') {
        box.innerHTML = `
          <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div class="font-bold text-white tracking-wider">SEARCH CONCIERGE</div>
            <div class="text-slate-600 text-[10px]">──────────</div>
            <div class="text-amber-300 font-bold">Verified Portfolio Matches (3)</div>
          </div>
          <div class="p-2.5 rounded-lg bg-slate-900/90 border-l-4 border-amber-400 space-y-1">
            <div class="font-bold text-amber-300 text-[11px]">${escapeHtml(s.sweetSpot.badge)}</div>
            <div class="font-bold text-white">🏢 Time Square 7 (Duplex Loft)</div>
            <div class="text-amber-400 font-bold">▫️ Price: $81,315 USD</div>
            <div class="text-slate-400 text-[10px]">▫️ Specs: 38th Fl · 65m² · 1BR Duplex</div>
            <div class="text-[10px] text-amber-200/90 italic">💡 Why: ${escapeHtml(s.sweetSpot.rationale)}</div>
          </div>
          <div class="p-2.5 rounded-lg bg-slate-900/90 border-l-4 border-blue-400 space-y-1">
            <div class="font-bold text-blue-300 text-[11px]">${escapeHtml(s.luxuryAnchor.badge)}</div>
            <div class="font-bold text-white">🏢 Odom Living (Executive 2BR)</div>
            <div class="text-blue-300 font-bold">▫️ Price: $260,000 USD</div>
            <div class="text-slate-400 text-[10px]">▫️ Specs: 18th Fl · 82m² · 2BR</div>
            <div class="text-[10px] text-blue-200/90 italic">💡 Why: ${escapeHtml(s.luxuryAnchor.rationale)}</div>
          </div>
          <div class="p-2.5 rounded-lg bg-slate-900/90 border-l-4 border-emerald-400 space-y-1">
            <div class="font-bold text-emerald-300 text-[11px]">${escapeHtml(s.smartValue.badge)}</div>
            <div class="font-bold text-white">🏢 Residence L (Smart Entry)</div>
            <div class="text-emerald-300 font-bold">▫️ Price: $65,000 USD</div>
            <div class="text-slate-400 text-[10px]">▫️ Specs: 15th Fl · 50m² · 1BR</div>
            <div class="text-[10px] text-emerald-200/90 italic">💡 Why: ${escapeHtml(s.smartValue.rationale)}</div>
          </div>
        `;
        return;
      }

      let buttonsHtml = '';
      const isGrid = s.layout === '2_per_row';
      const btns = s.buttons || [];

      if (isGrid) {
        buttonsHtml = `<div class="grid grid-cols-2 gap-1.5 pt-1">`;
        btns.forEach(b => {
          buttonsHtml += `<div class="py-2 px-1.5 rounded-xl bg-slate-800 text-slate-100 font-semibold text-center border border-slate-700 text-[11px] truncate">${escapeHtml(b.label)}</div>`;
        });
        buttonsHtml += `</div>`;
      } else {
        buttonsHtml = `<div class="space-y-1.5 pt-1">`;
        btns.forEach(b => {
          buttonsHtml += `<div class="w-full py-2 px-2.5 rounded-xl bg-slate-800 text-slate-100 font-semibold text-center border border-slate-700 text-xs">${escapeHtml(b.label)}</div>`;
        });
        buttonsHtml += `</div>`;
      }

      if (Array.isArray(s.fullWidthButtons)) {
        s.fullWidthButtons.forEach(b => {
          buttonsHtml += `<div class="w-full mt-1.5 py-2 px-2.5 rounded-xl bg-slate-800 text-slate-200 text-center border border-slate-700 text-xs">${escapeHtml(b.label)}</div>`;
        });
      }

      if (s.backButton) {
        buttonsHtml += `<div class="w-full mt-1.5 py-1.5 px-2 rounded-xl bg-slate-900 text-slate-400 text-center border border-slate-800 text-[10px]">${escapeHtml(s.backButton.label)}</div>`;
      }

      box.innerHTML = `
        <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
          <div class="font-bold text-white tracking-wider">${escapeHtml(s.header || 'SEARCH CONCIERGE')}</div>
          <div class="text-slate-600 text-[10px]">──────────</div>
          <div class="font-semibold text-amber-300 text-xs">${escapeHtml(s.stepLabel || '')}</div>
          <p class="text-slate-300 text-xs pt-1 leading-relaxed">${escapeHtml(s.prompt || '')}</p>
        </div>
        ${buttonsHtml}
      `;
    }

    async function saveConfigToServer() {
      try {
        const res = await fetch('/api/tree-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(treeConfig)
        });
        if (res.ok) {
          const status = document.getElementById('save-status');
          status.classList.remove('hidden');
          setTimeout(() => status.classList.add('hidden'), 3500);
          alert('✅ Chat Tree Saved! Updated live on Telegram bot @Nick_REAKH_Bot.');
        } else {
          alert('Error saving configuration.');
        }
      } catch (e) {
        alert('Network error while saving: ' + e.message);
      }
    }

    function revertConfig() {
      if (confirm('Reload configuration from server?')) {
        loadTreeConfig();
      }
    }

    function escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function switchTab(tab) {
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
    }

    window.addEventListener('DOMContentLoaded', () => {
      loadTreeConfig();
    });'''

if script_needle in content:
    content = content.replace(script_needle, script_replacement)
else:
    print("Warning: script_needle not found!")

# Also ensure default view is 'editor' if desired or keep tab-editor active
with open('phc-tools/docs/phc-system-tree-canvas.html', 'w', encoding='utf-8') as f:
    f.write(content)

# Also copy to artifacts directory
import shutil
artifact_path = '/Users/macbook/.gemini/antigravity/brain/e1026403-336c-464a-8ee4-0b1595eba513/phc-system-tree-canvas.html'
shutil.copyfile('phc-tools/docs/phc-system-tree-canvas.html', artifact_path)
print("Successfully injected Studio Editor into phc-system-tree-canvas.html and artifact!")
