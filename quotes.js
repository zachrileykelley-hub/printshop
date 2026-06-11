// ── Quotes List Page ──────────────────────────────────────
const QuotesPage = {
  render() {
    const search  = (document.getElementById('q-search')?.value  || '').toLowerCase();
    const statusF = document.getElementById('q-status-filter')?.value || '';
    const typeF   = document.getElementById('q-type-filter')?.value   || '';

    let quotes = DB.getQuotes()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (search)  quotes = quotes.filter(q =>
      q.quoteNumber.toLowerCase().includes(search) ||
      (q.customerName  || '').toLowerCase().includes(search) ||
      (q.customerOrg   || '').toLowerCase().includes(search));
    if (statusF) quotes = quotes.filter(q => q.status === statusF);
    if (typeF)   quotes = quotes.filter(q => q.customerType === typeF);

    const tbody = document.getElementById('quotes-tbody');
    if (!quotes.length) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="9">No quotes found.</td></tr>`;
      return;
    }

    tbody.innerHTML = quotes.map(q => {
      const our     = DB.quoteOurTotal(q);
      const comp    = DB.quoteCompetitorTotal(q);
      const savings = comp - our;
      return `<tr onclick="QuotesPage.viewQuote('${q.id}')" class="cursor-pointer">
        <td class="fw-semibold">${Utils.escape(q.quoteNumber)}</td>
        <td>${Utils.escape(q.customerName)}${q.customerOrg ? '<br><small class="text-muted">'+Utils.escape(q.customerOrg)+'</small>' : ''}</td>
        <td>${Utils.typeBadge(q.customerType)}</td>
        <td class="text-end">${Utils.money(our)}</td>
        <td class="text-end text-muted">${Utils.money(comp)}</td>
        <td class="text-end text-savings">${savings > 0 ? Utils.money(savings) : '—'}</td>
        <td>${Utils.statusBadge(q.status)}</td>
        <td><small>${Utils.formatDate(q.createdAt)}</small></td>
        <td class="text-end" onclick="event.stopPropagation()">
          <button class="action-btn text-primary" title="Edit" onclick="App.go('quote-builder',{quoteId:'${q.id}'})">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="action-btn text-success" title="Download PDF" onclick="PDFGen.downloadQuote(DB.getQuote('${q.id}'))">
            <i class="bi bi-download"></i>
          </button>
          <button class="action-btn text-danger" title="Delete" onclick="QuotesPage.deleteQuote('${q.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');
  },

  viewQuote(id) {
    const q = DB.getQuote(id);
    if (!q) return;

    const our     = DB.quoteOurTotal(q);
    const comp    = DB.quoteCompetitorTotal(q);
    const savings = comp - our;
    const compName= (q.items && q.items[0] && q.items[0].competitorName) || DB.competitorName();

    document.getElementById('qv-title').textContent = `Quote ${q.quoteNumber}`;
    document.getElementById('qv-body').innerHTML = `
      <div class="row g-3 mb-3">
        <div class="col-md-5">
          <div class="p-3 bg-light rounded">
            <div class="fw-bold mb-1">Customer</div>
            <div class="fs-6">${Utils.escape(q.customerName)}</div>
            ${q.customerOrg ? `<div class="text-muted">${Utils.escape(q.customerOrg)}</div>` : ''}
            <div class="mt-1">${Utils.typeBadge(q.customerType)}</div>
            ${q.customerEmail ? `<div class="mt-1 small"><i class="bi bi-envelope me-1"></i>${Utils.escape(q.customerEmail)}</div>` : ''}
            ${q.customerPhone ? `<div class="small"><i class="bi bi-telephone me-1"></i>${Utils.escape(q.customerPhone)}</div>` : ''}
          </div>
        </div>
        <div class="col-md-4">
          <div class="p-3 bg-light rounded">
            <div class="fw-bold mb-1">Quote Info</div>
            <div><span class="text-muted small">Number:</span> <strong>${Utils.escape(q.quoteNumber)}</strong></div>
            <div><span class="text-muted small">Status:</span> ${Utils.statusBadge(q.status)}</div>
            <div><span class="text-muted small">Date:</span> ${Utils.formatDate(q.createdAt)}</div>
            ${q.notes ? `<div class="mt-2 small text-muted">${Utils.escape(q.notes)}</div>` : ''}
          </div>
        </div>
        <div class="col-md-3">
          <div class="p-3 rounded" style="background:#d1f5e4">
            <div class="fw-bold mb-1 text-success">Savings Summary</div>
            <div class="small text-muted">Our Total</div>
            <div class="fw-bold">${Utils.money(our)}</div>
            <div class="small text-muted mt-1">${Utils.escape(compName)} Total</div>
            <div class="text-muted"><s>${Utils.money(comp)}</s></div>
            <div class="small text-muted mt-1">You Save</div>
            <div class="fw-bold text-success fs-5">${Utils.money(savings)}</div>
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table table-sm table-bordered mb-0">
          <thead class="table-dark">
            <tr>
              <th>Service</th><th>Qty</th><th>Unit</th>
              <th class="text-end">Our Price</th><th class="text-end">Our Total</th>
              <th class="text-end">${Utils.escape(compName)} Price</th>
              <th class="text-end">${Utils.escape(compName)} Total</th>
              <th class="text-end">Savings</th>
            </tr>
          </thead>
          <tbody>
            ${(q.items || []).map(item => {
              const ot = (+item.quantity||0) * (+item.unitPrice||0);
              const ct = (+item.quantity||0) * (+item.competitorPrice||0);
              return `<tr>
                <td>${Utils.escape(item.serviceName || item.description || '—')}</td>
                <td>${item.quantity}</td>
                <td><small class="text-muted">${Utils.escape(item.unit||'')}</small></td>
                <td class="text-end">${Utils.money(item.unitPrice)}</td>
                <td class="text-end fw-semibold">${Utils.money(ot)}</td>
                <td class="text-end text-muted">${Utils.money(item.competitorPrice)}</td>
                <td class="text-end text-muted"><s>${Utils.money(ct)}</s></td>
                <td class="text-end text-savings">${Utils.money(ct - ot)}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot class="table-light fw-bold">
            <tr>
              <td colspan="4" class="text-end">Totals</td>
              <td class="text-end">${Utils.money(our)}</td>
              <td></td>
              <td class="text-end"><s>${Utils.money(comp)}</s></td>
              <td class="text-end text-success">${Utils.money(savings)}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;

    document.getElementById('qv-edit-btn').onclick = () => {
      bootstrap.Modal.getInstance(document.getElementById('quoteViewModal')).hide();
      App.go('quote-builder', { quoteId: id });
    };
    document.getElementById('qv-pdf-btn').onclick = () => PDFGen.downloadQuote(q);

    new bootstrap.Modal(document.getElementById('quoteViewModal')).show();
  },

  deleteQuote(id) {
    const q = DB.getQuote(id);
    if (!q) return;
    if (!Utils.confirm(`Delete quote ${q.quoteNumber}?`)) return;
    DB.deleteQuote(id);
    this.render();
    Utils.toast('Quote deleted.', 'info');
  },
};

