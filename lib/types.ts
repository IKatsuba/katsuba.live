// rssify API types

export type RssifyEntry = {
  id: string;
  feedId: string;
  title: string;
  url: string | null;
  author: string | null;
  summary: string | null;
  publishedAt: string | null;
  sortAt: string;
  feedTitle: string | null;
  read: boolean;
  // Only GET /api/v1/entries/:id returns it
  contentHtml?: string | null;
};

export type RssifyEntriesResponse = {
  entries: RssifyEntry[];
  nextCursor: string | null;
  asOf: string;
};

export type ProcessableEntry = {
  id: string;
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
