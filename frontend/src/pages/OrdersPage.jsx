import React, { useState, useEffect, useCallback } from "react";
import { orderService, mapOrderError } from "../services/order.service.js";
import OrderCard from "../components/orders/OrderCard.jsx";
import EmptyOrdersState from "../components/orders/EmptyOrdersState.jsx";
import OrderFormModal from "../components/orders/OrderFormModal.jsx";
import OrderDetailModal from "../components/orders/OrderDetailModal.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import { Plus, RefreshCw, AlertCircle, Loader2, Package } from "lucide-react";

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.getOrders();
      setOrders(data);
    } catch (err) {
      setError(mapOrderError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle Order Creation / Update
  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingOrder) {
        const updated = await orderService.updateOrder(
          editingOrder.id,
          formData,
        );
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? updated : o)),
        );
        if (selectedOrder && selectedOrder.id === updated.id) {
          setSelectedOrder(updated);
        }
      } else {
        const created = await orderService.createOrder(formData);
        setOrders((prev) => [created, ...prev]);
        setSelectedOrder(created);
        setDetailModalOpen(true);
      }
      setFormModalOpen(false);
      setEditingOrder(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Order Cancellation
  const handleCancelOrder = async (orderId) => {
    setIsCancelling(true);
    try {
      const cancelled = await orderService.cancelOrder(orderId);
      setOrders((prev) =>
        prev.map((o) => (o.id === cancelled.id ? cancelled : o)),
      );
      setSelectedOrder(cancelled);
    } finally {
      setIsCancelling(false);
    }
  };

  const openCreateModal = () => {
    setEditingOrder(null);
    setFormModalOpen(true);
  };

  const openEditModal = (order) => {
    setEditingOrder(order);
    setFormModalOpen(true);
  };

  const openDetailModal = (order) => {
    setSelectedOrder(order);
    setDetailModalOpen(true);
  };

  return (
    <div className="orders-page-container">
      {/* Page Header */}
      <div className="orders-header">
        <div className="orders-header-title-group">
          <div className="orders-title-row">
            <h1 className="orders-page-title">Your Deliveries</h1>
            {!loading && !error && (
              <Badge variant="primary" size="md">
                {orders.length} {orders.length === 1 ? "order" : "orders"}
              </Badge>
            )}
          </div>
          <p className="orders-page-sub">
            Track and manage your outgoing fulfillment requests.
          </p>
        </div>

        <div className="orders-header-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchOrders}
            disabled={loading}
            aria-label="Refresh deliveries"
            title="Refresh deliveries"
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={openCreateModal}
          >
            Create a Delivery
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="orders-loading-state">
          <Loader2 size={32} className="spin loading-spinner" />
          <p>Loading your deliveries...</p>
        </div>
      ) : error ? (
        <div className="orders-error-state">
          <AlertCircle size={32} className="error-icon" />
          <h3>We couldn't load your deliveries</h3>
          <p>{error}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchOrders}
            icon={RefreshCw}
          >
            Try Again
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <EmptyOrdersState onCreateClick={openCreateModal} />
      ) : (
        <div className="orders-grid">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => openDetailModal(order)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <OrderFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingOrder(null);
        }}
        onSubmit={handleFormSubmit}
        initialOrder={editingOrder}
        isSubmitting={isSubmitting}
      />

      <OrderDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onEdit={openEditModal}
        onCancel={handleCancelOrder}
        isCancelling={isCancelling}
      />
    </div>
  );
}

export default OrdersPage;
