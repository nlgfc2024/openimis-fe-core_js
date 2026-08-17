/**
 * Resolution of the application name shown in the header and the browser tab.
 *
 * Precedence:
 *  1. `appName` in the backend fe-core ModuleConfiguration -- the same place
 *     `menus` and the other server-driven settings live, so an instance can be
 *     rebranded without a frontend rebuild.
 *  2. the `core.appName` / `appName` translation messages, preserving the
 *     previous behaviour for instances that set the name that way.
 *  3. "openIMIS".
 */
export const APP_NAME_MODULE = "fe-core";
export const APP_NAME_CONFIG_KEY = "appName";
export const CORE_APP_NAME_MESSAGE_ID = "core.appName";
export const APP_NAME_MESSAGE_ID = "appName";
export const DEFAULT_APP_NAME = "openIMIS";

/**
 * App name from the backend module configuration, or null when unset.
 * Returns null (rather than a default) so callers can fall back to translations.
 */
export function configuredAppName(modulesManager) {
  const configured = modulesManager?.getConf(APP_NAME_MODULE, APP_NAME_CONFIG_KEY, null);
  return typeof configured === "string" && configured.trim() ? configured : null;
}

/**
 * Full resolution, for callers that have the merged messages to hand.
 * `messages` is the flat id -> string map given to IntlProvider.
 */
export function resolveAppName(modulesManager, messages = {}) {
  return (
    configuredAppName(modulesManager) ??
    messages[CORE_APP_NAME_MESSAGE_ID] ??
    messages[APP_NAME_MESSAGE_ID] ??
    DEFAULT_APP_NAME
  );
}
