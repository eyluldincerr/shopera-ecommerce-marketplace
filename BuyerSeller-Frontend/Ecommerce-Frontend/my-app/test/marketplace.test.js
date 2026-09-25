import test from "node:test";
import assert from "node:assert/strict";

import {
  ORDER_STATUS,
  PRODUCT_CONDITION,
  PRODUCT_STATUS,
  STOCK_STATUS,
  getAllowedOrderStatuses,
  getStockStatus,
  isValidOrderStatusTransition,
  normalizeOrderStatus,
  normalizeProductCondition,
  normalizeProductStatus,
} from "../src/constants/marketplace.js";

test("normalizers return canonical database enum values", () => {
  assert.equal(normalizeOrderStatus("orders.status.shipped"), ORDER_STATUS.SHIPPED);
  assert.equal(
    normalizeProductCondition("used-like-new"),
    PRODUCT_CONDITION.USED_LIKE_NEW
  );
  assert.equal(
    normalizeProductStatus("out of stock"),
    PRODUCT_STATUS.OUT_OF_STOCK
  );
});

test("stock labels are derived without becoming publication statuses", () => {
  assert.equal(getStockStatus(0), STOCK_STATUS.OUT_OF_STOCK);
  assert.equal(getStockStatus(4), STOCK_STATUS.LOW_STOCK);
  assert.equal(getStockStatus(20), STOCK_STATUS.IN_STOCK);
});

test("order workflow permits forward transitions and blocks regressions", () => {
  assert.equal(
    isValidOrderStatusTransition(ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED),
    true
  );
  assert.equal(
    isValidOrderStatusTransition(ORDER_STATUS.DELIVERED, ORDER_STATUS.PROCESSING),
    false
  );
  assert.deepEqual(getAllowedOrderStatuses(ORDER_STATUS.PENDING), [
    ORDER_STATUS.CONFIRMED,
  ]);
  assert.deepEqual(getAllowedOrderStatuses(ORDER_STATUS.CONFIRMED), [
    ORDER_STATUS.PROCESSING,
  ]);
  assert.deepEqual(getAllowedOrderStatuses(ORDER_STATUS.PROCESSING), [
    ORDER_STATUS.SHIPPED,
  ]);
  assert.deepEqual(getAllowedOrderStatuses(ORDER_STATUS.SHIPPED), [
    ORDER_STATUS.DELIVERED,
  ]);
  assert.deepEqual(getAllowedOrderStatuses(ORDER_STATUS.DELIVERED), []);
  assert.deepEqual(getAllowedOrderStatuses(ORDER_STATUS.CANCELLED), []);
  assert.deepEqual(getAllowedOrderStatuses(ORDER_STATUS.RETURNED), []);
  assert.deepEqual(
    getAllowedOrderStatuses({
      orderStatus: ORDER_STATUS.PENDING,
      allowedNextStatuses: [ORDER_STATUS.CONFIRMED],
    }),
    [ORDER_STATUS.CONFIRMED]
  );
  assert.deepEqual(
    getAllowedOrderStatuses({
      orderStatus: ORDER_STATUS.DELIVERED,
      allowedNextStatuses: [ORDER_STATUS.PENDING],
    }),
    []
  );
});
