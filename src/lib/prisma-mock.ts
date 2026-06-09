/**
 * In-memory mock Prisma client for local development without a database.
 * Loads seed data from data/db.json and provides a Prisma-compatible API.
 * Activated automatically when DATABASE_URL contains "placeholder" or "localhost" with no real Postgres.
 */
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const SEED_PASSWORD = "password123";

type Row = Record<string, unknown>;

interface DbData {
  users: Row[];
  coaches: Row[];
  batches: Row[];
  games: Row[];
  gamePlayers: Row[];
  waitlist: Row[];
  bookings: Row[];
  reviews: Row[];
  camps: Row[];
  campRegistrations: Row[];
  events: Row[];
  eventRegistrations: Row[];
  workshops: Row[];
  workshopRegistrations: Row[];
  payments: Row[];
}

// Model name → db.json key mapping
const MODEL_KEY_MAP: Record<string, keyof DbData> = {
  user: "users",
  coach: "coaches",
  batch: "batches",
  game: "games",
  gamePlayer: "gamePlayers",
  waitlistEntry: "waitlist",
  booking: "bookings",
  review: "reviews",
  camp: "camps",
  campRegistration: "campRegistrations",
  sportEvent: "events",
  eventRegistration: "eventRegistrations",
  workshop: "workshops",
  workshopRegistration: "workshopRegistrations",
  payment: "payments",
};

// Unique fields per model (used by findUnique)
const UNIQUE_FIELDS: Record<string, string[][]> = {
  user: [["id"], ["email"], ["username"], ["googleId"]],
  coach: [["id"], ["userId"]],
  batch: [["id"]],
  game: [["id"]],
  gamePlayer: [["id"], ["gameId", "userId"]],
  waitlistEntry: [["id"]],
  booking: [["id"]],
  review: [["id"], ["userId", "coachId"]],
  camp: [["id"]],
  campRegistration: [["id"]],
  sportEvent: [["id"]],
  eventRegistration: [["id"]],
  workshop: [["id"]],
  workshopRegistration: [["id"]],
  payment: [["id"]],
};

function loadDbData(): DbData {
  const dbPath = path.join(process.cwd(), "data", "db.json");
  const empty: DbData = {
    users: [], coaches: [], batches: [], games: [], gamePlayers: [],
    waitlist: [], bookings: [], reviews: [], camps: [], campRegistrations: [],
    events: [], eventRegistrations: [], workshops: [], workshopRegistrations: [],
    payments: [],
  };

  if (!fs.existsSync(dbPath)) {
    console.warn("[mock-prisma] data/db.json not found, using empty data.");
    return empty;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    
    // Helper to recursively convert ISO date strings to Date objects
    const hydrateDates = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(obj)) {
        return new Date(obj);
      }
      if (Array.isArray(obj)) return obj.map(hydrateDates);
      if (typeof obj === "object") {
        const newObj: any = {};
        for (const [k, v] of Object.entries(obj)) newObj[k] = hydrateDates(v);
        return newObj;
      }
      return obj;
    };

    const hydrated = hydrateDates(raw);

    // Flatten coach batches into separate batches array
    const batches: Row[] = [];
    for (const c of hydrated.coaches ?? []) {
      if (c.batches) {
        for (const b of c.batches) {
          batches.push({ ...b, coachId: c.id });
        }
      }
    }

    return {
      users: hydrated.users ?? [],
      coaches: (hydrated.coaches ?? []).map((c: Row) => { const { batches: _, ...rest } = c; return rest; }),
      batches,
      games: hydrated.games ?? [],
      gamePlayers: hydrated.gamePlayers ?? [],
      waitlist: hydrated.waitlist ?? [],
      bookings: hydrated.bookings ?? [],
      reviews: hydrated.reviews ?? [],
      camps: hydrated.camps ?? [],
      campRegistrations: hydrated.campRegistrations ?? [],
      events: hydrated.events ?? [],
      eventRegistrations: hydrated.eventRegistrations ?? [],
      workshops: hydrated.workshops ?? [],
      workshopRegistrations: hydrated.workshopRegistrations ?? [],
      payments: hydrated.payments ?? [],
    };
  } catch (err) {
    console.error("[mock-prisma] Failed to load db.json:", err);
    return empty;
  }
}

