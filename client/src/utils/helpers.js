// ─── Formatting ───────────────────────────────────────────────────────────────

export const formatPrice = (amount) =>
  `Rs ${Number(amount || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

export const formatDate = (date, opts = {}) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', ...opts }).format(new Date(date));

export const formatRelativeTime = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
};

// ─── Order status ─────────────────────────────────────────────────────────────

export const ORDER_STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'badge-yellow' },
  confirmed:  { label: 'Confirmed',  color: 'badge-blue'   },
  processing: { label: 'Processing', color: 'badge-blue'   },
  shipped:    { label: 'Shipped',    color: 'badge-purple' },
  delivered:  { label: 'Delivered',  color: 'badge-green'  },
  cancelled:  { label: 'Cancelled',  color: 'badge-red'    },
  refunded:   { label: 'Refunded',   color: 'badge-gray'   },
};

// ─── Vendor application ───────────────────────────────────────────────────────

export const VENDOR_STATUS_CONFIG = {
  pending:  { label: 'Under Review', color: 'badge-yellow' },
  approved: { label: 'Approved',     color: 'badge-green'  },
  rejected: { label: 'Rejected',     color: 'badge-red'    },
};

// ─── Misc ─────────────────────────────────────────────────────────────────────

export const truncate = (str, n = 100) =>
  str?.length > n ? `${str.slice(0, n)}…` : str;

export const slugToTitle = (slug) =>
  slug?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '';

export const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

export const getErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || 'Something went wrong';

export const PK_PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Gilgit-Baltistan',
  'Azad Kashmir',
  'Islamabad Capital Territory',
];

export const CATEGORIES = [
  'Electronics', 'Clothing', 'Home & Garden', 'Sports & Outdoors',
  'Health & Beauty', 'Toys & Games', 'Books', 'Automotive',
  'Food & Grocery', 'Jewelry', 'Art & Crafts', 'Pet Supplies',
  'Office Supplies', 'Other',
];
