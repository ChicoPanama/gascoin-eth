import { http, HttpResponse } from 'msw';

export const xApiHandlers = [
  http.get('https://api.twitter.com/2/tweets/:id', ({ params }) => {
    if (params.id === '000000000000000000') {
      return HttpResponse.json({ errors: [{ title: 'Not Found', detail: 'Tweet not found', status: 404 }] }, { status: 404 });
    }
    return HttpResponse.json({
      data: {
        id: params.id,
        text: 'Just filled up #gascoin submitting now!',
        author_id: '987654321',
        created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        entities: { hashtags: [{ tag: 'gascoin' }] },
      },
    });
  }),

  http.get('https://api.twitter.com/2/users/:id', ({ params }) => {
    if (params.id === '111111111') {
      return HttpResponse.json({ data: { id: '111111111', username: 'privateuser', name: 'Private', protected: true } });
    }
    return HttpResponse.json({ data: { id: params.id as string, username: 'validuser', name: 'Valid', protected: false } });
  }),
];

export const solanaHandlers = [
  http.post('http://localhost:8899', async ({ request }) => {
    const body = await request.json() as { method: string };
    if (body.method === 'getBalance') {
      return HttpResponse.json({ jsonrpc: '2.0', result: { context: { slot: 1 }, value: 5_000_000_000 }, id: 1 });
    }
    if (body.method === 'getParsedTokenAccountsByOwner') {
      return HttpResponse.json({
        jsonrpc: '2.0', id: 1,
        result: { context: { slot: 1 }, value: [{ account: { data: { parsed: { info: { tokenAmount: { amount: '500000000000', uiAmount: 500000, decimals: 6 } } } } } }] },
      });
    }
    return HttpResponse.json({ jsonrpc: '2.0', result: null, id: 1 });
  }),
];

export const handlers = [...xApiHandlers, ...solanaHandlers];
