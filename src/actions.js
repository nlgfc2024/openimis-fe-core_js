import { RSAA } from "redux-api-middleware";
import uuid from "lodash-uuid";
import _ from "lodash";
import {
  formatQuery,
  formatPageQuery,
  formatPageQueryWithCount,
  formatGQLString,
  formatMutation,
  formatServerError,
  actionRequiresAuthentication,
  getCsrfToken,
  storeCsrfToken,
} from "./helpers/api";

const REQUESTED_WITH = 'webapp'

const ROLE_FULL_PROJECTION = () => [
  "id",
  "uuid",
  "name",
  "altLanguage",
  "isSystem",
  "isBlocked",
  "validityFrom",
  "validityTo",
];

const ROLERIGHT_FULL_PROJECTION = () => ["rightId"];

const LANGUAGE_FULL_PROJECTION = () => ["name", "code"];

const MODULEPERMISSION_FULL_PROJECTION = () => ["modulePermsList{moduleName, permissions{permsName, permsValue}}"];

const CUSTOM_FILTER_FULL_PROJECTION = () => ["type", "code", "possibleFilters {field, filter, type}"];

export function fetchCustomFilter(params) {
  const payload = formatQuery("customFilters", params, CUSTOM_FILTER_FULL_PROJECTION());
  return graphql(payload, "FETCH_CUSTOM_FILTER");
}

function getApiUrl() {
  let _baseApiUrl = process.env.REACT_APP_API_URL ?? "/api";
  if (_baseApiUrl.indexOf("/") !== 0) {
    _baseApiUrl = `/${_baseApiUrl}`;
  }
  return _baseApiUrl;
}

export const baseApiUrl = getApiUrl();

export function apiHeaders() {
  let headers = {
    "Content-Type": "application/json",
    "X-CSRFToken": getCsrfToken(),
  };
  return headers;
}

export function cacheFilters(key, filters) {
  return (dispatch) => {
    dispatch({ type: "CORE_CACHE_FILTER", payload: { [key]: filters } });
  };
}

export function resetCacheFilters(key) {
  return (dispatch) => {
    dispatch({ type: "CORE_CACHE_FILTER_RESET", payload: key });
  };
}

export function journalize(mutation, meta) {
  return (dispatch) => {
    mutation.status = 0;
    dispatch({ type: "CORE_MUTATION_ADD", payload: mutation, meta });
  };
}

export function graphql(payload, type = "GRAPHQL_QUERY", params = {}) {
  let req = type + "_REQ";
  let resp = type + "_RESP";
  let err = type + "_ERR";
  if (Array.isArray(type)) {
    [req, resp, err] = type;
  }
  return async (dispatch) => {
    try {
      const response = await dispatch(
        fetch({
          endpoint: `${baseApiUrl}/graphql`,
          method: "POST",
          body: JSON.stringify({ query: payload }),
          types: [
            {
              type: req,
              meta: params,
            },
            {
              type: resp,
              meta: params,
            },
            {
              type: err,
              meta: params,
            },
          ],
        }),
      );
      if (response.error && !actionRequiresAuthentication(response)) {
        dispatch(coreAlert(formatServerError(response.payload)));
      }

      return response;
    } catch (err) {
      console.error(err);
    }
  };
}

export function graphqlWithVariables(operation, variables, type = "GRAPHQL_QUERY", params = {}, customHeaders = {}, options = {}) {
  let req, resp, err;
  if (Array.isArray(type)) {
    [req, resp, err] = type;
  } else {
    req = type + "_REQ";
    resp = type + "_RESP";
    err = type + "_ERR";
  }
  return async (dispatch) => {
    const response = await dispatch(
      fetch({
        endpoint: `${baseApiUrl}/graphql`,
        method: "POST",
        body: JSON.stringify({ query: operation, variables }),
        silent: options.silent,
        headers: {
          ...customHeaders
        },
        types: [
          {
            type: req,
            meta: params,
          },
          {
            type: resp,
            meta: params,
          },
          {
            type: err,
            meta: params,
          },
        ],
      }),
    );
    return response;
  };
}

export function prepareMutation(operation, input, params = {}) {
  if (!params.clientMutationId) {
    params.clientMutationId = uuid.uuid();
  }

  const variables = {
    input: {
      ...input,
      ...params,
    },
  };

  return { operation, variables, clientMutationId: params.clientMutationId };
}

