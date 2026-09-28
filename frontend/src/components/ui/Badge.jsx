import React from "react";

export function Badge({
  children,
  variant = "neutral", // 'neutral' | 'primary' | 'warm' | 'success' | 'warning' | 'error'
  size = "md", // 'sm' | 'md'
  icon: Icon,
  className = "",
  ...props
}) {
  return (
    <span
      className={`badge badge-${variant} badge-${size} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === "sm" ? 12 : 14} className="badge-icon" />}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
