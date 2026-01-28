export const KUTT_BASE_URL = Deno.env.get('KUTT_BASE_URL');
export const KUTT_KEY = Deno.env.get('KUTT_KEY');
export const KUTT_API = Deno.env.get('KUTT_API');

export async function createShortLink(link: string): Promise<string> {
  const response = await fetch(`${KUTT_BASE_URL}${KUTT_API}/links`, {
    method: 'POST',
    body: JSON.stringify({ target: link }),
    headers: {
      'X-API-KEY': KUTT_KEY!,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  return data.link;
}
