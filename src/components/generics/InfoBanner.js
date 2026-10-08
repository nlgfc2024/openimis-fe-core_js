import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import FeedbackBanner from "./FeedbackBanner";

const useStyles = makeStyles((theme) => ({
  root: { marginBottom: theme.spacing(2) },
}));

const InfoBanner = ({ title, children }) => {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <FeedbackBanner title={title}>{children}</FeedbackBanner>
    </div>
  );
};

export default InfoBanner;
