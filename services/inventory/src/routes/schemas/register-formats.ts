import { FormatRegistry } from "@sinclair/typebox";

import { UUID_REGEX } from "../../constants/index.js";

let didRegister = false;

export function registerTypeboxFormats() {
  if (didRegister) {
    return;
  }

  if (!FormatRegistry.Get("uuid")) {
    FormatRegistry.Set("uuid", (value: string) => UUID_REGEX.test(value));
  }

  didRegister = true;
}
