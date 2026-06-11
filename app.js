// ── App Router & Init ─────────────────────────────────────
const App = {
  _currentPage: null,

  pages: {
    dashboard:     { el: 'page-dashboard',     render: () => Dashboard.render() },
    services:      { el: 'page-services',      render: () => ServicesPage.render() },
    customers:     { el: 'page-customers',     render: () => CustomersPage.render() },
    quotes:        { el: 'page-quotes',        render: () => QuotesPage.render() },
    'quote-builder':{ el: 'page-quote-builder',render: (opts) => QuoteBuilder.init(opts) },
    jobs:          { el: 'page-jobs',          render: () => JobsPage.render() },
    reports:       { el: 'page-reports',       render: () => ReportsPage.render() },
    settings:      { el: 'page-settings',      render: () => SettingsPage.render() },
  },

  go(page, opts = {}) {
    const def = this.pages[page];
    if (!def) return;

    // Hide all pages
    Object.values(this.pages).forEach(p => {
      const el = document.getElementById(p.el);
      if (el) el.classList.add('d-none');
    });

    // Show target page
    const el = document.getElementById(def.el);
    if (el) el.classList.remove('d-none');

    // Update nav active state
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });

    this._currentPage = page;
    def.render(opts);

    // Scroll to top
    document.getElementById('main-content').scrollTop = 0;
  },

  init() {
    // First run: seed default services & settings
    if (!localStorage.getItem('ps_services')) {
      DB.seedServices();
    }
    if (!localStorage.getItem('ps_settings')) {
      DB.saveSettings({
        schoolName:      'BPS Print Shop',
        address:         'Birmingham Public Schools',
        quotePrefix:     'BPS',
        competitorName:  'FedEx Office',
        label_internal:  'Internal',
        label_community: 'Community Org',
        label_external:  'External',
        terms:           'Thank you for using the BPS Print Shop! Payment is due upon receipt of completed job. Prices are valid for 30 days. For questions, please contact the Print Shop directly.',
      });
    }

    // Update sidebar school name
    const s = DB.getSettings();
    const navName = document.getElementById('nav-school-name');
    if (navName) navName.textContent = s.schoolName || 'BPS Print Shop';

    // Wire up sidebar nav links
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        App.go(link.dataset.page);
      });
    });

    // Start on dashboard
    this.go('dashboard');
  },
};

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
