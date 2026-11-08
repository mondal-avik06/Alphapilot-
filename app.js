/**
 * Alphapilot — Enterprise Inventory Management SaaS
 * Design references: Zoho Inventory (60%), Sortly (25%), Linear (15%)
 */

// --- Utility Functions ---
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
const APP_PAGES = ['dashboard','products','inventory','transactions','sales','purchases','suppliers','customers','reports','settings'];

const CURRENCIES = [
  ['USD', 'en-US', 'United States — USD ($)'],
  ['INR', 'en-IN', 'India — INR (₹)'],
  ['BDT', 'bn-BD', 'Bangladesh — BDT (৳)'],
  ['NPR', 'ne-NP', 'Nepal — NPR (रु)'],
  ['PKR', 'en-PK', 'Pakistan — PKR (₨)'],
  ['LKR', 'en-LK', 'Sri Lanka — LKR (Rs)'],
  ['GBP', 'en-GB', 'United Kingdom — GBP (£)'],
  ['EUR', 'de-DE', 'European Union — EUR (€)'],
  ['JPY', 'ja-JP', 'Japan — JPY (¥)'],
  ['CNY', 'zh-CN', 'China — CNY (¥)'],
  ['KRW', 'ko-KR', 'South Korea — KRW (₩)'],
  ['AUD', 'en-AU', 'Australia — AUD ($)'],
  ['CAD', 'en-CA', 'Canada — CAD ($)'],
  ['SGD', 'en-SG', 'Singapore — SGD ($)'],
  ['AED', 'en-AE', 'United Arab Emirates — AED'],
  ['SAR', 'en-SA', 'Saudi Arabia — SAR'],
  ['QAR', 'en-QA', 'Qatar — QAR'],
  ['ZAR', 'en-ZA', 'South Africa — ZAR (R)'],
  ['NGN', 'en-NG', 'Nigeria — NGN (₦)'],
  ['KES', 'en-KE', 'Kenya — KES'],
  ['BRL', 'pt-BR', 'Brazil — BRL (R$)'],
  ['MXN', 'es-MX', 'Mexico — MXN ($)']
];
const currencyConfig = code => CURRENCIES.find(([currency]) => currency === code) || CURRENCIES[0];
const currencyRate = () => Number(state?.exchangeRates?.[state.currency]) || 1;
const convertedAmount = val => Number(val || 0) * currencyRate();
const baseAmount = val => Number(val || 0) / currencyRate();
const money = (val) => {
  const [currency, locale] = currencyConfig(state?.currency || 'USD');
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(convertedAmount(val));
};
const formatNumber = (val) => Number(val || 0).toLocaleString('en-US');
const formatDate = (isoStr) => {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Global state
let state = {
  page: APP_PAGES.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard',
  products: [],
  suppliers: [],
  customers: [],
  transactions: [],
  sales: [],
  purchases: [],
  stats: {},
  dashboardPeriod: localStorage.getItem('alphapilot-dashboard-period') || '7',
  categories: [],
  theme: localStorage.getItem('alphapilot-theme') || 'light',
  currency: localStorage.getItem('alphapilot-currency') || 'USD',
  exchangeRates: { USD: 1 },
  exchangeRatesUpdatedAt: null,
  exchangeRatesSource: 'fallback',
  aiHistory: [],
  user: { name: 'Alex Morgan', role: 'Administrator', username: 'admin' },
  // Filters and table state
  productFilter: { q: '', category: 'All categories', status: 'All stock', sort: 'name', page: 1, limit: 12 },
  supplierFilter: { q: '', status: 'All statuses', sort: 'name_asc', page: 1, limit: 10 },
  salesFilter: { q: '' },
  selectedProducts: new Set(),
  selectedSuppliers: new Set(),
  openDropdownId: null
};

// --- SVG Icons Map (Lucide-inspired) ---
const ICONS = {
  box: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
  truck: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`,
  users: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  chart: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  dollar: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  alert: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  more: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
  download: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  upload: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  edit: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  eye: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  adjust: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>`,
  sparkles: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`
};

// --- API Client ---
async function api(path, options = {}) {
  const token = sessionStorage.getItem('alphapilot-token');
  const { headers: optionHeaders = {}, ...requestOptions } = options;
  const res = await fetch('/api' + path, {
    ...requestOptions,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...optionHeaders }
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : { error: await res.text() };
  if (res.status === 401 && path !== '/auth/login') {
    sessionStorage.removeItem('alphapilot-token');
    location.reload();
  }
  if (!res.ok) throw new Error(data.error || 'Server error occurred');
  return data;
}

// Toast notification
function toast(message, type = 'info') {
  const container = $('#toast');
  if (!container) return;
  container.textContent = String(message);
  container.className = `toast-container show toast-${type}`;
  setTimeout(() => {
    container.className = 'toast-container';
  }, 2800);
}

// --- Data Fetching ---
async function loadData() {
  try {
    const [products, stats, transactions, suppliers, customers, sales, purchases, exchangeRates] = await Promise.all([
      api('/products'),
      api('/dashboard/stats'),
      api('/transactions'),
      api('/suppliers'),
      api('/customers'),
      api('/sales'),
      api('/purchases'),
      api('/exchange-rates').catch(() => ({ rates: { USD: 1 }, source: 'fallback', updatedAt: null }))
    ]);

    state.products = products;
    state.stats = stats;
    state.transactions = transactions;
    state.suppliers = suppliers;
    state.customers = customers;
    state.sales = sales;
    state.purchases = purchases;
    state.exchangeRates = exchangeRates.rates || { USD: 1 };
    state.exchangeRatesUpdatedAt = exchangeRates.updatedAt || null;
    state.exchangeRatesSource = exchangeRates.source || 'fallback';

    // Update product counter in sidebar
    const pCountEl = $('#product-count');
    if (pCountEl) pCountEl.textContent = products.length;

    // Notification dot if items need attention
    const alertDot = $('#alert-dot');
    if (alertDot) {
      alertDot.style.display = (stats.low + stats.out) > 0 ? 'block' : 'none';
    }

    renderCurrentPage();
  } catch (err) {
    console.error('Error loading data:', err);
    toast('Error syncing data: ' + err.message, 'error');
  }
}

// --- Theme Management ---
function initTheme() {
  const isDark = state.theme === 'dark';
  document.body.classList.toggle('dark', isDark);
  updateThemeIcon(isDark);

  $('#theme-toggle')?.addEventListener('click', () => {
    const currentDark = document.body.classList.contains('dark');
    const newDark = !currentDark;
    document.body.classList.toggle('dark', newDark);
    state.theme = newDark ? 'dark' : 'light';
    localStorage.setItem('alphapilot-theme', state.theme);
    updateThemeIcon(newDark);
    toast(`Switched to ${newDark ? 'Dark' : 'Light'} theme`);
  });
}

function updateThemeIcon(isDark) {
  const sun = $('.sun-icon');
  const moon = $('.moon-icon');
  if (sun && moon) {
    sun.style.display = isDark ? 'none' : 'block';
    moon.style.display = isDark ? 'block' : 'none';
  }
}

// --- Status Badges ---
function renderStockBadge(product) {
  if (product.stock === 0) {
    return `<span class="status-badge badge-error">Out of Stock</span>`;
  }
  if (product.stock <= product.minStock) {
    return `<span class="status-badge badge-warning">Low Stock (${product.stock})</span>`;
  }
  return `<span class="status-badge badge-success">In Stock</span>`;
}

function renderSupplierBadge(status) {
  const isAct = (status || 'Active').toLowerCase() === 'active';
  return isAct
    ? `<span class="status-badge badge-success">Active</span>`
    : `<span class="status-badge badge-neutral">Inactive</span>`;
}

function renderOrderBadge(status) {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'received') return `<span class="status-badge badge-success">${status}</span>`;
  if (s === 'pending' || s === 'ordered') return `<span class="status-badge badge-warning">${status}</span>`;
  return `<span class="status-badge badge-neutral">${status || 'Pending'}</span>`;
}

// ==========================================================================
// VIEW: Dashboard (Overview)
// ==========================================================================
function renderDashboard() {
  const { stats, products, transactions } = state;
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Category calculation
  const catMap = {};
  products.forEach(p => {
    catMap[p.category] = (catMap[p.category] || 0) + p.stock;
  });
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const totalUnits = stats.units || 1;
  const selectedPeriod = String(state.dashboardPeriod || '7');
  const periodDays = selectedPeriod === 'month' ? Math.max(1, now.getDate()) : Number(selectedPeriod);
  const currentInventoryValue = Number(stats.value || 0);
  const dayMs = 86400000;
  const inventoryValueAt = timestamp => currentInventoryValue - transactions.reduce((sum, transaction) => {
    const transactionTime = new Date(transaction.date).getTime();
    if (transactionTime <= timestamp) return sum;
    const product = products.find(item => item.id === transaction.productId);
    return sum + Number(transaction.change || 0) * Number(product?.cost || 0);
  }, 0);
  const periodValues = Array.from({ length: periodDays }, (_, index) => inventoryValueAt(Date.now() - index * dayMs));
  const averageInventoryValue = periodValues.reduce((sum, value) => sum + value, 0) / periodValues.length;
  const periodOpeningValue = periodValues[periodValues.length - 1] ?? currentInventoryValue;
  const periodValueChange = currentInventoryValue - periodOpeningValue;

  // Products to watch (at or below reorder point)
  const watchProducts = [...products]
    .filter(p => p.stock <= p.minStock)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  return `
    <div class="page-header">
      <div class="page-header-text">
        <h1 class="page-title">Good morning, Alex 👋</h1>
        <p class="page-subtitle">${dateFormatted} · Here is your real-time inventory overview and operational summary.</p>
      </div>
      <div class="page-actions">
        <select class="input-select" id="dashboard-period">
          <option value="7" ${selectedPeriod === '7' ? 'selected' : ''}>Last 7 days</option>
          <option value="30" ${selectedPeriod === '30' ? 'selected' : ''}>Last 30 days</option>
          <option value="month" ${selectedPeriod === 'month' ? 'selected' : ''}>This Month</option>
        </select>
        <button class="btn" id="btn-export-dashboard" type="button">${ICONS.download} Export Summary</button>
        <button class="btn" id="btn-dashboard-ai" data-open-ai="true" type="button">${ICONS.sparkles} Ask AI</button>
        <button class="btn btn-primary" id="btn-add-product-quick" type="button">${ICONS.plus} Add Product</button>
      </div>
    </div>

    <!-- KPI Metric Cards -->
    <div class="metrics-row">
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Total Products</span>
          <span class="metric-icon-badge info">${ICONS.box}</span>
        </div>
        <div class="metric-value">${formatNumber(stats.products)}</div>
        <div class="metric-footer">
          <span class="trend-up">↑ 8.2%</span> &nbsp;vs. last month
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Units in Stock</span>
          <span class="metric-icon-badge success">${ICONS.chart}</span>
        </div>
        <div class="metric-value">${formatNumber(stats.units)}</div>
        <div class="metric-footer">Across 3 warehouse locations</div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Average Inventory Value</span>
          <span class="metric-icon-badge info">${ICONS.dollar}</span>
        </div>
        <div class="metric-value">${money(averageInventoryValue)}</div>
        <div class="metric-footer">
          <span class="${periodValueChange >= 0 ? 'trend-up' : 'trend-down'}">${periodValueChange >= 0 ? '↑' : '↓'} ${money(Math.abs(periodValueChange))}</span> &nbsp;· current ${money(currentInventoryValue)}
        </div>
      </div>

      <div class="metric-card" style="cursor:pointer;" id="kpi-attention" title="Click to view items needing attention">
        <div class="metric-header">
          <span class="metric-label">Needs Attention</span>
          <span class="metric-icon-badge ${stats.out > 0 ? 'danger' : 'warning'}">${ICONS.alert}</span>
        </div>
        <div class="metric-value">${stats.low + stats.out}</div>
        <div class="metric-footer">
          <span class="${stats.out > 0 ? 'trend-down' : ''}">${stats.low} low stock</span> &nbsp;·&nbsp; ${stats.out} out of stock
        </div>
      </div>
    </div>

    <!-- Analytics Section -->
    <div class="analytics-grid">
      <div class="dashboard-panel">
        <div class="panel-head">
          <div class="panel-title-group">
            <span class="panel-title">Inventory Movement</span>
            <span class="panel-subtitle">Total inbound and outbound stock activity</span>
          </div>
          <div class="panel-actions">
            <select class="input-select btn-sm" id="chart-days-select">
              <option value="7" ${periodDays === 7 ? 'selected' : ''}>Last 7 days</option>
              <option value="30" ${periodDays === 30 ? 'selected' : ''}>Last 30 days</option>
              ${selectedPeriod === 'month' ? `<option value="${periodDays}" selected>This Month</option>` : ''}
            </select>
          </div>
        </div>
        <div class="chart-container" id="movement-chart-box">
          ${renderSvgChart(periodDays)}
        </div>
      </div>

      <div class="dashboard-panel">
        <div class="panel-head">
          <div class="panel-title-group">
            <span class="panel-title">Stock by Category</span>
            <span class="panel-subtitle">${formatNumber(stats.units)} total units across catalog</span>
          </div>
          <button class="btn btn-sm" data-nav="inventory">View All</button>
        </div>
        <div class="category-bars-list">
          ${catEntries.slice(0, 5).map(([cat, count]) => {
            const pct = Math.round((count / totalUnits) * 100) || 0;
            return `
              <div class="category-bar-item">
                <span class="cat-name" title="${cat}">${cat}</span>
                <div class="cat-track">
                  <div class="cat-fill" style="width: ${Math.max(6, pct)}%;"></div>
                </div>
                <span class="cat-count">${formatNumber(count)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Bottom Section: Products to Watch + Recent Activity -->
    <div class="dashboard-bottom-grid">
      <div class="table-card">
        <div class="panel-head">
          <div class="panel-title-group">
            <span class="panel-title">Products to Watch</span>
            <span class="panel-subtitle">Items currently at or below their reorder point</span>
          </div>
          <button class="btn btn-sm" data-nav="inventory">Inventory Hub →</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th class="text-right">On Hand / Min</th>
                <th>Status</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              ${watchProducts.length ? watchProducts.map(p => `
                <tr>
                  <td>
                    <div class="entity-cell">
                      <div class="entity-icon">${ICONS.box}</div>
                      <div class="entity-info">
                        <span class="entity-name">${p.name}</span>
                        <span class="entity-sub">${p.category}</span>
                      </div>
                    </div>
                  </td>
                  <td><code>${p.sku}</code></td>
                  <td class="text-right"><strong>${p.stock}</strong> <span style="color:var(--text-muted)">/ ${p.minStock}</span></td>
                  <td>${renderStockBadge(p)}</td>
                  <td class="text-right">
                    <button class="btn btn-sm" data-adjust-id="${p.id}">Adjust</button>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="5" class="table-empty-state">
                    <div class="empty-icon">${ICONS.box}</div>
                    <span class="empty-title">All stock levels healthy</span>
                    <span class="empty-desc">No products are currently below their reorder threshold.</span>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <div class="dashboard-panel">
        <div class="panel-head">
          <div class="panel-title-group">
            <span class="panel-title">Recent Activity</span>
            <span class="panel-subtitle">Latest inventory adjustments and transfers</span>
          </div>
          <button class="btn btn-sm" data-nav="transactions">View Log →</button>
        </div>
        <div class="activity-feed-list">
          ${transactions.slice(0, 5).map(t => {
            const p = products.find(x => x.id === t.productId) || { name: 'Item #' + t.productId };
            const isPos = t.change > 0;
            const typeClass = isPos ? 'in' : (t.type === 'Sale' ? 'out' : 'adjust');
            return `
              <div class="activity-feed-item">
                <div class="activity-icon-wrap ${typeClass}">
                  ${isPos ? '↓' : '↑'}
                </div>
                <div class="activity-details">
                  <span class="activity-title">${p.name}</span>
                  <span class="activity-meta">${t.note || t.type} · ${formatDate(t.date)}</span>
                </div>
                <div class="activity-qty ${isPos ? 'positive' : 'negative'}">
                  ${isPos ? '+' : ''}${t.change}
                </div>
              </div>
            `;
          }).join('') || '<div class="table-empty-state"><span class="empty-desc">No transactions recorded yet.</span></div>'}
        </div>
      </div>
    </div>
  `;
}

function renderSvgChart(daysCount = 7) {
  const { transactions } = state;
  const now = Date.now();
  const days = Array.from({ length: daysCount }, (_, i) => new Date(now - (daysCount - 1 - i) * 86400000));
  const labels = days.map(d => daysCount <= 7 ? d.toLocaleDateString('en-US', { weekday: 'short' }) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const fullLabels = days.map(d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
  const tickStep = daysCount <= 7 ? 1 : Math.ceil(daysCount / 7);
  const showTick = index => index === 0 || index === daysCount - 1 || index % tickStep === 0;

  const dataValues = days.map((_, i) => {
    const start = now - (daysCount - i) * 86400000;
    const end = now - (daysCount - 1 - i) * 86400000;
    const count = transactions.filter(t => {
      const time = new Date(t.date).getTime();
      return time >= start && time < end;
    }).reduce((acc, t) => acc + Math.abs(t.change), 0);
    return count;
  });

  // Provide realistic fallback curve if local test transactions are sparse
  const hasData = dataValues.some(v => v > 0);
  const rawData = hasData ? dataValues : Array.from({ length: daysCount }, (_, i) => 14 + Math.round(18 * Math.abs(Math.sin((i + 1) * 0.75))));

  const rawMax = Math.max(...rawData, 10);
  const max = Math.ceil(rawMax / 10) * 10;
  const width = 600;
  const height = 150;
  const paddingX = 52;
  const paddingY = 20;

  const points = rawData.map((val, idx) => {
    const x = paddingX + idx * ((width - paddingX * 2) / (daysCount - 1));
    const y = height - paddingY - (val / max) * (height - paddingY * 2);
    return { x, y, val };
  });

  const polylineStr = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = `M${points[0].x},${height - paddingY} L${points.map(p => `${p.x},${p.y}`).join(' L')} L${points[points.length - 1].x},${height - paddingY} Z`;

  return `
    <div class="chart-svg-wrap">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2563EB" stop-opacity="0.18" />
            <stop offset="100%" stop-color="#2563EB" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Grid Lines -->
        <line class="chart-grid-line" x1="${paddingX}" y1="${paddingY}" x2="${width - paddingX}" y2="${paddingY}" />
        <line class="chart-grid-line" x1="${paddingX}" y1="${height / 2}" x2="${width - paddingX}" y2="${height / 2}" />
        <line class="chart-grid-line" x1="${paddingX}" y1="${height - paddingY}" x2="${width - paddingX}" y2="${height - paddingY}" />
        <text class="chart-y-label" x="${paddingX - 9}" y="${paddingY + 3}" text-anchor="end">${max}</text>
        <text class="chart-y-label" x="${paddingX - 9}" y="${height / 2 + 3}" text-anchor="end">${Math.round(max / 2)}</text>
        <text class="chart-y-label" x="${paddingX - 9}" y="${height - paddingY + 3}" text-anchor="end">0</text>

        <!-- Area & Line -->
        <path class="chart-area-fill" d="${areaPath}" />
        <polyline class="chart-main-line" points="${polylineStr}" />

        <!-- Interactive points, hover values & X-labels -->
        ${points.map((p, i) => {
          const tooltipWidth = 108;
          const tooltipX = Math.max(3, Math.min(width - tooltipWidth - 3, p.x - tooltipWidth / 2));
          const tooltipY = Math.max(3, p.y - 35);
          const pointRadius = daysCount > 14 ? 2.8 : 4;
          const hitRadius = daysCount > 14 ? 7 : 12;
          return `
            <g class="chart-point-group" tabindex="0" role="img" aria-label="${fullLabels[i]}: ${p.val} units moved">
              <line class="chart-hover-guide" x1="${p.x}" y1="${paddingY}" x2="${p.x}" y2="${height - paddingY}" />
              <circle class="chart-hit-area" cx="${p.x}" cy="${p.y}" r="${hitRadius}" />
              <circle class="chart-data-point" cx="${p.x}" cy="${p.y}" r="${pointRadius}" />
              <g class="chart-point-tooltip" aria-hidden="true">
                <rect x="${tooltipX}" y="${tooltipY}" width="${tooltipWidth}" height="25" rx="6" />
                <text x="${tooltipX + tooltipWidth / 2}" y="${tooltipY + 16}" text-anchor="middle">${fullLabels[i]} · ${p.val} unit${p.val === 1 ? '' : 's'}</text>
              </g>
            </g>
            ${showTick(i) ? `<text class="chart-axis-label" x="${p.x}" y="${height - 4}" text-anchor="middle">${labels[i]}</text>` : ''}
          `;
        }).join('')}
      </svg>
    </div>

    <div class="chart-legend-row">
      <div class="legend-item">
        <span class="legend-dot"></span>
        <span>Units Moved (${rawData.reduce((a, b) => a + b, 0)} total)</span>
      </div>
      <div>Peak Activity: <strong>${rawMax} units/day</strong></div>
    </div>
  `;
}

// ==========================================================================
// VIEW: Products & Inventory Catalog
// ==========================================================================
function renderProductsPage(isInventoryOnly = false) {
  const { products, stats, productFilter, selectedProducts } = state;
  const categories = ['All categories', ...new Set(products.map(p => p.category))].sort();

  // Filter
  let filtered = products.filter(p => {
    const text = (p.name + ' ' + p.sku + ' ' + (p.brand || '') + ' ' + (p.supplier || '')).toLowerCase();
    const matchesQ = !productFilter.q || text.includes(productFilter.q.toLowerCase());
    const matchesCat = productFilter.category === 'All categories' || p.category === productFilter.category;
    let matchesStatus = true;
    if (productFilter.status === 'Low stock') matchesStatus = p.stock > 0 && p.stock <= p.minStock;
    if (productFilter.status === 'Out of stock') matchesStatus = p.stock === 0;
    if (productFilter.status === 'In stock') matchesStatus = p.stock > p.minStock;
    return matchesQ && matchesCat && matchesStatus;
  });

  // Sort
  if (productFilter.sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (productFilter.sort === 'stock_desc') filtered.sort((a, b) => b.stock - a.stock);
  if (productFilter.sort === 'stock_asc') filtered.sort((a, b) => a.stock - b.stock);
  if (productFilter.sort === 'price_desc') filtered.sort((a, b) => b.price - a.price);

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / productFilter.limit) || 1;
  const page = Math.min(productFilter.page, totalPages);
  const start = (page - 1) * productFilter.limit;
  const pagedItems = filtered.slice(start, start + productFilter.limit);

  const allSelected = pagedItems.length > 0 && pagedItems.every(p => selectedProducts.has(p.id));

  return `
    <div class="page-header">
      <div class="page-header-text">
        <h1 class="page-title">${isInventoryOnly ? 'Inventory Control' : 'Products Catalog'}</h1>
        <p class="page-subtitle">${isInventoryOnly ? 'Track stock levels, warehouse allocations, and replenishment thresholds.' : 'Manage product master data, pricing, SKUs, and supplier links.'}</p>
      </div>
      <div class="page-actions">
        <button class="btn" id="btn-export-products" type="button">${ICONS.download} Export CSV</button>
        <button class="btn" id="btn-adjust-quick" type="button">${ICONS.adjust} Adjust Stock</button>
        <button class="btn btn-primary" id="btn-add-product" type="button">${ICONS.plus} New Product</button>
      </div>
    </div>

    <!-- Metrics Row -->
    <div class="metrics-row">
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Total SKUs</span>
          <span class="metric-icon-badge info">${ICONS.box}</span>
        </div>
        <div class="metric-value">${products.length}</div>
        <div class="metric-footer">Catalog items listed</div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Units on Hand</span>
          <span class="metric-icon-badge success">${ICONS.chart}</span>
        </div>
        <div class="metric-value">${formatNumber(stats.units)}</div>
        <div class="metric-footer">Across all warehouses</div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Low Stock</span>
          <span class="metric-icon-badge warning">${ICONS.alert}</span>
        </div>
        <div class="metric-value">${stats.low}</div>
        <div class="metric-footer">Below reorder point</div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Out of Stock</span>
          <span class="metric-icon-badge danger">${ICONS.alert}</span>
        </div>
        <div class="metric-value">${stats.out}</div>
        <div class="metric-footer">Requires immediate order</div>
      </div>
    </div>

    <!-- Table Card -->
    <div class="table-card">
      <div class="table-toolbar">
        <div class="table-search-box">
          <span class="search-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input type="search" id="product-search-input" placeholder="Search by name, SKU, or supplier..." value="${productFilter.q}">
        </div>

        <select class="input-select" id="product-category-filter">
          ${categories.map(c => `<option value="${c}" ${productFilter.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>

        <select class="input-select" id="product-status-filter">
          <option value="All stock" ${productFilter.status === 'All stock' ? 'selected' : ''}>All Stock Statuses</option>
          <option value="In stock" ${productFilter.status === 'In stock' ? 'selected' : ''}>In Stock</option>
          <option value="Low stock" ${productFilter.status === 'Low stock' ? 'selected' : ''}>Low Stock</option>
          <option value="Out of stock" ${productFilter.status === 'Out of stock' ? 'selected' : ''}>Out of Stock</option>
        </select>

        <select class="input-select" id="product-sort-select">
          <option value="name" ${productFilter.sort === 'name' ? 'selected' : ''}>Sort: Name (A-Z)</option>
          <option value="stock_desc" ${productFilter.sort === 'stock_desc' ? 'selected' : ''}>Sort: Stock (High to Low)</option>
          <option value="stock_asc" ${productFilter.sort === 'stock_asc' ? 'selected' : ''}>Sort: Stock (Low to High)</option>
          <option value="price_desc" ${productFilter.sort === 'price_desc' ? 'selected' : ''}>Sort: Price (High to Low)</option>
        </select>

        <div class="toolbar-spacer"></div>
        <span class="toolbar-meta">Showing ${totalItems} product${totalItems === 1 ? '' : 's'}</span>
      </div>

      ${selectedProducts.size > 0 ? `
        <div class="bulk-action-bar">
          <span><strong class="bulk-count">${selectedProducts.size}</strong> product(s) selected</span>
          <button class="btn btn-sm" id="btn-bulk-export">Export Selected</button>
          <button class="btn btn-sm btn-danger" id="btn-bulk-delete">Delete Selected</button>
          <button class="btn btn-sm" id="btn-clear-selection">Clear Selection</button>
        </div>
      ` : ''}

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th class="cell-checkbox">
                <input type="checkbox" class="custom-checkbox" id="select-all-products" ${allSelected ? 'checked' : ''}>
              </th>
              <th>Product Details</th>
              <th>Category</th>
              <th>SKU</th>
              <th class="text-right">Price</th>
              <th class="text-right">Cost</th>
              <th class="text-right">Stock</th>
              <th>Location</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pagedItems.length ? pagedItems.map(p => {
              const isChecked = selectedProducts.has(p.id);
              return `
                <tr class="${isChecked ? 'row-selected' : ''}">
                  <td class="cell-checkbox">
                    <input type="checkbox" class="custom-checkbox product-select-cb" data-id="${p.id}" ${isChecked ? 'checked' : ''}>
                  </td>
                  <td>
                    <div class="entity-cell">
                      <div class="entity-icon">${ICONS.box}</div>
                      <div class="entity-info">
                        <span class="entity-name">${p.name}</span>
                        <span class="entity-sub">${p.brand || 'Acme'} · ${p.supplier || 'Standard Supply'}</span>
                      </div>
                    </div>
                  </td>
                  <td>${p.category}</td>
                  <td><code>${p.sku}</code></td>
                  <td class="text-right font-mono">${money(p.price)}</td>
                  <td class="text-right font-mono" style="color:var(--text-muted)">${money(p.cost)}</td>
                  <td class="text-right">
                    <strong>${p.stock}</strong> <span style="color:var(--text-muted);font-size:11px">/ ${p.minStock}</span>
                  </td>
                  <td><span style="font-size:11.5px;color:var(--text-secondary)">${p.location || 'Main Warehouse'}</span></td>
                  <td>${renderStockBadge(p)}</td>
                  <td class="text-right">
                    <div class="action-dropdown-wrap">
                      <button class="action-trigger-btn" data-dropdown="prod-${p.id}" title="Actions">
                        ${ICONS.more}
                      </button>
                      <div class="action-dropdown-menu" id="dropdown-prod-${p.id}" hidden>
                        <button type="button" data-action="adjust" data-id="${p.id}">${ICONS.adjust} Adjust Stock</button>
                        <button type="button" data-action="edit-product" data-id="${p.id}">${ICONS.edit} Edit Details</button>
                        <button type="button" class="danger" data-action="delete-product" data-id="${p.id}">${ICONS.trash} Delete</button>
                      </div>
                    </div>
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="10" class="table-empty-state">
                  <div class="empty-icon">${ICONS.box}</div>
                  <span class="empty-title">No products found</span>
                  <span class="empty-desc">No products matched your search or filter criteria. Try resetting filters.</span>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="table-pagination">
        <div>
          Showing <strong>${totalItems ? start + 1 : 0}</strong> to <strong>${Math.min(start + productFilter.limit, totalItems)}</strong> of <strong>${totalItems}</strong> entries
        </div>
        <div class="pagination-controls">
          <button class="page-btn" id="prod-prev-page" ${page <= 1 ? 'disabled' : ''}>Previous</button>
          <span style="padding:0 8px">Page ${page} of ${totalPages}</span>
          <button class="page-btn" id="prod-next-page" ${page >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    </div>
  `;
}

// ==========================================================================
// VIEW: Suppliers (Requirement 8 Redesign)
// ==========================================================================
function renderSuppliersPage() {
  const { suppliers, supplierFilter, selectedSuppliers } = state;

  // Filter
  let filtered = suppliers.filter(s => {
    const text = (s.name + ' ' + (s.contact || '') + ' ' + (s.email || '') + ' ' + (s.phone || '')).toLowerCase();
    const matchesQ = !supplierFilter.q || text.includes(supplierFilter.q.toLowerCase());
    let matchesStatus = true;
    if (supplierFilter.status === 'Active') matchesStatus = (s.status || 'Active').toLowerCase() === 'active';
    if (supplierFilter.status === 'Inactive') matchesStatus = (s.status || '').toLowerCase() === 'inactive';
    return matchesQ && matchesStatus;
  });

  // Sort
  if (supplierFilter.sort === 'name_asc') filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (supplierFilter.sort === 'name_desc') filtered.sort((a, b) => b.name.localeCompare(a.name));
  if (supplierFilter.sort === 'id_desc') filtered.sort((a, b) => b.id - a.id);

  const activeCount = suppliers.filter(s => (s.status || 'Active').toLowerCase() === 'active').length;
  const inactiveCount = suppliers.length - activeCount;

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / supplierFilter.limit) || 1;
  const page = Math.min(supplierFilter.page, totalPages);
  const start = (page - 1) * supplierFilter.limit;
  const pagedItems = filtered.slice(start, start + supplierFilter.limit);

  const allSelected = pagedItems.length > 0 && pagedItems.every(s => selectedSuppliers.has(s.id));

  return `
    <div class="page-header">
      <div class="page-header-text">
        <h1 class="page-title">Suppliers</h1>
        <p class="page-subtitle">Manage vendor contacts, procurement terms, and purchase order history.</p>
      </div>
      <div class="page-actions">
        <button class="btn" id="btn-export-suppliers" type="button">${ICONS.download} Export</button>
        <button class="btn btn-primary" id="btn-add-supplier" type="button">${ICONS.plus} New Supplier</button>
      </div>
    </div>

    <!-- Supplier Metrics Summary Cards -->
    <div class="metrics-row" style="grid-template-columns: repeat(3, 1fr);">
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Total Suppliers</span>
          <span class="metric-icon-badge info">${ICONS.truck}</span>
        </div>
        <div class="metric-value">${suppliers.length}</div>
        <div class="metric-footer">Registered commercial vendors</div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Active Suppliers</span>
          <span class="metric-icon-badge success">${ICONS.users}</span>
        </div>
        <div class="metric-value">${activeCount}</div>
        <div class="metric-footer">Available for purchase orders</div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Inactive Suppliers</span>
          <span class="metric-icon-badge warning">${ICONS.alert}</span>
        </div>
        <div class="metric-value">${inactiveCount}</div>
        <div class="metric-footer">Archived or paused contracts</div>
      </div>
    </div>

    <!-- Supplier Table Card -->
    <div class="table-card">
      <div class="table-toolbar">
        <div class="table-search-box">
          <span class="search-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input type="search" id="supplier-search-input" placeholder="Search supplier, contact, email..." value="${supplierFilter.q}">
        </div>

        <select class="input-select" id="supplier-status-filter">
          <option value="All statuses" ${supplierFilter.status === 'All statuses' ? 'selected' : ''}>All Statuses</option>
          <option value="Active" ${supplierFilter.status === 'Active' ? 'selected' : ''}>Active</option>
          <option value="Inactive" ${supplierFilter.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
        </select>

        <select class="input-select" id="supplier-sort-select">
          <option value="name_asc" ${supplierFilter.sort === 'name_asc' ? 'selected' : ''}>Sort: Name (A to Z)</option>
          <option value="name_desc" ${supplierFilter.sort === 'name_desc' ? 'selected' : ''}>Sort: Name (Z to A)</option>
          <option value="id_desc" ${supplierFilter.sort === 'id_desc' ? 'selected' : ''}>Sort: Recently Added</option>
        </select>

        <div class="toolbar-spacer"></div>
        <span class="toolbar-meta">Showing ${totalItems} supplier${totalItems === 1 ? '' : 's'}</span>
      </div>

      ${selectedSuppliers.size > 0 ? `
        <div class="bulk-action-bar">
          <span><strong class="bulk-count">${selectedSuppliers.size}</strong> supplier(s) selected</span>
          <button class="btn btn-sm" id="btn-bulk-export-suppliers">Export Selected</button>
          <button class="btn btn-sm btn-danger" id="btn-bulk-delete-suppliers">Delete Selected</button>
          <button class="btn btn-sm" id="btn-clear-supplier-selection">Clear Selection</button>
        </div>
      ` : ''}

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th class="cell-checkbox">
                <input type="checkbox" class="custom-checkbox" id="select-all-suppliers" ${allSelected ? 'checked' : ''}>
              </th>
              <th>Supplier</th>
              <th>Contact Person</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pagedItems.length ? pagedItems.map(s => {
              const isChecked = selectedSuppliers.has(s.id);
              return `
                <tr class="${isChecked ? 'row-selected' : ''}">
                  <td class="cell-checkbox">
                    <input type="checkbox" class="custom-checkbox supplier-select-cb" data-id="${s.id}" ${isChecked ? 'checked' : ''}>
                  </td>
                  <td>
                    <div class="entity-cell">
                      <div class="entity-icon">${ICONS.truck}</div>
                      <div class="entity-info">
                        <span class="entity-name">${s.name}</span>
                        <span class="entity-sub">Vendor #SUP-${String(s.id).padStart(3, '0')}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style="font-weight:500;color:var(--text-main)">${s.contact || '—'}</span>
                  </td>
                  <td>
                    <a href="mailto:${s.email}" style="color:var(--primary);text-decoration:none">${s.email || '—'}</a>
                  </td>
                  <td>
                    <span style="color:var(--text-secondary)">${s.phone || '—'}</span>
                  </td>
                  <td>${renderSupplierBadge(s.status)}</td>
                  <td class="text-right">
                    <div class="action-dropdown-wrap">
                      <button class="action-trigger-btn" data-dropdown="sup-${s.id}" title="Actions">
                        ${ICONS.more}
                      </button>
                      <div class="action-dropdown-menu" id="dropdown-sup-${s.id}" hidden>
                        <button type="button" data-action="view-supplier" data-id="${s.id}">${ICONS.eye} View Profile</button>
                        <button type="button" data-action="edit-supplier" data-id="${s.id}">${ICONS.edit} Edit Supplier</button>
                        <button type="button" class="danger" data-action="delete-supplier" data-id="${s.id}">${ICONS.trash} Delete</button>
                      </div>
                    </div>
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="7" class="table-empty-state">
                  <div class="empty-icon">${ICONS.truck}</div>
                  <span class="empty-title">No suppliers found</span>
                  <span class="empty-desc">No suppliers matched your search query. Click "New Supplier" to create one.</span>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="table-pagination">
        <div>
          Showing <strong>${totalItems ? start + 1 : 0}</strong> to <strong>${Math.min(start + supplierFilter.limit, totalItems)}</strong> of <strong>${totalItems}</strong> entries
        </div>
        <div class="pagination-controls">
          <button class="page-btn" id="sup-prev-page" ${page <= 1 ? 'disabled' : ''}>Previous</button>
          <span style="padding:0 8px">Page ${page} of ${totalPages}</span>
          <button class="page-btn" id="sup-next-page" ${page >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    </div>
  `;
}

// ==========================================================================
// VIEW: Stock Movements (Transactions)
// ==========================================================================
function renderMovementsPage() {
  const { transactions, products } = state;
  return `
    <div class="page-header">
      <div class="page-header-text">
        <h1 class="page-title">Stock Movements</h1>
        <p class="page-subtitle">Complete ledger of inventory adjustments, receipts, and order disbursements.</p>
      </div>
      <div class="page-actions">
        <button class="btn" id="btn-export-movements" type="button">${ICONS.download} Export Ledger</button>
        <button class="btn btn-primary" id="btn-adjust-quick" type="button">${ICONS.adjust} Record Adjustment</button>
      </div>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <div class="table-search-box">
          <span class="search-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input type="search" id="tx-search-input" placeholder="Filter movements...">
        </div>
        <div class="toolbar-spacer"></div>
        <span class="toolbar-meta">${transactions.length} transactions recorded</span>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Movement Type</th>
              <th class="text-right">Quantity Change</th>
              <th>Date & Time</th>
              <th>Reference / Note</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.slice(0, 50).map(t => {
              const p = products.find(x => x.id === t.productId) || { name: 'Item #' + t.productId, sku: '—' };
              const isPos = t.change > 0;
              return `
                <tr>
                  <td>
                    <div class="entity-cell">
                      <div class="entity-icon">${ICONS.box}</div>
                      <div class="entity-info">
                        <span class="entity-name">${p.name}</span>
                        <span class="entity-sub">${p.sku}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="status-badge ${isPos ? 'badge-success' : 'badge-neutral'}">
                      ${t.type}
                    </span>
                  </td>
                  <td class="text-right font-mono" style="font-weight:700;color:${isPos ? 'var(--status-success)' : 'var(--status-error)'}">
                    ${isPos ? '+' : ''}${t.change}
                  </td>
                  <td>${formatDate(t.date)}</td>
                  <td><span style="color:var(--text-secondary)">${t.note || 'Manual cycle adjustment'}</span></td>
                </tr>
              `;
            }).join('') || `<tr><td colspan="5" class="table-empty-state"><span class="empty-title">No transactions recorded yet</span></td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ==========================================================================
// VIEW: Sales
// ==========================================================================
function renderSalesPage() {
  const { sales } = state;
  const completedSales = sales.filter(s => (s.status || 'Completed') === 'Completed');
  const totalRevenue = completedSales.reduce((a, s) => a + Number(s.amount || 0), 0);
  const salesQuery = state.salesFilter.q.toLowerCase().trim();
  const filteredSales = sales.filter(s => !salesQuery || `${s.reference || ''} ${s.customer || ''} ${s.productName || ''} ${s.sku || ''} ${s.status || ''} ${s.notes || ''}`.toLowerCase().includes(salesQuery));
  const todayKey = new Date().toDateString();
  const todaySales = completedSales.filter(s => new Date(s.date).toDateString() === todayKey);
  const dailySales = Object.values(sales.reduce((groups, sale) => {
    const date = new Date(sale.date);
    const key = date.toDateString();
    groups[key] ||= { key, date: sale.date, records: 0, items: 0, amount: 0 };
    groups[key].records += 1;
    groups[key].items += Number(sale.items || 0);
    if ((sale.status || 'Completed') === 'Completed') groups[key].amount += Number(sale.amount || 0);
    return groups;
  }, {})).sort((a, b) => new Date(b.date) - new Date(a.date));

  return `
    <div class="page-header">
      <div class="page-header-text">
        <h1 class="page-title">Sales Records</h1>
        <p class="page-subtitle">Record every sale, customer, amount, status, date, and supporting note.</p>
      </div>
      <div class="page-actions">
        <button class="btn" id="btn-export-sales" type="button">${ICONS.download} Export Sales</button>
        <button class="btn btn-primary" id="btn-new-sale" type="button">${ICONS.plus} Record Sale</button>
      </div>
    </div>

    <div class="metrics-row" style="grid-template-columns: repeat(4, 1fr);">
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Total Orders</span>
          <span class="metric-icon-badge info">${ICONS.box}</span>
        </div>
        <div class="metric-value">${sales.length}</div>
        <div class="metric-footer">All recorded sales statuses</div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Today's Sales</span>
          <span class="metric-icon-badge success">${ICONS.chart}</span>
        </div>
        <div class="metric-value">${money(todaySales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0))}</div>
        <div class="metric-footer">${todaySales.length} record${todaySales.length === 1 ? '' : 's'} today</div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Gross Revenue</span>
          <span class="metric-icon-badge success">${ICONS.dollar}</span>
        </div>
        <div class="metric-value">${money(totalRevenue)}</div>
        <div class="metric-footer">Lifetime realized value</div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Average Order</span>
          <span class="metric-icon-badge info">${ICONS.chart}</span>
        </div>
        <div class="metric-value">${money(completedSales.length ? totalRevenue / completedSales.length : 0)}</div>
        <div class="metric-footer">Per completed transaction</div>
      </div>
    </div>

    <div class="table-card" style="margin-bottom:18px;">
      <div class="panel-head">
        <div class="panel-title-group">
          <span class="panel-title">Daily Sales Ledger</span>
          <span class="panel-subtitle">A day-by-day summary of every recorded sale</span>
        </div>
        <button class="btn btn-sm btn-primary" id="btn-new-sale-daily" type="button">${ICONS.plus} Add Today's Sale</button>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>Date</th><th class="text-right">Sales Records</th><th class="text-right">Line Items</th><th class="text-right">Daily Revenue</th></tr></thead>
          <tbody>
            ${dailySales.map(day => `<tr><td><strong>${formatDate(day.date)}</strong>${day.key === todayKey ? ' <span class="status-badge badge-success">Today</span>' : ''}</td><td class="text-right">${day.records}</td><td class="text-right">${day.items}</td><td class="text-right font-mono"><strong>${money(day.amount)}</strong></td></tr>`).join('') || '<tr><td colspan="4"><div class="table-empty-state"><span class="empty-title">No daily sales yet</span><span class="empty-desc">Use “Add Today’s Sale” to record the first transaction.</span></div></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <div class="table-search-box">
          <span class="search-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input type="search" id="sales-search-input" placeholder="Search reference, product, customer, status, or notes..." value="${escapeHtml(state.salesFilter.q)}">
        </div>
        <div class="toolbar-spacer"></div>
        <span class="toolbar-meta">${filteredSales.length} of ${sales.length} records</span>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Product</th>
              <th>Customer</th>
              <th class="text-right">Units Sold</th>
              <th class="text-right">Total Amount</th>
              <th>Order Date</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSales.map((s, idx) => `
              <tr>
                <td><strong>${escapeHtml(s.reference || `SO-${String(idx + 1040)}`)}</strong></td>
                <td><strong>${escapeHtml(s.productName || 'Legacy sale')}</strong><br><span style="color:var(--text-secondary)">${escapeHtml(s.sku || '—')}</span></td>
                <td>
                  <span style="font-weight:600;color:var(--text-main)">${escapeHtml(s.customer)}</span>
                </td>
                <td class="text-right">${s.items || 1} item(s)</td>
                <td class="text-right font-mono" style="font-weight:600">${money(s.amount)}</td>
                <td>${formatDate(s.date)}</td>
                <td>${renderOrderBadge(s.status || 'Completed')}</td>
                <td><span style="color:var(--text-secondary)" title="${escapeHtml(s.notes || '')}">${escapeHtml(s.notes || '—')}</span></td>
              </tr>
            `).join('') || `<tr><td colspan="8"><div class="table-empty-state"><span class="empty-title">No sales records found</span><span class="empty-desc">Adjust your search or record a new sale.</span></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ==========================================================================
// VIEW: Purchases
// ==========================================================================
function renderPurchasesPage() {
  const { purchases, suppliers } = state;
  const pendingCount = purchases.filter(p => p.status === 'Pending').length;

  return `
    <div class="page-header">
      <div class="page-header-text">
        <h1 class="page-title">Purchase Orders</h1>
        <p class="page-subtitle">Manage procurement orders, incoming shipments, and supplier payments.</p>
      </div>
      <div class="page-actions">
        <button class="btn" id="btn-export-purchases" type="button">${ICONS.download} Export POs</button>
        <button class="btn btn-primary" id="btn-new-purchase" type="button">${ICONS.plus} New Purchase Order</button>
      </div>
    </div>

    <div class="metrics-row" style="grid-template-columns: repeat(3, 1fr);">
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Total POs</span>
          <span class="metric-icon-badge info">${ICONS.box}</span>
        </div>
        <div class="metric-value">${purchases.length}</div>
        <div class="metric-footer">Issued purchase orders</div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Pending Receipt</span>
          <span class="metric-icon-badge warning">${ICONS.alert}</span>
        </div>
        <div class="metric-value">${pendingCount}</div>
        <div class="metric-footer">Awaiting warehouse delivery</div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Committed Spend</span>
          <span class="metric-icon-badge info">${ICONS.dollar}</span>
        </div>
        <div class="metric-value">${money(purchases.reduce((a, p) => a + Number(p.amount || 0), 0))}</div>
        <div class="metric-footer">Total procurement volume</div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <div class="table-search-box">
          <span class="search-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input type="search" placeholder="Search POs or supplier...">
        </div>
        <div class="toolbar-spacer"></div>
        <span class="toolbar-meta">${purchases.length} purchase orders</span>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Supplier</th>
              <th class="text-right">Order Amount</th>
              <th>Expected Date</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${purchases.map(p => `
              <tr>
                <td><strong>${p.id}</strong></td>
                <td>
                  <span style="font-weight:600;color:var(--text-main)">${p.supplier}</span>
                </td>
                <td class="text-right font-mono" style="font-weight:600">${money(p.amount)}</td>
                <td>${formatDate(p.date)}</td>
                <td>${renderOrderBadge(p.status)}</td>
                <td class="text-right">
                  ${p.status === 'Pending' ? `
                    <button class="btn btn-sm" data-action="receive-po" data-id="${p.id}">Receive Goods</button>
                  ` : `
                    <span style="font-size:11px;color:var(--text-muted)">Fulfilled</span>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ==========================================================================
// VIEW: Customers
// ==========================================================================
function renderCustomersPage() {
  const { customers } = state;

  return `
    <div class="page-header">
      <div class="page-header-text">
        <h1 class="page-title">Customers</h1>
        <p class="page-subtitle">Directory of wholesale accounts, buyers, and shipping addresses.</p>
      </div>
      <div class="page-actions">
        <button class="btn" id="btn-export-customers" type="button">${ICONS.download} Export Directory</button>
        <button class="btn btn-primary" id="btn-add-customer" type="button">${ICONS.plus} New Customer</button>
      </div>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <div class="table-search-box">
          <span class="search-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input type="search" placeholder="Search customers...">
        </div>
        <div class="toolbar-spacer"></div>
        <span class="toolbar-meta">${customers.length} customer accounts</span>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Email</th>
              <th>Account Type</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${customers.map(c => `
              <tr>
                <td>
                  <div class="entity-cell">
                    <div class="entity-icon">${ICONS.users}</div>
                    <div class="entity-info">
                      <span class="entity-name">${c.name}</span>
                      <span class="entity-sub">Account #CUST-${String(c.id).padStart(3, '0')}</span>
                    </div>
                  </div>
                </td>
                <td><a href="mailto:${c.email}" style="color:var(--primary);text-decoration:none">${c.email}</a></td>
                <td>Wholesale / Commercial</td>
                <td><span class="status-badge badge-success">Active</span></td>
                <td class="text-right">
                  <button class="btn btn-sm" data-action="edit-customer" data-id="${c.id}">Edit</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ==========================================================================
// VIEW: Reports
// ==========================================================================
function renderReportsPage() {
  const { products, stats } = state;

  const reportsList = [
    { title: 'Inventory Valuation by Category', desc: 'Asset valuation based on unit purchase cost across active categories.', items: products.length, value: money(stats.value) },
    { title: 'Low Stock Restock Advisory', desc: 'Listing of all items requiring reorder with recommended replenishment quantities.', items: stats.low, value: 'Immediate Action' },
    { title: 'Out of Stock Critical Audit', desc: 'Items currently zeroed out causing fulfillment bottlenecks.', items: stats.out, value: 'Zero Inventory' },
    { title: 'Dead Stock & Slow Turnover Analysis', desc: 'Stock sitting in warehouse for over 90 days with no sales velocity.', items: '3 SKUs', value: money(1420) },
    { title: 'Warehouse Bin & Location Matrix', desc: 'Inventory counts mapped across Main Warehouse, North Depot, and South Store.', items: '3 Locations', value: `${formatNumber(stats.units)} units` }
  ];

  return `
    <div class="page-header">
      <div class="page-header-text">
        <h1 class="page-title">Inventory Reports & Analytics</h1>
        <p class="page-subtitle">Download audit-ready snapshots, valuation summaries, and restock reports.</p>
      </div>
    </div>

    <div class="table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Report Title</th>
              <th>Description</th>
              <th class="text-right">Items in Scope</th>
              <th>Summary Value</th>
              <th class="text-right">Download</th>
            </tr>
          </thead>
          <tbody>
            ${reportsList.map(r => `
              <tr>
                <td>
                  <div class="entity-cell">
                    <div class="entity-icon">${ICONS.chart}</div>
                    <div class="entity-info">
                      <span class="entity-name">${r.title}</span>
                      <span class="entity-sub">Generated just now</span>
                    </div>
                  </div>
                </td>
                <td style="color:var(--text-secondary);max-width:320px">${r.desc}</td>
                <td class="text-right font-mono">${r.items}</td>
                <td><strong>${r.value}</strong></td>
                <td class="text-right">
                  <button class="btn btn-sm" data-action="download-report" data-name="${r.title}">${ICONS.download} CSV</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ==========================================================================
// VIEW: Settings
// ==========================================================================
function renderSettingsPage() {
  return `
    <div class="page-header">
      <div class="page-header-text">
        <h1 class="page-title">System Settings</h1>
        <p class="page-subtitle">Configure organization profile, warehouse locations, and security policies.</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(280px,1fr);gap:18px;">
      <div class="table-card" style="padding:22px;">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:14px;">Organization Details</h3>
        <div class="form-grid" style="margin-bottom:18px;">
          <div class="form-group">
            <label class="form-label">Company Name</label>
            <input class="form-input" value="Acme Logistics Corp" readonly>
          </div>
          <div class="form-group">
            <label class="form-label">Primary Currency</label>
            <select class="form-select" id="settings-currency" aria-label="Primary currency">
              ${CURRENCIES.map(([code, locale, label]) => `<option value="${code}" ${state.currency === code ? 'selected' : ''}>${label}</option>`).join('')}
            </select>
            <span class="form-hint">1 USD = ${(state.exchangeRates[state.currency] || 1).toLocaleString(undefined,{maximumFractionDigits:6})} ${state.currency} · ${state.exchangeRatesSource === 'live' ? 'Daily rate' : 'Offline fallback'} · <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by ExchangeRate-API</a></span>
          </div>
          <div class="form-group">
            <label class="form-label">Default Warehouse</label>
            <input class="form-input" value="Main Warehouse" readonly>
          </div>
          <div class="form-group">
            <label class="form-label">Timezone</label>
            <input class="form-input" value="Eastern Time (US & Canada)" readonly>
          </div>
        </div>

        <h3 style="font-size:14px;font-weight:700;margin-bottom:14px;border-top:1px solid var(--border-subtle);padding-top:16px;">Active Warehouses</h3>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-subtle);border-radius:var(--radius-sm);border:1px solid var(--border-standard)">
            <div>
              <strong>Main Warehouse</strong>
              <div style="font-size:11px;color:var(--text-muted)">Primary distribution hub · Building A</div>
            </div>
            <span class="status-badge badge-success">Active</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-subtle);border-radius:var(--radius-sm);border:1px solid var(--border-standard)">
            <div>
              <strong>North Depot</strong>
              <div style="font-size:11px;color:var(--text-muted)">Secondary logistics yard</div>
            </div>
            <span class="status-badge badge-success">Active</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-subtle);border-radius:var(--radius-sm);border:1px solid var(--border-standard)">
            <div>
              <strong>South Store</strong>
              <div style="font-size:11px;color:var(--text-muted)">Regional fulfillment depot</div>
            </div>
            <span class="status-badge badge-success">Active</span>
          </div>
        </div>
      </div>

      <div class="table-card" style="padding:22px;">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:14px;">User Account</h3>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div class="profile-avatar" style="width:42px;height:42px;font-size:16px;">AM</div>
          <div>
            <strong>Alex Morgan</strong>
            <div style="font-size:11px;color:var(--text-muted)">alex.morgan@example.test</div>
            <span class="status-badge badge-info" style="margin-top:4px;">Administrator</span>
          </div>
        </div>
        <p style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:18px;">
          Local development demo session active. Login credentials are <code>admin</code> / <code>admin123</code>.
        </p>
        <button class="btn btn-danger" style="width:100%" id="btn-settings-logout">Log Out of Workspace</button>
      </div>
    </div>
  `;
}

// ==========================================================================
// RENDER DISPATCHER
// ==========================================================================
function renderCurrentPage() {
  const view = $('#view');
  if (!view) return;

  const crumb = $('#crumb');
  const labels = {
    dashboard: 'Overview',
    products: 'Products',
    inventory: 'Inventory',
    transactions: 'Stock Movements',
    sales: 'Sales Orders',
    purchases: 'Purchase Orders',
    suppliers: 'Suppliers',
    customers: 'Customers',
    reports: 'Reports',
    settings: 'Settings'
  };

  if (crumb) crumb.textContent = labels[state.page] || 'Overview';

  // Highlight active nav item
  $$('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === state.page);
  });

  // Render view
  switch (state.page) {
    case 'dashboard':
      view.innerHTML = renderDashboard();
      break;
    case 'products':
      view.innerHTML = renderProductsPage(false);
      break;
    case 'inventory':
      view.innerHTML = renderProductsPage(true);
      break;
    case 'transactions':
      view.innerHTML = renderMovementsPage();
      break;
    case 'sales':
      view.innerHTML = renderSalesPage();
      break;
    case 'purchases':
      view.innerHTML = renderPurchasesPage();
      break;
    case 'suppliers':
      view.innerHTML = renderSuppliersPage();
      break;
    case 'customers':
      view.innerHTML = renderCustomersPage();
      break;
    case 'reports':
      view.innerHTML = renderReportsPage();
      break;
    case 'settings':
      view.innerHTML = renderSettingsPage();
      break;
    default:
      view.innerHTML = renderDashboard();
  }
}

function renderPreservingInput(inputId, selectionStart, selectionEnd) {
  renderCurrentPage();
  const input = document.getElementById(inputId);
  if (!input) return;
  input.focus({ preventScroll: true });
  const end = input.value.length;
  input.setSelectionRange(
    Math.min(selectionStart ?? end, end),
    Math.min(selectionEnd ?? selectionStart ?? end, end)
  );
}

// ==========================================================================
// MODALS (Linear-precision, Accessible, Clean forms)
// ==========================================================================
function closeModal() {
  $('#modal-root').innerHTML = '';
}

function showProductModal(editId = null) {
  const p = editId ? state.products.find(x => x.id === Number(editId)) : null;
  const isEdit = Boolean(p);
  const categories = ['Electronics', 'Office', 'Furniture', 'Accessories', 'Kitchen', 'Safety', 'Packaging', 'Tools'];
  const suppliers = state.suppliers.map(s => s.name);

  $('#modal-root').innerHTML = `
    <div class="modal-backdrop" id="modal-bg">
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-header-info">
            <h2 class="modal-title">${isEdit ? 'Edit Product' : 'Add New Product'}</h2>
            <p class="modal-desc">${isEdit ? 'Update product specification, catalog pricing, and reorder levels.' : 'Register a new SKU into your centralized warehouse catalog.'}</p>
          </div>
          <button class="modal-close-btn" id="modal-close" aria-label="Close">${ICONS.more}</button>
        </div>
        <form id="product-form">
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group form-col-span-2">
                <label class="form-label">Product Name <span class="required">*</span></label>
                <input class="form-input" name="name" required placeholder="e.g. Ergonomic Keyboard" value="${p?.name || ''}">
              </div>

              <div class="form-group">
                <label class="form-label">SKU Code <span class="required">*</span></label>
                <input class="form-input" name="sku" required placeholder="e.g. STK-1051" value="${p?.sku || ''}">
              </div>

              <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" name="category">
                  ${categories.map(c => `<option value="${c}" ${p?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Brand / Manufacturer</label>
                <input class="form-input" name="brand" placeholder="e.g. Acme Tech" value="${p?.brand || ''}">
              </div>

              <div class="form-group">
                <label class="form-label">Primary Supplier</label>
                <select class="form-select" name="supplier">
                  ${suppliers.map(s => `<option value="${s}" ${p?.supplier === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Selling Price (${state.currency})</label>
                <input class="form-input" name="price" type="number" step="0.01" min="0" value="${p ? convertedAmount(p.price).toFixed(2) : ''}">
              </div>

              <div class="form-group">
                <label class="form-label">Purchase Cost (${state.currency})</label>
                <input class="form-input" name="cost" type="number" step="0.01" min="0" value="${p ? convertedAmount(p.cost).toFixed(2) : ''}">
              </div>

              <div class="form-group">
                <label class="form-label">Reorder Point (Min Stock)</label>
                <input class="form-input" name="minStock" type="number" min="0" value="${p?.minStock ?? 12}">
              </div>

              <div class="form-group">
                <label class="form-label">Warehouse Location</label>
                <select class="form-select" name="location">
                  <option value="Main Warehouse" ${p?.location === 'Main Warehouse' ? 'selected' : ''}>Main Warehouse</option>
                  <option value="North Depot" ${p?.location === 'North Depot' ? 'selected' : ''}>North Depot</option>
                  <option value="South Store" ${p?.location === 'South Store' ? 'selected' : ''}>South Store</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn" id="modal-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Product'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  $('#modal-close').onclick = closeModal;
  $('#modal-cancel').onclick = closeModal;
  $('#modal-bg').onclick = (e) => { if (e.target.id === 'modal-bg') closeModal(); };

  $('#product-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd);
    body.price = baseAmount(parseFloat(body.price) || 0);
    body.cost = baseAmount(parseFloat(body.cost) || 0);
    body.minStock = Number.isInteger(Number(body.minStock)) ? Number(body.minStock) : 10;

    try {
      if (isEdit) {
        await api(`/products/${p.id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast('Product updated successfully');
      } else {
        await api('/products', { method: 'POST', body: JSON.stringify(body) });
        toast('New product created');
      }
      closeModal();
      await loadData();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
}

function showAdjustStockModal(productId = null) {
  const products = state.products;
  const initialId = productId ? Number(productId) : products[0]?.id;

  $('#modal-root').innerHTML = `
    <div class="modal-backdrop" id="modal-bg">
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-header-info">
            <h2 class="modal-title">Record Stock Adjustment</h2>
            <p class="modal-desc">Manually adjust inventory for incoming replenishment, shrinkage, or audit corrections.</p>
          </div>
          <button class="modal-close-btn" id="modal-close">${ICONS.more}</button>
        </div>
        <form id="adjust-form">
          <div class="modal-body">
            <div class="form-grid single-col">
              <div class="form-group">
                <label class="form-label">Select Product <span class="required">*</span></label>
                <select class="form-select" name="productId" required id="adjust-prod-select">
                  ${products.map(p => `
                    <option value="${p.id}" ${p.id === initialId ? 'selected' : ''}>
                      ${p.name} (${p.sku}) — ${p.stock} units currently on hand
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Quantity Change <span class="required">*</span></label>
                <input class="form-input" name="quantity" type="number" required placeholder="e.g. +20 for restock, -5 for damage/loss">
                <span class="form-hint">Use a positive number to add stock, or a negative number to reduce stock.</span>
              </div>

              <div class="form-group">
                <label class="form-label">Reason / Adjustment Note</label>
                <input class="form-input" name="note" placeholder="e.g. Weekly replenishment, Cycle count variance">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn" id="modal-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">Apply Adjustment</button>
          </div>
        </form>
      </div>
    </div>
  `;

  $('#modal-close').onclick = closeModal;
  $('#modal-cancel').onclick = closeModal;
  $('#modal-bg').onclick = (e) => { if (e.target.id === 'modal-bg') closeModal(); };

  $('#adjust-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd);
    try {
      await api('/stock/adjust', { method: 'POST', body: JSON.stringify(body) });
      toast('Stock adjustment recorded successfully');
      closeModal();
      await loadData();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
}

function showSaleModal() {
  const now = new Date();
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const suggestedReference = `SO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(state.sales.length + 1).padStart(4, '0')}`;
  $('#modal-root').innerHTML = `
    <div class="modal-backdrop" id="modal-bg">
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-header-info">
            <h2 class="modal-title">Record a Sale</h2>
            <p class="modal-desc">Add a complete sales record to the local inventory database.</p>
          </div>
          <button class="modal-close-btn" id="modal-close" aria-label="Close">${ICONS.more}</button>
        </div>
        <form id="sale-form">
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Sales Reference <span class="required">*</span></label>
                <input class="form-input" name="reference" required maxlength="40" value="${suggestedReference}">
              </div>
              <div class="form-group">
                <label class="form-label">Sale Date <span class="required">*</span></label>
                <input class="form-input" name="date" type="datetime-local" required value="${localDateTime}">
              </div>
              <div class="form-group form-col-span-2">
                <label class="form-label">Customer <span class="required">*</span></label>
                <input class="form-input" name="customer" list="sales-customer-list" required maxlength="120" placeholder="Select or enter a customer">
                <datalist id="sales-customer-list">${state.customers.map(customer => `<option value="${escapeHtml(customer.name)}"></option>`).join('')}</datalist>
              </div>
              <div class="form-group form-col-span-2">
                <label class="form-label">Product <span class="required">*</span></label>
                <select class="form-select" name="productId" required>
                  <option value="">Select a product</option>
                  ${[...state.products].sort((a,b) => a.name.localeCompare(b.name)).map(product => `<option value="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>${escapeHtml(product.name)} (${escapeHtml(product.sku)}) — ${product.stock} available${product.stock === 0 ? ' — Out of stock' : ''}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Units Sold <span class="required">*</span></label>
                <input class="form-input" name="items" type="number" min="1" max="1000000" step="1" required value="1">
              </div>
              <div class="form-group">
                <label class="form-label">Total Amount (${state.currency}) <span class="required">*</span></label>
                <input class="form-input" name="amount" type="number" min="0" max="1000000000" step="0.01" required placeholder="0.00">
              </div>
              <div class="form-group">
                <label class="form-label">Status</label>
                <select class="form-select" name="status">
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>
              <div class="form-group form-col-span-2">
                <label class="form-label">Notes</label>
                <textarea class="form-textarea" name="notes" maxlength="500" rows="3" placeholder="Products sold, payment method, delivery details, or other context"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn" id="modal-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Sales Record</button>
          </div>
        </form>
      </div>
    </div>
  `;
  $('#modal-close').onclick = closeModal;
  $('#modal-cancel').onclick = closeModal;
  $('#modal-bg').onclick = event => { if (event.target.id === 'modal-bg') closeModal(); };
  $('#sale-form').onsubmit = async event => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target));
    body.amount = baseAmount(Number(body.amount));
    body.items = Number(body.items);
    body.productId = Number(body.productId);
    body.date = new Date(body.date).toISOString();
    try {
      await api('/sales', { method: 'POST', body: JSON.stringify(body) });
      closeModal();
      await loadData();
      toast('Sales record saved to the database');
    } catch (error) {
      toast(error.message, 'error');
    }
  };
}

function showSupplierModal(supplierId = null) {
  const s = supplierId ? state.suppliers.find(x => x.id === Number(supplierId)) : null;
  const isEdit = Boolean(s);

  $('#modal-root').innerHTML = `
    <div class="modal-backdrop" id="modal-bg">
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-header-info">
            <h2 class="modal-title">${isEdit ? 'Edit Supplier' : 'Add New Supplier'}</h2>
            <p class="modal-desc">${isEdit ? 'Update vendor contact details, phone, and agreement status.' : 'Register a commercial supplier to manage purchase orders and catalog sourcing.'}</p>
          </div>
          <button class="modal-close-btn" id="modal-close">${ICONS.more}</button>
        </div>
        <form id="supplier-form">
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group form-col-span-2">
                <label class="form-label">Supplier / Company Name <span class="required">*</span></label>
                <input class="form-input" name="name" required placeholder="e.g. Apex Industrial Supply" value="${s?.name || ''}">
              </div>

              <div class="form-group">
                <label class="form-label">Contact Person</label>
                <input class="form-input" name="contact" placeholder="e.g. Jordan Lee" value="${s?.contact || ''}">
              </div>

              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input class="form-input" name="email" type="email" placeholder="orders@vendor.com" value="${s?.email || ''}">
              </div>

              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input class="form-input" name="phone" placeholder="+1 555 0199" value="${s?.phone || ''}">
              </div>

              <div class="form-group">
                <label class="form-label">Status</label>
                <select class="form-select" name="status">
                  <option value="Active" ${s?.status === 'Active' ? 'selected' : ''}>Active</option>
                  <option value="Inactive" ${s?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn" id="modal-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Supplier'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  $('#modal-close').onclick = closeModal;
  $('#modal-cancel').onclick = closeModal;
  $('#modal-bg').onclick = (e) => { if (e.target.id === 'modal-bg') closeModal(); };

  $('#supplier-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd);
    try {
      if (isEdit) {
        await api(`/suppliers/${s.id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast('Supplier details updated');
      } else {
        await api('/suppliers', { method: 'POST', body: JSON.stringify(body) });
        toast('New supplier registered');
      }
      closeModal();
      await loadData();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
}

function showCustomerModal(customerId = null) {
  const customer = customerId ? state.customers.find(item => item.id === Number(customerId)) : null;
  const isEdit = Boolean(customer);
  $('#modal-root').innerHTML = `
    <div class="modal-backdrop" id="modal-bg">
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-header-info">
            <h2 class="modal-title">${isEdit ? 'Edit Customer' : 'Add Customer'}</h2>
            <p class="modal-desc">${isEdit ? 'Update the customer account details.' : 'Create a customer record for sales and account tracking.'}</p>
          </div>
          <button class="modal-close-btn" id="modal-close" aria-label="Close">${ICONS.more}</button>
        </div>
        <form id="customer-form">
          <div class="modal-body">
            <div class="form-grid single-col">
              <div class="form-group"><label class="form-label">Customer Name <span class="required">*</span></label><input class="form-input" name="name" required maxlength="120" value="${escapeHtml(customer?.name || '')}"></div>
              <div class="form-group"><label class="form-label">Email Address</label><input class="form-input" name="email" type="email" maxlength="160" value="${escapeHtml(customer?.email === '—' ? '' : customer?.email || '')}" placeholder="customer@example.com"></div>
            </div>
          </div>
          <div class="modal-footer"><button type="button" class="btn" id="modal-cancel">Cancel</button><button type="submit" class="btn btn-primary">${isEdit ? 'Save Customer' : 'Create Customer'}</button></div>
        </form>
      </div>
    </div>`;
  $('#modal-close').onclick = closeModal;
  $('#modal-cancel').onclick = closeModal;
  $('#modal-bg').onclick = event => { if (event.target.id === 'modal-bg') closeModal(); };
  $('#customer-form').onsubmit = async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target));
    try {
      await api(isEdit ? `/customers/${customer.id}` : '/customers', { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      closeModal();
      await loadData();
      toast(isEdit ? 'Customer updated' : 'Customer created');
    } catch (error) { toast(error.message, 'error'); }
  };
}

function showSupplierViewModal(supplierId) {
  const s = state.suppliers.find(x => x.id === Number(supplierId));
  if (!s) return;
  const suppliedProds = state.products.filter(p => p.supplier === s.name);

  $('#modal-root').innerHTML = `
    <div class="modal-backdrop" id="modal-bg">
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-header-info">
            <h2 class="modal-title">${s.name}</h2>
            <p class="modal-desc">Supplier Profile · Vendor #SUP-${String(s.id).padStart(3, '0')}</p>
          </div>
          <button class="modal-close-btn" id="modal-close">${ICONS.more}</button>
        </div>
        <div class="modal-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border-subtle)">
            <div>
              <span class="form-hint">Contact Person</span>
              <strong style="display:block;font-size:13px;color:var(--text-main);">${s.contact || '—'}</strong>
            </div>
            <div>
              <span class="form-hint">Status</span>
              <div style="margin-top:2px;">${renderSupplierBadge(s.status)}</div>
            </div>
            <div>
              <span class="form-hint">Email</span>
              <a href="mailto:${s.email}" style="color:var(--primary);text-decoration:none">${s.email || '—'}</a>
            </div>
            <div>
              <span class="form-hint">Phone</span>
              <span style="color:var(--text-main);">${s.phone || '—'}</span>
            </div>
          </div>

          <h4 style="font-size:12px;font-weight:700;margin-bottom:8px;text-transform:uppercase;color:var(--text-secondary)">
            Supplied Products (${suppliedProds.length})
          </h4>
          <div style="max-height:180px;overflow-y:auto;border:1px solid var(--border-standard);border-radius:var(--radius-sm)">
            <table class="data-table" style="font-size:11.5px;">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th class="text-right">Stock</th>
                </tr>
              </thead>
              <tbody>
                ${suppliedProds.length ? suppliedProds.map(p => `
                  <tr>
                    <td><strong>${p.name}</strong></td>
                    <td><code>${p.sku}</code></td>
                    <td class="text-right">${p.stock}</td>
                  </tr>
                `).join('') : `<tr><td colspan="3" class="text-center" style="padding:16px;color:var(--text-muted)">No products linked to this supplier yet.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" id="modal-close-btn">Close</button>
          <button class="btn btn-primary" id="modal-edit-supplier">Edit Supplier</button>
        </div>
      </div>
    </div>
  `;

  $('#modal-close').onclick = closeModal;
  $('#modal-close-btn').onclick = closeModal;
  $('#modal-bg').onclick = (e) => { if (e.target.id === 'modal-bg') closeModal(); };
  $('#modal-edit-supplier').onclick = () => {
    closeModal();
    showSupplierModal(s.id);
  };
}

function showAttentionModal() {
  const lowItems = state.products.filter(p => p.stock <= p.minStock).sort((a, b) => a.stock - b.stock);

  $('#modal-root').innerHTML = `
    <div class="modal-backdrop" id="modal-bg">
      <div class="modal-dialog" style="max-width:580px">
        <div class="modal-header">
          <div class="modal-header-info">
            <h2 class="modal-title">Inventory Needing Attention</h2>
            <p class="modal-desc">${lowItems.length} products currently at or below minimum threshold</p>
          </div>
          <button class="modal-close-btn" id="modal-close">${ICONS.more}</button>
        </div>
        <div class="modal-body" style="padding:0;">
          <div style="max-height:360px;overflow-y:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th class="text-right">On Hand / Min</th>
                  <th>Status</th>
                  <th class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                ${lowItems.map(p => `
                  <tr>
                    <td>
                      <div class="entity-cell">
                        <div class="entity-icon">${ICONS.box}</div>
                        <div class="entity-info">
                          <span class="entity-name">${p.name}</span>
                          <span class="entity-sub">${p.category}</span>
                        </div>
                      </div>
                    </td>
                    <td><code>${p.sku}</code></td>
                    <td class="text-right"><strong>${p.stock}</strong> / ${p.minStock}</td>
                    <td>${renderStockBadge(p)}</td>
                    <td class="text-right">
                      <button class="btn btn-sm" data-adjust-id="${p.id}">Restock</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" id="modal-close-btn">Close</button>
          <button class="btn btn-primary" id="modal-goto-inventory">Open Inventory Hub</button>
        </div>
      </div>
    </div>
  `;

  $('#modal-close').onclick = closeModal;
  $('#modal-close-btn').onclick = closeModal;
  $('#modal-bg').onclick = (e) => { if (e.target.id === 'modal-bg') closeModal(); };
  $('#modal-goto-inventory').onclick = () => {
    closeModal();
    navigateTo('inventory');
  };
}

function openAiChat() {
  const panel = $('#chat-panel');
  if (!panel) return;
  panel.style.removeProperty('display');
  panel.classList.add('open');
  const input = $('#chat-input');
  if (input) {
    setTimeout(() => input.focus(), 60);
  }
}

function closeAiChat() {
  const panel = $('#chat-panel');
  if (!panel) return;
  panel.classList.remove('open');
}

function toggleAiChat() {
  const panel = $('#chat-panel');
  if (!panel) return;
  if (panel.classList.contains('open')) {
    closeAiChat();
  } else {
    openAiChat();
  }
}

async function handleAiSubmit(customMessage = null) {
  const input = $('#chat-input');
  const msg = (customMessage !== null ? customMessage : (input?.value || '')).trim();
  if (!msg) return;

  if (input) input.value = '';

  const chatBody = $('#chat-messages');
  if (!chatBody) return;

  openAiChat();

  // Append user bubble
  const userDiv = document.createElement('div');
  userDiv.className = 'chat-bubble user';
  userDiv.textContent = msg;
  chatBody.appendChild(userDiv);

  // Append loading bubble
  const botDiv = document.createElement('div');
  botDiv.className = 'chat-bubble bot';
  botDiv.innerHTML = '<span style="color:var(--text-muted)">Consulting live inventory...</span>';
  chatBody.appendChild(botDiv);
  chatBody.scrollTop = chatBody.scrollHeight;

  try {
    const res = await api('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: msg, currency: state.currency, history: state.aiHistory.slice(-8) })
    });
    botDiv.textContent = res.answer || 'Query completed.';
    state.aiHistory.push(
      { role: 'user', content: msg },
      { role: 'assistant', content: res.answer || 'Query completed.' }
    );
    state.aiHistory = state.aiHistory.slice(-12);
    if (res.changed) {
      await loadData();
      toast('Inventory updated by Alphapilot AI');
    }
  } catch (err) {
    botDiv.textContent = 'Error: ' + err.message;
  }
  chatBody.scrollTop = chatBody.scrollHeight;
}

// CSV Export Utility
function exportCsv(filename, rows) {
  if (!rows || !rows.length) {
    toast('No data to export');
    return;
  }
  const keys = Object.keys(rows[0]);
  const csvContent = [
    keys.join(','),
    ...rows.map(row => keys.map(k => {
      const raw = row[k] ?? '';
      const safe = typeof raw === 'string' && /^[=+\-@]/.test(raw) ? `'${raw}` : String(raw);
      return `"${safe.replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `alphapilot-${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${rows.length} rows to CSV`);
}

// ==========================================================================
// NAVIGATION & EVENT LISTENERS
// ==========================================================================
function navigateTo(pageId) {
  state.page = APP_PAGES.includes(pageId) ? pageId : 'dashboard';
  if (location.hash !== `#${state.page}`) history.pushState(null, '', `#${state.page}`);
  closeDropdowns();
  renderCurrentPage();
  $('#sidebar')?.classList.remove('show');
}

function closeDropdowns() {
  $$('.action-dropdown-menu').forEach(el => el.hidden = true);
  const accountMenu = $('#account-menu');
  if (accountMenu) accountMenu.hidden = true;
  state.openDropdownId = null;
}

function setupEventListeners() {
  // Navigation clicks
  document.addEventListener('click', (e) => {
    // Nav links
    const navLink = e.target.closest('[data-page]');
    if (navLink) {
      e.preventDefault();
      navigateTo(navLink.dataset.page);
      return;
    }

    const navBtn = e.target.closest('[data-nav]');
    if (navBtn) {
      e.preventDefault();
      navigateTo(navBtn.dataset.nav);
      return;
    }

    // Dropdown toggles
    const dropdownTrigger = e.target.closest('[data-dropdown]');
    if (dropdownTrigger) {
      e.stopPropagation();
      const targetId = dropdownTrigger.dataset.dropdown;
      const menu = $(`#dropdown-${targetId}`);
      if (menu) {
        const isHidden = menu.hidden;
        closeDropdowns();
        menu.hidden = !isHidden;
        state.openDropdownId = isHidden ? targetId : null;
      }
      return;
    }

    // Topbar avatar dropdown
    const avatarBtn = e.target.closest('#avatar-btn');
    if (avatarBtn) {
      e.stopPropagation();
      const menu = $('#account-menu');
      if (menu) menu.hidden = !menu.hidden;
      return;
    }

    // Attention KPI click
    if (e.target.closest('#kpi-attention')) {
      showAttentionModal();
      return;
    }

    // Bell notification click
    if (e.target.closest('#bell')) {
      showAttentionModal();
      return;
    }

    // Mobile sidebar toggle
    if (e.target.closest('#sidebar-toggle')) {
      $('#sidebar')?.classList.toggle('show');
      return;
    }

    // Quick add product
    if (e.target.closest('#btn-add-product') || e.target.closest('#btn-add-product-quick')) {
      showProductModal();
      return;
    }

    // Quick adjust stock
    if (e.target.closest('#btn-adjust-quick')) {
      showAdjustStockModal();
      return;
    }

    // In-row adjust stock
    const adjustBtn = e.target.closest('[data-adjust-id]');
    if (adjustBtn) {
      showAdjustStockModal(adjustBtn.dataset.adjustId);
      return;
    }

    // Add supplier
    if (e.target.closest('#btn-add-supplier')) {
      showSupplierModal();
      return;
    }

    // Action menu items
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      const id = actionBtn.dataset.id;
      closeDropdowns();

      if (action === 'adjust') showAdjustStockModal(id);
      if (action === 'edit-product') showProductModal(id);
      if (action === 'delete-product') {
        if (confirm('Are you sure you want to delete this product?')) {
          api(`/products/${id}`, { method: 'DELETE' })
            .then(() => { toast('Product deleted'); loadData(); })
            .catch(err => toast(err.message, 'error'));
        }
      }

      if (action === 'view-supplier') showSupplierViewModal(id);
      if (action === 'edit-supplier') showSupplierModal(id);
      if (action === 'delete-supplier') {
        if (confirm('Are you sure you want to delete this supplier?')) {
          api(`/suppliers/${id}`, { method: 'DELETE' })
            .then(() => { toast('Supplier deleted'); loadData(); })
            .catch(err => toast(err.message, 'error'));
        }
      }

      if (action === 'receive-po') {
        api(`/purchases/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'Received' }) })
          .then(() => { toast(`Purchase Order ${id} marked as received`); loadData(); })
          .catch(err => toast(err.message, 'error'));
      }

      if (action === 'edit-customer') showCustomerModal(id);

      if (action === 'download-report') {
        const reportName = actionBtn.dataset.name;
        let rows = state.products;
        if (/low stock/i.test(reportName)) rows = state.products.filter(product => product.stock > 0 && product.stock <= product.minStock);
        if (/out of stock/i.test(reportName)) rows = state.products.filter(product => product.stock === 0);
        if (/dead stock/i.test(reportName)) rows = state.products.filter(product => product.stock > product.minStock * 3);
        if (/warehouse/i.test(reportName)) rows = state.products.map(product => ({ sku: product.sku, product: product.name, location: product.location, stock: product.stock }));
        exportCsv(reportName.toLowerCase().replace(/\s+/g, '-'), rows);
      }

      if (action === 'settings') {
        navigateTo('settings');
      }
      return;
    }

    // Exports
    if (e.target.closest('#btn-export-dashboard')) {
      exportCsv('dashboard-summary', [{ period: state.dashboardPeriod, products: state.stats.products, units: state.stats.units, inventoryValueUSD: state.stats.value, lowStock: state.stats.low, outOfStock: state.stats.out, suppliers: state.stats.suppliers, completedSalesUSD: state.stats.sales, pendingPurchases: state.stats.pending }]);
      return;
    }

    if (e.target.closest('#btn-export-products')) {
      exportCsv('products', state.products);
      return;
    }

    if (e.target.closest('#btn-export-suppliers')) {
      exportCsv('suppliers', state.suppliers);
      return;
    }


    if (e.target.closest('#btn-export-movements')) {
      exportCsv('movements', state.transactions);
      return;
    }

    if (e.target.closest('#btn-export-sales')) {
      exportCsv('sales', state.sales);
      return;
    }

    if (e.target.closest('#btn-export-purchases')) {
      exportCsv('purchases', state.purchases);
      return;
    }

    if (e.target.closest('#btn-export-customers')) {
      exportCsv('customers', state.customers);
      return;
    }

    // New Sale / Purchase / Customer triggers
    if (e.target.closest('#btn-new-sale') || e.target.closest('#btn-new-sale-daily')) {
      showSaleModal();
      return;
    }

    if (e.target.closest('#btn-new-purchase')) {
      const sup = prompt('Enter supplier name:', state.suppliers[0]?.name || 'Northstar Supply');
      const amt = parseFloat(prompt(`Enter PO amount (${state.currency}):`, convertedAmount(850).toFixed(2)));
      if (sup && amt) {
        api('/purchases', { method: 'POST', body: JSON.stringify({ supplier: sup, amount: baseAmount(amt), status: 'Pending' }) })
          .then(() => { toast('Purchase order created'); loadData(); })
          .catch(err => toast(err.message, 'error'));
      }
      return;
    }

    if (e.target.closest('#btn-add-customer')) {
      showCustomerModal();
      return;
    }

    // Logout
    if (e.target.closest('#header-logout') || e.target.closest('#sidebar-logout') || e.target.closest('#btn-settings-logout')) {
      sessionStorage.removeItem('alphapilot-token');
      location.reload();
      return;
    }

    // AI Assistant Launcher
    if (
      e.target.closest('#chat-fab') ||
      e.target.closest('#help-chat') ||
      e.target.closest('[data-open-ai]') ||
      e.target.closest('.chat-launcher') ||
      e.target.closest('.ai-card-button')
    ) {
      e.preventDefault();
      e.stopPropagation();
      toggleAiChat();
      return;
    }

    if (e.target.closest('#close-chat')) {
      e.preventDefault();
      e.stopPropagation();
      closeAiChat();
      return;
    }

    // AI suggestion chip click
    const chip = e.target.closest('.suggestion-chip');
    if (chip) {
      e.preventDefault();
      e.stopPropagation();
      handleAiSubmit(chip.textContent);
      return;
    }

    // AI chat send button
    if (e.target.closest('.chat-send-btn')) {
      e.preventDefault();
      e.stopPropagation();
      handleAiSubmit();
      return;
    }

    // Bulk selection buttons
    if (e.target.closest('#btn-bulk-export')) {
      const selected = state.products.filter(p => state.selectedProducts.has(p.id));
      exportCsv('selected-products', selected);
      return;
    }

    if (e.target.closest('#btn-bulk-delete')) {
      if (confirm(`Delete ${state.selectedProducts.size} selected products?`)) {
        Promise.all([...state.selectedProducts].map(id => api(`/products/${id}`, { method: 'DELETE' })))
          .then(() => {
            state.selectedProducts.clear();
            toast('Selected products deleted');
            loadData();
          })
          .catch(err => toast(err.message, 'error'));
      }
      return;
    }

    if (e.target.closest('#btn-clear-selection')) {
      state.selectedProducts.clear();
      renderCurrentPage();
      return;
    }

    if (e.target.closest('#btn-clear-supplier-selection')) {
      state.selectedSuppliers.clear();
      renderCurrentPage();
      return;
    }

    // Pagination
    if (e.target.closest('#prod-prev-page')) {
      if (state.productFilter.page > 1) {
        state.productFilter.page--;
        renderCurrentPage();
      }
      return;
    }
    if (e.target.closest('#prod-next-page')) {
      state.productFilter.page++;
      renderCurrentPage();
      return;
    }

    if (e.target.closest('#sup-prev-page')) {
      if (state.supplierFilter.page > 1) {
        state.supplierFilter.page--;
        renderCurrentPage();
      }
      return;
    }
    if (e.target.closest('#sup-next-page')) {
      state.supplierFilter.page++;
      renderCurrentPage();
      return;
    }

    // Close any opened menus when clicking outside
    closeDropdowns();
  });

  // Checkbox Selection Events
  document.addEventListener('change', (e) => {
    if (e.target.id === 'settings-currency') {
      state.currency = currencyConfig(e.target.value)[0];
      localStorage.setItem('alphapilot-currency', state.currency);
      renderCurrentPage();
      toast(`Currency changed to ${state.currency}`);
      return;
    }

    // Select all products
    if (e.target.id === 'select-all-products') {
      const isChecked = e.target.checked;
      $$('.product-select-cb').forEach(cb => {
        const id = Number(cb.dataset.id);
        if (isChecked) state.selectedProducts.add(id);
        else state.selectedProducts.delete(id);
      });
      renderCurrentPage();
      return;
    }

    // Individual product checkbox
    if (e.target.classList.contains('product-select-cb')) {
      const id = Number(e.target.dataset.id);
      if (e.target.checked) state.selectedProducts.add(id);
      else state.selectedProducts.delete(id);
      renderCurrentPage();
      return;
    }

    // Select all suppliers
    if (e.target.id === 'select-all-suppliers') {
      const isChecked = e.target.checked;
      $$('.supplier-select-cb').forEach(cb => {
        const id = Number(cb.dataset.id);
        if (isChecked) state.selectedSuppliers.add(id);
        else state.selectedSuppliers.delete(id);
      });
      renderCurrentPage();
      return;
    }

    // Individual supplier checkbox
    if (e.target.classList.contains('supplier-select-cb')) {
      const id = Number(e.target.dataset.id);
      if (e.target.checked) state.selectedSuppliers.add(id);
      else state.selectedSuppliers.delete(id);
      renderCurrentPage();
      return;
    }

    // Filter selectors
    if (e.target.id === 'product-category-filter') {
      state.productFilter.category = e.target.value;
      state.productFilter.page = 1;
      renderCurrentPage();
      return;
    }

    if (e.target.id === 'product-status-filter') {
      state.productFilter.status = e.target.value;
      state.productFilter.page = 1;
      renderCurrentPage();
      return;
    }

    if (e.target.id === 'product-sort-select') {
      state.productFilter.sort = e.target.value;
      renderCurrentPage();
      return;
    }

    if (e.target.id === 'supplier-status-filter') {
      state.supplierFilter.status = e.target.value;
      state.supplierFilter.page = 1;
      renderCurrentPage();
      return;
    }

    if (e.target.id === 'supplier-sort-select') {
      state.supplierFilter.sort = e.target.value;
      renderCurrentPage();
      return;
    }

    if (e.target.id === 'dashboard-period' || e.target.id === 'chart-days-select') {
      state.dashboardPeriod = e.target.value;
      localStorage.setItem('alphapilot-dashboard-period', state.dashboardPeriod);
      renderCurrentPage();
      return;
    }
  });

  // Search Input Events
  document.addEventListener('input', (e) => {
    if (e.target.id === 'product-search-input') {
      const { selectionStart, selectionEnd } = e.target;
      state.productFilter.q = e.target.value;
      state.productFilter.page = 1;
      renderPreservingInput('product-search-input', selectionStart, selectionEnd);
      return;
    }

    if (e.target.id === 'supplier-search-input') {
      const { selectionStart, selectionEnd } = e.target;
      state.supplierFilter.q = e.target.value;
      state.supplierFilter.page = 1;
      renderPreservingInput('supplier-search-input', selectionStart, selectionEnd);
      return;
    }

    if (e.target.id === 'sales-search-input') {
      const { selectionStart, selectionEnd } = e.target;
      state.salesFilter.q = e.target.value;
      renderPreservingInput('sales-search-input', selectionStart, selectionEnd);
      return;
    }

    // Global Search Bar in Topbar
    if (e.target.id === 'global-search') {
      const query = e.target.value.trim();
      if (query) {
        state.page = 'products';
        state.productFilter.q = query;
        state.productFilter.page = 1;
        renderCurrentPage();
        const pSearch = $('#product-search-input');
        if (pSearch) {
          pSearch.focus({ preventScroll: true });
          pSearch.setSelectionRange(pSearch.value.length, pSearch.value.length);
        }
      }
    }
  });

  // Global Keyboard Shortcuts (⌘K / Ctrl+K)
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const gs = $('#global-search');
      if (gs) gs.focus();
    }
    if (e.key === 'Escape') {
      closeModal();
      closeDropdowns();
      $('#chat-panel')?.classList.remove('open');
    }
  });

  // AI Assistant Chat Form Submission
  $('#chat-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleAiSubmit();
  });

  // Enter key inside AI chat input
  $('#chat-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAiSubmit();
    }
  });
}

// ==========================================================================
// AUTHENTICATION SHELL (Zoho/Linear Clean Login)
// ==========================================================================
function checkAuth() {
  const token = sessionStorage.getItem('alphapilot-token');
  if (token) {
    document.body.classList.remove('auth-pending');
    return true;
  }

  document.body.classList.add('auth-pending');
  const authHtml = `
    <section class="auth-shell" id="auth-shell">
      <div class="auth-card">
        <div class="auth-brand">
          <img src="/alpha-logo.png" alt="Alphapilot logo" onerror="this.style.display='none'">
          <h1 class="auth-title">Welcome to Alphapilot</h1>
          <p class="auth-desc">Enterprise Inventory Management Platform</p>
        </div>
        <form class="auth-form" id="login-form">
          <div class="auth-error" id="login-error"></div>
          <div class="form-group">
            <label class="form-label">Username</label>
            <input class="form-input" name="username" value="admin" required autofocus autocomplete="username">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" name="password" type="password" value="admin123" required autocomplete="current-password">
          </div>
          <button type="submit" class="btn btn-primary" style="height:38px;margin-top:4px;">Sign In to Workspace</button>
        </form>
        <div class="auth-demo-badge">
          Local test credentials: <code>admin</code> / <code>admin123</code>
        </div>
      </div>
    </section>
  `;

  document.body.insertAdjacentHTML('afterbegin', authHtml);

  $('#login-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errBox = $('#login-error');
    errBox.style.display = 'none';

    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(fd))
      });
      sessionStorage.setItem('alphapilot-token', res.token);
      document.body.classList.remove('auth-pending');
      $('#auth-shell')?.remove();
      const chatPanel = $('#chat-panel');
      if (chatPanel) chatPanel.style.removeProperty('display');
      const chatFab = $('#chat-fab');
      if (chatFab) chatFab.style.removeProperty('display');
      const appLayout = $('.app-layout');
      if (appLayout) appLayout.style.removeProperty('display');
      toast(`Signed in as ${res.user?.name || 'Administrator'}`);
      loadData();
    } catch (err) {
      errBox.textContent = err.message || 'Invalid username or password';
      errBox.style.display = 'block';
    }
  };
  return false;
}

// --- App Initialization ---
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEventListeners();

  if (checkAuth()) {
    loadData();
  }
});

window.addEventListener('hashchange', () => {
  const page = location.hash.slice(1);
  if (!APP_PAGES.includes(page) || page === state.page) return;
  state.page = page;
  closeDropdowns();
  renderCurrentPage();
});
