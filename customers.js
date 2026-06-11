// ── Customers Page ────────────────────────────────────────
const CustomersPage = {
  _modal: null,

  render() {
    const search = (document.getElementById('cust-search')?.value || '').toLowerCase();
    const typeF  = document.getElementById('cust-type-filter')?.value || '';

    let customers = DB.getCustomers()
      .sort((a, b) => a.name.localeCompare(b.name));

    if (search) customers = customers.filter(c =>
      c.name.toLowerCase().includes(search) ||
      (c.organization || '').toLowerCase().includes(search) ||
      (c.email || '').toLowerCase().includes(search));
    if (typeF) customers = customers.filter(c => c.type === typeF);

    const tbody = document.getElementById('customers-tbody');
    if (!customers.length) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="6">No customers found.</td></tr>`;
      return;
    }

    tbody.innerHTML = customers.map(c => `
      <tr>
        <td class="fw-semibold">${Utils.escape(c.name)}</td>
        <td>${Utils.escape(c.organization || '—')}</td>
        <td>${Utils.typeBadge(c.type)}</td>
        <td>${c.email ? `<a href="mailto:${Utils.escape(c.email)}">${Utils.escape(c.email)}</a>` : '—'}</td>
        <td>${Utils.escape(c.phone || '—')}</td>
        <td class="text-end">
          <button class="action-btn text-primary" title="New quote for this customer"
            onclick="CustomersPage.newQuote('${c.id}')"><i class="bi bi-file-earmark-plus"></i></button>
          <button class="action-btn text-secondary" title="Edit"
            onclick="CustomersPage.openModal('${c.id}')"><i class="bi bi-pencil"></i></button>
          <button class="action-btn text-danger" title="Delete"
            onclick="CustomersPage.deleteCustomer('${c.id}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');
  },

  openModal(id) {
    const c = id ? DB.getCustomers().find(x => x.id === id) : null;
    document.getElementById('cust-modal-title').textContent = c ? 'Edit Customer' : 'Add Customer';
    document.getElementById('cust-id').value        = c?.id || '';
    document.getElementById('cust-name-inp').value  = c?.name || '';
    document.getElementById('cust-org-inp').value   = c?.organization || '';
    document.getElementById('cust-email-inp').value = c?.email || '';
    document.getElementById('cust-phone-inp').value = c?.phone || '';

    // Set radio
    ['internal','community','external'].forEach(t => {
      const el = document.getElementById('cm-' + t);
      if (el) el.checked = (c?.type === t);
    });
    if (!c) {
      const el = document.getElementById('cm-internal');
      if (el) el.checked = true;
    }

    if (!this._modal) this._modal = new bootstrap.Modal(document.getElementById('customerModal'));
    this._modal.show();
  },

  saveCustomer() {
    const name = document.getElementById('cust-name-inp').value.trim();
    if (!name) { Utils.toast('Name is required', 'error'); return; }

    const typeEl = document.querySelector('input[name="cust-type"]:checked');
    if (!typeEl) { Utils.toast('Select a customer type', 'error'); return; }

    const id = document.getElementById('cust-id').value || Utils.uuid();
    DB.saveCustomer({
      id,
      name,
      organization: document.getElementById('cust-org-inp').value.trim(),
      email:        document.getElementById('cust-email-inp').value.trim(),
      phone:        document.getElementById('cust-phone-inp').value.trim(),
      type:         typeEl.value,
      createdAt:    DB.getCustomers().find(c => c.id === id)?.createdAt || new Date().toISOString(),
    });

    this._modal.hide();
    this.render();
    Utils.toast(`Customer "${name}" saved.`);
  },

  deleteCustomer(id) {
    const c = DB.getCustomers().find(x => x.id === id);
    if (!c) return;
    if (!Utils.confirm(`Delete "${c.name}"?`)) return;
    DB.deleteCustomer(id);
    this.render();
    Utils.toast('Customer deleted.', 'info');
  },

  newQuote(custId) {
    App.go('quote-builder', { customerId: custId });
  },
};