export function waitForMutation(clientMutationId) {
  return async (dispatch) => {
    let attempts = 0;
    let res;
    do {
      if (res) {
        await new Promise((resolve) => setTimeout(resolve, 100 * attempts));
      }
      const response = await dispatch(
        graphqlWithVariables(
          `
        query ($clientMutationId: String) {
          mutationLogs (clientMutationId: $clientMutationId) {
            edges {
              node {
                status
                clientMutationId
                jsonContent
                error
              }
            }
          }
        }
      `,
          { clientMutationId },
        ),
      );
      if (response.error) {
        return null;
      }
      res = response.payload.data.mutationLogs?.edges[0]?.node;
    } while ((!res || res.status === 0) && attempts++ < 10);
    if (res && res.status === 1 && res.error) {
      res.error = JSON.parse(res.error);
    }
    return res;
  };
}

export function graphqlMutation(mutation, variables, type = "CORE_TRIGGER_MUTATION", params = {}, wait = true, customHeaders = {}, trackMutation = true) {
  let clientMutationId;
  if (variables?.input) {
    clientMutationId = uuid.uuid();
    variables.input.clientMutationId = clientMutationId;
  }
  return async (dispatch) => {
    const response = await dispatch(graphqlWithVariables(mutation, variables, type, params, customHeaders));
    if (clientMutationId && trackMutation) {
      dispatch(fetchMutation(clientMutationId));
      if (wait) {
        return dispatch(waitForMutation(clientMutationId));
      } else {
        return response?.payload?.data;
      }
    }
    return response;
  };
}

import * as Sentry from "@sentry/react";

function promptSessionExpiry() {
  return (dispatch, getState) => {
    const core = getState()?.core;
    if (core?.isInitialized && core?.user && !core?.sessionExpiryPending) {
      dispatch(coreConfirm(
        "Session Expired",
        "Your session has expired, You will be redirected to the login page.",
        "csrf_logout",
      ));
    }
  };
}

export function fetch(config) {
  const { silent = false, ...request } = config;

  return async (dispatch, getState) => {
    let action;

    try {
      action = await dispatch({
        [RSAA]: {
          ...request,
          types: request.types.map((type) => {
            const descriptor = typeof type === "string" ? { type } : type;
            const originalMeta = descriptor.meta;
            return {
              ...descriptor,
              meta: (...args) => ({
                ...(typeof originalMeta === "function" ? originalMeta(...args) : originalMeta),
                silent,
              }),
            };
          }),
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRFToken": getCsrfToken(),
            ...config.headers,
          },
        },
      });

      const endpoint = config.endpoint;
      const payload = action?.payload || {};
      const response = payload?.response;
      const status = payload?.status ?? response?.status;
      const statusText = payload?.statusText ?? response?.statusText;
      const gqlErrors = payload?.errors || response?.errors || [];
      const message = payload?.message || action?.error?.message;

      // This is the sole owner of session UI; silent probes retain refresh cookies.
      if (actionRequiresAuthentication(action)) {
        if (!silent) dispatch(promptSessionExpiry());
        return action;
      }
      if (silent) return action;

      if (action.error) {
        let errorMessage = "";

        if (!response && !message) {
          errorMessage = "Server not responding";
        } else if (status) {
          errorMessage = `HTTP ${status}: ${statusText || "Unknown status"}`;
        } else if (gqlErrors?.length > 0) {
          errorMessage = `GraphQL Error: ${gqlErrors.map(e => e.message).join("; ")}`;
        } else if (message) {
          errorMessage = `Network or API Error: ${message}`;
        } else {
          errorMessage = "Unknown error during API call";
        }

        Sentry.captureException(new Error(errorMessage), {
          level: "error",
          tags: {
            endpoint,
            status: status || "no-status",
            type: config.method || "unknown-method",
          },
          extra: {
            endpoint,
            status,
            statusText,
          },
        });
      }

      if (!action.error && gqlErrors?.length > 0) {
        const gqlMessage = gqlErrors.map(e => e.message).join("; ");

        Sentry.captureException(new Error(`GraphQL Error: ${gqlMessage}`), {
          level: "error",
          tags: {
            endpoint,
            type: config.method || "unknown-method",
          },
          extra: {
            endpoint,
            errors: gqlErrors,
          },
        });
      }
    } catch (err) {
      const errorMessage = "Server not responding";

      Sentry.captureException(new Error(errorMessage), {
        level: "error",
        tags: {
          endpoint: config.endpoint,
          type: config.method || "unknown-method",
        },
        extra: {
          endpoint: config.endpoint,
          originalError: err,
        },
      });

      throw err;
    }

    return action;
  };
}

