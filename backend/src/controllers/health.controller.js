import healthService from "../services/health.service.js";

export const getHealth = (req, res, next) => {
  try {
    const health = healthService.getHealthStatus();
    return res.status(200).json(health);
  } catch (error) {
    return next(error);
  }
};

export default {
  getHealth,
};
