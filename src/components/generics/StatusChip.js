import React from "react";
import { Chip } from "@material-ui/core";
import { fade, makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: ({ severity }) => {
    const palette = theme.palette[severity] || theme.palette.info;
    return {
      backgroundColor: fade(palette.main, 0.14),
      color: palette.dark,
      fontWeight: 500,
    };
  },
}));

const StatusChip = ({ label, severity = "info", size = "small" }) => {
  const classes = useStyles({ severity });
  return <Chip className={classes.root} label={label} size={size} />;
};

export default StatusChip;
