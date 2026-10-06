import React from "react";
import { injectIntl } from "react-intl";
import { fade, withTheme, withStyles } from "@material-ui/core/styles";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@material-ui/core";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import WarningOutlinedIcon from "@material-ui/icons/WarningOutlined";
import { formatMessage } from "../../helpers/i18n";

const styles = (theme) => ({
  primaryButton: theme.dialog.primaryButton,
  secondaryButton: theme.dialog.secondaryButton,
  warningContent: {
    alignItems: "flex-start",
    backgroundColor: fade(theme.palette.warning.main, 0.14),
    borderRadius: 4,
    color: theme.palette.warning.dark,
    display: "flex",
    gap: theme.spacing(1),
    margin: `${theme.spacing(1)}px ${theme.spacing(3)}px`,
    padding: theme.spacing(2),
  },
  warningIcon: {
    marginTop: 2,
  },
  warningMessage: {
    color: "inherit",
    margin: 0,
  },
  infoContent: {
    alignItems: "flex-start",
    backgroundColor: fade(theme.palette.info.main, 0.12),
    borderRadius: 4,
    color: theme.palette.info.dark,
    display: "flex",
    gap: theme.spacing(1),
    margin: `${theme.spacing(1)}px ${theme.spacing(3)}px`,
    padding: theme.spacing(2),
  },
  infoIcon: {
    marginTop: 2,
  },
  infoMessage: {
    color: "inherit",
    margin: 0,
  },
});

const ConfirmDialog = props => {
  const { intl, classes, confirm, onConfirm} = props;
  const isWarning = confirm?.severity === "warning";
  const isInfo = confirm?.severity === "info";
  return (
    <div>
      <Dialog open={!!confirm} onClose={() => onConfirm(false)} aria-labelledby="confirm-dialog-title">
        {confirm?.title && <DialogTitle id="confirm-dialog-title">{confirm.title}</DialogTitle>}
        {confirm?.message && (
          <DialogContent className={isWarning ? classes.warningContent : isInfo ? classes.infoContent : undefined}>
            {isWarning && <WarningOutlinedIcon className={classes.warningIcon} aria-hidden="true" />}
            {isInfo && <InfoOutlinedIcon className={classes.infoIcon} aria-hidden="true" />}
            <DialogContentText className={isWarning ? classes.warningMessage : isInfo ? classes.infoMessage : undefined}>{confirm.message}</DialogContentText>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => onConfirm(true)} autoFocus className={classes.primaryButton}>
            {formatMessage(intl, "core", "ok")}
          </Button>
          <Button onClick={() => onConfirm(false)} className={classes.secondaryButton}>
            {formatMessage(intl, "core", "cancel")}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default withTheme(withStyles(styles)(injectIntl(ConfirmDialog)));
