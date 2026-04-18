/**
 * Supabase query helpers.
 *
 * Supabase REST URLs are bounded (roughly 8 KB). A single `.in('col', values)`
 * with more than ~180 Solana addresses (44 chars each) silently fails at the
 * edge — no rows returned, no error surfaced. `chunkedIn` splits the list,
 * issues one query per chunk, and concatenates the rows.
 */

export async function chunkedIn<T>(
  queryBuilder: () => any,
  column: string,
  values: string[],
  chunkSize: number = 80,
): Promise<T[]> {
  if (values.length === 0) return [];
  const results: T[] = [];
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    const { data } = await queryBuilder().in(column, chunk);
    if (data) results.push(...(data as T[]));
  }
  return results;
}