export function loadUser(options = {}) {
  return fetch({
    endpoint: `${baseApiUrl}/core/users/current_user/`,
    silent: options.silent,
    method: "GET",
    types: ["CORE_USERS_CURRENT_USER_REQ", "CORE_USERS_CURRENT_USER_RESP", "CORE_USERS_CURRENT_USER_ERR"],
  });
}

export function login(credentials) {
  return async (dispatch) => {
    if (credentials) {
      const mutation = `mutation authenticate($username: String!, $password: String!) {
            tokenAuth(username: $username, password: $password) {
              refreshExpiresIn
              passwordExpired
              passwordExpiryWarning
              passwordExpiresInDays
              passwordExpiresAt
              resetEmailSent
              username
            }
          }`;

      try {
        const loginCsrfToken = getCsrfToken();
        const response = await dispatch(
          graphqlMutation(mutation, credentials, ["CORE_AUTH_LOGIN_REQ", "CORE_AUTH_LOGIN_RESP", "CORE_AUTH_ERR"], {}, false, {
            "X-CSRFToken": loginCsrfToken
          }),
        );
        const responsePayload = response?.payload ?? response;
        const responseData = responsePayload?.data ?? responsePayload;
        const responseErrors = responsePayload?.errors ?? responsePayload?.response?.errors ?? response?.errors;

        if (responseErrors?.length > 0) {
          const errorMessage = responseErrors[0].message;
          if (errorMessage === "PASSWORD_EXPIRED") {
            return {
              loginStatus: "CORE_AUTH_PASSWORD_EXPIRED",
              message: "PASSWORD_EXPIRED",
              username: credentials.username,
              resetEmailSent: false,
            };
          }
          dispatch(authError({ message: errorMessage }));
          return { loginStatus: "CORE_AUTH_ERR", message: errorMessage };
        }

        const authData = responseData?.tokenAuth;
        if (authData?.passwordExpired || authData?.password_expired) {
          return {
            loginStatus: "CORE_AUTH_PASSWORD_EXPIRED",
            message: "PASSWORD_EXPIRED",
            username: authData.username || credentials.username,
            resetEmailSent: authData.resetEmailSent || authData.reset_email_sent,
          };
        }

        if (!authData?.refreshExpiresIn && !authData?.refresh_expires_in) {
          return {
            loginStatus: "CORE_AUTH_ERR",
            message: "INCORRECT_CREDENTIALS",
          };
        }
        
        const csrfResponse = await dispatch(fetchCsrfToken());
        const csrfResponsePayload = csrfResponse?.payload ?? csrfResponse;
        const csrfResponseData = csrfResponsePayload?.data ?? csrfResponsePayload;
        const csrfResponseErrors = csrfResponsePayload?.errors ?? csrfResponsePayload?.response?.errors ?? csrfResponse?.errors;
        if (csrfResponseErrors?.length > 0) {
          const errorMessage = csrfResponseErrors[0].message;
          dispatch(authError({ message: errorMessage }));
          return { loginStatus: "CORE_AUTH_ERR", message: errorMessage };
        }
        const csrfToken = csrfResponseData?.getCsrfToken?.csrfToken;
        if (!csrfToken) {
          return { loginStatus: "CORE_AUTH_ERR", message: "GENERAL" };
        }
        if (csrfToken) {
          storeCsrfToken(csrfToken);
        }


        const action = await dispatch(loadUser());
        return {
          loginStatus: action.type,
          message: action?.payload?.response?.detail ?? "",
          passwordExpiryWarning: authData.passwordExpiryWarning || authData.password_expiry_warning,
          passwordExpiresInDays: authData.passwordExpiresInDays ?? authData.password_expires_in_days,
          passwordExpiresAt: authData.passwordExpiresAt || authData.password_expires_at,
        };
      } catch (error) {
        dispatch(authError({ message: error.message }));
        return { loginStatus: "CORE_AUTH_ERR", message: error.message };
      }
    } else {
      // Keep the public no-argument login API used by existing consumers.
      const action = await dispatch(restoreSession({ refreshCsrf: false }));
      return { loginStatus: action.type, message: action?.payload?.response?.detail ?? "" };
    }
  };
}

