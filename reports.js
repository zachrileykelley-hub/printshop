// ── Reports Page ──────────────────────────────────────────
const ReportsPage = {
  _typeChart:  null,
  _trendChart: null,

  render() {
    const period = document.getElementById('rpt-period')?.value || 'month';
    const from   = document.getElementById('rpt-from')?.value  || '';
    const to     = document.getElementById('rpt-to')?.value    || '';

    // Show/hide custom date inputs
    ['rpt-custom-from-wrap','rpt-custom-to-wrap'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('d-none', period !== 'custom');
    });

    // Active types
    const types = ['internal','community','external'].filter(t =>
      document.getElementById('rpt-' + t)?.checked);

    const { start, end } = Utils.periodRange(period, from, to);
    const jobs = DB.completedQuotesInRange(start, end, types);

    this._renderSummaryCards(jobs, types);
    this._renderTable(jobs);
    this._renderTypeChart(jobs, types);
    this._renderTrendChart(types);
  },

  _renderSummaryCards(jobs, types) {
    const totalOur   = jobs.reduce((s, q) => s + DB.quoteOurTotal(q), 0);
    const totalComp  = jobs.reduce((s, q) => s + DB.quoteCompetitorTotal(q), 0);
    const totalSave  = totalComp - totalOur;
    const savePct    = totalComp > 0 ? (totalSave / totalComp * 100) : 0;

    const byType = {};
    types.forEach(t => {
      const tJobs = jobs.filter(q => q.customerType === t);
      byType[t] = {
        count: tJobs.length,
        save:  tJobs.reduce((s, q) => s + DB.quoteSavings(q), 0),
      };
    });

    document.getElementById('rpt-summary-cards').innerHTML = `
      <div class="col-md-3 col-sm-6">
        <div class="stat-card">
          <div class="stat-icon" style="background:#dbeafe;color:#1d4ed8"><i class="bi bi-briefcase-fill"></i></div>
          <div><div class="stat-value">${jobs.length}</div><div class="stat-label">Jobs Completed</div></div>
        </div>
      </div>
      <div class="col-md-3 col-sm-6">
        <div class="stat-card">
          <div class="stat-icon" style="background:#dcfce7;color:#166534"><i class="bi bi-cash-stack"></i></div>
          <div><div class="stat-value">${Utils.money(totalOur)}</div><div class="stat-label">Our Revenue</div></div>
        </div>
      </div>
      <div class="col-md-3 col-sm-6">
        <div class="stat-card">
          <div class="stat-icon" style="background:#f3e8ff;color:#6b21a8"><i class="bi bi-piggy-bank-fill"></i></div>
          <div><div class="stat-value">${Utils.money(totalSave)}</div><div class="stat-label">Total Savings vs Retail</div></div>
        </div>
      </div>
      <div class="col-md-3 col-sm-6">
        <div class="stat-card">
          <div class="stat-icon" style="background:#fef9c3;color:#854d0e"><i class="bi bi-percent"></i></div>
          <div><div class="stat-value">${savePct.toFixed(1)}%</div><div class="stat-label">Below Retail Price</div></div>
        </div>
      </div>
    `;
  },

  _renderTable(jobs) {
    const tbody = document.getElementById('rpt-jobs-tbody');
    const tfoot = document.getElementById('rpt-jobs-tfoot');

    if (!jobs.length) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="8">No completed jobs in this period.</td></tr>`;
      tfoot.innerHTML = '';
      return;
    }

    let totOur = 0, totComp = 0, totSave = 0;

    tbody.innerHTML = jobs
      .sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt))
      .map(q => {
        const our  = DB.quoteOurTotal(q);
        const comp = DB.quoteCompetitorTotal(q);
        const save = comp - our;
        const pct  = comp > 0 ? (save / comp * 100) : 0;
        totOur  += our;
        totComp += comp;
        totSave += save;
        return `<tr>
          <td class="fw-semibold">
            <a onclick="QuotesPage.viewQuote('${q.id}')" class="cursor-pointer text-decoration-none">${Utils.escape(q.quoteNumber)}</a>
          </td>
          <td><small>${Utils.formatDateShort(q.completedAt || q.updatedAt || q.createdAt)}</small></td>
          <td>${Utils.escape(q.customerName)}${q.customerOrg ? '<br><small class="text-muted">'+Utils.escape(q.customerOrg)+'</small>' : ''}</td>
          <td>${Utils.typeBadge(q.customerType)}</td>
          <td class="text-end">${Utils.money(our)}</td>
          <td class="text-end text-muted">${Utils.money(comp)}</td>
          <td class="text-end text-savings">${Utils.money(save)}</td>
          <td class="text-end text-savings">${pct.toFixed(1)}%</td>
        </tr>`;
      }).join('');

    const totPct = totComp > 0 ? (totSave / totComp * 100) : 0;
    tfoot.innerHTML = `<tr>
      <td colspan="4">Totals (${jobs.length} jobs)</td>
      <td class="text-end">${Utils.money(totOur)}</td>
      <td class="text-end">${Utils.money(totComp)}</td>
      <td class="text-end text-success">${Utils.money(totSave)}</td>
      <td class="text-end text-success">${totPct.toFixed(1)}%</td>
    </tr>`;
  },

  _renderTypeChart(jobs, types) {
    const ctx = document.getElementById('rpt-type-chart');
    if (!ctx) return;
    if (this._typeChart) { this._typeChart.destroy(); this._typeChart = null; }

    const colors = { internal: '#13295C', community: '#FFAD1F', external: '#306FB4' };
    const labels = types.map(t => DB.label(t));
    const data   = types.map(t => {
      return jobs.filter(q => q.customerType === t)
        .reduce((s, q) => s + DB.quoteSavings(q), 0);
    });

    this._typeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: types.map(t => colors[t] || '#aaa'), borderWidth: 2 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${Utils.money(ctx.raw)}` } },
        },
      },
    });
  },

  _renderTrendChart(types) {
    const ctx = document.getElementById('rpt-trend-chart');
    if (!ctx) return;
    if (this._trendChart) { this._trendChart.destroy(); this._trendChart = null; }

    const now    = new Date();
    const labels = [];
    const datasets = {
      internal:  { label: DB.label('internal'),  data: [], borderColor: '#13295C', backgroundColor: 'rgba(19,41,92,0.10)',   tension: 0.3, fill: true },
      community: { label: DB.label('community'), data: [], borderColor: '#FFAD1F', backgroundColor: 'rgba(255,173,31,0.12)', tension: 0.3, fill: true },
      external:  { label: DB.label('external'),  data: [], borderColor: '#306FB4', backgroundColor: 'rgba(48,111,180,0.10)', tension: 0.3, fill: true },
    };

    for (let i = 11; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
      types.forEach(t => {
        const jobs = DB.completedQuotesInRange(d, end, [t]);
        datasets[t].data.push(+jobs.reduce((s, q) => s + DB.quoteSavings(q), 0).toFixed(2));
      });
      // Fill unused types with 0
      ['internal','community','external'].filter(t => !types.includes(t)).forEach(t => {
        datasets[t].data.push(0);
      });
    }

    this._trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: types.map(t => datasets[t]),
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: {
          y: {
            ticks: { callback: v => '$' + v, font: { size: 10 } },
            grid:  { color: '#f0f0f0' },
          },
          x: { ticks: { font: { size: 9 } }, grid: { display: false } },
        },
      },
    });
  },

  downloadPDF() {
    const period = document.getElementById('rpt-period')?.value || 'month';
    const from   = document.getElementById('rpt-from')?.value  || '';
    const to     = document.getElementById('rpt-to')?.value    || '';
    const types  = ['internal','community','external'].filter(t =>
      document.getElementById('rpt-' + t)?.checked);

    const { start, end } = Utils.periodRange(period, from, to);
    const jobs    = DB.completedQuotesInRange(start, end, types);
    const label   = Utils.periodLabel(period, from, to);

    if (!jobs.length) {
      Utils.toast('No completed jobs in this period to report on.', 'info');
      return;
    }

    PDFGen.downloadReport(jobs, label, types);
  },
};