// ── Quote Builder ─────────────────────────────────────────
const QuoteBuilder = {
  _editId: null,
  _items:  [],

  init(opts = {}) {
    this._editId = opts.quoteId || null;
    this._items  = [];

    const q = this._editId ? DB.getQuote(this._editId) : null;

    // Quote number
    document.getElementById('qb-num').value    = q?.quoteNumber || DB.nextQuoteNumber();
    document.getElementById('qb-status').value = q?.status      || 'draft';
    document.getElementById('qb-notes').value  = q?.notes       || '';

    document.getElementById('qb-title').innerHTML =
      (q ? '<i class="bi bi-pencil me-2"></i>Edit Quote' : '<i class="bi bi-file-earmark-plus me-2"></i>New Quote') +
      ` <small class="text-muted ms-2 fs-6">${document.getElementById('qb-num').value}</small>`;

    // Populate customer dropdown (filtered by type later)
    this._populateCustomerDropdown(q?.customerType || '');

    // Set customer type radio
    if (q?.customerType) {
      const el = document.getElementById('qb-' + q.customerType);
      if (el) el.checked = true;
    }

    // Customer fields
    document.getElementById('qb-cust-name').value  = q?.customerName  || '';
    document.getElementById('qb-cust-org').value   = q?.customerOrg   || '';
    document.getElementById('qb-cust-email').value = q?.customerEmail || '';
    document.getElementById('qb-cust-phone').value = q?.customerPhone || '';

    // If customerId passed (from customer page)
    if (opts.customerId) {
      const c = DB.getCustomers().find(x => x.id === opts.customerId);
      if (c) {
        document.getElementById('qb-cust-select').value = c.id;
        this._fillCustomerFields(c);
        const el = document.getElementById('qb-' + c.type);
        if (el) { el.checked = true; this._populateCustomerDropdown(c.type); }
      }
    }

    // Items
    if (q?.items) {
      this._items = q.items.map(i => ({ ...i, _id: Utils.uuid() }));
    }
    this._renderItems();
    this._updateTotals();
  },

  _populateCustomerDropdown(typeFilter) {
    const sel = document.getElementById('qb-cust-select');
    let customers = DB.getCustomers().sort((a, b) => a.name.localeCompare(b.name));
    if (typeFilter) customers = customers.filter(c => c.type === typeFilter);
    sel.innerHTML = '<option value="">— or enter manually below —</option>' +
      customers.map(c => `<option value="${c.id}">${Utils.escape(c.name)}${c.organization ? ' — ' + Utils.escape(c.organization) : ''}</option>`).join('');
  },

  onTypeChange() {
    const el = document.querySelector('input[name="qb-ctype"]:checked');
    if (!el) return;
    this._populateCustomerDropdown(el.value);
    this._renderItems(); // Reprice existing items
    this._updateTotals();
  },

  onCustomerSelect() {
    const sel = document.getElementById('qb-cust-select');
    const id  = sel.value;
    if (!id) return;
    const c = DB.getCustomers().find(x => x.id === id);
    if (c) this._fillCustomerFields(c);
  },

  _fillCustomerFields(c) {
    document.getElementById('qb-cust-name').value  = c.name;
    document.getElementById('qb-cust-org').value   = c.organization || '';
    document.getElementById('qb-cust-email').value = c.email || '';
    document.getElementById('qb-cust-phone').value = c.phone || '';
    // Also set type
    const el = document.getElementById('qb-' + c.type);
    if (el) { el.checked = true; this.onTypeChange(); }
  },

  _getType() {
    const el = document.querySelector('input[name="qb-ctype"]:checked');
    return el ? el.value : '';
  },

  addItem() {
    this._items.push({
      _id:             Utils.uuid(),
      serviceId:       '',
      serviceName:     '',
      unit:            '',
      quantity:        1,
      unitPrice:       0,
      competitorPrice: 0,
      competitorName:  DB.competitorName(),
    });
    this._renderItems();
    this._updateTotals();
  },

  removeItem(localId) {
    this._items = this._items.filter(i => i._id !== localId);
    this._renderItems();
    this._updateTotals();
  },

  _renderItems() {
    const tbody   = document.getElementById('qb-items-tbody');
    const type    = this._getType();
    const services= DB.getServices().filter(s => s.active).sort((a, b) => a.name.localeCompare(b.name));

    if (!this._items.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-3">
        No items yet. <button class="btn btn-sm btn-outline-primary ms-2" onclick="QuoteBuilder.addItem()">Add Service</button>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = this._items.map(item => {
      const svcOptions = services.map(s =>
        `<option value="${s.id}" ${s.id === item.serviceId ? 'selected' : ''}>${Utils.escape(s.name)}</option>`
      ).join('');
      return `<tr data-lid="${item._id}">
        <td>
          <select class="form-select form-select-sm" onchange="QuoteBuilder.onServiceChange('${item._id}', this.value)">
            <option value="">— select —</option>
            ${svcOptions}
          </select>
          <input type="text" class="form-control form-control-sm mt-1 d-none" id="item-custom-${item._id}"
            placeholder="Custom description" value="${Utils.escape(item.serviceName||'')}"
            oninput="QuoteBuilder.onCustomName('${item._id}', this.value)">
        </td>
        <td><input type="number" class="form-control form-control-sm" min="0.01" step="any"
          value="${item.quantity}" onchange="QuoteBuilder.onQtyChange('${item._id}', this.value)"></td>
        <td><small class="text-muted" id="item-unit-${item._id}">${Utils.escape(item.unit||'')}</small></td>
        <td><div class="input-group input-group-sm">
          <span class="input-group-text p-1">$</span>
          <input type="number" class="form-control" min="0" step="0.01" id="item-price-${item._id}"
            value="${item.unitPrice}" onchange="QuoteBuilder.onPriceChange('${item._id}','unit',this.value)">
        </div></td>
        <td><div class="input-group input-group-sm">
          <span class="input-group-text p-1">$</span>
          <input type="number" class="form-control" min="0" step="0.01" id="item-comp-${item._id}"
            value="${item.competitorPrice}" onchange="QuoteBuilder.onPriceChange('${item._id}','comp',this.value)">
        </div></td>
        <td class="text-end fw-semibold" id="item-our-total-${item._id}">${Utils.money((+item.quantity||0)*(+item.unitPrice||0))}</td>
        <td class="text-end text-muted" id="item-comp-total-${item._id}"><s>${Utils.money((+item.quantity||0)*(+item.competitorPrice||0))}</s></td>
        <td><button class="action-btn text-danger" onclick="QuoteBuilder.removeItem('${item._id}')">
          <i class="bi bi-x-lg"></i></button></td>
      </tr>`;
    }).join('');

    // Show custom service text field if no service selected
    this._items.forEach(item => {
      const row = tbody.querySelector(`tr[data-lid="${item._id}"]`);
      if (!row) return;
      const customInput = document.getElementById(`item-custom-${item._id}`);
      if (customInput) customInput.classList.toggle('d-none', !!item.serviceId);
    });
  },

  onServiceChange(localId, serviceId) {
    const item = this._items.find(i => i._id === localId);
    if (!item) return;
    const type = this._getType();

    if (!serviceId) {
      item.serviceId = '';
      // Show custom input
      const customInput = document.getElementById(`item-custom-${localId}`);
      if (customInput) customInput.classList.remove('d-none');
      return;
    }

    const svc = DB.getServices().find(s => s.id === serviceId);
    if (!svc) return;

    item.serviceId       = svc.id;
    item.serviceName     = svc.name;
    item.unit            = svc.unit;
    item.competitorPrice = svc.competitorPrice;
    item.competitorName  = svc.competitorName || DB.competitorName();

    if (type === 'internal')  item.unitPrice = svc.internalPrice;
    else if (type === 'community') item.unitPrice = svc.communityPrice;
    else if (type === 'external')  item.unitPrice = svc.externalPrice;
    else item.unitPrice = svc.externalPrice;

    // Update fields
    const unitEl  = document.getElementById(`item-unit-${localId}`);
    const priceEl = document.getElementById(`item-price-${localId}`);
    const compEl  = document.getElementById(`item-comp-${localId}`);
    const customInput = document.getElementById(`item-custom-${localId}`);

    if (unitEl)  unitEl.textContent   = svc.unit;
    if (priceEl) priceEl.value        = item.unitPrice;
    if (compEl)  compEl.value         = item.competitorPrice;
    if (customInput) customInput.classList.add('d-none');

    this._recalcRow(localId);
    this._updateTotals();
  },

  onCustomName(localId, val) {
    const item = this._items.find(i => i._id === localId);
    if (item) item.serviceName = val;
  },

  onQtyChange(localId, val) {
    const item = this._items.find(i => i._id === localId);
    if (item) { item.quantity = +val || 0; this._recalcRow(localId); this._updateTotals(); }
  },

  onPriceChange(localId, field, val) {
    const item = this._items.find(i => i._id === localId);
    if (!item) return;
    if (field === 'unit') item.unitPrice       = +val || 0;
    if (field === 'comp') item.competitorPrice = +val || 0;
    this._recalcRow(localId);
    this._updateTotals();
  },

  _recalcRow(localId) {
    const item = this._items.find(i => i._id === localId);
    if (!item) return;
    const ot = (+item.quantity||0) * (+item.unitPrice||0);
    const ct = (+item.quantity||0) * (+item.competitorPrice||0);
    const otEl = document.getElementById(`item-our-total-${localId}`);
    const ctEl = document.getElementById(`item-comp-total-${localId}`);
    if (otEl) otEl.textContent = Utils.money(ot);
    if (ctEl) ctEl.innerHTML   = `<s>${Utils.money(ct)}</s>`;
  },

  _updateTotals() {
    const our  = this._items.reduce((s, i) => s + (+i.quantity||0) * (+i.unitPrice||0), 0);
    const comp = this._items.reduce((s, i) => s + (+i.quantity||0) * (+i.competitorPrice||0), 0);
    const sav  = comp - our;
    const compName = (this._items.find(i => i.competitorName)?.competitorName) || DB.competitorName();

    document.getElementById('qb-our-total').textContent    = Utils.money(our);
    document.getElementById('qb-comp-total').textContent   = Utils.money(comp);
    document.getElementById('qb-savings').textContent      = Utils.money(sav > 0 ? sav : 0);
    const cl = document.getElementById('qb-competitor-label');
    if (cl) cl.textContent = compName + ' Subtotal';
  },

  _buildQuoteObj() {
    const custName  = document.getElementById('qb-cust-name').value.trim();
    const type      = this._getType();
    if (!custName)  { Utils.toast('Customer name is required', 'error'); return null; }
    if (!type)      { Utils.toast('Select a customer type', 'error'); return null; }
    if (!this._items.length) { Utils.toast('Add at least one line item', 'error'); return null; }

    const validItems = this._items.filter(i => (i.serviceId || i.serviceName) && +i.quantity > 0);
    if (!validItems.length) { Utils.toast('Add at least one valid line item with a service and quantity', 'error'); return null; }

    const now = new Date().toISOString();
    const status = document.getElementById('qb-status').value;

    return {
      id:            this._editId || Utils.uuid(),
      quoteNumber:   document.getElementById('qb-num').value,
      customerName:  custName,
      customerOrg:   document.getElementById('qb-cust-org').value.trim(),
      customerEmail: document.getElementById('qb-cust-email').value.trim(),
      customerPhone: document.getElementById('qb-cust-phone').value.trim(),
      customerType:  type,
      status,
      notes:         document.getElementById('qb-notes').value.trim(),
      items:         validItems,
      createdAt:     this._editId ? (DB.getQuote(this._editId)?.createdAt || now) : now,
      completedAt:   status === 'completed' ? now : (DB.getQuote(this._editId)?.completedAt || null),
    };
  },

  saveQuote() {
    const q = this._buildQuoteObj();
    if (!q) return;
    DB.saveQuote(q);
    Utils.toast(`Quote ${q.quoteNumber} saved!`);
    App.go('quotes');
  },

  downloadPDF() {
    const q = this._buildQuoteObj();
    if (!q) return;
    DB.saveQuote(q);
    PDFGen.downloadQuote(q);
  },

  previewPDF() {
    this.downloadPDF(); // same as download — opens download dialog
  },
};
