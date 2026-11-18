import React, { useState } from "react";
import { injectIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Tooltip,
} from "@material-ui/core";
import withStyles from "@material-ui/core/styles/withStyles";
import GetAppIcon from "@material-ui/icons/GetApp";

import { closeExportConfigDialog, openExportConfigDialog } from "../../actions";
import { EXPORT_FILE_FORMATS } from "../../constants";
import { decodeId } from "../../helpers/api";
import { formatMessage } from "../../helpers/i18n";
import ExportConfigDialog from "../dialogs/ExportConfigDialog";
import SearcherActionButton from "./SearcherActionButton";
import PublishedComponent from "./PublishedComponent";

const styles = (theme) => ({
  error: {
    padding: theme.spacing(2),
  },
  errorHeader: {
    color: theme.palette.error.main,
  },
  errorDetail: {
    color: theme.palette.error.main,
  },
});

function SearcherExport(props) {
  const {
    intl,
    selection,
    filters,
    exportFetch,
    exportFields,
    exportFieldsColumns,
    chooseExportableColumns,
    additionalExportFields,
    chooseFileFormat,
    exportFileFormats,
    exportFileFormat = EXPORT_FILE_FORMATS.csv,
    setExportFileFormat,
    label = null,
    selectWithCheckbox,
    downloadWithIconButton,
    displayClearAllColsButton,
    exportOptions,
  } = props;

  const [exportStatus, setExport] = useState(0);
  const [exportOptionDialogOpen, setExportOptionDialogOpen] = useState(false);
  const [selectedExportOption, setSelectedExportOption] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const dispatch = useDispatch();
  const isExportConfigDialogOpen = useSelector((state) => state.core?.isExportConfigDialogOpen);

  const enabled = (selection) => (selectWithCheckbox ? !selection?.length && exportStatus === 0 : exportStatus === 0);

  const exportData = (
    fields = exportFields,
    columns = exportFieldsColumns,
    additionalFields = additionalExportFields,
    exportOption = null,
  ) => {
    const defaultFilters = Object.keys(filters)
      .filter((f) => !!filters[f]["filter"])
      .map((f) => filters[f]["filter"]);

    const additionalFilters = Object.entries(additionalFields || {}).map(([key, value]) => `${key}: "${value}"`);
    const optionParameters = exportOption?.parameters || [];
    const optionArgumentNames = new Set(
      optionParameters
        .map((parameter) => parameter.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/)?.[1])
        .filter(Boolean),
    );
    // An export option can deliberately override an existing page filter. For
    // KYC this is the Phase selected in the dialog; sending both values creates
    // an invalid GraphQL request with two `benefitPlanId` arguments.
    const isOverriddenByOption = (parameter) => {
      const name = parameter.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/)?.[1];
      return name && optionArgumentNames.has(name);
    };
    const parameters = [
      ...defaultFilters.filter((parameter) => !isOverriddenByOption(parameter)),
      ...additionalFilters.filter((parameter) => !isOverriddenByOption(parameter)),
    ];

    parameters.push(`fileFormat: "${exportFileFormat}"`);
    parameters.push(`fields: ${JSON.stringify(fields)}`);
    parameters.push(`fieldsColumns: "${JSON.stringify(columns).replace(/\"/g, '\\"')}"`);
    parameters.push(...optionParameters);
    exportFetch(parameters);
  };

  const handleExportData = (exportOption = null) => {
    if (chooseExportableColumns || chooseFileFormat) {
      // Preserve dynamic option parameters (notably the Phase selected for a
      // KYC export) until the user confirms the column configuration dialog.
      // Without this, `handleColumnFiltering` exported using the original
      // option and silently dropped `benefitPlanId`.
      setSelectedExportOption(exportOption);
      dispatch(openExportConfigDialog());
    } else {
      exportData(exportFields, exportFieldsColumns, additionalExportFields, exportOption);
    }
  };

  const handleColumnFiltering = (fields, columns) => {
    exportData(fields, columns, additionalExportFields, selectedExportOption);
  };

  const configuredFields = selectedExportOption?.fields || exportFields;
  const configuredColumns = selectedExportOption?.columns || exportFieldsColumns;

  const parseToDialogColumns = (columns, fields) => {
    return fields.reduce(
      (dialogColumns, field) => {
        if (!(field in dialogColumns)) {
          dialogColumns[field] = field.startsWith("json_ext__") ? field.replace(/^json_ext__/, "") : field;
        }
        return dialogColumns;
      },
      { ...columns },
    );
  };

  const entries = exportOptions?.length ? [{
    text: label || formatMessage(intl, "core", "exportSearchResult"),
    icon: <GetAppIcon />,
    action: () => setExportOptionDialogOpen(true),
  }] : [
    {
      text: label || formatMessage(intl, "core", "exportSearchResult"),
      icon: <GetAppIcon />,
      action: handleExportData,
    },
  ];

  return (
    <>
      {(chooseExportableColumns || chooseFileFormat) && (
        <ExportConfigDialog
          confirmState={isExportConfigDialogOpen}
          onConfirm={() => dispatch(closeExportConfigDialog())}
          onClose={() => dispatch(closeExportConfigDialog())}
          module="core"
          getFilteredFieldsAndColumn={handleColumnFiltering}
          columns={parseToDialogColumns(configuredColumns, configuredFields)}
          exportFileFormat={exportFileFormat}
          setExportFileFormat={setExportFileFormat}
          exportFileFormats={exportFileFormats}
          chooseFileFormat={chooseFileFormat}
          chooseExportableColumns={chooseExportableColumns}
          displayClearAllColsButton={displayClearAllColsButton}
        />
      )}
      {exportOptions?.length && (
        <Dialog open={exportOptionDialogOpen} onClose={() => setExportOptionDialogOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>{label || formatMessage(intl, "core", "exportSearchResult")}</DialogTitle>
          <DialogContent>
            <Select
              fullWidth
              displayEmpty
              value={selectedExportOption?.label || ""}
              onChange={(event) => setSelectedExportOption(
                exportOptions.find((option) => option.label === event.target.value) || null,
              )}
            >
              <MenuItem value="" disabled>Select export type</MenuItem>
              {exportOptions.map((option) => (
                <MenuItem key={option.label} value={option.label}>{option.label}</MenuItem>
              ))}
            </Select>
            {selectedExportOption?.requiresPhase && (
              <PublishedComponent
                pubRef="socialProtection.BenefitPlanPicker"
                type="GROUP"
                withLabel
                label="Phase"
                value={selectedPhase}
                onChange={setSelectedPhase}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExportOptionDialogOpen(false)}>
              {formatMessage(intl, "core", "exportConfigDialog.cancelButton")}
            </Button>
            <Button
              color="primary"
              variant="contained"
              disabled={!selectedExportOption || (selectedExportOption.requiresPhase && !selectedPhase)}
              onClick={() => {
                setExportOptionDialogOpen(false);
                // The picker returns a Relay global ID, while the group
                // export's benefitPlanId filter expects the underlying UUID.
                const phaseId = decodeId(selectedPhase.id);
                handleExportData({
                  ...selectedExportOption,
                  parameters: [
                    ...(selectedExportOption.parameters || []),
                    ...(selectedExportOption.requiresPhase ? [`benefitPlanId: "${phaseId}"`] : []),
                  ],
                });
              }}
            >
              {formatMessage(intl, "core", "exportConfigDialog.confirmButton")}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <div>
        {entries.map((item, idx) => (
          <Tooltip title={formatMessage(intl, "core", "exportSearchResult.tooltip")}>
            <div key={`selectionsMenu-export-${idx}`}>
              {downloadWithIconButton ? (
                <SearcherActionButton
                  onClick={item.action}
                  disabled={!enabled(selection)}
                  variant="outlined"
                  startIcon={item.icon}
                  label={item.text}
                  size="medium"
                  borderless={false}
                />
              ) : (
                <MenuItem onClick={(e) => item.action()} disabled={!enabled(selection)}>
                  {item.text}
                </MenuItem>
              )}
            </div>
          </Tooltip>
        ))}
      </div>
    </>
  );
}

export default injectIntl(withStyles(styles)(SearcherExport));
