import { logger } from "../logger/index.js";

export async function connectDatabase() {
  logger.info("database adapter ready");
}

export async function disconnectDatabase() {
  logger.info("database adapter disconnected");
}
