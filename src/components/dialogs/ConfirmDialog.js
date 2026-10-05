import React from "react";
import { injectIntl } from "react-intl";
import { withTheme, withStyles } from "@material-ui/core/styles";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@material-ui/core";
import WarningOutlinedIcon from "@material-ui/icons/WarningOutlined";
import { formatMessage } from "../../helpers/i18n";

const styles = (theme) => ({
  primaryButton: theme.dialog.primaryButton,
  secondaryButton: theme.dialog.secondaryButton,
  warningContent: {
    alignItems: "flex-start",
    backgroundColor: "#bd7300",
    borderRadius: 4,
    color: "#fff",
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
});

const ConfirmDialog = props => {
  const { intl, classes, confirm, onConfirm} = props;
  const isWarning = confirm?.severity === "warning";
  return (
    <div>
      <Dialog open={!!confirm} onClose={() => onConfirm(false)} aria-labelledby="confirm-dialog-title">
        {confirm?.title && <DialogTitle id="confirm-dialog-title">{confirm.title}</DialogTitle>}
        {confirm?.message && (
          <DialogContent className={isWarning ? classes.warningContent : undefined}>
            {isWarning && <WarningOutlinedIcon className={classes.warningIcon} aria-hidden="true" />}
            <DialogContentText className={isWarning ? classes.warningMessage : undefined}>{confirm.message}</DialogContentText>
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
