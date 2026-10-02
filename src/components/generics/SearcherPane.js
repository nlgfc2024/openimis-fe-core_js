import React, { Component, Fragment } from "react";
import { injectIntl } from "react-intl";
import _debounce from "lodash/debounce";
import {
  Grid,
  Paper,
  Divider,
} from "@material-ui/core";
import { withTheme, withStyles } from "@material-ui/core/styles";
import {
  YoutubeSearchedFor as ResetFilterIcon,
  Search as DefaultSearchIcon,
} from "@material-ui/icons";

import { SearcherActionButton } from "@openimis/fe-core";
import { DEFAULT_DEBOUNCE_TIME, ENTER_KEY } from "../../constants";
import { formatMessage } from "../../helpers/i18n";
import AdvancedFiltersDialog from "../dialogs/AdvancedFiltersDialog";
import FormattedMessage from "./FormattedMessage";

const styles = (theme) => ({
  panel: {
    margin: theme.spacing(0),
    backgroundColor: theme.palette.common.white,
  },
  panelSummary: {
    backgroundColor: theme.paper.header.backgroundColor,
    color: theme.palette.primary.main,
    minHeight: "36px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing(0, 2),
  },
  panelDetails: {
    backgroundColor: theme.paper.body.backgroundColor,
    padding: theme.spacing(2),
    width: "100%",
    display: "block",
  },
  panelTitle: theme.paper.title,
  paper: theme.paper.body,
  paperDivider: theme.paper.divider,
  paperHeaderAction: {
    ...theme.paper.action,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  paperHeader: {
    ...theme.paper.header,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center"
  },
});

class SearcherPane extends Component {
  constructor(props) {
    super(props);
    const { refresh = () => {}, reset = () => {} } = this.props;
    this.debouncedRefresh = _debounce(refresh, DEFAULT_DEBOUNCE_TIME);
    this.debouncedReset = _debounce(reset, DEFAULT_DEBOUNCE_TIME);
  }

  handleKeyDown = (event) => {
    if (event.key === ENTER_KEY) {
      if(!event.target.value){
        this.debouncedRefresh();
      }
    }
  };

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  render() {
    const {
      classes,
      module,
      del,
      title = "search.title",
      filterPane,
      filters,
      resultsPane = null,
      reset,
      refresh,
      actions,
      isCustomFiltering = false,
      objectForCustomFiltering = null,
      additionalCustomFilterParams = null,
      moduleName = null,
      objectType = null,
      setAppliedCustomFilters = null,
      appliedCustomFilters = null,
      onChangeFilters,
      appliedFiltersRowStructure = null,
      setAppliedFiltersRowStructure = null,
      applyNumberCircle = null,
    } = this.props;

    return (
      <Paper className={classes.paper}>
        <div className={classes.panel}>
          <div className={classes.panelSummary}>
            <Grid item xs className={classes.panelTitle}>
              <FormattedMessage module={module} id={title} />
            </Grid>
            <Grid item className={classes.paperHeader}>
              {isCustomFiltering && (
                <AdvancedFiltersDialog
                  object={objectForCustomFiltering}
                  additionalParams={additionalCustomFilterParams}
                  moduleName={moduleName}
                  objectType={objectType}
                  setAppliedCustomFilters={setAppliedCustomFilters}
                  appliedCustomFilters={appliedCustomFilters}
                  onChangeFilters={onChangeFilters}
                  appliedFiltersRowStructure={appliedFiltersRowStructure}
                  setAppliedFiltersRowStructure={setAppliedFiltersRowStructure}
                  applyNumberCircle={applyNumberCircle}
                  searchCriteria={filters}
                  deleteFilter={del}
                />
              )}
              {!!actions &&
                actions.map((a, idx) => (
                  <SearcherActionButton
                    key={`action-${idx}`}
                    onClick={a.action}
                    startIcon={a.icon}
                    label={a.label || ""}
                  />
                ))}
              {!!reset && (
                <SearcherActionButton
                  startIcon={<ResetFilterIcon />}
                  onClick={this.debouncedReset}
                  label={formatMessage(this.props.intl, module, "resetFilterTooltip")}
                />
              )}
              {!!refresh && (
                <SearcherActionButton
                  startIcon={<DefaultSearchIcon />}
                  onClick={this.debouncedRefresh}
                  label={formatMessage(this.props.intl, module, "refreshFilterTooltip")}
                />
              )}
            </Grid>
          </div>

          <div className={classes.panelDetails}>
            <Grid container spacing={1}>
              {!!filterPane && (
                <Fragment>
                  <Grid item xs={12} className={classes.paperDivider}>
                    <Divider />
                  </Grid>
                  {filterPane}
                </Fragment>
              )}
              {!!resultsPane && (
                <Fragment>
                  <Grid item xs={12} className={classes.paperDivider}>
                    <Divider />
                  </Grid>
                  {resultsPane}
                </Fragment>
              )}
            </Grid>
          </div>
        </div>
      </Paper>
    );
  }
}

export default injectIntl(withTheme(withStyles(styles)(SearcherPane)));
