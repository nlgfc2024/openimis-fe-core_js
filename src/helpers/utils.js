import { baseApiUrl, logout } from "../actions";
import { SAML_LOGOUT_PATH } from "../constants";

export const ensureArray = (maybeArray) => {
  if (Array.isArray(maybeArray)) {
    return maybeArray;
  } else if (maybeArray !== null && maybeArray !== undefined) {
    return [maybeArray];
  } else {
    return [];
  }
};

export const prepareForComparison = (stateRole, propsRole, roleRights) => {
  const tempStateRole = { ...stateRole };
  delete tempStateRole.roleRights;

  const tempPropsRole = { ...propsRole, isSystem: !!propsRole?.isSystem };

  const tempRoleRights = roleRights?.map((right) => right?.rightId);

  return {
    stateRole: tempStateRole,
    propsRole: tempPropsRole,
    convertedRoleRights: tempRoleRights || [],
  };
};

export function getTimeDifferenceInDays(_firstDate, _secondDate) {
  let firstDate = new Date(_firstDate);
  let secondDate = new Date(_secondDate);
  const timeDelta = firstDate.getTime() - secondDate.getTime();
  const timeInDays = Math.ceil(timeDelta / (1000 * 60 * 60 * 24));

  return timeInDays;
}

export function getTimeDifferenceInDaysFromToday(dateToCheck) {
  const currentDate = new Date();
  return getTimeDifferenceInDays(dateToCheck, currentDate);
}

export const onLogout = async (dispatch) => {
  const result = await dispatch(logout());
  if (result?.type === "CORE_AUTH_LOGOUT") localStorage.clear();
  return result;
};

export const redirectToSamlLogout = (e) => {
  e.preventDefault();
  localStorage.clear();
  const redirectToURL = new URL(`${window.location.origin}${baseApiUrl}${SAML_LOGOUT_PATH}`);

  window.location.href = redirectToURL.href;
};

export const getLanguageNameByCode = (languages, languageCode) => {
  return languages.find((language) => language.code === languageCode)?.name;
}

export function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}

// value is expected to be a number, not string
export function getDecimalPlaces(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;

  const str = String(Number(value));
  if (!str.includes('.')) return 0;
  return str.split('.')[1]?.length || 0;
}


export function menuEntryMatchesLocationPath(entry) {
  const pathname = location.pathname
  return (
    pathname === `/front${entry.route}`
    || pathname.startsWith(`/front${entry.route}/`)
  )
}
