import React from "react";
import { PackageOpen, Plus } from "lucide-react";
import Button from "../ui/Button.jsx";

export function EmptyOrdersState({ onCreateClick }) {
  return (
    <div className="empty-orders-container">
      <div className="empty-orders-icon-box">
        <PackageOpen size={36} />
      </div>
      <h3 className="empty-orders-title">No deliveries yet</h3>
      <p className="empty-orders-sub">
        Create your first delivery and let your recipient choose where and when
        they would like it sent.
      </p>
      <Button
        variant="primary"
        size="md"
        icon={Plus}
        onClick={onCreateClick}
        className="empty-orders-btn"
      >
        Create a Delivery
      </Button>
    </div>
  );
}

export default EmptyOrdersState;
