import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const stateKeySchema = z.enum([
  "bookings",
  "grid",
  "admins",
  "audit",
  "auth-history",
  "passport-records",
  "anketa-records",
]);

const getStateSchema = z.object({
  key: stateKeySchema,
});

const setStateSchema = z.object({
  key: stateKeySchema,
  stateData: z.any(),
  expectedVersion: z.number().int().nullable().optional(),
});

export type HotelStateKey = z.infer<typeof stateKeySchema>;

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

function createPublicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const getHotelState = createServerFn({ method: "GET" })
  .inputValidator((input) => getStateSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    if (!supabase) return null;

    const { data: row, error } = await supabase
      .from("hotel_app_state")
      .select("state_data, version, updated_at")
      .eq("state_key", data.key)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) return null;

    return {
      stateData: row.state_data as JsonValue,
      version: Number(row.version ?? 0),
      updatedAt: String(row.updated_at ?? ""),
    };
  });

export const setHotelState = createServerFn({ method: "POST" })
  .inputValidator((input) => setStateSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createPublicClient();

    if (!supabase) {
      return {
        stateData: data.stateData as JsonValue,
        version: 0,
        updatedAt: "",
      };
    }

    const { data: rows, error } = await supabase.rpc("hotel_app_state_cas", {
      p_key: data.key,
      p_expected_version: data.expectedVersion ?? null,
      p_state_data: data.stateData,
    });

    if (error) throw new Error(error.message);

    const row = Array.isArray(rows) ? rows[0] : rows;

    return {
      stateData: row?.state_data as JsonValue,
      version: Number(row?.version ?? 0),
      updatedAt: String(row?.updated_at ?? ""),
    };
  });
