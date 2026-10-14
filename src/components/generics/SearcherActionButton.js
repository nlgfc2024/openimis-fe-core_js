import React from "react";

import { Typography, Button } from "@material-ui/core";

const SearcherActionButton = ({
  onClick,
  startIcon,
  label,
  variant = "outlined",
  color = "primary",
  size = "medium",
  disabled = false,
  className,
  borderless = true,
}) => {
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
      {label && <Typography variant="body2">{label}</Typography>}
    </Button>
  );
};

export default SearcherActionButton;
