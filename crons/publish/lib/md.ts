import { createShortLink, KUTT_KEY } from './kutt.ts';

export function findLinks(markdown: string): string[] {
  const linkRegex = /\[([^\]]+)\]\((https:\/\/[^\)]+)\)/g;
  const links = [];
  let match;
  while ((match = linkRegex.exec(markdown)) !== null) {
    links.push(match[2]);
  }
  return links;
}

export function generateNewLinks(oldLinks: string[]): Promise<string[]> {
  return Promise.all(
    oldLinks.map((link) => createShortLink(link)),
  );
}

export function replaceLinks(
  markdown: string,
  oldLinks: string[],
  newLinks: string[],
): string {
  let newMarkdown = markdown;

  oldLinks.forEach((link, index) => {
    const newLink = newLinks[index];
    const linkRegex = new RegExp(`\\[([^\\]]+)\\]\\(${link}\\)`, 'g');
    newMarkdown = newMarkdown.replace(linkRegex, `[$1](${newLink})`);
  });

  return newMarkdown;
}

export async function processMarkdown(markdown: string): Promise<string> {
  if (!KUTT_KEY) {
    return markdown;
  }

  const oldLinks = findLinks(markdown);
  const newLinks = await generateNewLinks(oldLinks);
  return replaceLinks(markdown, oldLinks, newLinks);
}