export function fetchCsrfToken(jwtToken, options = {}) {
  return async (dispatch) => {
    const csrfQuery = `mutation {
      getCsrfToken {
        csrfToken
      }
    }`;
    const headers = jwtToken ? { "Authorization": `JWT ${jwtToken}` } : {};

    return dispatch(
      graphqlWithVariables(csrfQuery, {}, ["CORE_AUTH_CSRTOKEN_REQ", "CORE_AUTH_CSRTOKEN_RESP", "CORE_AUTH_ERR"], {}, headers, options),
    );
  };
}

export function refreshAuthToken(options = {}) {
  return (dispatch) => {
    const mutation = `
    mutation refreshAuthToken {
      refreshToken {
        refreshExpiresIn
      }
    }
  `;
    return dispatch(graphqlWithVariables(mutation, {}, "CORE_AUTH_REFRESH_TOKEN", {}, {}, options));
  };
}

// Check password/session policy without resetting CSRF, then slide JWT expiry.
// A Django-only session never needs a refresh-token mutation.
export function refreshSession() {
  return async (dispatch) => {
    const session = await dispatch(loadUser({ silent: true }));
    if (actionRequiresAuthentication(session)) {
      dispatch(promptSessionExpiry());
    } else if (!session?.error && !["session", "other"].includes(session?.payload?.authMode)) {
      return dispatch(refreshAuthToken());
    }
    return session;
  };
}

// The server accepts either a Django session or a JWT cookie. A refresh is only
// attempted after an authentication failure, at most once per probe.
export function restoreSession({ refreshCsrf = true } = {}) {
  return async (dispatch) => {
    let session = await dispatch(loadUser({ silent: true }));
    if (actionRequiresAuthentication(session) && session?.payload?.response?.detail !== "PASSWORD_EXPIRED") {
      const refresh = await dispatch(refreshAuthToken({ silent: true }));
      if (!refresh?.error && !refresh?.payload?.errors?.length && refresh?.payload?.data?.refreshToken) {
        session = await dispatch(loadUser({ silent: true }));
      }
    }
    if (actionRequiresAuthentication(session)) {
      return dispatch(logout({ silent: true }));
    } else if (!session?.error && (refreshCsrf || !getCsrfToken())) {
      // Also required for CSRF_USE_SESSIONS and this fork's session CSRF check.
      const csrf = await dispatch(fetchCsrfToken(undefined, { silent: true }));
      const token = csrf?.payload?.data?.getCsrfToken?.csrfToken;
      if (token) storeCsrfToken(token);
      if (actionRequiresAuthentication(csrf)) return dispatch(logout({ silent: true }));
      if (!token) {
        // Do not silently mark boot ready for mutations without a session CSRF token.
        dispatch(authError({ status: csrf?.payload?.status, statusText: "Unable to obtain CSRF token" }));
        return csrf;
      }
    }
    return session;
  };
}

export function initialize({ publicRoute = false } = {}) {
  return async (dispatch) => {
    try {
      if (!publicRoute) await dispatch(restoreSession());
    } catch (error) {
      dispatch(authError({ statusText: "Unable to initialize authentication" }));
    } finally {
      dispatch({ type: "CORE_INITIALIZED" });
    }
  };
}

export function authError(error) {
  return {
    type: "CORE_AUTH_ERR",
    payload: error,
  };
}

export function logout({ silent = false } = {}) {
  return async (dispatch) => {
    const sendLogout = () => dispatch(fetch({
      endpoint: `${baseApiUrl}/core/logout/`,
      method: "POST",
      silent: true,
      types: ["CORE_SESSION_LOGOUT_REQ", "CORE_SESSION_LOGOUT_RESP", "CORE_SESSION_LOGOUT_ERR"],
    }));
    let response;
    try {
      response = await sendLogout();
      if (response?.payload?.status === 403) {
        // The Django CSRF session may have expired while its JWT is still valid.
        // Fetch a fresh CSRF token once, then retry the protected logout endpoint.
        const csrf = await dispatch(fetchCsrfToken(undefined, { silent: true }));
        const token = csrf?.payload?.data?.getCsrfToken?.csrfToken;
        if (token) {
          storeCsrfToken(token);
          response = await sendLogout();
        }
      }
    } catch (error) {
      response = { error: true };
      Sentry.captureException(new Error("Unable to end authentication session"));
    }
    if (response?.error && !silent) {
      dispatch(coreAlert("Logout failed", "Your server session could not be ended. Please retry."));
      return response;
    }
    if (typeof localStorage !== "undefined") localStorage.removeItem("csrfToken");
    return dispatch({ type: "CORE_AUTH_LOGOUT" });
  };
}

