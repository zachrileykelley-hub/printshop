// ── Data Layer (localStorage) ────────────────────────────
const DB = {
  // ── Settings ─────────────────────────────────────────
  getSettings() {
    return JSON.parse(localStorage.getItem('ps_settings') || '{}');
  },
  saveSettings(s) {
    localStorage.setItem('ps_settings', JSON.stringify(s));
  },
  label(type) {
    const s = this.getSettings();
    return s['label_' + type] || { internal: 'Internal', community: 'Community Org', external: 'External' }[type] || type;
  },
  competitorName() {
    return this.getSettings().competitorName || 'FedEx Office';
  },

  // ── Services ─────────────────────────────────────────
  getServices() {
    return JSON.parse(localStorage.getItem('ps_services') || '[]');
  },
  saveService(svc) {
    const list = this.getServices();
    const idx  = list.findIndex(s => s.id === svc.id);
    if (idx >= 0) list[idx] = svc; else list.push(svc);
    localStorage.setItem('ps_services', JSON.stringify(list));
  },
  deleteService(id) {
    localStorage.setItem('ps_services',
      JSON.stringify(this.getServices().filter(s => s.id !== id)));
  },
  getCategories() {
    const cats = [...new Set(this.getServices().map(s => s.category).filter(Boolean))];
    return cats.sort();
  },

  // ── Customers ────────────────────────────────────────
  getCustomers() {
    return JSON.parse(localStorage.getItem('ps_customers') || '[]');
  },
  saveCustomer(c) {
    const list = this.getCustomers();
    const idx  = list.findIndex(x => x.id === c.id);
    if (idx >= 0) list[idx] = c; else list.push(c);
    localStorage.setItem('ps_customers', JSON.stringify(list));
  },
  deleteCustomer(id) {
    localStorage.setItem('ps_customers',
      JSON.stringify(this.getCustomers().filter(c => c.id !== id)));
  },

  // ── Quotes ───────────────────────────────────────────
  getQuotes() {
    return JSON.parse(localStorage.getItem('ps_quotes') || '[]');
  },
  getQuote(id) {
    return this.getQuotes().find(q => q.id === id) || null;
  },
  saveQuote(q) {
    const list = this.getQuotes();
    const idx  = list.findIndex(x => x.id === q.id);
    q.updatedAt = new Date().toISOString();
    if (idx >= 0) list[idx] = q; else list.push(q);
    localStorage.setItem('ps_quotes', JSON.stringify(list));
    return q;
  },
  deleteQuote(id) {
    localStorage.setItem('ps_quotes',
      JSON.stringify(this.getQuotes().filter(q => q.id !== id)));
  },
  nextQuoteNumber() {
    const s      = this.getSettings();
    const prefix = s.quotePrefix || 'PSQ';
    const year   = new Date().getFullYear();
    const quotes = this.getQuotes();
    const count  = quotes.filter(q => q.quoteNumber && q.quoteNumber.startsWith(`${prefix}-${year}-`)).length;
    return `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`;
  },

  // ── Helpers for reports ──────────────────────────────
  completedQuotesInRange(start, end, types) {
    return this.getQuotes().filter(q => {
      if (q.status !== 'completed') return false;
      if (types && types.length && !types.includes(q.customerType)) return false;
      const d = new Date(q.completedAt || q.updatedAt || q.createdAt);
      return d >= start && d <= end;
    });
  },

  quoteOurTotal(q) {
    return (q.items || []).reduce((s, i) => s + (+i.quantity || 0) * (+i.unitPrice || 0), 0);
  },
  quoteCompetitorTotal(q) {
    return (q.items || []).reduce((s, i) => s + (+i.quantity || 0) * (+i.competitorPrice || 0), 0);
  },
  quoteSavings(q) {
    return this.quoteCompetitorTotal(q) - this.quoteOurTotal(q);
  },

  // ── Backup / Restore ─────────────────────────────────
  exportAll() {
    const quotes = this.getQuotes();
    const jobs   = quotes.filter(q => q.status === 'completed');

    // Per-job savings summary for easy reference in the export
    const jobSummary = jobs.map(q => ({
      quoteNumber:      q.quoteNumber,
      completedAt:      q.completedAt || q.updatedAt || q.createdAt,
      customerName:     q.customerName,
      customerOrg:      q.customerOrg  || '',
      customerType:     q.customerType,
      ourTotal:         +this.quoteOurTotal(q).toFixed(2),
      retailTotal:      +this.quoteCompetitorTotal(q).toFixed(2),
      savings:          +this.quoteSavings(q).toFixed(2),
      savingsPct:       this.quoteCompetitorTotal(q) > 0
                          ? +((this.quoteSavings(q) / this.quoteCompetitorTotal(q)) * 100).toFixed(2)
                          : 0,
    }));

    const totalSavings = jobs.reduce((s, q) => s + this.quoteSavings(q), 0);

    return {
      exportedAt:   new Date().toISOString(),
      exportedBy:   (this.getSettings().schoolName || 'BPS Print Shop') + ' — Print Shop Manager',
      // ── Settings ──
      settings:     this.getSettings(),
      // ── Service catalog ──
      services:     this.getServices(),
      // ── Customer records ──
      customers:    this.getCustomers(),
      // ── ALL quotes (includes every status) ──
      allQuotes:    quotes,
      // ── Completed jobs only (full quote objects) ──
      jobHistory:   jobs,
      // ── Savings summary table (quick reference) ──
      savingsSummary: {
        totalJobsCompleted: jobs.length,
        totalOurRevenue:    +jobs.reduce((s, q) => s + this.quoteOurTotal(q), 0).toFixed(2),
        totalRetailValue:   +jobs.reduce((s, q) => s + this.quoteCompetitorTotal(q), 0).toFixed(2),
        totalSavings:       +totalSavings.toFixed(2),
        perJob:             jobSummary,
      },
    };
  },
  importAll(obj) {
    if (obj.settings)   localStorage.setItem('ps_settings',  JSON.stringify(obj.settings));
    if (obj.services)   localStorage.setItem('ps_services',  JSON.stringify(obj.services));
    if (obj.customers)  localStorage.setItem('ps_customers', JSON.stringify(obj.customers));
    // Support both old key (quotes) and new key (allQuotes)
    const quotes = obj.allQuotes || obj.quotes;
    if (quotes)         localStorage.setItem('ps_quotes',    JSON.stringify(quotes));
  },

  // ── Seed default services ────────────────────────────
  seedServices() {
    const defaults = [
      // category, name, unit, internal, community, external, competitor
      ['Copies & Printing', 'B&W Copies 8.5×11',        'per page',      0.05, 0.08, 0.12, 0.15],
      ['Copies & Printing', 'Color Copies 8.5×11',      'per page',      0.25, 0.35, 0.55, 0.79],
      ['Copies & Printing', 'B&W Copies 8.5×14 Legal',  'per page',      0.07, 0.10, 0.15, 0.19],
      ['Copies & Printing', 'Color Copies 8.5×14 Legal','per page',      0.30, 0.45, 0.65, 0.89],
      ['Copies & Printing', 'B&W Copies 11×17',         'per page',      0.10, 0.15, 0.22, 0.25],
      ['Copies & Printing', 'Color Copies 11×17',       'per page',      0.55, 0.75, 1.10, 1.29],
      ['Wide Format',       'Poster Print 24×36 Color', 'per poster',    8.00,12.00,18.00,29.99],
      ['Wide Format',       'Poster Print 18×24 Color', 'per poster',    5.00, 8.00,12.00,19.99],
      ['Wide Format',       'Banner 2×6 ft',            'per banner',   15.00,22.00,35.00,49.99],
      ['Finishing',         'Laminating 8.5×11',        'per sheet',     0.50, 0.75, 1.25, 1.99],
      ['Finishing',         'Laminating 11×17',         'per sheet',     1.00, 1.50, 2.50, 3.99],
      ['Finishing',         'Spiral Binding',           'per book',      2.00, 3.00, 5.00, 5.99],
      ['Finishing',         'GBC / Comb Binding',       'per book',      3.00, 4.50, 7.00, 8.99],
      ['Finishing',         'Perfect Binding',          'per book',      5.00, 7.00,12.00,18.99],
      ['Finishing',         'Cutting / Trimming',       'per ream',      0.50, 1.00, 2.00, 3.50],
      ['Finishing',         'Folding (per 100)',        'per 100 sheets',1.00, 1.50, 3.00, 5.00],
      ['Finishing',         'Stapling / Collating',     'per set',       0.10, 0.20, 0.35, 0.75],
      ['Design & Specialty','Graphic Design',           'per hour',     15.00,25.00,40.00,65.00],
      ['Design & Specialty','Business Cards (100)',     'per 100',       5.00, 8.00,15.00,24.99],
      ['Design & Specialty','Envelope Printing',        'per envelope',  0.10, 0.15, 0.25, 0.45],
      ['Design & Specialty','Booklet Saddle-Stitch',    'per booklet',   3.00, 5.00, 8.00,14.99],
      ['Design & Specialty','NCR Forms (2-part)',       'per set',       0.30, 0.50, 0.85, 1.49],
    ];

    const existing = this.getServices();
    const existingNames = new Set(existing.map(s => s.name));
    let added = 0;

    defaults.forEach(([cat, name, unit, ip, cp, ep, comp]) => {
      if (existingNames.has(name)) return;
      this.saveService({
        id:              Utils.uuid(),
        category:        cat,
        name,
        description:     '',
        unit,
        internalPrice:   ip,
        communityPrice:  cp,
        externalPrice:   ep,
        competitorPrice: comp,
        competitorName:  'FedEx Office',
        active:          true,
      });
      added++;
    });
    return added;
  },
};
