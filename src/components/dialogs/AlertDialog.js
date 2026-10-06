import React, { Component } from "react";
import { bindActionCreators } from "redux";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { withTheme } from "@material-ui/core/styles";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
  Grid,
} from "@material-ui/core";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import ArrowRightIcon from "@material-ui/icons/ArrowRight";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import { clearAlert } from "../../actions";
import { formatMessage } from "../../helpers/i18n";
import { ensureArray } from "../../helpers/utils";

class AlertDialog extends Component {
  state = {
    expanded: false,
  };

  toggleOpen = () => {
    this.setState({ expanded: !this.state.expanded });
  };

  dismissAlert = () => {
    const { alert, clearAlert } = this.props;
    const refreshOnClose = alert?.refreshOnClose;
    clearAlert();
    if (refreshOnClose && typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    const { intl, alert, theme } = this.props;
    const isSuccess = alert?.severity === "success";
    return (
      <Dialog
        open={Boolean(alert)}
        onClose={this.dismissAlert}
        disableBackdropClick={Boolean(alert?.refreshOnClose)}
        disableEscapeKeyDown={Boolean(alert?.refreshOnClose)}
      >
        {alert && (
          <>
            {!isSuccess && <DialogTitle>{alert.title ?? formatMessage(intl, "core", "FatalError.title")}</DialogTitle>}
            <DialogContent>
              {isSuccess ? (
                <Grid
                  container
                  wrap="nowrap"
                  style={{
                    backgroundColor: theme.palette.success.light,
                    borderRadius: theme.shape.borderRadius,
                    color: theme.palette.success.dark,
                    gap: theme.spacing(1.5),
                    padding: theme.spacing(2),
                  }}
                >
                  <CheckCircleOutlineIcon aria-hidden="true" />
                  <Grid item>
                    <Typography variant="subtitle1" style={{ fontWeight: 600 }}>{alert.title}</Typography>
                    {ensureArray(alert.message).map((message, i) => (
                      <DialogContentText key={`message-${i}`} style={{ color: "inherit", marginBottom: 0 }}>{message}</DialogContentText>
                    ))}
                  </Grid>
                </Grid>
              ) : (
                <Grid container>
                  <Grid item onClick={this.toggleOpen}>
                    {alert.detail && this.state.expanded && <ArrowDropDownIcon />}
                    {alert.detail && !this.state.expanded && <ArrowRightIcon />}
                  </Grid>
                  <Grid item>
                    <Grid container onClick={this.toggleOpen}>
                      {ensureArray(alert.message ?? formatMessage(intl, "core", "FatalError.message")).map(
                        (message, i) => (
                          <Grid key={`message-${i}`} item>
                            <DialogContentText>{message}</DialogContentText>
                          </Grid>
                        ),
                      )}
                    </Grid>
                    {alert.detail && (
                      <Typography style={{ visibility: this.state.expanded ? "visible" : "hidden" }}>
                        {alert.detail}
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              )}
            </DialogContent>
          </>
        )}
        <DialogActions>
          <Button onClick={this.dismissAlert} color="primary" autoFocus>
            {formatMessage(intl, "core", "close")}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      clearAlert,
    },
    dispatch,
  );
};

export default withTheme(injectIntl(connect((state) => ({ alert: state.core.alert }), mapDispatchToProps)(AlertDialog)));
