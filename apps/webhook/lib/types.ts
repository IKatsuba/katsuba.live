// Miniflux API types

export type MinifluxFeed = {
  id: number;
  user_id: number;
  feed_url: string;
  site_url: string;
  title: string;
  checked_at: string;
  next_check_at: string;
  etag_header: string;
  last_modified_header: string;
  parsing_error_count: number;
  parsing_error_message: string;
  scraper_rules: string;
  rewrite_rules: string;
  crawler: boolean;
  blocklist_rules: string;
  keeplist_rules: string;
  urlrewrite_rules: string;
  user_agent: string;
  cookie: string;
  username: string;
  password: string;
  disabled: boolean;
  no_media_player: boolean;
  ignore_http_cache: boolean;
  allow_self_signed_certificates: boolean;
  fetch_via_proxy: boolean;
  hide_globally: boolean;
  category: {
    id: number;
    title: string;
  };
  icon: {
    feed_id: number;
    icon_id: number;
  } | null;
};

export type MinifluxEntry = {
  id: number;
  user_id: number;
  feed_id: number;
  status: 'unread' | 'read' | 'removed';
  hash: string;
  title: string;
  url: string;
  comments_url: string;
  published_at: string;
  created_at: string;
  changed_at: string;
  content: string;
  author: string;
  share_code: string;
  starred: boolean;
  reading_time: number;
  enclosures: unknown[];
  feed: MinifluxFeed;
  tags: string[];
};

export type MinifluxEntriesResponse = {
  total: number;
  entries: MinifluxEntry[];
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

export type EvaluationResult = {
  score: number;
  reason: string;
  shouldPublish: boolean;
};
