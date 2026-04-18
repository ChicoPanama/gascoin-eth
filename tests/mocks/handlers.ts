import { http, HttpResponse } from 'msw';

export const xApiHandlers = [
  http.get('https://api.x.com/2/tweets/:id', ({ params }) => {
    if (params.id === '000000000000000000') return HttpResponse.json({ errors: [{ title: 'Not Found' }] }, { status: 404 });
    if (params.id === '999999999999999999') return new HttpResponse(null, { status: 429 });
    return HttpResponse.json({
      data: {
        id: params.id, text: 'Just filled up #gascoin!', author_id: '987654321',
        created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        entities: { hashtags: [{ tag: 'gascoin' }] },
      },
      includes: { users: [{ id: '987654321', username: 'validuser', protected: false, public_metrics: { followers_count: 500 } }] },
    });
  }),
  http.get('https://api.x.com/2/users/by/username/:username', ({ params }) => {
    const followers = params.username === 'lowfollowers' ? 10 : 500;
    const isProtected = params.username === 'privateuser';
    return HttpResponse.json({ data: { id: '987654321', username: params.username as string, protected: isProtected, public_metrics: { followers_count: followers } } });
  }),
  http.get('https://api.x.com/2/users/:id', ({ params }) => {
    if (params.id === '111111111') return HttpResponse.json({ data: { id: '111111111', username: 'privateuser', protected: true } });
    return HttpResponse.json({ data: { id: params.id as string, username: 'validuser', protected: false } });
  }),
  http.get('https://publish.twitter.com/oembed', () => {
    return HttpResponse.json({ html: '<blockquote>#gascoin <a href="https://twitter.com/validuser">@validuser</a></blockquote>' });
  }),
];

export const ethereumHandlers = [
  http.post('https://eth-mainnet.g.alchemy.com/v2/:apiKey', async ({ request }) => {
    const body = await request.json() as { method: string };
    if (body.method === 'eth_getBalance') return HttpResponse.json({ jsonrpc: '2.0', result: '0x4563918244F40000', id: 1 });
    if (body.method === 'eth_call') return HttpResponse.json({ jsonrpc: '2.0', id: 1, result: '0x000000000000000000000000000000000000000000006765c793fa10079d000000' });
    if (body.method === 'eth_blockNumber') return HttpResponse.json({ jsonrpc: '2.0', result: '0x1388', id: 1 });
    return HttpResponse.json({ jsonrpc: '2.0', result: null, id: 1 });
  }),
];

export const openRouterHandlers = [
  http.post('https://openrouter.ai/api/v1/chat/completions', async () => {
    return HttpResponse.json({
      choices: [{ message: { content: JSON.stringify({ station_country: 'US', receipt_date: '2026-04-01', total_amount: 52.40, currency: 'USD', wallet_address: null, has_handwriting: true, has_gascoin_hashtag: false, is_physical_receipt: true, is_gas_station: true, is_digitally_manipulated: false, confidence: 0.87, fraud_notes: '', raw_text: 'Total $52.40' }) } }],
      model: 'google/gemini-2.0-flash-001', usage: { prompt_tokens: 800, completion_tokens: 200 },
    });
  }),
];

export const handlers = [...xApiHandlers, ...ethereumHandlers, ...openRouterHandlers];
