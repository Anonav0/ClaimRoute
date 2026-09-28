import { BaseRepository } from "./baseRepository.js";
import { userRepository, UserRepository } from "./userRepository.js";
import { orderRepository, OrderRepository } from "./orderRepository.js";
import {
  claimTokenRepository,
  ClaimTokenRepository,
} from "./claimTokenRepository.js";
import {
  recipientRepository,
  RecipientRepository,
} from "./recipientRepository.js";
import {
  deliveryConstraintRepository,
  DeliveryConstraintRepository,
} from "./deliveryConstraintRepository.js";
import {
  routingRequestRepository,
  RoutingRequestRepository,
} from "./routingRequestRepository.js";

export {
  BaseRepository,
  userRepository,
  UserRepository,
  orderRepository,
  OrderRepository,
  claimTokenRepository,
  ClaimTokenRepository,
  recipientRepository,
  RecipientRepository,
  deliveryConstraintRepository,
  DeliveryConstraintRepository,
  routingRequestRepository,
  RoutingRequestRepository,
};

export default {
  userRepository,
  orderRepository,
  claimTokenRepository,
  recipientRepository,
  deliveryConstraintRepository,
  routingRequestRepository,
};
