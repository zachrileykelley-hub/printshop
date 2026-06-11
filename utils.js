// ── Utilities ────────────────────────────────────────────
const Utils = {
  uuid() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
  },

  money(n) {
    return '$' + (+n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  pct(n) {
    return (+n || 0).toFixed(1) + '%';
  },

  formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  formatDateShort(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
  },

  todayISO() {
    return new Date().toISOString().slice(0, 10);
  },

  monthLabel(iso) {          // "2025-04" → "Apr 2025"
    if (!iso) return '';
    const [y, m] = iso.split('-');
    return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  },

  escape(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  typeBadge(type) {
    const map = {
      internal:  ['badge-internal',  DB.label('internal')],
      community: ['badge-community', DB.label('community')],
      external:  ['badge-external',  DB.label('external')],
    };
    const [cls, lbl] = map[type] || ['bg-secondary text-white', type || '?'];
    return `<span class="${cls}">${Utils.escape(lbl)}</span>`;
  },

  statusBadge(status) {
    return `<span class="badge-status status-${status}">${Utils.escape(status)}</span>`;
  },

  toast(msg, type = 'success') {
    const el = document.getElementById('app-toast');
    const msgEl = document.getElementById('toast-msg');
    el.className = 'toast align-items-center border-0 toast-' + type;
    msgEl.textContent = msg;
    bootstrap.Toast.getOrCreateInstance(el, { delay: 3000 }).show();
  },

  confirm(msg) {
    return window.confirm(msg);
  },

  // Get date range for a report period selection
  periodRange(period, from, to) {
    const now = new Date();
    let start, end;
    switch (period) {
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'last-month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'quarter': {
        const q = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), q * 3, 1);
        end   = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59);
        break;
      }
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case 'custom':
        start = from ? new Date(from + 'T00:00:00') : new Date(0);
        end   = to   ? new Date(to   + 'T23:59:59') : new Date(8640000000000000);
        break;
      default:
        start = new Date(0);
        end   = new Date(8640000000000000);
    }
    return { start, end };
  },

  periodLabel(period, from, to) {
    switch (period) {
      case 'month':      return Utils.monthLabel(new Date().toISOString().slice(0, 7));
      case 'last-month': {
        const d = new Date(); d.setMonth(d.getMonth() - 1);
        return Utils.monthLabel(d.toISOString().slice(0, 7));
      }
      case 'quarter': {
        const q = Math.floor(new Date().getMonth() / 3) + 1;
        return `Q${q} ${new Date().getFullYear()}`;
      }
      case 'year':   return String(new Date().getFullYear());
      case 'custom': return `${from || '?'} to ${to || '?'}`;
      default:       return 'All Time';
    }
  }
};
