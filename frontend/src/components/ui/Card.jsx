import React from "react";

export function Card({
  children,
  className = "",
  hover = false,
  padded = true,
  border = true,
  as: Component = "div",
  ...props
}) {
  return (
    <Component
      className={`card ${hover ? "card-hover" : ""} ${padded ? "card-padded" : ""} ${
        border ? "card-bordered" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className = "", ...props }) {
  return (
    <div className={`card-header ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "", ...props }) {
  return (
    <div className={`card-body ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", ...props }) {
  return (
    <div className={`card-footer ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
