export interface Article {
  title: string;
  url: string;
  siteName: string;
  byline: string;
  lang: string;
  text: string;
  wordCount: number;
  truncated: boolean;
}

export const MAX_ARTICLE_CHARS = 100_000;
