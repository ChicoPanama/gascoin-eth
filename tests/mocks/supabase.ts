// In-memory Supabase mock with chained query building
// Supports: from/select/insert/update/upsert/delete/eq/or/ilike/in/gt/gte/order/limit/single/maybeSingle
// select() does NOT override operation when chained after insert/upsert
// single/maybeSingle return copies so mutations don't affect store

type Row = Record<string, any>;

class MockStore {
  private tables: Map<string, Row[]> = new Map();
  private buckets: Map<string, Map<string, Buffer>> = new Map();

  getTable(name: string): Row[] {
    if (!this.tables.has(name)) this.tables.set(name, []);
    return this.tables.get(name)!;
  }

  seed(table: string, rows: Row[]) {
    this.tables.set(table, [...rows]);
  }

  clear() {
    this.tables.clear();
    this.buckets.clear();
  }

  clearTable(table: string) {
    this.tables.set(table, []);
  }

  getBucket(name: string): Map<string, Buffer> {
    if (!this.buckets.has(name)) this.buckets.set(name, new Map());
    return this.buckets.get(name)!;
  }
}

class QueryBuilder {
  private store: MockStore;
  private tableName: string;
  private operation: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private filters: Array<(row: Row) => boolean> = [];
  private orderBy: { col: string; asc: boolean } | null = null;
  private limitCount: number | null = null;
  private selectFields: string | null = null;
  private insertData: Row | Row[] | null = null;
  private updateData: Row | null = null;
  private upsertConflict: string | null = null;
  private countMode: boolean = false;
  private headMode: boolean = false;
  private rangeFrom: number = 0;
  private rangeTo: number | null = null;

  constructor(store: MockStore, table: string) {
    this.store = store;
    this.tableName = table;
  }

  select(fields?: string, opts?: { count?: string; head?: boolean }) {
    // Only set operation to select if no prior operation was set
    if (this.operation === 'select' && !this.insertData && !this.updateData) {
      this.selectFields = fields || '*';
    }
    if (opts?.count) this.countMode = true;
    if (opts?.head) this.headMode = true;
    return this;
  }

  insert(data: Row | Row[]) {
    this.operation = 'insert';
    this.insertData = data;
    return this;
  }

  update(data: Row) {
    this.operation = 'update';
    this.updateData = data;
    return this;
  }

  upsert(data: Row | Row[], opts?: { onConflict?: string }) {
    this.operation = 'upsert';
    this.insertData = data;
    this.upsertConflict = opts?.onConflict || 'id';
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(col: string, val: any) { this.filters.push((r) => r[col] === val); return this; }
  neq(col: string, val: any) { this.filters.push((r) => r[col] !== val); return this; }
  gt(col: string, val: any) { this.filters.push((r) => r[col] > val); return this; }
  gte(col: string, val: any) { this.filters.push((r) => r[col] >= val); return this; }
  lt(col: string, val: any) { this.filters.push((r) => r[col] < val); return this; }
  in(col: string, vals: any[]) { this.filters.push((r) => vals.includes(r[col])); return this; }
  ilike(col: string, pattern: string) {
    const re = new RegExp(pattern.replace(/%/g, '.*'), 'i');
    this.filters.push((r) => re.test(String(r[col] || '')));
    return this;
  }
  or(expr: string) {
    // Simple OR parser: "col1.eq.val1,col2.eq.val2"
    const parts = expr.split(',').map((p) => {
      const [colOp, val] = [p.substring(0, p.lastIndexOf('.')), p.substring(p.lastIndexOf('.') + 1)];
      const [col, op] = [colOp.substring(0, colOp.lastIndexOf('.')), colOp.substring(colOp.lastIndexOf('.') + 1)];
      return { col, op, val };
    });
    this.filters.push((r) => parts.some((p) => {
      if (p.op === 'eq') return String(r[p.col]) === p.val;
      return false;
    }));
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, asc: opts?.ascending ?? true };
    return this;
  }

  limit(n: number) { this.limitCount = n; return this; }

  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  single(): Promise<{ data: Row | null; error: any }> {
    return this.execute().then((res) => {
      const row = Array.isArray(res.data) ? res.data[0] || null : res.data;
      return { data: row ? JSON.parse(JSON.stringify(row)) : null, error: res.error };
    });
  }

