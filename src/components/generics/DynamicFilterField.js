import React from "react";
import Autocomplete from "../inputs/Autocomplete";
import NumberInput from "../inputs/NumberInput";
import TextInput from "../inputs/TextInput";
import PublishedComponent from "./PublishedComponent";

const BOOLEAN_OPTIONS = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
];

function findSelectedOption(options, value) {
  if (value === "" || value === null || value === undefined) return null;
  return options.find((option) => option.value === value) || null;
}

function findSelectedOptions(options, values) {
  if (!Array.isArray(values)) return [];
  return options.filter((option) => values.includes(option.value));
}

/**
 * Renders one input for a module driving a filter form from a schema
 * instead of one component per field.
 *
 * @param {object} props
 * @param {string} props.module - caller's i18n module name
 * @param {object} props.field - field definition:
 *   - {string} name, label
 *   - {"text"|"number"|"boolean"|"select"|"multiselect"|"location"} [type="text"]
 *   - {boolean} [required]
 *   - {Array<{value, label}>} [options] - required for select/multiselect
 *   - {number} [min], [max]
 *   - {number} [maxLevel] - location depth cap
 * @param {*} props.value - array for multiselect, raw hierarchical value for
 *   location, plain value otherwise
 * @param {(value: *) => void} props.onChange
 * @param {boolean} [props.readOnly]
 *
 * @example
 * <DynamicFilterField
 *   module={MY_MODULE}
 *   field={field}
 *   value={filters[field.name]}
 *   onChange={(value) => setFilters({ ...filters, [field.name]: value })}
 * />
 */
function DynamicFilterField({ module, field, value, onChange, readOnly }) {
  const { type, label, required, options } = field;

  switch (type) {
    case "location":
      return (
        <PublishedComponent
          pubRef="location.LocationCascader"
          value={value}
          onChange={onChange}
          withLabel
          label={label}
          readOnly={readOnly}
          required={!!required}
          maxLevel={field.maxLevel}
        />
      );

    case "number":
      return (
        <NumberInput
          module={module}
          label={label}
          min={field.min}
          max={field.max}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      );

    case "boolean":
      return (
        <Autocomplete
          module={module}
          label={label}
          options={BOOLEAN_OPTIONS}
          value={findSelectedOption(BOOLEAN_OPTIONS, value)}
          onChange={(option) => onChange(option?.value ?? null)}
          onInputChange={() => {}}
          getOptionLabel={(option) => option.label}
          getOptionSelected={(option, v) => option.value === v?.value}
          readOnly={readOnly}
          required={!!required}
        />
      );

    case "multiselect":
      return (
        <Autocomplete
          module={module}
          label={label}
          multiple
          options={options || []}
          value={findSelectedOptions(options || [], value)}
          onChange={(selected) => onChange((selected || []).map((option) => option.value))}
          onInputChange={() => {}}
          getOptionLabel={(option) => option.label}
          getOptionSelected={(option, v) => option.value === v?.value}
          readOnly={readOnly}
        />
      );

    case "select":
      return (
        <Autocomplete
          module={module}
          label={label}
          options={options || []}
          value={findSelectedOption(options || [], value)}
          onChange={(option) => onChange(option?.value ?? "")}
          onInputChange={() => {}}
          getOptionLabel={(option) => option.label}
          getOptionSelected={(option, v) => option.value === v?.value}
          readOnly={readOnly}
          required={!!required}
        />
      );

    case "text":
    default:
      return (
        <TextInput
          module={module}
          label={label}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          required={!!required}
        />
      );
  }
}

export default DynamicFilterField;
