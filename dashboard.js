// ── Dashboard ─────────────────────────────────────────────
const Dashboard = {
  _chart: null,

  render() {
    this._renderStats();
    this._renderRecentQuotes();
    this._renderSavingsChart();
  },

  _renderStats() {
    const quotes    = DB.getQuotes();
    const active    = quotes.filter(q => ['sent','approved'].includes(q.status));
    const completed = quotes.filter(q => q.status === 'completed');

    const now   = new Date();
    const mStart= new Date(now.getFullYear(), now.getMonth(), 1);
    const mComp = completed.filter(q => {
      const d = new Date(q.completedAt || q.updatedAt || q.createdAt);
      return d >= mStart;
    });
    const mSavings = mComp.reduce((s, q) => s + DB.quoteSavings(q), 0);
    const mRevenue = mComp.reduce((s, q) => s + DB.quoteOurTotal(q), 0);

    const cards = [
      { icon: 'bi-file-earmark-text', bg: '#dbeafe', color: '#1d4ed8', val: quotes.length,   lbl: 'Total Quotes' },
      { icon: 'bi-hourglass-split',   bg: '#fef9c3', color: '#854d0e', val: active.length,   lbl: 'Active / In Progress' },
      { icon: 'bi-check-circle',      bg: '#dcfce7', color: '#166534', val: mComp.length,    lbl: 'Completed This Month' },
      { icon: 'bi-piggy-bank',        bg: '#f3e8ff', color: '#6b21a8', val: Utils.money(mSavings), lbl: 'Savings This Month' },
    ];

    document.getElementById('dash-stats').innerHTML = cards.map(c => `
      <div class="col-md-3 col-sm-6">
        <div class="stat-card">
          <div class="stat-icon" style="background:${c.bg};color:${c.color}">
            <i class="bi ${c.icon}"></i>
          </div>
          <div>
            <div class="stat-value">${c.val}</div>
            <div class="stat-label">${c.lbl}</div>
          </div>
        </div>
      </div>`).join('');
  },

  _renderRecentQuotes() {
    const quotes = DB.getQuotes()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    if (!quotes.length) {
      document.getElementById('dash-recent-quotes').innerHTML =
        '<div class="p-4 text-center text-muted">No quotes yet. <a onclick="App.go(\'quote-builder\')" class="cursor-pointer">Create your first quote</a>.</div>';
      return;
    }

    document.getElementById('dash-recent-quotes').innerHTML = `
      <table class="table table-hover table-sm mb-0">
        <thead class="table-light">
          <tr>
            <th>Quote #</th><th>Customer</th><th>Type</th>
            <th class="text-end">Our Total</th><th class="text-end">Savings</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${quotes.map(q => {
            const savings = DB.quoteSavings(q);
            return `<tr onclick="QuotesPage.viewQuote('${q.id}')" class="cursor-pointer">
              <td class="fw-semibold">${Utils.escape(q.quoteNumber)}</td>
              <td>${Utils.escape(q.customerName)}${q.customerOrg ? '<br><small class="text-muted">'+Utils.escape(q.customerOrg)+'</small>' : ''}</td>
              <td>${Utils.typeBadge(q.customerType)}</td>
              <td class="text-end">${Utils.money(DB.quoteOurTotal(q))}</td>
              <td class="text-end text-savings">${savings > 0 ? Utils.money(savings) : '—'}</td>
              <td>${Utils.statusBadge(q.status)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  },

  _renderSavingsChart() {
    const now   = new Date();
    const labels= [], ourData = [], compData = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const jobs = DB.completedQuotesInRange(d, end, []);
      labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
      ourData.push(+jobs.reduce((s, q) => s + DB.quoteOurTotal(q), 0).toFixed(2));
      compData.push(+jobs.reduce((s, q) => s + DB.quoteCompetitorTotal(q), 0).toFixed(2));
    }

    const ctx = document.getElementById('dash-savings-chart');
    if (!ctx) return;
    if (this._chart) { this._chart.destroy(); this._chart = null; }

    this._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Our Revenue', data: ourData,  backgroundColor: '#306FB4', borderRadius: 4 },
          { label: 'Retail Value',data: compData, backgroundColor: '#D9D9D9', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: {
          y: { ticks: { callback: v => '$' + v, font: { size: 10 } }, grid: { color: '#f0f0f0' } },
          x: { ticks: { font: { size: 10 } }, grid: { display: false } },
        },
      },
    });

    // Summary text
    const thisMonth = DB.completedQuotesInRange(
      new Date(now.getFullYear(), now.getMonth(), 1),
      new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      []
    );
    const save  = thisMonth.reduce((s, q) => s + DB.quoteSavings(q), 0);
    const total = thisMonth.reduce((s, q) => s + DB.quoteCompetitorTotal(q), 0);
    const pct   = total > 0 ? (save / total * 100) : 0;

    document.getElementById('dash-savings-summary').innerHTML = `
      <div class="d-flex justify-content-between">
        <div class="text-center">
          <div class="fw-bold fs-5" style="color:#13295C">${Utils.money(save)}</div>
          <div class="text-muted small">Saved this month</div>
        </div>
        <div class="text-center">
          <div class="fw-bold fs-5" style="color:#FFAD1F">${pct.toFixed(0)}%</div>
          <div class="text-muted small">Below retail</div>
        </div>
        <div class="text-center">
          <div class="fw-bold fs-5">${thisMonth.length}</div>
          <div class="text-muted small">Jobs completed</div>
        </div>
      </div>`;
  },
};
