import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import { Package, AlertCircle } from "lucide-react";
import { mapOrderError } from "../../services/order.service.js";

export function OrderFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialOrder = null,
  isSubmitting = false,
}) {
  const isEditing = Boolean(initialOrder);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [deliveryTimeframe, setDeliveryTimeframe] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (initialOrder) {
      const itemName =
        typeof initialOrder.item === "object"
          ? initialOrder.item.name
          : initialOrder.item || "";
      const itemDesc =
        typeof initialOrder.item === "object"
          ? initialOrder.item.description
          : initialOrder.description || "";

      setName(itemName);
      setDescription(itemDesc);
      setQuantity(initialOrder.quantity || 1);
      setDeliveryTimeframe(initialOrder.deliveryTimeframe || "");
      setNotes(initialOrder.notes || "");
    } else {
      setName("");
      setDescription("");
      setQuantity(1);
      setDeliveryTimeframe("");
      setNotes("");
    }
    setErrorMsg(null);
  }, [initialOrder, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Please enter an item name.");
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg("Quantity must be at least 1.");
      return;
    }

    const payload = {
      item: {
        name: name.trim(),
        description: description.trim(),
      },
      quantity: qty,
      deliveryTimeframe: deliveryTimeframe.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setErrorMsg(mapOrderError(err));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Delivery Information" : "Create a New Delivery"}
    >
      <form onSubmit={handleSubmit} className="order-form">
        {errorMsg && (
          <div className="form-error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="order-item-name" className="field-label">
            Item / Gift Name <span className="required">*</span>
          </label>
          <input
            id="order-item-name"
            type="text"
            placeholder="e.g. Artisanal Ceramic Mug Set"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            className="form-input"
            autoFocus
          />
          <span className="field-hint">
            What is being fulfilled or delivered?
          </span>
        </div>

        <div className="form-field">
          <label htmlFor="order-description" className="field-label">
            Item Description <span className="optional">(optional)</span>
          </label>
          <textarea
            id="order-description"
            rows={2}
            placeholder="e.g. Set of 2 handmade mugs in gift packaging"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            className="form-textarea"
          />
        </div>

        <div className="form-row-2">
          <div className="form-field">
            <label htmlFor="order-quantity" className="field-label">
              Quantity <span className="required">*</span>
            </label>
            <input
              id="order-quantity"
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label htmlFor="order-timeframe" className="field-label">
              Delivery Window <span className="optional">(optional)</span>
            </label>
            <input
              id="order-timeframe"
              type="text"
              placeholder="e.g. Before Friday, Anytime"
              value={deliveryTimeframe}
              onChange={(e) => setDeliveryTimeframe(e.target.value)}
              maxLength={100}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="order-notes" className="field-label">
            Sender Notes <span className="optional">(optional)</span>
          </label>
          <input
            id="order-notes"
            type="text"
            placeholder="e.g. Fragile glassware, handle gently"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            className="form-input"
          />
          <span className="field-hint">
            Internal note for courier or fulfillment team.
          </span>
        </div>

        <div className="form-footer-actions">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            icon={Package}
            className="btn-create-submit"
          >
            {isEditing ? "Save Changes" : "Create Delivery"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default OrderFormModal;