// Singleton data store
let _data: DbData | null = null;
let _passwordHash: string | null = null;


function getData(): DbData {
  if (!_data) {
    _data = loadDbData();
    // Pre-hash passwords synchronously for users
    _passwordHash = bcrypt.hashSync(SEED_PASSWORD, 10);
    for (const u of _data.users) {
      if (!u.passwordHash) {
        u.passwordHash = _passwordHash;
      }
    }
    console.log(`[mock-prisma] Loaded in-memory DB: ${_data.users.length} users, ${_data.games.length} games, ${_data.coaches.length} coaches`);
  }
  return _data;
}

function getCollection(model: string): Row[] {
  const data = getData();
  const key = MODEL_KEY_MAP[model];
  if (!key) {
    console.warn(`[mock-prisma] Unknown model: ${model}`);
    return [];
  }
  return data[key];
}

// Simple where-clause matching
function matchesWhere(row: Row, where: Record<string, unknown> | undefined): boolean {
  if (!where) return true;
  for (const [key, val] of Object.entries(where)) {
    if (val === undefined) continue;
    const rowVal = row[key];

    if (val && typeof val === "object" && !Array.isArray(val)) {
      const cond = val as Record<string, unknown>;

      // Handle { not: value } or { not: condition }
      if ("not" in cond) {
        if (typeof cond.not === "object" && cond.not !== null) {
          if (matchesWhere(row, { [key]: cond.not })) return false;
        } else {
          if (rowVal === cond.not) return false;
        }
        continue;
      }
      // Handle { in: [...] }
      if ("in" in cond) {
        if (!Array.isArray(cond.in) || !(cond.in as unknown[]).includes(rowVal)) return false;
        continue;
      }
      // Handle { contains: string, mode: "insensitive" }
      if ("contains" in cond) {
        const needle = String(cond.contains).toLowerCase();
        if (!String(rowVal ?? "").toLowerCase().includes(needle)) return false;
        continue;
      }
      // Handle { gte, lte, gt, lt }
      if ("gte" in cond) { if ((rowVal as number) < (cond.gte as number)) return false; }
      if ("lte" in cond) { if ((rowVal as number) > (cond.lte as number)) return false; }
      if ("gt" in cond) { if ((rowVal as number) <= (cond.gt as number)) return false; }
      if ("lt" in cond) { if ((rowVal as number) >= (cond.lt as number)) return false; }
      if ("gte" in cond || "lte" in cond || "gt" in cond || "lt" in cond) continue;

      // Handle { startsWith: string }
      if ("startsWith" in cond) {
        if (!String(rowVal ?? "").toLowerCase().startsWith(String(cond.startsWith).toLowerCase())) return false;
        continue;
      }

      // Handle nested relation filter e.g. { game: { status: { not: "cancelled" } } }
      // For simple cases, just skip (we can't resolve relations easily)
      continue;
    }

    // Handle OR
    if (key === "OR" && Array.isArray(val)) {
      const orMatch = (val as Record<string, unknown>[]).some(clause => matchesWhere(row, clause));
      if (!orMatch) return false;
      continue;
    }

    // Handle AND
    if (key === "AND" && Array.isArray(val)) {
      const andMatch = (val as Record<string, unknown>[]).every(clause => matchesWhere(row, clause));
      if (!andMatch) return false;
      continue;
    }

    // Direct equality
    if (rowVal === undefined && val === null) continue;
    if (rowVal === null && val === undefined) continue;
    if (rowVal !== val) return false;
  }
  return true;
}

function applySelect(row: Row, select: Record<string, unknown> | undefined): Row {
  if (!select) return { ...row };
  const result: Row = {};
  for (const [key, val] of Object.entries(select)) {
    if (val === true) {
      result[key] = row[key];
    } else if (val && typeof val === "object") {
      // Nested select for relations — return empty array or null
      result[key] = Array.isArray(row[key]) ? row[key] : (row[key] ?? null);
    }
  }
  return result;
}

