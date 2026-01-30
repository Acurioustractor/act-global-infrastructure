import type { RegistrySourceConfig, RegistrySourceId } from "./types";

const getEnv = (key: string) => process.env[key] ?? "";

const buildSource = (
  id: RegistrySourceId,
  label: string,
  envPrefix: string
): RegistrySourceConfig => {
  const feedUrl = getEnv(`${envPrefix}_REGISTRY_URL`);
  const baseUrl = getEnv(`${envPrefix}_API_BASE_URL`);
  const token = getEnv(`${envPrefix}_API_TOKEN`);

  return {
    id,
    label,
    feedUrl: feedUrl || undefined,
    baseUrl: baseUrl || undefined,
    feedPath: getEnv(`${envPrefix}_REGISTRY_PATH`) || "/api/registry",
    token: token || undefined,
    authType: token ? "bearer" : "none",
    enabled: Boolean(feedUrl || baseUrl),
  };
};

export const registrySources: RegistrySourceConfig[] = [
  buildSource("curious_tractor", "A Curious Tractor", "ACT_TRACTOR"),
  buildSource("goods", "Goods on Country", "GOODS"),
  buildSource("justicehub", "JusticeHub", "JUSTICEHUB"),
  buildSource("empathy_ledger", "Empathy Ledger", "EMPATHY_LEDGER"),
  buildSource("harvest", "Harvest", "HARVEST"),
];
