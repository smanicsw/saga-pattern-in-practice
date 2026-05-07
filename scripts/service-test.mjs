import { spawnSync } from "node:child_process";

const services = {
  inventory: {
    packageName: "@saga/inventory-service",
    dbService: "inventory-test-db",
  },
  order: {
    packageName: "@saga/order-service",
    dbService: "order-test-db",
  },
  payments: {
    packageName: "@saga/payments-service",
    dbService: "payments-test-db",
  },
};

const aliases = {
  all: Object.keys(services),
  inventory: ["inventory"],
  order: ["order"],
  payment: ["payments"],
  payments: ["payments"],
};

const [, , command, maybeService] = process.argv;
const serviceName = maybeService ?? "all";
const selectedServiceNames = aliases[serviceName];

if (!command || !["up", "test", "functional", "down"].includes(command)) {
  console.error("Usage: npm run test[:up|:down|:functional] -- <service|all>");
  process.exit(1);
}

if (!selectedServiceNames) {
  console.error(
    `Unknown service "${serviceName}". Expected one of: ${Object.keys(aliases).join(", ")}`,
  );
  process.exit(1);
}

const selectedServices = selectedServiceNames.map((name) => services[name]);

switch (command) {
  case "up":
    runDockerCompose(["up", "-d", ...selectedServices.map((service) => service.dbService)]);
    break;
  case "test":
    runPnpmForServices("test");
    break;
  case "functional":
    runPnpmForServices("test:functional");
    break;
  case "down":
    if (serviceName === "all") {
      runDockerCompose(["down"]);
      break;
    }

    for (const service of selectedServices) {
      runDockerCompose(["stop", service.dbService]);
      runDockerCompose(["rm", "-f", service.dbService]);
    }
    break;
}

function runPnpmForServices(scriptName) {
  for (const service of selectedServices) {
    run("corepack", [
      "pnpm",
      "--filter",
      service.packageName,
      scriptName,
    ]);
  }
}

function runDockerCompose(args) {
  run("docker", ["compose", "-f", "docker-compose.test.yml", ...args]);
}

function run(commandName, args) {
  const result = spawnSync(commandName, args, {
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
