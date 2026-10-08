import React from "react";
import { Button, CircularProgress } from "@material-ui/core";

const LoadingButton = ({ children, disabled, disableWhileLoading = true, loading = false, loadingLabel, startIcon, ...props }) => (
  <Button
    {...props}
    disabled={disabled || (loading && disableWhileLoading)}
    startIcon={loading ? <CircularProgress color="inherit" size={16} /> : startIcon}
  >
    {loading ? loadingLabel : children}
  </Button>
);

export default LoadingButton;
