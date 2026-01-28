export type WebhookFeed = {
  id: number;
  feed_url: string;
  site_url: string;
  title: string;
  description: string;
};

export type WebhookEntry = {
  id: number;
  feed_id: number;
  title: string;
  url: string;
  content: string;
  author: string;
  published_at: string;
  created_at: string;
};

export type NewEntriesPayload = {
  event_type: 'new_entries';
  feed: WebhookFeed;
  entries: WebhookEntry[];
};

export type ProcessableEntry = {
  id: number;
  title: string;
  content: string;
  url: string;
  published_at: string;
  feed: {
    title: string;
  };
};
