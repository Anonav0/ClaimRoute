import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardSummaryCards from "../components/dashboard/DashboardSummaryCards.jsx";
import DashboardAttentionSection from "../components/dashboard/DashboardAttentionSection.jsx";
import DashboardFilters from "../components/dashboard/DashboardFilters.jsx";
import DashboardOrderTable from "../components/dashboard/DashboardOrderTable.jsx";
import DashboardDetailModal from "../components/dashboard/DashboardDetailModal.jsx";
import Button from "../components/ui/Button.jsx";
import {
  RefreshCw,
  Package,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import dashboardService from "../services/dashboard.service.js";

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 15,
    hasNextPage: false,
    nextCursor: null,
  });
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [error, setError] = useState(null);

  // Active filters derived from URL search parameters
  const currentStatus = searchParams.get("status") || "ALL";
  const currentAiStatus = searchParams.get("aiStatus") || "ALL";
  const currentRoutingStatus = searchParams.get("routingStatus") || "ALL";
  const currentFulfillmentStatus =
    searchParams.get("fulfillmentStatus") || "ALL";
  const currentSearch = searchParams.get("search") || "";
  const currentCursor = searchParams.get("cursor") || null;

  // Pagination history stack for back-navigation
  const [cursorHistory, setCursorHistory] = useState([]);

  // Load summary metrics
  const loadSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const data = await dashboardService.getSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to load dashboard summary:", err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  // Load filtered orders
  const loadOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    setError(null);
    try {
      const data = await dashboardService.getOrders({
        status: currentStatus,
        aiStatus: currentAiStatus,
        routingStatus: currentRoutingStatus,
        fulfillmentStatus: currentFulfillmentStatus,
        search: currentSearch,
        limit: 15,
        cursor: currentCursor,
      });

      setOrders(data.items || []);
      setPagination(
        data.pagination || {
          total: 0,
          limit: 15,
          hasNextPage: false,
          nextCursor: null,
        },
      );
    } catch (err) {
      setError(
        err?.data?.error?.message ||
          err?.message ||
          "Failed to load deliveries.",
      );
    } finally {
      setIsLoadingOrders(false);
    }
  }, [
    currentStatus,
    currentAiStatus,
    currentRoutingStatus,
    currentFulfillmentStatus,
    currentSearch,
    currentCursor,
  ]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Handle filter changes (updates URL parameters)
  const handleFilterChange = (updates) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === "ALL") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, val);
      }
    });

    // Reset pagination on filter change
    if (!updates.cursor) {
      nextParams.delete("cursor");
      setCursorHistory([]);
    }

    setSearchParams(nextParams);
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
    setCursorHistory([]);
  };

  // Pagination Handlers
  const handleNextPage = () => {
    if (!pagination.nextCursor) return;
    setCursorHistory((prev) => [...prev, currentCursor]);
    handleFilterChange({ cursor: pagination.nextCursor });
  };

  const handlePrevPage = () => {
    if (cursorHistory.length === 0) return;
    const prevCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((prev) => prev.slice(0, -1));
    handleFilterChange({ cursor: prevCursor || "" });
  };

  const handleRefreshAll = () => {
    loadSummary();
    loadOrders();
  };

  // Dynamic greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="dashboard-container">
      {/* Top Welcome & Control Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-text">
          <h1 className="dashboard-title">{greeting}</h1>
          <p className="dashboard-subtitle">
            Here's what's happening across your deliveries today.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={handleRefreshAll}
            isLoading={isLoadingSummary || isLoadingOrders}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <DashboardSummaryCards
        counts={summary?.counts || {}}
        activeFilter={currentStatus}
        onSelectFilter={(status) => handleFilterChange({ status })}
      />

      {/* Action-Required Attention Section */}
      <DashboardAttentionSection
        attention={summary?.attention || {}}
        onApplyFilter={handleFilterChange}
      />

      {/* Main Order Management Section */}
      <div className="dashboard-main-card">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">Delivery Operations</h2>
          <span className="dashboard-total-tag">
            {pagination.total} deliveries
          </span>
        </div>

        {/* Filter Controls */}
        <DashboardFilters
          filters={{
            status: currentStatus,
            aiStatus: currentAiStatus,
            routingStatus: currentRoutingStatus,
            fulfillmentStatus: currentFulfillmentStatus,
            search: currentSearch,
          }}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          totalCount={pagination.total}
        />

        {/* Error State */}
        {error ? (
          <div className="dashboard-error-state">
            <AlertTriangle size={28} className="text-error" />
            <h3>Unable to load deliveries</h3>
            <p>{error}</p>
            <Button variant="secondary" size="sm" onClick={loadOrders}>
              Try Again
            </Button>
          </div>
        ) : isLoadingOrders ? (
          <div className="dashboard-loading-state">
            <div className="dashboard-skeleton-row" />
            <div className="dashboard-skeleton-row" />
            <div className="dashboard-skeleton-row" />
            <div className="dashboard-skeleton-row" />
          </div>
        ) : (
          <>
            {/* Orders Table & Mobile Cards */}
            <DashboardOrderTable
              orders={orders}
              onSelectOrder={(id) => setSelectedOrderId(id)}
              isLoading={isLoadingOrders}
            />

            {/* Pagination Controls */}
            {pagination.total > 0 && (
              <div className="dashboard-pagination-bar">
                <span className="pagination-info">
                  Showing {orders.length} of {pagination.total} results
                </span>

                <div className="pagination-buttons">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={ChevronLeft}
                    onClick={handlePrevPage}
                    disabled={cursorHistory.length === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={ChevronRight}
                    iconPosition="right"
                    onClick={handleNextPage}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Operational Order Detail Modal */}
      <DashboardDetailModal
        isOpen={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId}
        onOrderUpdated={handleRefreshAll}
      />
    </div>
  );
}

export default DashboardPage;