  maybeSingle(): Promise<{ data: Row | null; error: any }> {
    return this.single();
  }

  then(resolve: (val: any) => void, reject?: (err: any) => void) {
    return this.execute().then(resolve, reject);
  }

  private async execute(): Promise<{ data: any; error: any; count?: number }> {
    const table = this.store.getTable(this.tableName);

    switch (this.operation) {
      case 'insert': {
        const rows = Array.isArray(this.insertData) ? this.insertData : [this.insertData!];
        const inserted = rows.map((r) => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...r }));
        table.push(...inserted);
        if (this.selectFields) {
          return { data: inserted.map((r) => JSON.parse(JSON.stringify(r))), error: null };
        }
        return { data: inserted.length === 1 ? JSON.parse(JSON.stringify(inserted[0])) : inserted.map((r) => JSON.parse(JSON.stringify(r))), error: null };
      }

      case 'update': {
        let updated: Row[] = [];
        for (const row of table) {
          if (this.filters.every((f) => f(row))) {
            Object.assign(row, this.updateData);
            updated.push(row);
          }
        }
        return { data: updated.map((r) => JSON.parse(JSON.stringify(r))), error: null };
      }

      case 'upsert': {
        const rows = Array.isArray(this.insertData) ? this.insertData : [this.insertData!];
        const conflictCol = this.upsertConflict || 'id';
        const results: Row[] = [];
        for (const r of rows) {
          const idx = table.findIndex((existing) => existing[conflictCol] === r[conflictCol]);
          if (idx >= 0) {
            Object.assign(table[idx], r);
            results.push(table[idx]);
          } else {
            const newRow = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...r };
            table.push(newRow);
            results.push(newRow);
          }
        }
        return { data: results.map((r) => JSON.parse(JSON.stringify(r))), error: null };
      }

      case 'delete': {
        const before = table.length;
        const remaining = table.filter((r) => !this.filters.every((f) => f(r)));
        this.store.seed(this.tableName, remaining);
        return { data: null, error: null, count: before - remaining.length };
      }

      case 'select': {
        let rows = table.filter((r) => this.filters.every((f) => f(r)));
        if (this.orderBy) {
          const { col, asc } = this.orderBy;
          rows.sort((a, b) => {
            const av = a[col], bv = b[col];
            return asc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
          });
        }
        if (this.rangeTo !== null) {
          rows = rows.slice(this.rangeFrom, this.rangeTo + 1);
        } else if (this.limitCount !== null) {
          rows = rows.slice(0, this.limitCount);
        }

        const copied = rows.map((r) => JSON.parse(JSON.stringify(r)));

        if (this.countMode && this.headMode) {
          return { data: null, error: null, count: copied.length };
        }
        if (this.countMode) {
          return { data: copied, error: null, count: copied.length };
        }
        return { data: copied, error: null };
      }
    }

    return { data: null, error: null };
  }
}

class StorageBuilder {
  private store: MockStore;
  private bucketName: string;

  constructor(store: MockStore, bucket: string) {
    this.store = store;
    this.bucketName = bucket;
  }

  async upload(path: string, data: Buffer | Uint8Array, opts?: any) {
    this.store.getBucket(this.bucketName).set(path, Buffer.from(data));
    return { data: { path }, error: null };
  }

  async createSignedUrl(path: string, expiresIn: number) {
    return { data: { signedUrl: `https://mock.supabase.co/storage/v1/${this.bucketName}/${path}?token=mock` }, error: null };
  }
}

export function createMockSupabase(store?: MockStore) {
  const s = store || new MockStore();

  return {
    store: s,
    from: (table: string) => new QueryBuilder(s, table),
    storage: {
      from: (bucket: string) => new StorageBuilder(s, bucket),
    },
    rpc: (fn: string, params?: any) => new QueryBuilder(s, `rpc_${fn}`),
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
      subscribe: () => ({}),
    }),
    removeChannel: () => {},
  };
}

export { MockStore };