export function fetchPasswordPolicy() {
  const payload = `query {
    passwordPolicy
  }`;
  return graphql(payload, "PASSWORD_POLICY_FIELDS");
}

export function fetchMutation(clientMutationId) {
  const payload = formatPageQuery(
    "mutationLogs",
    [`clientMutationId: "${clientMutationId}"`],
    [
      "id",
      "status",
      "error",
      "clientMutationId",
      "clientMutationLabel",
      "clientMutationDetails",
      "requestDateTime",
      "jsonExt",
      "autogeneratedCode"
    ],
  );
  return graphql(payload, "CORE_MUTATION");
}

export function fetchHistoricalMutations(pageSize, afterCursor) {
  let filters = [`first: ${pageSize}`];
  if (!!afterCursor) {
    filters.push(`after: "${afterCursor}"`);
  }
  filters.push(`orderBy: "-request_date_time"`);
  const payload = formatPageQuery("mutationLogs", filters, [
    "id",
    "status",
    "error",
    "clientMutationId",
    "clientMutationLabel",
    "clientMutationDetails",
    "requestDateTime",
    "jsonExt",
  ]);
  return graphql(payload, "CORE_HISTORICAL_MUTATIONS");
}

export function coreAlert(titleOrObject, message, detail) {
  let payload;

  if (_.isObject(titleOrObject)) {
    payload = titleOrObject;
  } else {
    payload = {
      title: titleOrObject,
      message,
      detail,
    };
  }

  return (dispatch) => {
    dispatch({ type: "CORE_ALERT", payload });
  };
}

export function clearAlert() {
  return (dispatch) => {
    dispatch({ type: "CORE_ALERT_CLEAR" });
  };
}

export function coreConfirm(title, message, intent = null, severity = "neutral") {
  return (dispatch) => {
    dispatch({ type: "CORE_CONFIRM", payload: { title, message, intent, severity } });
  };
}

export function clearConfirm(confirmed) {
  return (dispatch) => {
    dispatch({ type: "CORE_CONFIRM_CLEAR", payload: confirmed });
  };
}

export function openExportConfigDialog() {
  return (dispatch) => {
    dispatch({ type: "CORE_OPEN_EXPORT_CONFIG_DIALOG"})
  }
}

export function closeExportConfigDialog() {
  return (dispatch) => {
    dispatch({type: "CORE_CLOSE_EXPORT_CONFIG_DIALOG"})
  }
}

export function fetchRoles(params) {
  const payload = formatPageQueryWithCount("role", params, ROLE_FULL_PROJECTION());
  return graphql(payload, "CORE_ROLES");
}

export function fetchRole(params) {
  const payload = formatPageQuery("role", params, ROLE_FULL_PROJECTION());
  return graphql(payload, "CORE_ROLE");
}

export function fetchRoleRights(params) {
  const payload = formatPageQuery("roleRight", params, ROLERIGHT_FULL_PROJECTION());
  return graphql(payload, "CORE_ROLERIGHTS");
}

export function fetchModulesPermissions() {
  const payload = formatQuery("modulesPermissions", null, MODULEPERMISSION_FULL_PROJECTION());
  return graphql(payload, "CORE_MODULEPERMISSIONS");
}

export function fetchLanguages() {
  let payload = formatQuery("languages", null, LANGUAGE_FULL_PROJECTION());
  return graphql(payload, "CORE_LANGUAGES");
}

function formatRoleGQL(role) {
  return `
        ${!!role.uuid ? `uuid: "${role.uuid}"` : ""}
        ${!!role.name ? `name: "${formatGQLString(role.name)}"` : ""}
        ${!!role.altLanguage ? `altLanguage: "${formatGQLString(role.altLanguage)}"` : ""}
        ${role.isSystem !== null ? `isSystem: ${role.isSystem}` : ""}
        ${role.isBlocked !== null ? `isBlocked: ${role.isBlocked}` : ""}
        ${!!role.roleRights ? `rightsId: [${role.roleRights.join(",")}]` : ""}
    `;
}

