import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: supabaseMocks.createClient }));

import { POST } from "./route";

const relationshipId = "30000000-0000-4000-8000-000000000001";
const factId = "10000000-0000-4000-8000-000000000001";
const userId = "40000000-0000-4000-8000-000000000001";

function makeRelationshipQuery(data: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
  };
  return query;
}

function makeListQuery(data: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(async () => ({ data, error: null })),
  };
  return query;
}

function makeRequest(body: unknown) {
  return new Request(`https://signal.test/api/relationships/${relationshipId}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("relationship questions route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unknown question topics before reading private data", async () => {
    const response = await POST(makeRequest({ topic: "private free-form content" }), {
      params: Promise.resolve({ relationshipId }),
    });

    expect(response.status).toBe(400);
    expect(supabaseMocks.createClient).not.toHaveBeenCalled();
  });

  it("requires verified claims before querying a relationship", async () => {
    const client = {
      auth: { getClaims: vi.fn(async () => ({ data: { claims: {} } })) },
      from: vi.fn(),
    };
    supabaseMocks.createClient.mockResolvedValue(client);

    const response = await POST(makeRequest({ topic: "change" }), {
      params: Promise.resolve({ relationshipId }),
    });

    expect(response.status).toBe(401);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("returns not found when RLS hides the requested relationship", async () => {
    const relationshipQuery = makeRelationshipQuery(null);
    const client = {
      auth: { getClaims: vi.fn(async () => ({ data: { claims: { sub: userId } } })) },
      from: vi.fn(() => relationshipQuery),
    };
    supabaseMocks.createClient.mockResolvedValue(client);

    const response = await POST(makeRequest({ topic: "evidence" }), {
      params: Promise.resolve({ relationshipId }),
    });

    expect(response.status).toBe(404);
    expect(relationshipQuery.eq).toHaveBeenCalledWith("id", relationshipId);
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it("reads facts and snapshots scoped to the visible relationship", async () => {
    const relationshipQuery = makeRelationshipQuery({ id: relationshipId });
    const factsQuery = makeListQuery([{
      id: factId,
      text_original: "相手から次の週末に会えるか聞かれた。",
      created_at: "2026-10-01T09:00:00.000Z",
    }]);
    const snapshotsQuery = makeListQuery([{
      id: "20000000-0000-4000-8000-000000000001",
      previous_snapshot_id: null,
      romantic_interest: 60,
      desire_to_meet: 55,
      initiative: 50,
      evidence_sufficiency: 44,
      created_at: "2026-10-01T10:00:00.000Z",
    }]);
    const client = {
      auth: { getClaims: vi.fn(async () => ({ data: { claims: { sub: userId } } })) },
      from: vi.fn((table: string) => {
        if (table === "relationships") return relationshipQuery;
        if (table === "facts") return factsQuery;
        return snapshotsQuery;
      }),
    };
    supabaseMocks.createClient.mockResolvedValue(client);

    const response = await POST(makeRequest({ topic: "evidence" }), {
      params: Promise.resolve({ relationshipId }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith("relationships");
    expect(client.from).toHaveBeenCalledWith("facts");
    expect(client.from).toHaveBeenCalledWith("analysis_snapshots");
    expect(factsQuery.eq).toHaveBeenCalledWith("relationship_id", relationshipId);
    expect(snapshotsQuery.eq).toHaveBeenCalledWith("relationship_id", relationshipId);
    expect(payload.facts).toEqual([{ id: factId, text: "相手から次の週末に会えるか聞かれた。", createdAt: "2026-10-01T09:00:00.000Z" }]);
  });
});
