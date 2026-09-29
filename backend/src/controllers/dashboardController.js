import { dashboardService } from "../services/dashboardService.js";

/**
 * GET /api/dashboard/summary
 * Retrieve aggregated counts and operational attention metrics
 */
export const getSummary = async (req, res, next) => {
  try {
    const summary = await dashboardService.getSummary(req.user);
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/dashboard/orders
 * Retrieve filtered and paginated operational dashboard orders
 */
export const getOrders = async (req, res, next) => {
  try {
    const options = {
      status: req.query.status,
      aiStatus: req.query.aiStatus,
      routingStatus: req.query.routingStatus,
      fulfillmentStatus: req.query.fulfillmentStatus,
      search: req.query.search,
      limit: req.query.limit,
      cursor: req.query.cursor,
    };

    const result = await dashboardService.getOrders(req.user, options);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/dashboard/orders/:orderId
 * Retrieve detailed operational view for a specific order
 */
export const getOrderDetail = async (req, res, next) => {
  try {
    const detail = await dashboardService.getOrderDetail(
      req.user,
      req.params.orderId,
    );
    return res.status(200).json({
      success: true,
      data: detail,
    });
  } catch (error) {
    return next(error);
  }
};
