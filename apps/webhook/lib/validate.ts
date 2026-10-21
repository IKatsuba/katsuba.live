import { splitMessage, toTelegramMarkdownV2 } from 'md-to-telegram';

export type ValidationResult = {
  ok: boolean;
  problems: string[];
};

export function validatePost(markdown: string, url: string): ValidationResult {
  const problems: string[] = [];
  const lines = markdown.trim().split('\n');
  const title = lines[0] ?? '';

  if (
    !/^(\*\*|#{1,3} )/.test(title) || !/\p{Extended_Pictographic}/u.test(title)
  ) {
    problems.push(
      'The first line must be a title with an emoji, in bold or as a heading.',
    );
  }

  if (markdown.includes('```')) {
    problems.push('Code blocks are not allowed.');
  }

  if (lines.some((line) => /^\s*([-*+]|\d+[.)])\s/.test(line))) {
    problems.push('Lists are not allowed.');
  }

  if (lines.some((line) => /^\s*\|.*\|\s*$/.test(line))) {
    problems.push('Tables are not allowed.');
  }

  if (!markdown.includes(`](${url})`)) {
    problems.push(`The post must contain a markdown link to ${url}.`);
  }

  if (!/(^|\s)#[\p{L}\p{N}_]+/u.test(lines.at(-1) ?? '')) {
    problems.push('The post must end with a line of hashtags.');
  }

  const { text } = toTelegramMarkdownV2(markdown);
  const parts = splitMessage(text, { format: 'markdownv2' });
  if (parts.length > 1) {
    problems.push(
      `The post is too long for one Telegram message (${parts.length} parts); shorten it.`,
    );
  }

  return { ok: problems.length === 0, problems };
}
