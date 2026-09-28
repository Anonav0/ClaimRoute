import React from "react";
import { Loader2 } from "lucide-react";

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  className = "",
  icon: Icon,
  iconPosition = "left",
  ...props
}) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={size === "sm" ? 14 : 16} className="btn-spinner" />
      ) : (
        Icon &&
        iconPosition === "left" && (
          <Icon size={size === "sm" ? 15 : 18} className="btn-icon left" />
        )
      )}
      <span className="btn-content">{children}</span>
      {!isLoading && Icon && iconPosition === "right" && (
        <Icon size={size === "sm" ? 15 : 18} className="btn-icon right" />
      )}
    </button>
  );
}

export default Button;
