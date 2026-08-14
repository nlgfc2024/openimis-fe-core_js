import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Button, Grid, LinearProgress, Typography, Chip } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import { cancelAsyncJob } from "../actions";
import { useAsyncJob } from "../helpers/hooks";
import { useModulesManager } from "../helpers/modules";
import { useTranslations } from "../helpers/i18n";
import { formatServerError } from "../helpers/api";
import Error from "./generics/Error";

const useStyles = makeStyles((theme) => ({
  container: { padding: theme.spacing(1) },
  bar: { marginTop: theme.spacing(1), marginBottom: theme.spacing(1) },
  error: { color: theme.palette.error.main },
  metrics: { color: theme.palette.text.secondary },
}));

const RUNNING_STATUSES = ["RECEIVED", "QUEUED", "RUNNING"];

const AsyncJobProgress = ({ uuid, clientMutationId, actions }) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations("core", modulesManager);
  const { job, error, isTerminal, refetch } = useAsyncJob({ uuid, clientMutationId });
  const [cancelling, setCancelling] = useState(false);

  const onCancel = async () => {
    setCancelling(true);
    await dispatch(cancelAsyncJob(job.uuid));
    await refetch();
    setCancelling(false);
  };

  if (error) return <Error error={formatServerError(error)} />;
  if (!job) {
    return (
      <Grid container className={classes.container}>
        <Grid item xs={12}>
          <LinearProgress className={classes.bar} />
          <Typography variant="body2">{formatMessage("asyncJob.waiting")}</Typography>
        </Grid>
      </Grid>
    );
  }

  const percent = job.total ? Math.min(100, Math.round((100 * job.processed) / job.total)) : null;
  const running = RUNNING_STATUSES.includes(job.status);
  const metrics = Object.entries(job.metrics ?? {});

  return (
    <Grid container className={classes.container} spacing={1} alignItems="center">
      <Grid item>
        <Chip size="small" label={formatMessage(`asyncJob.status.${job.status}`)} />
      </Grid>
      {percent !== null && (
        <Grid item>
          <Typography variant="body2">
            {formatMessageWithValues("asyncJob.progress", {
              processed: job.processed,
              total: job.total,
              percent,
            })}
          </Typography>
        </Grid>
      )}
      {metrics.length > 0 && (
        <Grid item>
          <Typography variant="body2" className={classes.metrics}>
            {metrics.map(([name, value]) => `${name}: ${value}`).join(" · ")}
          </Typography>
        </Grid>
      )}
      {running && (
        <Grid item>
          <Button size="small" variant="outlined" onClick={onCancel} disabled={cancelling}>
            {formatMessage("asyncJob.cancel")}
          </Button>
        </Grid>
      )}
      {!!actions && (
        <Grid item style={{ marginLeft: "auto" }}>
          {actions}
        </Grid>
      )}
      <Grid item xs={12}>
        {running && (
          <LinearProgress
            className={classes.bar}
            variant={percent !== null ? "determinate" : "indeterminate"}
            value={percent ?? 0}
          />
        )}
        {isTerminal && percent !== null && (
          <LinearProgress className={classes.bar} variant="determinate" value={percent} />
        )}
      </Grid>
      {!!job.message && (
        <Grid item xs={12}>
          <Typography variant="body2">{job.message}</Typography>
        </Grid>
      )}
      {!!job.error && (
        <Grid item xs={12}>
          <Typography variant="body2" className={classes.error}>
            {job.error}
          </Typography>
        </Grid>
      )}
    </Grid>
  );
};

export default AsyncJobProgress;
