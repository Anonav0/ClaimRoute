import { orderRepository } from "../repositories/orderRepository.js";
import { recipientRepository } from "../repositories/recipientRepository.js";
import { deliveryConstraintRepository } from "../repositories/deliveryConstraintRepository.js";
import { routingRequestRepository } from "../repositories/routingRequestRepository.js";
import { fulfillmentRepository } from "../repositories/fulfillmentRepository.js";
import { authorizationService, USER_ROLES } from "./authorizationService.js";
import { readinessService } from "./readinessService.js";
import {
  mapDashboardOrderDTO,
  mapDashboardOrderDetailResponse,
} from "../utils/responseMappers.js";
import { ORDER_STATUS } from "../utils/firestore.js";
import { NotFoundError } from "../errors/AppError.js";

export class DashboardService {
  /**
   * Retrieves summary operational counts and attention metrics for the dashboard
   * @param {Object} user - Authenticated user context
   * @returns {Promise<Object>} Aggregated metrics { counts, attention }
   */
  async getSummary(user) {
    const isPrivileged =
      user.role === USER_ROLES.OPERATIONS || user.role === USER_ROLES.ADMIN;

    const orders = isPrivileged
      ? await orderRepository.findAllOrders()
      : await orderRepository.findAllBySender(user.id);

    const counts = {
      total: orders.length,
      created: 0,
      claimPending: 0,
      claimed: 0,
      processing: 0,
      routingReady: 0,
      fulfillmentReady: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const order of orders) {
      switch (order.status) {
        case ORDER_STATUS.CREATED:
          counts.created++;
          break;
        case ORDER_STATUS.CLAIM_PENDING:
          counts.claimPending++;
          break;
        case ORDER_STATUS.CLAIMED:
          counts.claimed++;
          break;
        case ORDER_STATUS.PROCESSING:
          counts.processing++;
          break;
        case ORDER_STATUS.ROUTING_READY:
          counts.routingReady++;
          break;
        case ORDER_STATUS.FULFILLMENT_READY:
          counts.fulfillmentReady++;
          break;
        case ORDER_STATUS.COMPLETED:
          counts.completed++;
          break;
        case ORDER_STATUS.CANCELLED:
          counts.cancelled++;
          break;
        default:
          break;
      }
    }

    // Identify deliveries requiring operational attention
    let aiExtractionFailed = 0;
    let routingBlocked = 0;
    let recipientDetailsPending = 0;

    for (const order of orders) {
      if (
        order.status === ORDER_STATUS.CANCELLED ||
        order.status === ORDER_STATUS.COMPLETED
      ) {
        continue;
      }

      if (
        order.status === ORDER_STATUS.CLAIM_PENDING ||
        (order.status === ORDER_STATUS.CLAIMED && !order.recipientId)
      ) {
        recipientDetailsPending++;
      }

      // Check delivery constraints for AI failure
      if (order.claimedAt) {
        const constraints = await deliveryConstraintRepository.findByOrderId(
          order.id,
        );
        if (constraints?.status === "FAILED") {
          aiExtractionFailed++;
        }
      }

      // Check if routing is blocked in PROCESSING state
      if (order.status === ORDER_STATUS.PROCESSING) {
        try {
          const readiness = await readinessService.checkRoutingReadiness(order);
          if (!readiness.isReady) {
            routingBlocked++;
          }
        } catch {
          routingBlocked++;
        }
      }
    }

    return {
      counts,
      attention: {
        aiExtractionFailed,
        routingBlocked,
        recipientDetailsPending,
      },
    };
  }

  /**
   * Retrieves a filtered, paginated list of orders shaped as safe dashboard DTOs
   * @param {Object} user - Authenticated user context
   * @param {Object} options - Filter, search, and pagination parameters
   * @returns {Promise<Object>} { items, pagination }
   */
  async getOrders(user, options = {}) {
    const isPrivileged =
      user.role === USER_ROLES.OPERATIONS || user.role === USER_ROLES.ADMIN;

    const allOrders = isPrivileged
      ? await orderRepository.findAllOrders()
      : await orderRepository.findAllBySender(user.id);

    const {
      status,
      aiStatus,
      routingStatus,
      fulfillmentStatus,
      search,
      limit = 20,
      cursor,
    } = options;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    // Filter orders
    let filtered = allOrders;

    // Filter by orderStatus
    if (status && status !== "ALL") {
      filtered = filtered.filter((o) => o.status === status);
    }

    // Search filter (by Order ID, Item name, Item description)
    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((o) => {
        const idMatch = o.id && o.id.toLowerCase().includes(q);
        const name = typeof o.item === "object" ? o.item.name : o.item;
        const nameMatch = name && name.toLowerCase().includes(q);
        const desc = typeof o.item === "object" ? o.item.description || "" : "";
        const descMatch = desc && desc.toLowerCase().includes(q);
        return idMatch || nameMatch || descMatch;
      });
    }

