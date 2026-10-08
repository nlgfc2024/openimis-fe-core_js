import React, { Component } from "react";
import { bindActionCreators } from "redux";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
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
import { clearAlert } from "../../actions";
import { formatMessage } from "../../helpers/i18n";
import { ensureArray } from "../../helpers/utils";
import FeedbackBanner from "../generics/FeedbackBanner";

class AlertDialog extends Component {
  state = {
    expanded: false,
  };

  toggleOpen = () => {
    this.setState({ expanded: !this.state.expanded });
  };

  dismissAlert = () => {
    const { clearAlert } = this.props;
    clearAlert();
  };

  render() {
    const { intl, alert } = this.props;
    const isSuccess = alert?.severity === "success";
    return (
      <Dialog
        open={Boolean(alert)}
        onClose={this.dismissAlert}
      >
        {alert && (
          <>
            {!isSuccess && <DialogTitle>{alert.title ?? formatMessage(intl, "core", "FatalError.title")}</DialogTitle>}
            <DialogContent>
              {isSuccess ? (
                <FeedbackBanner severity="success" title={alert.title}>
                  {ensureArray(alert.message).map((message, i) => (
                    <DialogContentText key={`message-${i}`} style={{ color: "inherit", marginBottom: 0 }}>{message}</DialogContentText>
                  ))}
                </FeedbackBanner>
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

export default injectIntl(connect((state) => ({ alert: state.core.alert }), mapDispatchToProps)(AlertDialog));