export function createRole(role, clientMutationLabel) {
  let mutation = formatMutation("createRole", formatRoleGQL(role), clientMutationLabel);
  var requestedDateTime = new Date();
  return graphql(mutation.payload, ["CORE_ROLE_MUTATION_REQ", "CORE_CREATE_ROLE_RESP", "CORE_ROLE_MUTATION_ERR"], {
    clientMutationId: mutation.clientMutationId,
    clientMutationLabel,
    requestedDateTime,
  });
}

export function updateRole(role, clientMutationLabel) {
  let mutation = formatMutation("updateRole", formatRoleGQL(role), clientMutationLabel);
  var requestedDateTime = new Date();
  return graphql(mutation.payload, ["CORE_ROLE_MUTATION_REQ", "CORE_UPDATE_ROLE_RESP", "CORE_ROLE_MUTATION_ERR"], {
    clientMutationId: mutation.clientMutationId,
    clientMutationLabel,
    requestedDateTime,
  });
}

export function deleteRole(role, clientMutationLabel, clientMutationDetails = null) {
  let roleUuids = `uuids: ["${role.uuid}"]`;
  let mutation = formatMutation("deleteRole", roleUuids, clientMutationLabel, clientMutationDetails);
  var requestedDateTime = new Date();
  return graphql(mutation.payload, ["CORE_ROLE_MUTATION_REQ", "CORE_DELETE_ROLE_RESP", "CORE_ROLE_MUTATION_ERR"], {
    clientMutationId: mutation.clientMutationId,
    clientMutationLabel,
    requestedDateTime,
  });
}

export function roleNameValidationCheck(mm, variables) {
  return graphqlWithVariables(
    `
      query ($roleName: String!) {
        isValid: validateRoleName(roleName: $roleName)
      }
    `,
    variables,
    `CORE_ROLE_NAME_VALIDATION_FIELDS`,
  );
}

export function roleNameValidationClear() {
  return (dispatch) => {
    dispatch({ type: `CORE_ROLE_NAME_VALIDATION_FIELDS_CLEAR` });
  };
}

export function roleNameSetValid() {
  return (dispatch) => {
    dispatch({ type: `CORE_ROLE_NAME_VALIDATION_FIELDS_SET_VALID` });
  };
}

export function saveCurrentPaginationPage(page, afterCursor, beforeCursor, module) {
  return (dispatch) => {
    dispatch({ type: "CORE_PAGINATION_PAGE", payload: { page, afterCursor, beforeCursor, module } });
  };
}

export function clearCurrentPaginationPage() {
  return (dispatch) => {
    dispatch({ type: "CORE_PAGINATION_PAGE_CLEAR" });
  };
}

export function toggleCurrentCalendarType(isSecondaryCalendarEnabled) {
  return (dispatch) => {
    dispatch({ type: "CORE_CALENDAR_TYPE_TOGGLE", payload: { isSecondaryCalendarEnabled } });
  };
}

export function changeUserLanguage(language, clientMutationLabel) {
  const mutation = formatMutation("changeUserLanguage", `languageId: "${language}"`, clientMutationLabel);
  const requestedDateTime = new Date();

  return graphql(mutation.payload, ["CORE_MUTATION_REQ", "CHANGE_USER_LANGUAGE_RESP", "CORE_MUTATION_ERR"], {
    actionType: "CHANGE_USER_LANGUAGE_RESP",
    clientMutationId: mutation.clientMutationId,
    clientMutationLabel,
    requestedDateTime,
  });
}

const CANCEL_ASYNC_JOB_MUTATION = `
  mutation cancelAsyncJob($input: CancelAsyncJobMutationInput!) {
    cancelAsyncJob(input: $input) {
      clientMutationId
      internalId
    }
  }
`;

// Cooperative: the job stops at its next progress checkpoint, not instantly.
export function cancelAsyncJob(uuid) {
  return graphqlWithVariables(CANCEL_ASYNC_JOB_MUTATION, { input: { id: uuid } }, "CORE_CANCEL_ASYNC_JOB");
}