    // Hydrate operational details for matched orders
    const hydratedItems = await Promise.all(
      filtered.map(async (order) => {
        const [recipient, constraints, routingRequest, fulfillment] =
          await Promise.all([
            order.recipientId
              ? recipientRepository.findById(order.recipientId)
              : recipientRepository.findByOrderId(order.id),
            deliveryConstraintRepository.findByOrderId(order.id),
            routingRequestRepository.findByOrderId(order.id),
            fulfillmentRepository.findByOrderId(order.id),
          ]);

        const dto = mapDashboardOrderDTO(order, {
          recipient,
          constraints,
          routingRequest,
          fulfillment,
        });

        return dto;
      }),
    );

    // Apply secondary operational status filters
    let secondaryFiltered = hydratedItems;

    if (aiStatus && aiStatus !== "ALL") {
      secondaryFiltered = secondaryFiltered.filter(
        (item) => item.aiStatus === aiStatus,
      );
    }

    if (routingStatus && routingStatus !== "ALL") {
      secondaryFiltered = secondaryFiltered.filter(
        (item) => item.routingStatus === routingStatus,
      );
    }

    if (fulfillmentStatus && fulfillmentStatus !== "ALL") {
      secondaryFiltered = secondaryFiltered.filter(
        (item) => item.fulfillmentStatus === fulfillmentStatus,
      );
    }

    // Pagination
    let startIndex = 0;
    if (cursor) {
      const foundIdx = secondaryFiltered.findIndex(
        (item) => item.id === cursor,
      );
      if (foundIdx !== -1) {
        startIndex = foundIdx + 1;
      } else {
        startIndex = parseInt(cursor, 10) || 0;
      }
    }

    const paginatedItems = secondaryFiltered.slice(
      startIndex,
      startIndex + parsedLimit,
    );
    const hasNextPage = startIndex + parsedLimit < secondaryFiltered.length;
    const nextCursor = hasNextPage
      ? paginatedItems[paginatedItems.length - 1]?.id ||
        String(startIndex + parsedLimit)
      : null;

    return {
      items: paginatedItems,
      pagination: {
        total: secondaryFiltered.length,
        limit: parsedLimit,
        hasNextPage,
        nextCursor,
      },
    };
  }

  /**
   * Retrieves an authorized detailed operational view of a specific order
   * @param {Object} user - Authenticated user context
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Dashboard order detail DTO
   */
  async getOrderDetail(user, orderId) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError(
        `Order with ID ${orderId} not found.`,
        "ORDER_NOT_FOUND",
      );
    }

    authorizationService.authorizeOrderAccess(user, order);

    const [
      recipient,
      deliveryConstraints,
      routingRequest,
      fulfillment,
      readiness,
    ] = await Promise.all([
      order.recipientId
        ? recipientRepository.findById(order.recipientId)
        : recipientRepository.findByOrderId(orderId),
      deliveryConstraintRepository.findByOrderId(orderId),
      routingRequestRepository.findByOrderId(orderId),
      fulfillmentRepository.findByOrderId(orderId),
      readinessService.checkRoutingReadiness(order).catch(() => null),
    ]);

    // Construct operational timeline
    const timeline = [
      {
        stage: "CREATED",
        label: "Delivery Created",
        timestamp: order.createdAt || null,
        completed: true,
      },
      {
        stage: "CLAIM_PENDING",
        label: "Claim Link Generated",
        timestamp:
          order.status !== ORDER_STATUS.CREATED ? order.createdAt : null,
        completed: order.status !== ORDER_STATUS.CREATED,
      },
      {
        stage: "CLAIMED",
        label: "Recipient Claimed",
        timestamp: order.claimedAt || null,
        completed: Boolean(order.claimedAt || order.recipientId),
      },
      {
        stage: "PROCESSING",
        label: "Operational Processing",
        timestamp:
          fulfillment?.processingStartedAt || order.processingStartedAt || null,
        completed: [
          ORDER_STATUS.PROCESSING,
          ORDER_STATUS.ROUTING_READY,
          ORDER_STATUS.FULFILLMENT_READY,
          ORDER_STATUS.COMPLETED,
        ].includes(order.status),
      },
      {
        stage: "ROUTING_READY",
        label: "Ready for Routing",
        timestamp: routingRequest?.readyAt || order.routingReadyAt || null,
        completed: [
          ORDER_STATUS.ROUTING_READY,
          ORDER_STATUS.FULFILLMENT_READY,
          ORDER_STATUS.COMPLETED,
        ].includes(order.status),
      },
      {
        stage: "FULFILLMENT_READY",
        label: "Fulfillment Ready",
        timestamp:
          fulfillment?.fulfillmentReadyAt || order.fulfillmentReadyAt || null,
        completed: [
          ORDER_STATUS.FULFILLMENT_READY,
          ORDER_STATUS.COMPLETED,
        ].includes(order.status),
      },
      {
        stage: "COMPLETED",
        label: "Delivery Completed",
        timestamp: order.completedAt || fulfillment?.completedAt || null,
        completed: order.status === ORDER_STATUS.COMPLETED,
      },
    ];

    return mapDashboardOrderDetailResponse({
      order,
      recipient,
      deliveryConstraints,
      routingRequest,
      fulfillment,
      readiness,
      timeline,
      role: user.role,
    });
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
