import { orderService } from "../services/orderService.js";
import {
  mapOrderResponse,
  mapOrderListResponse,
} from "../utils/responseMappers.js";

/**
 * POST /api/orders
 * Create a new fulfillment order
 */
export const createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(
      req.senderId,
      req.validatedOrder,
    );
    return res.status(201).json({
      success: true,
      data: mapOrderResponse(order),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/orders/:orderId
 * Retrieve an order by ID
 */
export const getOrder = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(
      req.senderId,
      req.params.orderId,
    );
    return res.status(200).json({
      success: true,
      data: mapOrderResponse(order),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/orders
 * List orders belonging to the authenticated sender
 */
export const listOrders = async (req, res, next) => {
  try {
    const orders = await orderService.listSenderOrders(req.senderId);
    return res.status(200).json({
      success: true,
      data: mapOrderListResponse(orders),
      count: orders.length,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/orders/:orderId
 * Update editable fields of an order
 */
export const updateOrder = async (req, res, next) => {
  try {
    const updated = await orderService.updateOrder(
      req.senderId,
      req.params.orderId,
      req.validatedUpdates,
    );
    return res.status(200).json({
      success: true,
      data: mapOrderResponse(updated),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/orders/:orderId/cancel
 * Cancel an order
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const cancelled = await orderService.cancelOrder(
      req.senderId,
      req.params.orderId,
    );
    return res.status(200).json({
      success: true,
      data: mapOrderResponse(cancelled),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/orders/:orderId/constraints
 * Retrieve extracted delivery constraints for an order
 */
export const getOrderConstraints = async (req, res, next) => {
  try {
    const { deliveryConstraintService } =
      await import("../services/deliveryConstraintService.js");
    const { mapDeliveryConstraintsResponse } =
      await import("../utils/responseMappers.js");

    const constraints = await deliveryConstraintService.getConstraintsByOrderId(
      req.user,
      req.params.orderId,
    );

    return res.status(200).json({
      success: true,
      data: mapDeliveryConstraintsResponse(constraints),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/orders/:orderId/constraints/extract
 * Manually trigger or re-run AI delivery constraint extraction
 */
export const triggerConstraintExtraction = async (req, res, next) => {
  try {
    const { deliveryConstraintService } =
      await import("../services/deliveryConstraintService.js");
    const { mapDeliveryConstraintsResponse } =
      await import("../utils/responseMappers.js");

    // Verify ownership first
    await orderService.getOrderById(req.senderId, req.params.orderId);

    const constraints =
      await deliveryConstraintService.extractAndSaveConstraintsForOrder(
        req.params.orderId,
        { safeMode: false },
      );

    return res.status(200).json({
      success: true,
      data: mapDeliveryConstraintsResponse(constraints),
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  createOrder,
  getOrder,
  listOrders,
  updateOrder,
  cancelOrder,
  getOrderConstraints,
  triggerConstraintExtraction,
};
