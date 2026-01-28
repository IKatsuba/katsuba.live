import { findLinks, replaceLinks } from './md.ts';
import { expect } from 'jsr:@std/expect';

Deno.test('md', async (t) => {
  await t.step('findLinks should return all links in the markdown', () => {
    const markdown =
      '[example](http://example.com) [test](https://test.com) [some some](https://blog.stackblitz.com/posts/introducing-sqlite3-webcontainers-support/)';
    const links = findLinks(markdown);
    expect(links).toEqual([
      'https://test.com',
      'https://blog.stackblitz.com/posts/introducing-sqlite3-webcontainers-support/',
    ]);
  });

  await t.step(
    'findLinks should return an empty array if no links are found',
    () => {
      const markdown = 'No links here!';
      const links = findLinks(markdown);
      expect(links).toEqual([]);
    },
  );

  await t.step(
    'replaceLinks should replace old links with new links in the markdown',
    () => {
      const markdown =
        `🌟 В блоге StackBlitz появилась важная новость! Теперь в WebContainers поддерживается SQLite3! 🧪
Это означает, что разработчики могут начать использовать базы данных в своих проектах на StackBlitz. Это открывает новые возможности для создания более сложных и функциональных приложений прямо в браузере.
🔗 [Читать полную статью](https://blog.stackblitz.com/posts/introducing-sqlite3-webcontainers-support/)`;
      const oldLinks = findLinks(markdown);
      const newLinks = ['https://short.ly/1', 'https://short.ly/2'];
      const newMarkdown = replaceLinks(markdown, oldLinks, newLinks);
      expect(newMarkdown).toContain(
        '[Читать полную статью](https://short.ly/1)',
      );
    },
  );
});
