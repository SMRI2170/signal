import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({ createClient: vi.fn(), createAdminClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: supabaseMocks.createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: supabaseMocks.createAdminClient }));

import { GET } from "./route";

const userId = "40000000-0000-4000-8000-000000000001";

function makeQuery(data: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => ({ data, error: null })),
  };
  return query;
}

function makeRequest(token = "native-session-token") {
  return new Request("https://signal.test/api/relationships/summaries", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe("relationship summaries route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("verifies the bearer token and returns only the user's latest cartridge summaries", async () => {
    const session = { auth: { getClaims: vi.fn(async () => ({ data: { claims: { sub: userId } }, error: null })) } };
    const relationshipsQuery = makeQuery([{
      id: "30000000-0000-4000-8000-000000000001",
      display_name: "アプリの人",
      updated_at: "2026-10-03T09:00:00.000Z",
      analysis_snapshots: [
        { romantic_interest: 52, created_at: "2026-10-02T09:00:00.000Z" },
        { romantic_interest: 58, created_at: "2026-10-03T09:00:00.000Z" },
      ],
    }]);
    const admin = { from: vi.fn(() => relationshipsQuery) };
    supabaseMocks.createClient.mockResolvedValue(session);
    supabaseMocks.createAdminClient.mockReturnValue(admin);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(session.auth.getClaims).toHaveBeenCalledWith("native-session-token");
    expect(relationshipsQuery.eq).toHaveBeenCalledWith("user_id", userId);
    expect(await response.json()).toEqual({
      relationships: [{
        id: "30000000-0000-4000-8000-000000000001",
        displayName: "アプリの人",
        signalLevel: 58,
        updatedAt: "2026-10-03T09:00:00.000Z",
      }],
    });
  });

  it("rejects an unverified session before querying relationship data", async () => {
    const session = { auth: { getClaims: vi.fn(async () => ({ data: { claims: {} }, error: null })) } };
    supabaseMocks.createClient.mockResolvedValue(session);

    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(supabaseMocks.createAdminClient).not.toHaveBeenCalled();
  });
});