function applyOrderBy(rows: Row[], orderBy: unknown): Row[] {
  if (!orderBy) return rows;
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const order of orders) {
      for (const [key, dir] of Object.entries(order as Record<string, string>)) {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal === bVal) continue;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp = aVal < bVal ? -1 : 1;
        return dir === "desc" ? -cmp : cmp;
      }
    }
    return 0;
  });
}

function resolveIncludes(row: Row, include: Record<string, unknown> | undefined, model: string): Row {
  if (!include) return row;
  const data = getData();
  const result = { ...row };

  for (const [key, val] of Object.entries(include)) {
    if (!val) continue;

    // Map relation names to models and foreign keys
    const relationMap: Record<string, { model: string; fk: string; type: "many" | "one"; reverseFK?: string }> = {
      // User relations
      organizedGames: { model: "game", fk: "organizerId", type: "many" },
      gamePlayers: { model: "gamePlayer", fk: "userId", type: "many" },
      bookings: { model: "booking", fk: "userId", type: "many" },
      reviews: { model: "review", fk: "userId", type: "many" },
      campRegistrations: { model: "campRegistration", fk: "userId", type: "many" },
      eventRegistrations: { model: "eventRegistration", fk: "userId", type: "many" },
      workshopRegistrations: { model: "workshopRegistration", fk: "userId", type: "many" },
      payments: { model: "payment", fk: "userId", type: "many" },
      coachProfile: { model: "coach", fk: "userId", type: "one" },
      // Coach relations
      batches: { model: "batch", fk: "coachId", type: "many" },
      // Game relations
      organizer: { model: "user", fk: "id", type: "one", reverseFK: "organizerId" },
      players: { model: "gamePlayer", fk: "gameId", type: "many" },
      waitlist: { model: "waitlistEntry", fk: "gameId", type: "many" },
      // GamePlayer relations
      game: { model: "game", fk: "id", type: "one", reverseFK: "gameId" },
      user: { model: "user", fk: "id", type: "one", reverseFK: "userId" },
      // Booking relations
      coach: { model: "coach", fk: "id", type: "one", reverseFK: "coachId" },
      batch: { model: "batch", fk: "id", type: "one", reverseFK: "batchId" },
      // Camp/Event/Workshop relations
      registrations: { model: "campRegistration", fk: "campId", type: "many" },
      camp: { model: "camp", fk: "id", type: "one", reverseFK: "campId" },
      event: { model: "sportEvent", fk: "id", type: "one", reverseFK: "eventId" },
      workshop: { model: "workshop", fk: "id", type: "one", reverseFK: "workshopId" },
    };

    const rel = relationMap[key];
    if (key === "_count" && typeof val === "object" && val !== null) {
      result._count = {};
      const selectObj = (val as any).select || val;
      for (const [countKey, _v] of Object.entries(selectObj)) {
        if (_v) {
          const countRel = relationMap[countKey];
          if (countRel && countRel.type === "many") {
            const countColl = getCollection(countRel.model);
            result._count[countKey] = countColl.filter(r => r[countRel.fk] === row.id).length;
          } else {
            result._count[countKey] = 0;
          }
        }
      }
      continue;
    }
    
    if (!rel) continue;

    const coll = getCollection(rel.model);
    if (rel.type === "many") {
      result[key] = coll.filter(r => r[rel.fk] === row.id);
    } else {
      const lookupId = rel.reverseFK ? row[rel.reverseFK] : row.id;
      result[key] = coll.find(r => r[rel.fk] === lookupId) ?? null;
    }
  }

  return result;
}

let idCounter = 1000;
function generateId(): string {
  return `mock_${Date.now()}_${idCounter++}`;
}

