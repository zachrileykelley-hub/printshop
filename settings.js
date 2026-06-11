// ── Settings Page ─────────────────────────────────────────
const SettingsPage = {
  render() {
    const s = DB.getSettings();
    document.getElementById('set-name').value            = s.schoolName        || '';
    document.getElementById('set-address').value         = s.address           || '';
    document.getElementById('set-phone').value           = s.phone             || '';
    document.getElementById('set-email').value           = s.email             || '';
    document.getElementById('set-prefix').value          = s.quotePrefix       || 'PSQ';
    document.getElementById('set-competitor').value      = s.competitorName    || 'FedEx Office';
    document.getElementById('set-terms').value           = s.terms             || '';
    document.getElementById('set-label-internal').value  = s.label_internal    || 'Internal';
    document.getElementById('set-label-community').value = s.label_community   || 'Community Org';
    document.getElementById('set-label-external').value  = s.label_external    || 'External';
  },

  save() {
    const s = {
      schoolName:     document.getElementById('set-name').value.trim(),
      address:        document.getElementById('set-address').value.trim(),
      phone:          document.getElementById('set-phone').value.trim(),
      email:          document.getElementById('set-email').value.trim(),
      quotePrefix:    document.getElementById('set-prefix').value.trim()     || 'PSQ',
      competitorName: document.getElementById('set-competitor').value.trim() || 'FedEx Office',
      terms:          document.getElementById('set-terms').value.trim(),
      label_internal: document.getElementById('set-label-internal').value.trim()  || 'Internal',
      label_community:document.getElementById('set-label-community').value.trim() || 'Community Org',
      label_external: document.getElementById('set-label-external').value.trim()  || 'External',
    };
    DB.saveSettings(s);

    // Update sidebar school name
    const navName = document.getElementById('nav-school-name');
    if (navName) navName.textContent = s.schoolName || 'Print Shop';

    Utils.toast('Settings saved!');
  },

  exportData() {
    const data = JSON.stringify(DB.exportAll(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `PrintShop-Backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Utils.toast('Backup exported!');
  },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Utils.confirm('This will overwrite all current data. Continue?')) return;
        DB.importAll(data);
        Utils.toast('Backup imported! Refreshing…');
        setTimeout(() => location.reload(), 1000);
      } catch {
        Utils.toast('Invalid backup file.', 'error');
      }
    };
    reader.readAsText(file);
  },

  clearData() {
    if (!Utils.confirm('Clear ALL data? This cannot be undone.')) return;
    if (!Utils.confirm('Are you absolutely sure?')) return;
    ['ps_settings','ps_services','ps_customers','ps_quotes'].forEach(k => localStorage.removeItem(k));
    Utils.toast('All data cleared. Refreshing…', 'info');
    setTimeout(() => location.reload(), 1000);
  },

  resetSeedData() {
    const n = DB.seedServices();
    ServicesPage.render();
    Utils.toast(`Added ${n} default service(s).`);
  },
};
