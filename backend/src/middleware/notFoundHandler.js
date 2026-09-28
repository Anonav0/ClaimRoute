import { NotFoundError } from "../errors/AppError.js";

export const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
};

export default notFoundHandler;
