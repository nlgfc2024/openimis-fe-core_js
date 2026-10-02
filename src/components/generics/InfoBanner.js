import React from "react";
import { Paper, Typography } from "@material-ui/core";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    alignItems: "flex-start",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1.5),
    backgroundColor: "#e3f2fd",
    color: "#174f7c",
  },
  icon: { marginTop: 2 },
  title: { fontWeight: 600 },
}));

const InfoBanner = ({ title, children }) => {
  const classes = useStyles();
  return (
    <Paper elevation={0} className={classes.root}>
      <InfoOutlinedIcon className={classes.icon} fontSize="small" />
      <div>
        {title && <Typography className={classes.title}>{title}</Typography>}
        {children && <Typography variant="body2">{children}</Typography>}
      </div>
    </Paper>
  );
};

export default InfoBanner;
