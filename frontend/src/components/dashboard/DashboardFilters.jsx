import React from "react";
import { Search, X, Filter } from "lucide-react";
import Button from "../ui/Button.jsx";

export function DashboardFilters({
  filters = {},
  onChange,
  onReset,
  totalCount = 0,
}) {
  const quickViews = [
    { id: "ALL", label: "All Deliveries" },
    { id: "CLAIM_PENDING", label: "Awaiting Claim" },
    { id: "PROCESSING", label: "In Processing" },
    { id: "ROUTING_READY", label: "Routing Ready" },
    { id: "FULFILLMENT_READY", label: "Fulfillment Ready" },
    { id: "COMPLETED", label: "Completed" },
  ];

  const hasActiveFilters =
    (filters.status && filters.status !== "ALL") ||
    (filters.aiStatus && filters.aiStatus !== "ALL") ||
    (filters.routingStatus && filters.routingStatus !== "ALL") ||
    (filters.fulfillmentStatus && filters.fulfillmentStatus !== "ALL") ||
    Boolean(filters.search);

  return (
    <div className="dashboard-filters-container">
      {/* Quick Status View Pills */}
      <div className="quick-views-scroll-row">
        {quickViews.map((qv) => {
          const isActive = (filters.status || "ALL") === qv.id;
          return (
            <button
              key={qv.id}
              type="button"
              className={`quick-view-pill ${isActive ? "active" : ""}`}
              onClick={() => onChange({ status: qv.id, page: 1, cursor: null })}
            >
              {qv.label}
            </button>
          );
        })}
      </div>

      {/* Search & Secondary Filter Controls */}
      <div className="filter-controls-row">
        {/* Search input */}
        <div className="filter-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by Item name or Order ID..."
            value={filters.search || ""}
            onChange={(e) =>
              onChange({ search: e.target.value, page: 1, cursor: null })
            }
            className="filter-search-input"
          />
          {filters.search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onChange({ search: "", page: 1, cursor: null })}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Secondary dropdowns */}
        <div className="filter-dropdowns-group">
          {/* AI Status filter */}
          <select
            value={filters.aiStatus || "ALL"}
            onChange={(e) =>
              onChange({ aiStatus: e.target.value, page: 1, cursor: null })
            }
            className="filter-select"
            aria-label="Filter by AI Extraction Status"
          >
            <option value="ALL">All AI Statuses</option>
            <option value="COMPLETED">AI Extracted</option>
            <option value="PENDING">AI Extracting</option>
            <option value="FAILED">AI Failed</option>
            <option value="NO_NOTES">No Notes</option>
          </select>

          {/* Routing Status filter */}
          <select
            value={filters.routingStatus || "ALL"}
            onChange={(e) =>
              onChange({ routingStatus: e.target.value, page: 1, cursor: null })
            }
            className="filter-select"
            aria-label="Filter by Routing Status"
          >
            <option value="ALL">All Routing</option>
            <option value="READY">Route Ready</option>
            <option value="NOT_READY">Route Blocked</option>
            <option value="COMPLETED">Route Completed</option>
          </select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={onReset}
              className="clear-filters-btn"
            >
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardFilters;
