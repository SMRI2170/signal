import { JevTranslationAdapter, NoOpTranslator } from "./translator-jev";
import type { FactTranslator } from "./translator";

/**
 * `getFactTranslator` returns the translator the server should use for the
 * current environment. Resolution order:
 *
 *   1. If `SIGNAL_TRANSLATOR_PROVIDER` is set, dispatch on its value:
 *        - `jev`      → JevTranslationAdapter (server-only)
 *        - `noop`     → NoOpTranslator (static demo / preview)
 *        - `disabled` → NoOpTranslator (production diagnostic path with banner)
 *   2. Else, if `TYPESAFE_API_KEY` is configured, default to `jev`.
 *   3. Else, fall back to `noop`.
 *
 * The registry is server-only: never import this module from a client
 * component. The browser bundle must never see the `fetch` call against
 * `api.typesafe.ai`.
 */
export function getFactTranslator(): FactTranslator {
  const explicit = process.env.SIGNAL_TRANSLATOR_PROVIDER?.toLowerCase();
  if (explicit === "disabled" || explicit === "noop") return new NoOpTranslator();
  if (explicit === "jev") return new JevTranslationAdapter();
  if (!explicit && process.env.TYPESAFE_API_KEY) return new JevTranslationAdapter();
  return new NoOpTranslator();
}