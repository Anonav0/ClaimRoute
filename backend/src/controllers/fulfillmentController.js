import { fulfillmentService } from "../services/fulfillmentService.js";
import { routingService } from "../services/routingService.js";
import { readinessService } from "../services/readinessService.js";
import { orderService } from "../services/orderService.js";
import {
  mapOrderResponse,
  mapFulfillmentResponse,
  mapRoutingRequestResponse,
  mapReadinessResponse,
  mapOperationsSummaryResponse,
} from "../utils/responseMappers.js";

/**
 * POST /api/orders/:orderId/process
 * Move a claimed order into operational PROCESSING status
 */
export const startProcessing = async (req, res, next) => {
  try {
    const result = await fulfillmentService.startProcessing(
      req.user,
      req.params.orderId,
    );
    return res.status(200).json({
      success: true,
      data: {
        order: mapOrderResponse(result.order),
        fulfillment: mapFulfillmentResponse(result.fulfillment),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/orders/:orderId/fulfillment
 * Retrieve fulfillment state for an order
 */
export const getFulfillment = async (req, res, next) => {
  try {
    const fulfillment = await fulfillmentService.getFulfillmentByOrderId(
      req.user,
      req.params.orderId,
    );
    return res.status(200).json({
      success: true,
      data: mapFulfillmentResponse(fulfillment),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/orders/:orderId/readiness
 * Evaluate and retrieve deterministic routing readiness checklist
 */
export const checkReadiness = async (req, res, next) => {
  try {
    // Authorize sender/operator access to order first
    const order = await orderService.getOrderById(req.user, req.params.orderId);
    const readiness = await readinessService.checkRoutingReadiness(order);
    return res.status(200).json({
      success: true,
      data: mapReadinessResponse(readiness),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/orders/:orderId/routing-request
 * Create a routing request when prerequisites are satisfied
 */
export const createRoutingRequest = async (req, res, next) => {
  try {
    const routingRequest = await routingService.createRoutingRequest(
      req.user,
      req.params.orderId,
    );
    return res.status(201).json({
      success: true,
      data: mapRoutingRequestResponse(routingRequest),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/orders/:orderId/routing-request
 * Retrieve routing request for an order
 */
export const getRoutingRequest = async (req, res, next) => {
  try {
    const routingRequest = await routingService.getRoutingRequest(
      req.user,
      req.params.orderId,
    );
    return res.status(200).json({
      success: true,
      data: mapRoutingRequestResponse(routingRequest),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/orders/:orderId/fulfillment-ready
 * Mark order as FULFILLMENT_READY once routing request is prepared
 */
export const markFulfillmentReady = async (req, res, next) => {
  try {
    const result = await fulfillmentService.markFulfillmentReady(
      req.user,
      req.params.orderId,
    );
    return res.status(200).json({
      success: true,
      data: {
        order: mapOrderResponse(result.order),
        fulfillment: mapFulfillmentResponse(result.fulfillment),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/orders/:orderId/complete
 * Finalize fulfillment and mark order as COMPLETED
 */
export const completeOrder = async (req, res, next) => {
  try {
    const result = await fulfillmentService.completeOrder(
      req.user,
      req.params.orderId,
    );
    return res.status(200).json({
      success: true,
      data: {
        order: mapOrderResponse(result.order),
        fulfillment: mapFulfillmentResponse(result.fulfillment),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/orders/:orderId/operations
 * Retrieve consolidated operational view with sensitive PII and secrets filtered out
 */
export const getOperationsSummary = async (req, res, next) => {
  try {
    const summary = await fulfillmentService.getOperationsSummary(
      req.user,
      req.params.orderId,
    );
    return res.status(200).json({
      success: true,
      data: mapOperationsSummaryResponse(summary),
    });
  } catch (error) {
    return next(error);
  }
};