function applyUpdate(row: Row, updateData: Record<string, unknown>): void {
  for (const [key, val] of Object.entries(updateData)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const op = val as Record<string, unknown>;
      if ("increment" in op) {
        row[key] = ((row[key] as number) ?? 0) + (op.increment as number);
        continue;
      }
      if ("decrement" in op) {
        row[key] = ((row[key] as number) ?? 0) - (op.decrement as number);
        continue;
      }
      if ("set" in op) {
        row[key] = op.set;
        continue;
      }
      if ("push" in op) {
        const arr = (row[key] as unknown[]) ?? [];
        arr.push(op.push);
        row[key] = arr;
        continue;
      }
    }
    row[key] = val;
  }
  row.updatedAt = new Date().toISOString();
}

function createModelProxy(model: string) {
  return {
    async findUnique(args: { where: Record<string, unknown>; select?: Record<string, unknown>; include?: Record<string, unknown> }) {
      const coll = getCollection(model);
      const uniqueFieldSets = UNIQUE_FIELDS[model] ?? [["id"]];

      let found: Row | undefined;
      for (const fields of uniqueFieldSets) {
        const allPresent = fields.every(f => args.where[f] !== undefined);
        if (allPresent) {
          found = coll.find(row => fields.every(f => row[f] === args.where[f]));
          if (found) break;
        }
      }

      if (!found) return null;
      let result = resolveIncludes(found, args.include, model);
      result = applySelect(result, args.select);
      return result;
    },

    async findFirst(args?: { where?: Record<string, unknown>; select?: Record<string, unknown>; include?: Record<string, unknown>; orderBy?: unknown }) {
      const coll = getCollection(model);
      let rows = coll.filter(r => matchesWhere(r, args?.where));
      if (args?.orderBy) rows = applyOrderBy(rows, args.orderBy);
      const found = rows[0];
      if (!found) return null;
      let result = resolveIncludes(found, args?.include, model);
      result = applySelect(result, args?.select);
      return result;
    },

    async findMany(args?: { where?: Record<string, unknown>; select?: Record<string, unknown>; include?: Record<string, unknown>; orderBy?: unknown; take?: number; skip?: number }) {
      const coll = getCollection(model);
      let rows = coll.filter(r => matchesWhere(r, args?.where));
      if (model === "user" && args?.where?.deletedAt === null) {
        console.log(`[mock-prisma] findMany users: Total ${coll.length}, Matched ${rows.length}, where:`, JSON.stringify(args?.where));
      }
      if (args?.orderBy) rows = applyOrderBy(rows, args.orderBy);
      if (args?.skip) rows = rows.slice(args.skip);
      if (args?.take) rows = rows.slice(0, args.take);
      return rows.map(r => {
        let result = resolveIncludes(r, args?.include, model);
        result = applySelect(result, args?.select);
        return result;
      });
    },

    async create(args: { data: Record<string, unknown>; include?: Record<string, unknown> }) {
      const coll = getCollection(model);
      const newRow: Row = { id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...args.data };

      // Handle nested creates (e.g., batches: { create: [...] })
      for (const [key, val] of Object.entries(args.data)) {
        if (val && typeof val === "object" && !Array.isArray(val) && "create" in (val as Record<string, unknown>)) {
          const nested = (val as Record<string, unknown>).create;
          // Remove the nested create from the main row
          delete newRow[key];
          // This is simplified — in a full impl we'd create the related records
          if (Array.isArray(nested)) {
            for (const item of nested) {
              const nestedRow = { id: generateId(), ...item as Record<string, unknown>, [`${model}Id`]: newRow.id };
              // Find the right collection for the nested model
              const nestedModelKey = key;
              const nestedColl = getCollection(nestedModelKey.endsWith("s") ? nestedModelKey.slice(0, -2) : nestedModelKey);
              if (nestedColl) nestedColl.push(nestedRow);
            }
          }
        }
      }

      coll.push(newRow);
      return resolveIncludes(newRow, args.include, model);
    },

    async createMany(args: { data: Record<string, unknown>[] }) {
      const coll = getCollection(model);
      for (const item of args.data) {
        coll.push({ id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...item });
      }
      return { count: args.data.length };
    },

    async update(args: { where: Record<string, unknown>; data: Record<string, unknown>; select?: Record<string, unknown>; include?: Record<string, unknown> }) {
      const coll = getCollection(model);
      const row = coll.find(r => {
        const uniqueFieldSets = UNIQUE_FIELDS[model] ?? [["id"]];
        return uniqueFieldSets.some(fields => fields.every(f => args.where[f] !== undefined && r[f] === args.where[f]));
      });
      if (!row) throw new Error(`[mock-prisma] ${model}.update: Record not found`);
      applyUpdate(row, args.data);
      let result = resolveIncludes(row, args.include, model);
      result = applySelect(result, args.select);
      return result;
    },

    async updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      const coll = getCollection(model);
      const rows = coll.filter(r => matchesWhere(r, args.where));
      for (const row of rows) applyUpdate(row, args.data);
      return { count: rows.length };
    },

    async delete(args: { where: Record<string, unknown> }) {
      const coll = getCollection(model);
      const key = MODEL_KEY_MAP[model]!;
      const idx = coll.findIndex(r => {
        const uniqueFieldSets = UNIQUE_FIELDS[model] ?? [["id"]];
        return uniqueFieldSets.some(fields => fields.every(f => args.where[f] !== undefined && r[f] === args.where[f]));
      });
      if (idx === -1) throw new Error(`[mock-prisma] ${model}.delete: Record not found`);
      const [deleted] = coll.splice(idx, 1);
      return deleted;
    },

    async deleteMany(args?: { where?: Record<string, unknown> }) {
      const data = getData();
      const key = MODEL_KEY_MAP[model]!;
      if (!args?.where) {
        const count = data[key].length;
        data[key] = [];
        return { count };
      }
      const before = data[key].length;
      data[key] = data[key].filter(r => !matchesWhere(r, args.where));
      return { count: before - data[key].length };
    },

    async count(args?: { where?: Record<string, unknown> }) {
      const coll = getCollection(model);
      if (!args?.where) return coll.length;
      return coll.filter(r => matchesWhere(r, args.where)).length;
    },

    async upsert(args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown>; include?: Record<string, unknown> }) {
      const coll = getCollection(model);
      const existing = coll.find(r => {
        const uniqueFieldSets = UNIQUE_FIELDS[model] ?? [["id"]];
        return uniqueFieldSets.some(fields => fields.every(f => args.where[f] !== undefined && r[f] === args.where[f]));
      });
      if (existing) {
        applyUpdate(existing, args.update);
        return resolveIncludes(existing, args.include, model);
      }
      const newRow: Row = { id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...args.create };
      coll.push(newRow);
      return resolveIncludes(newRow, args.include, model);
    },

    async aggregate(args: any) {
      const coll = getCollection(model);
      const rows = coll.filter(r => matchesWhere(r, args?.where));
      
      const result: any = { _count: { _all: rows.length } };
      
      if (args?._sum && typeof args._sum === "object") {
        result._sum = {};
        for (const key of Object.keys(args._sum)) {
          result._sum[key] = rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);
        }
      } else {
        result._sum = {};
      }
      
      return result;
    },

    async groupBy() {
      return [];
    },
  };
}

export function createMockPrismaClient() {
  console.log("[mock-prisma] ⚡ Using in-memory mock database (no PostgreSQL needed)");

  const models: Record<string, ReturnType<typeof createModelProxy>> = {};
  for (const modelName of Object.keys(MODEL_KEY_MAP)) {
    models[modelName] = createModelProxy(modelName);
  }

  const client = new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      if (prop === "$transaction") {
        return async (operations: unknown[] | ((tx: unknown) => Promise<unknown>)) => {
          if (typeof operations === "function") {
            return operations(client);
          }
          return Promise.all(operations);
        };
      }
      if (prop === "$disconnect" || prop === "$connect") {
        return async () => {};
      }
      if (prop === "$queryRaw" || prop === "$executeRaw") {
        return async () => [];
      }
      if (models[prop]) return models[prop];
      return undefined;
    },
  });

  return client;
}
