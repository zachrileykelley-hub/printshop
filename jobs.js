// ── Jobs Page ─────────────────────────────────────────────
const JobsPage = {
  render() {
    const search  = (document.getElementById('job-search')?.value || '').toLowerCase();
    const statusF = document.getElementById('job-status-filter')?.value || '';
    const typeF   = document.getElementById('job-type-filter')?.value   || '';

    // Jobs = quotes that are approved, completed, or cancelled
    let quotes = DB.getQuotes()
      .filter(q => ['approved','completed','cancelled'].includes(q.status))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    if (search)  quotes = quotes.filter(q =>
      q.quoteNumber.toLowerCase().includes(search) ||
      (q.customerName || '').toLowerCase().includes(search) ||
      (q.customerOrg  || '').toLowerCase().includes(search));
    if (statusF) quotes = quotes.filter(q => q.status === statusF);
    if (typeF)   quotes = quotes.filter(q => q.customerType === typeF);

    const tbody = document.getElementById('jobs-tbody');
    if (!quotes.length) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="8">No jobs found. Quotes move here when marked Approved or Completed.</td></tr>`;
      return;
    }

    tbody.innerHTML = quotes.map(q => {
      const our     = DB.quoteOurTotal(q);
      const savings = DB.quoteSavings(q);
      const date    = q.completedAt || q.updatedAt || q.createdAt;

      return `<tr>
        <td class="fw-semibold">
          <a onclick="QuotesPage.viewQuote('${q.id}')" class="cursor-pointer text-decoration-none">${Utils.escape(q.quoteNumber)}</a>
        </td>
        <td>${Utils.escape(q.customerName)}${q.customerOrg ? '<br><small class="text-muted">'+Utils.escape(q.customerOrg)+'</small>' : ''}</td>
        <td>${Utils.typeBadge(q.customerType)}</td>
        <td class="text-end">${Utils.money(our)}</td>
        <td class="text-end text-savings">${savings > 0 ? Utils.money(savings) : '—'}</td>
        <td>${Utils.statusBadge(q.status)}</td>
        <td><small>${Utils.formatDate(date)}</small></td>
        <td class="text-end">
          ${q.status !== 'completed' ? `
            <button class="btn btn-sm btn-success me-1" onclick="JobsPage.markComplete('${q.id}')">
              <i class="bi bi-check-lg me-1"></i>Complete
            </button>` : ''}
          ${q.status === 'approved' ? `
            <button class="btn btn-sm btn-outline-danger" onclick="JobsPage.markCancelled('${q.id}')">
              Cancel
            </button>` : ''}
          <button class="action-btn text-primary ms-1" title="Download PDF"
            onclick="PDFGen.downloadQuote(DB.getQuote('${q.id}'))">
            <i class="bi bi-download"></i>
          </button>
        </td>
      </tr>`;
    }).join('');
  },

  markComplete(id) {
    const q = DB.getQuote(id);
    if (!q) return;
    q.status      = 'completed';
    q.completedAt = new Date().toISOString();
    DB.saveQuote(q);
    this.render();
    Utils.toast(`Job ${q.quoteNumber} marked complete!`);
  },

  markCancelled(id) {
    const q = DB.getQuote(id);
    if (!q || !Utils.confirm(`Cancel job ${q.quoteNumber}?`)) return;
    q.status = 'cancelled';
    DB.saveQuote(q);
    this.render();
    Utils.toast(`Job ${q.quoteNumber} cancelled.`, 'info');
  },
};
