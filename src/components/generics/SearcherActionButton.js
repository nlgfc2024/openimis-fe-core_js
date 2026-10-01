import React from "react";

import { Typography, Button } from "@material-ui/core";

import { useModulesManager } from "@openimis/fe-core";
import { DEFAULT } from "../../constants";

const SearcherActionButton = ({
  onClick,
  startIcon,
  label,
  variant = "outlined",
  color = "primary",
  size = "small",
  disabled = false,
  className,
  borderless = true,
}) => {
  const modulesManager = useModulesManager();
  const isWorker = modulesManager.getConf("fe-core", "isWorker", DEFAULT.IS_WORKER);

  return (
    <Button
      variant={variant}
      color={color}
      size={size}
      disabled={disabled}
      className={className}
      style={borderless ? { border: 0 } : undefined}
      onClick={onClick}
      startIcon={startIcon}
    >
      {label && <Typography variant={isWorker ? "body2" : "subtitle1"}>{label}</Typography>}
    </Button>
  );
};

export default SearcherActionButton;
