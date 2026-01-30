import "server-only";
import { createClient } from "@supabase/supabase-js";

type SupabaseServerConfig = {
  url: string;
  serviceRoleKey: string;
};

const getSupabaseConfig = (): SupabaseServerConfig | null => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
};

export const getSupabaseServerClient = () => {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
