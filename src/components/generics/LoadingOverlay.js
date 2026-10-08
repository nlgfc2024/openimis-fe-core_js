import React from "react";
import { Backdrop } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import LoadingButton from "./LoadingButton";

const useStyles = makeStyles((theme) => ({
  backdrop: {
    zIndex: theme.zIndex.modal + 1,
  },
  button: {
    fontSize: "1rem",
    minWidth: 220,
    padding: theme.spacing(1.5, 3),
  },
}));

const LoadingOverlay = ({ label, open }) => {
  const classes = useStyles();
  return (
    <Backdrop className={classes.backdrop} open={open}>
      <LoadingButton className={classes.button} color="primary" disableWhileLoading={false} loading loadingLabel={label} size="large" variant="contained" />
    </Backdrop>
  );
};

export default LoadingOverlay;
