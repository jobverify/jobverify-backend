import express from "express";
import { processTelegramWebhook } from "../controllers/telegramController.js";

const router = express.Router();

router.post("/webhook", processTelegramWebhook);

export default router;
