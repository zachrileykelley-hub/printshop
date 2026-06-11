// ── Services & Pricing Page ───────────────────────────────
const ServicesPage = {
  _modal: null,

  render() {
    const search = (document.getElementById('svc-search')?.value || '').toLowerCase();
    const catF   = document.getElementById('svc-cat-filter')?.value || '';

    // Refresh category filter options
    const cats = DB.getCategories();
    const catSel = document.getElementById('svc-cat-filter');
    if (catSel) {
      const cur = catSel.value;
      catSel.innerHTML = '<option value="">All categories</option>' +
        cats.map(c => `<option value="${Utils.escape(c)}" ${c === cur ? 'selected' : ''}>${Utils.escape(c)}</option>`).join('');
    }

    // Also refresh datalist for service modal
    const dl = document.getElementById('svc-cat-list');
    if (dl) dl.innerHTML = cats.map(c => `<option value="${Utils.escape(c)}"></option>`).join('');

    let services = DB.getServices();
    if (search) services = services.filter(s =>
      s.name.toLowerCase().includes(search) ||
      (s.category || '').toLowerCase().includes(search) ||
      (s.description || '').toLowerCase().includes(search));
    if (catF)   services = services.filter(s => s.category === catF);

    // Group by category
    const grouped = {};
    services.forEach(s => {
      const cat = s.category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    });

    const compName = DB.competitorName();

    let html = '';
    if (!services.length) {
      html = '<div class="card"><div class="card-body text-center text-muted py-5">No services found. <button class="btn btn-sm btn-primary ms-2" onclick="ServicesPage.openModal()">Add Service</button></div></div>';
    } else {
      Object.entries(grouped).sort().forEach(([cat, svcs]) => {
        html += `<div class="service-category-heading">${Utils.escape(cat)}</div>
        <div class="card mb-2">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th style="min-width:200px">Service</th>
                  <th>Unit</th>
                  <th class="text-end"><span class="badge-internal">${Utils.escape(DB.label('internal'))}</span></th>
                  <th class="text-end"><span class="badge-community">${Utils.escape(DB.label('community'))}</span></th>
                  <th class="text-end"><span class="badge-external">${Utils.escape(DB.label('external'))}</span></th>
                  <th class="text-end">${Utils.escape(compName)}</th>
                  <th class="text-center" style="width:70px">Active</th>
                  <th class="text-end" style="width:80px">Actions</th>
                </tr>
              </thead>
              <tbody>`;
        svcs.forEach(s => {
          html += `<tr class="${s.active ? '' : 'opacity-50'}">
            <td>
              <div class="fw-semibold">${Utils.escape(s.name)}</div>
              ${s.description ? `<small class="text-muted">${Utils.escape(s.description)}</small>` : ''}
            </td>
            <td><small class="text-muted">${Utils.escape(s.unit)}</small></td>
            <td class="text-end fw-semibold text-success">${Utils.money(s.internalPrice)}</td>
            <td class="text-end fw-semibold" style="color:var(--color-community)">${Utils.money(s.communityPrice)}</td>
            <td class="text-end fw-semibold" style="color:var(--color-external)">${Utils.money(s.externalPrice)}</td>
            <td class="text-end text-muted"><s>${Utils.money(s.competitorPrice)}</s></td>
            <td class="text-center">
              <div class="form-check d-flex justify-content-center mb-0">
                <input class="form-check-input" type="checkbox" ${s.active ? 'checked' : ''}
                  onchange="ServicesPage.toggleActive('${s.id}', this.checked)">
              </div>
            </td>
            <td class="text-end">
              <button class="action-btn text-primary" title="Edit" onclick="ServicesPage.openModal('${s.id}')">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="action-btn text-danger" title="Delete" onclick="ServicesPage.deleteService('${s.id}')">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>`;
        });
        html += '</tbody></table></div></div>';
      });
    }

    document.getElementById('services-list').innerHTML = html;
  },

  openModal(id) {
    const s = id ? DB.getServices().find(x => x.id === id) : null;
    const settings = DB.getSettings();

    document.getElementById('svc-modal-title').textContent = s ? 'Edit Service' : 'Add Service';
    document.getElementById('svc-id').value            = s?.id || '';
    document.getElementById('svc-name').value          = s?.name || '';
    document.getElementById('svc-category').value      = s?.category || '';
    document.getElementById('svc-unit').value          = s?.unit || '';
    document.getElementById('svc-desc').value          = s?.description || '';
    document.getElementById('svc-price-internal').value  = s?.internalPrice ?? '';
    document.getElementById('svc-price-community').value = s?.communityPrice ?? '';
    document.getElementById('svc-price-external').value  = s?.externalPrice ?? '';
    document.getElementById('svc-price-competitor').value= s?.competitorPrice ?? '';
    document.getElementById('svc-competitor-name').value = s?.competitorName || settings.competitorName || 'FedEx Office';
    document.getElementById('svc-active').checked     = s ? s.active : true;

    if (!this._modal) this._modal = new bootstrap.Modal(document.getElementById('serviceModal'));
    this._modal.show();
  },

  saveService() {
    const name = document.getElementById('svc-name').value.trim();
    const unit = document.getElementById('svc-unit').value.trim();
    if (!name) { Utils.toast('Service name is required', 'error'); return; }
    if (!unit) { Utils.toast('Unit is required', 'error'); return; }

    const id = document.getElementById('svc-id').value || Utils.uuid();
    DB.saveService({
      id,
      name,
      category:        document.getElementById('svc-category').value.trim() || 'General',
      unit,
      description:     document.getElementById('svc-desc').value.trim(),
      internalPrice:   +document.getElementById('svc-price-internal').value  || 0,
      communityPrice:  +document.getElementById('svc-price-community').value || 0,
      externalPrice:   +document.getElementById('svc-price-external').value  || 0,
      competitorPrice: +document.getElementById('svc-price-competitor').value|| 0,
      competitorName:  document.getElementById('svc-competitor-name').value.trim() || DB.competitorName(),
      active:          document.getElementById('svc-active').checked,
    });

    this._modal.hide();
    this.render();
    Utils.toast(`Service "${name}" saved.`);
  },

  deleteService(id) {
    const s = DB.getServices().find(x => x.id === id);
    if (!s) return;
    if (!Utils.confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    DB.deleteService(id);
    this.render();
    Utils.toast('Service deleted.', 'info');
  },

  toggleActive(id, active) {
    const s = DB.getServices().find(x => x.id === id);
    if (!s) return;
    s.active = active;
    DB.saveService(s);
  },
};
