import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({ createClient: vi.fn(), createAdminClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: supabaseMocks.createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: supabaseMocks.createAdminClient }));

import { GET } from "./route";

const relationshipId = "30000000-0000-4000-8000-000000000001";
const userId = "40000000-0000-4000-8000-000000000001";

function makeRequest() {
  return new Request(`https://signal.test/api/relationships/${relationshipId}`, {
    headers: { Authorization: "Bearer native-session-token" },
  });
}

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

describe("relationship detail route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns saved facts and snapshot receipt data only after owner verification", async () => {
    const session = { auth: { getClaims: vi.fn(async () => ({ data: { claims: { sub: userId } }, error: null })) } };
    const relationshipQuery = makeRelationshipQuery({ id: relationshipId, display_name: "アプリの人" });
    const factsQuery = makeListQuery([{ text_original: "次の週末に会えるか聞かれた。", created_at: "2026-10-01T09:00:00.000Z" }]);
    const snapshotsQuery = makeListQuery([{
      romantic_interest: 58,
      desire_to_meet: 64,
      initiative: 51,
      evidence_sufficiency: 40,
      fact_count: 3,
      created_at: "2026-10-01T10:00:00.000Z",
    }]);
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "relationships") return relationshipQuery;
        if (table === "facts") return factsQuery;
        return snapshotsQuery;
      }),
    };
    supabaseMocks.createClient.mockResolvedValue(session);
    supabaseMocks.createAdminClient.mockReturnValue(admin);

    const response = await GET(makeRequest(), { params: Promise.resolve({ relationshipId }) });

    expect(response.status).toBe(200);
    expect(session.auth.getClaims).toHaveBeenCalledWith("native-session-token");
    expect(relationshipQuery.eq).toHaveBeenCalledWith("user_id", userId);
    expect(factsQuery.eq).toHaveBeenCalledWith("relationship_id", relationshipId);
    expect(snapshotsQuery.eq).toHaveBeenCalledWith("relationship_id", relationshipId);
    expect(await response.json()).toEqual({
      id: relationshipId,
      displayName: "アプリの人",
      facts: [{ text: "次の週末に会えるか聞かれた。", createdAt: "2026-10-01T09:00:00.000Z" }],
      snapshots: [{
        signalLevel: 58,
        desireToMeet: 64,
        initiative: 51,
        evidenceSufficiency: 40,
        factCount: 3,
        createdAt: "2026-10-01T10:00:00.000Z",
      }],
    });
  });

  it("does not read facts or snapshots when the relationship belongs to someone else", async () => {
    const session = { auth: { getClaims: vi.fn(async () => ({ data: { claims: { sub: userId } }, error: null })) } };
    const relationshipQuery = makeRelationshipQuery(null);
    const admin = { from: vi.fn(() => relationshipQuery) };
    supabaseMocks.createClient.mockResolvedValue(session);
    supabaseMocks.createAdminClient.mockReturnValue(admin);

    const response = await GET(makeRequest(), { params: Promise.resolve({ relationshipId }) });

    expect(response.status).toBe(404);
    expect(admin.from).toHaveBeenCalledTimes(1);
  });
});
