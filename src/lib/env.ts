import "server-only";

/**
 * Server-only deployment config. `server-only` makes an accidental import
 * from a Client Component a build-time error, not just a silently-undefined
 * value - see docs/adr/0001-server-side-proxy-for-the-backend-api.md.
 *
 * Read once per process (module scope), same reasoning as the backend's own
 * `ApiSettings` (purchase_engine/src/purchase_engine/api/settings.py): fail
 * fast on a missing var instead of surfacing a confusing error deep inside a
 * fetch call.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set - copy .env.example to .env.local and fill it in`,
    );
  }
  return value;
}

export const env = {
  backendUrl: required("PURCHASE_ENGINE_API_URL").replace(/\/+$/, ""),
  backendApiKey: required("PURCHASE_ENGINE_API_KEY"),
};
