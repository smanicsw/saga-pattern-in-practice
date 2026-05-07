import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { createApp } from "../../src/app.js";

export type TestApp = {
  baseUrl: string;
  close: () => Promise<void>;
};

export async function startTestApp(): Promise<TestApp> {
  const app = createApp();

  const server = await new Promise<Server>((resolve, reject) => {
    const listeningServer = app.listen(0, () => resolve(listeningServer));

    listeningServer.once("error", reject);
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Expected test app to listen on a TCP port.");
  }

  return {
    baseUrl: `http://127.0.0.1:${(address as AddressInfo).port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}
