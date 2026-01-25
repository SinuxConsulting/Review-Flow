import { Business, Feedback, FeedbackActivity, FeedbackActivityType, FeedbackStatus, LinkEntry, LowRatingQuestion, ReviewEvent, ReviewEventType } from '../types';

const KEYS = {
  BUSINESSES: 'rf_businesses',
  FEEDBACK: 'rf_feedback',
  LINKS: 'rf_links',
  EVENTS: 'rf_events'
};

const DEFAULT_THEME = {
  accentColor: '#3b82f6',
  customerBackground: '#ffffff',
  dashboardBackground: '#f8fafc',
  cardBackground: '#ffffff'
};

const SEED_BUSINESSES: Business[] = [
  {
    id: 'b1',
    name: 'Sunrise Cafe',
    slug: 'sunrise-cafe',
    timezone: 'America/New_York',
    thresholdRating: 4,
    googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG839ndE',
    exitRedirectUrl: 'https://example.com',
    theme: { ...DEFAULT_THEME, accentColor: '#3b82f6' },
    lowRatingQuestions: [
      { id: 'q1', prompt: 'Did you dine in, take away or get delivery?', type: 'single', options: ['Dine in', 'Takeaway', 'Delivery'] },
      { id: 'q2', prompt: 'What did you get?', type: 'multiple', options: ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Coffee', 'Drinks'] }
    ],
    contactSettings: { notifyEmail: 'manager@sunrisecafe.com', enabled: true },
    createdAt: new Date().toISOString()
  },
  {
    id: 'b2',
    name: 'QuickFix Plumbing',
    slug: 'quickfix-plumbing',
    timezone: 'America/Los_Angeles',
    thresholdRating: 5,
    googleReviewUrl: 'https://g.page/r/example-plumbing/review',
    exitRedirectUrl: 'https://example.com',
    theme: { ...DEFAULT_THEME, accentColor: '#10b981' },
    lowRatingQuestions: [],
    contactSettings: { notifyEmail: 'admin@quickfix.io', enabled: true },
    createdAt: new Date().toISOString()
  }
];

const SEED_LINKS: Record<string, Omit<LinkEntry, 'id' | 'createdAt'>[]> = {
  b1: [
    { businessId: 'b1', label: 'Table 1', source: 'table_1' },
    { businessId: 'b1', label: 'Email Footer', source: 'email' }
  ],
  b2: [
    { businessId: 'b2', label: 'Front Desk', source: 'front_desk' }
  ]
};

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');


const readEvents = (): ReviewEvent[] => {
  const data = localStorage.getItem(KEYS.EVENTS);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeEvents = (events: ReviewEvent[]) => {
  localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
};

const addEvent = (event: Omit<ReviewEvent, 'id' | 'createdAt'>): ReviewEvent => {
  const all = readEvents();
  const newEvent: ReviewEvent = {
    ...event,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  all.push(newEvent);
  writeEvents(all);
  return newEvent;
};

const normalizeBusiness = (b: any): Business => {
  const theme = {
    ...DEFAULT_THEME,
    ...(b.theme || {})
  };

  const lowRatingQuestions: LowRatingQuestion[] = Array.isArray(b.lowRatingQuestions) ? b.lowRatingQuestions : [];

  return {
    ...b,
    slug: toSlug(b.slug || b.name || ''),
    thresholdRating: Number.isFinite(b.thresholdRating) ? b.thresholdRating : 4,
    googleReviewUrl: b.googleReviewUrl || '',
    exitRedirectUrl: b.exitRedirectUrl || '',
    theme,
    lowRatingQuestions
  };
};

const normalizeFeedback = (f: any): Feedback => {
  return {
    id: f.id,
    rating: f.rating,
    comment: f.comment,
    email: f.email,
    name: f.name,
    status: (f.status as FeedbackStatus) ?? FeedbackStatus.NEW,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    isRead: Boolean(f.isRead),
    source: f.source,
    activity: Array.isArray(f.activity) ? f.activity : []
  };
};

const createActivity = (
  type: FeedbackActivityType,
  message: string,
  meta?: Record<string, any>
): FeedbackActivity => ({
  id: crypto.randomUUID(),
  type,
  message,
  createdAt: new Date().toISOString(),
  meta
});

const appendActivity = (fb: Feedback, entry: FeedbackActivity) => {
  fb.activity = Array.isArray(fb.activity) ? fb.activity : [];
  fb.activity.unshift(entry);
};

export const dataService = {
  // Businesses
  getBusinesses: (): Business[] => {
    const data = localStorage.getItem(KEYS.BUSINESSES);
    if (!data) {
      localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(SEED_BUSINESSES));
      return SEED_BUSINESSES;
    }
    try {
      const parsed = JSON.parse(data);
      const normalized = (Array.isArray(parsed) ? parsed : []).map(normalizeBusiness);
      // Keep storage forward-compatible by writing back the normalized shape
      localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(normalized));
      return normalized;
    } catch {
      localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(SEED_BUSINESSES));
      return SEED_BUSINESSES;
    }
  },

  getBusinessBySlug: (slug: string): Business | undefined => {
    const clean = toSlug(slug || '');
    return dataService.getBusinesses().find(b => b.slug === clean);
  },

  isSlugAvailable: (slug: string, excludeBusinessId?: string): boolean => {
    const clean = toSlug(slug || '');
    if (!clean) return false;
    return !dataService.getBusinesses().some(b => b.slug === clean && b.id !== excludeBusinessId);
  },

  saveBusiness: (business: Business) => {
    const all = dataService.getBusinesses();
    const index = all.findIndex(b => b.id === business.id);
    const normalized = normalizeBusiness(business);

    if (index > -1) {
      all[index] = normalized;
    } else {
      all.push(normalized);
    }
    localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(all));
  },

  // Feedback
  getFeedback: (businessId?: string): Feedback[] => {
    const data = localStorage.getItem(KEYS.FEEDBACK);
    const raw: any[] = data ? JSON.parse(data) : [];
    const all: Feedback[] = Array.isArray(raw) ? raw.map(normalizeFeedback) : [];
    // Write back normalized to keep localStorage forward-compatible
    localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(all));
    if (businessId) {
      return all.filter(f => f.businessId === businessId);
    }
    return all;
  },
  // Events (scans / redirects / internal)
  getEvents: (businessId?: string): ReviewEvent[] => {
    const all = readEvents();
    const filtered = businessId ? all.filter(e => e.businessId === businessId) : all;
    return filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  recordScan: (businessId: string, source?: string) => {
    addEvent({ businessId, type: 'scan', source });
  },

  recordRedirect: (businessId: string, rating: number, source?: string) => {
    addEvent({ businessId, type: 'redirect', source, rating });
  },


  addFeedback: (feedback: Omit<Feedback, 'id' | 'createdAt' | 'status'>) => {
    const all = dataService.getFeedback();
    const newFeedback: Feedback = {
      ...feedback,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: FeedbackStatus.NEW,
      isRead: false,
      activity: [
        createActivity('created', 'Feedback received', { rating: feedback.rating, source: feedback.source })
      ]
    };
    all.push(newFeedback);
    localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(all));

    // Record an internal feedback event for analytics (source attribution)
    addEvent({ businessId: newFeedback.businessId, type: 'internal', source: newFeedback.source, rating: newFeedback.rating });
    return newFeedback;
  },

  updateFeedbackStatus: (id: string, status: FeedbackStatus) => {
    const all = dataService.getFeedback();
    const index = all.findIndex(f => f.id === id);
    if (index === -1) return;

    const prev = all[index].status;
    all[index].status = status;
    all[index].updatedAt = new Date().toISOString();

    appendActivity(all[index], createActivity('status', `Status changed: ${prev} → ${status}`, { from: prev, to: status }));

    localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(all));
  },

  markFeedbackRead: (id: string, isRead: boolean) => {
    const all = dataService.getFeedback();
    const index = all.findIndex(f => f.id === id);
    if (index === -1) return;

    const prev = Boolean(all[index].isRead);
    all[index].isRead = isRead;
    all[index].updatedAt = new Date().toISOString();

    if (!prev && isRead) {
      appendActivity(all[index], createActivity('read', 'Marked as read'));
    }
    if (prev && !isRead) {
      appendActivity(all[index], createActivity('read', 'Marked as unread'));
    }

    localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(all));
  },

  /**
   * Records a reply to the customer. In Phase 4 this is client-side only.
   * When Supabase is connected, this should call a server/API route (e.g., Resend + audit logging).
   */
  sendFeedbackReply: async (id: string, to: string, message: string) => {
    const all = dataService.getFeedback();
    const index = all.findIndex(f => f.id === id);
    if (index === -1) return;

    appendActivity(all[index], createActivity('email', 'Reply sent to customer', { to, message }));
    all[index].updatedAt = new Date().toISOString();
    localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(all));

    // Mock async behavior
    await new Promise(resolve => setTimeout(resolve, 250));
  },

  markAllFeedbackRead: (businessId: string) => {
    const all = dataService.getFeedback();
    let changed = false;
    for (const f of all) {
      if (f.businessId === businessId && !f.isRead) {
        f.isRead = true;
        f.updatedAt = new Date().toISOString();
        changed = true;
      }
    }
    if (changed) localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(all));
  },

  bulkUpdateFeedbackStatus: (ids: string[], status: FeedbackStatus) => {
    const all = dataService.getFeedback();
    let changed = false;
    for (const id of ids) {
      const idx = all.findIndex(f => f.id === id);
      if (idx > -1) {
        // Preserve reversible previous status for flag only.
        const current = all[idx].status;
        if (status === FeedbackStatus.FLAGGED && current !== status) {
          all[idx].previousStatus = current;
        }
        all[idx].status = status;
        all[idx].isRead = true;
        all[idx].updatedAt = new Date().toISOString();
        changed = true;
      }
    }
    if (changed) localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(all));
  },

  /**
   * Permanent delete: removes the feedback record from storage.
   * NOTE: UI may hold an in-memory undo window before calling this.
   */
  deleteFeedback: (id: string) => {
    const all = dataService.getFeedback();
    const filtered = all.filter(f => f.id !== id);
    localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(filtered));
  },

  /**
   * Undo a reversible status (e.g., DELETED/FLAGGED) back to previous status.
   */
  undoFeedbackStatus: (id: string) => {
    const all = dataService.getFeedback();
    const index = all.findIndex(f => f.id === id);
    if (index > -1) {
      const prev = all[index].previousStatus || FeedbackStatus.NEW;
      const from = all[index].status;
      all[index].status = prev;
      appendActivity(all[index], createActivity('status', `Undo: ${from} → ${prev}`));
      all[index].updatedAt = new Date().toISOString();
      all[index].previousStatus = undefined;
      all[index].deletedAt = undefined;
      localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(all));
    }
  },

  /**
   * Toggle flag on/off. If already flagged, undo to previous status.
   */
  toggleFlagFeedback: (id: string) => {
    const all = dataService.getFeedback();
    const index = all.findIndex(f => f.id === id);
    if (index > -1) {
      if (all[index].status === FeedbackStatus.FLAGGED) {
        dataService.undoFeedbackStatus(id);
        return;
      }
      dataService.updateFeedbackStatus(id, FeedbackStatus.FLAGGED);
    }
  },

  bulkDeleteFeedback: (ids: string[]) => {
    const idSet = new Set(ids);
    const all = dataService.getFeedback();
    const filtered = all.filter(f => !idSet.has(f.id));
    localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(filtered));
  },

  // Links & QR
  getLinks: (businessId?: string): LinkEntry[] => {
    const data = localStorage.getItem(KEYS.LINKS);
    if (!data) {
      const seeded: LinkEntry[] = Object.values(SEED_LINKS).flat().map(l => ({
        ...l,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      }));
      localStorage.setItem(KEYS.LINKS, JSON.stringify(seeded));
      return businessId ? seeded.filter(l => l.businessId === businessId) : seeded;
    }
    const all: LinkEntry[] = JSON.parse(data);
    return businessId ? all.filter(l => l.businessId === businessId) : all;
  },

  addLink: (link: Omit<LinkEntry, 'id' | 'createdAt'>) => {
    const all = dataService.getLinks();
    const newLink: LinkEntry = {
      ...link,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    all.push(newLink);
    localStorage.setItem(KEYS.LINKS, JSON.stringify(all));
    return newLink;
  },

  updateLink: (id: string, updates: Partial<Pick<LinkEntry, 'label' | 'source'>>) => {
    const all = dataService.getLinks();
    const index = all.findIndex(l => l.id === id);
    if (index > -1) {
      all[index] = { ...all[index], ...updates };
      localStorage.setItem(KEYS.LINKS, JSON.stringify(all));
    }
  },

  deleteLink: (id: string) => {
    const all = dataService.getLinks();
    const filtered = all.filter(l => l.id !== id);
    localStorage.setItem(KEYS.LINKS, JSON.stringify(filtered));
  },

  // Utils
  toSlug
};
