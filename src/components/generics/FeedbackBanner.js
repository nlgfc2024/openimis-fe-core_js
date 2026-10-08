import React from "react";
import { Paper, Typography } from "@material-ui/core";
import { fade, makeStyles } from "@material-ui/core/styles";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";

const icons = {
  error: ErrorOutlineIcon,
  info: InfoOutlinedIcon,
  success: CheckCircleOutlineIcon,
};

const useStyles = makeStyles((theme) => ({
  root: ({ severity }) => {
    const palette = theme.palette[severity] || theme.palette.info;
    return {
      alignItems: "flex-start",
      backgroundColor: fade(palette.main, 0.12),
      borderRadius: theme.shape.borderRadius,
      color: palette.dark,
      display: "flex",
      gap: theme.spacing(1),
      padding: theme.spacing(1.5),
    };
  },
  icon: { marginTop: 2 },
  title: { fontWeight: 600 },
}));

const FeedbackBanner = ({ children, severity = "info", title }) => {
  const classes = useStyles({ severity });
  const Icon = icons[severity] || icons.info;

  return (
    <Paper
      aria-live={severity === "error" ? "assertive" : "polite"}
      className={classes.root}
      elevation={0}
      role={severity === "error" ? "alert" : "status"}
    >
      <Icon className={classes.icon} fontSize="small" />
      <div>
        {title && <Typography className={classes.title}>{title}</Typography>}
        {children && (typeof children === "string" ? <Typography variant="body2">{children}</Typography> : children)}
      </div>
    </Paper>
  );
};

export default FeedbackBanner;
