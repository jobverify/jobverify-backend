import assert from "node:assert/strict";
import test from "node:test";

import { deleteUserAccount } from "../src/controllers/userController.js";
import Click from "../src/models/Click.js";
import JobAlertDelivery from "../src/models/JobAlertDelivery.js";
import PlanPurchase from "../src/models/PlanPurchase.js";
import Subscription from "../src/models/Subscription.js";
import TelegramLinkToken from "../src/models/TelegramLinkToken.js";
import User from "../src/models/User.js";
import UserSuggestion from "../src/models/UserSuggestion.js";

const createResponseDouble = () => ({
  statusCode: 200,
  body: null,
  clearedCookie: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
  clearCookie(name) {
    this.clearedCookie = name;
  },
});

test("deleteUserAccount removes the authenticated user's account-linked data and clears their session", async () => {
  const userId = "507f1f77bcf86cd799439011";
  const originalMethods = {
    deleteOne: User.deleteOne,
    subscriptions: Subscription.deleteMany,
    clicks: Click.deleteMany,
    deliveries: JobAlertDelivery.deleteMany,
    purchases: PlanPurchase.deleteMany,
    suggestions: UserSuggestion.deleteMany,
    telegramTokens: TelegramLinkToken.deleteMany,
  };
  const removals = [];

  User.deleteOne = async (filter) => { removals.push(["user", filter]); };
  Subscription.deleteMany = async (filter) => { removals.push(["subscription", filter]); };
  Click.deleteMany = async (filter) => { removals.push(["click", filter]); };
  JobAlertDelivery.deleteMany = async (filter) => { removals.push(["delivery", filter]); };
  PlanPurchase.deleteMany = async (filter) => { removals.push(["purchase", filter]); };
  UserSuggestion.deleteMany = async (filter) => { removals.push(["suggestion", filter]); };
  TelegramLinkToken.deleteMany = async (filter) => { removals.push(["telegramToken", filter]); };

  try {
    const res = createResponseDouble();
    await deleteUserAccount({
      user: { _id: userId },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      code: 200,
      success: true,
      message: "Account deleted successfully",
    });
    assert.equal(res.clearedCookie, "jobverify_token");
    assert.deepEqual(removals.map(([model, filter]) => [model, filter]), [
      ["subscription", { user: userId }],
      ["click", { user: userId }],
      ["delivery", { user: userId }],
      ["purchase", { user: userId }],
      ["telegramToken", { user: userId }],
      ["suggestion", { user: userId }],
      ["user", { _id: userId }],
    ]);
  } finally {
    User.deleteOne = originalMethods.deleteOne;
    Subscription.deleteMany = originalMethods.subscriptions;
    Click.deleteMany = originalMethods.clicks;
    JobAlertDelivery.deleteMany = originalMethods.deliveries;
    PlanPurchase.deleteMany = originalMethods.purchases;
    UserSuggestion.deleteMany = originalMethods.suggestions;
    TelegramLinkToken.deleteMany = originalMethods.telegramTokens;
  }
});
