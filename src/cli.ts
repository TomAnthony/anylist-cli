#!/usr/bin/env node

import { Command } from "commander";
import { createInterface } from "node:readline";
import {
  getClient,
  teardown,
  getLists,
  getListByName,
  getItems,
  addItem,
  checkItem,
  uncheckItem,
  removeItem,
  clearChecked,
} from "./client.js";
import {
  loadConfig,
  saveConfig,
  clearConfig,
  requireConfig,
  getConfigPath,
} from "./config.js";
import { ANYLIST_CATEGORIES, ExitCode, type CategoryName } from "./types.js";
import { setNoColor, printError, printSuccess, style } from "./output.js";

const VERSION = "0.1.0";

const program = new Command();

program
  .name("anylist")
  .description("Unofficial CLI for AnyList grocery and shopping lists")
  .version(VERSION, "-V, --version", "Show version number")
  .option("--no-color", "Disable colored output")
  .configureOutput({
    writeErr: (str) => process.stderr.write(str),
    writeOut: (str) => process.stdout.write(str),
    outputError: (str, write) => write(str),
  })
  .exitOverride((err) => {
    // Use exit code 2 for usage errors (Commander uses 1 by default)
    if (
      err.code === "commander.missingArgument" ||
      err.code === "commander.unknownOption" ||
      err.code === "commander.invalidArgument" ||
      err.code === "commander.missingMandatoryOptionValue"
    ) {
      process.exit(ExitCode.InvalidUsage);
    }
    process.exit(err.exitCode);
  })
  .hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts() as { color?: boolean };
    if (opts.color === false) {
      setNoColor(true);
    }
  });

/**
 * Prompt for input with optional hidden mode (for passwords)
 */
function prompt(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (hidden && process.stdin.isTTY) {
      process.stdout.write(question);
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf8");

      let password = "";
      const onData = (char: string) => {
        if (char === "\n" || char === "\r" || char === "\u0004") {
          stdin.setRawMode(false);
          stdin.removeListener("data", onData);
          rl.close();
          process.stdout.write("\n");
          resolve(password);
        } else if (char === "\u0003") {
          // Ctrl-C
          stdin.setRawMode(false);
          rl.close();
          process.exit(ExitCode.Failure);
        } else if (char === "\u007F" || char === "\b") {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
        } else {
          password += char;
        }
      };
      stdin.on("data", onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

/**
 * Get an authenticated client, handling errors appropriately
 */
async function getAuthenticatedClient() {
  const config = requireConfig();
  try {
    const client = await getClient(config.email, config.password);
    return client;
  } catch (error) {
    printError(
      `Authentication failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(ExitCode.AuthFailure);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH COMMANDS
// ─────────────────────────────────────────────────────────────────────────────

program
  .command("auth")
  .description("Authenticate with AnyList (interactive)")
  .action(async () => {
    if (!process.stdin.isTTY) {
      printError("Interactive authentication requires a TTY.");
      printError(
        "For non-interactive use, set ANYLIST_EMAIL and ANYLIST_PASSWORD environment variables."
      );
      process.exit(ExitCode.InvalidUsage);
    }

    try {
      const email = await prompt("Email: ");
      const password = await prompt("Password: ", true);

      if (!email || !password) {
        printError("Email and password are required.");
        process.exit(ExitCode.InvalidUsage);
      }

      console.log("Verifying credentials...");
      const client = await getClient(email, password);
      const lists = await getLists(client);
      teardown();

      // Save credentials
      saveConfig({ email, password });

      printSuccess(
        `Authenticated successfully. Found ${lists.length} list${lists.length === 1 ? "" : "s"}.`
      );
      console.log(style.dim(`Credentials saved to ${getConfigPath()}`));
    } catch (error) {
      printError(
        `Authentication failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(ExitCode.AuthFailure);
    }
  });

program
  .command("logout")
  .description("Clear stored credentials")
  .action(() => {
    clearConfig();
    printSuccess("Credentials cleared.");
  });

program
  .command("whoami")
  .description("Show current authenticated user")
  .option("--json", "Output as JSON")
  .action((options: { json?: boolean }) => {
    const config = loadConfig();
    if (!config) {
      if (options.json) {
        console.log(JSON.stringify({ authenticated: false }));
      } else {
        console.log("Not authenticated. Run: anylist auth");
      }
      return;
    }
    if (options.json) {
      console.log(
        JSON.stringify({ authenticated: true, email: config.email }, null, 2)
      );
    } else {
      console.log(`Authenticated as: ${style.bold(config.email)}`);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// LIST COMMANDS
// ─────────────────────────────────────────────────────────────────────────────

program
  .command("lists")
  .description("Show all lists")
  .option("--json", "Output as JSON")
  .action(async (options: { json?: boolean }) => {
    try {
      const client = await getAuthenticatedClient();
      const lists = await getLists(client);
      teardown();

      if (options.json) {
        console.log(JSON.stringify(lists, null, 2));
      } else {
        if (lists.length === 0) {
          console.log("No lists found.");
          return;
        }
        console.log("Your lists:\n");
        for (const list of lists) {
          const checked =
            list.checkedCount > 0
              ? style.dim(` (${list.checkedCount} checked)`)
              : "";
          console.log(`  • ${style.bold(list.name)} - ${list.itemCount} items${checked}`);
        }
      }
    } catch (error) {
      printError(error instanceof Error ? error.message : String(error));
      process.exit(ExitCode.Failure);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// ITEM COMMANDS
// ─────────────────────────────────────────────────────────────────────────────

program
  .command("items")
  .description("Show items in a list")
  .argument("<list>", "List name")
  .option("--json", "Output as JSON")
  .option("--unchecked", "Only show unchecked items")
  .action(
    async (
      listName: string,
      options: { json?: boolean; unchecked?: boolean }
    ) => {
      try {
        const client = await getAuthenticatedClient();
        const list = await getListByName(client, listName);

        if (!list) {
          printError(`List not found: ${listName}`);
          teardown();
          process.exit(ExitCode.Failure);
        }

        const items = getItems(list, options.unchecked);
        teardown();

        if (options.json) {
          console.log(JSON.stringify({ name: list.name, items }, null, 2));
        } else if (items.length === 0) {
          const msg = options.unchecked ? "No unchecked items" : "List is empty";
          console.log(`${list.name}: ${msg}`);
        } else {
          const unchecked = items.filter((i) => !i.checked);
          const checked = items.filter((i) => i.checked);

          console.log(`${style.bold(list.name)}:\n`);

          if (unchecked.length > 0) {
            for (const item of unchecked) {
              const qty = item.quantity ? style.dim(` (${item.quantity})`) : "";
              console.log(`  • ${item.name}${qty}`);
            }
          }

          if (checked.length > 0 && !options.unchecked) {
            if (unchecked.length > 0) console.log("");
            console.log(style.dim("Checked:"));
            for (const item of checked) {
              const qty = item.quantity ? ` (${item.quantity})` : "";
              console.log(style.dim(`  ✓ ${item.name}${qty}`));
            }
          }
        }
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(ExitCode.Failure);
      }
    }
  );

program
  .command("add")
  .description("Add item to a list")
  .argument("<list>", "List name")
  .argument("<item>", "Item name")
  .option("--quantity <quantity>", "Item quantity")
  .option(
    "--category <category>",
    "Item category (e.g., produce, meat, dairy)"
  )
  .option("--json", "Output as JSON")
  .action(
    async (
      listName: string,
      itemName: string,
      options: { quantity?: string; category?: string; json?: boolean }
    ) => {
      try {
        const client = await getAuthenticatedClient();
        const list = await getListByName(client, listName);

        if (!list) {
          printError(`List not found: ${listName}`);
          teardown();
          process.exit(ExitCode.Failure);
        }

        // Map category name to category ID
        let categoryId: string | undefined;
        if (options.category) {
          const lowerCategory = options.category.toLowerCase() as CategoryName;
          categoryId = ANYLIST_CATEGORIES[lowerCategory];
          if (!categoryId) {
            printError(`Unknown category: ${options.category}`);
            console.error(
              `Available categories: ${Object.keys(ANYLIST_CATEGORIES).join(", ")}`
            );
            teardown();
            process.exit(ExitCode.InvalidUsage);
          }
        }

        const item = await addItem(
          client,
          list,
          itemName,
          options.quantity,
          categoryId
        );
        teardown();

        if (options.json) {
          console.log(JSON.stringify(item, null, 2));
        } else {
          const qty = item.quantity ? ` (${item.quantity})` : "";
          printSuccess(`Added "${item.name}"${qty} to ${list.name}`);
        }
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(ExitCode.Failure);
      }
    }
  );

program
  .command("check")
  .description("Mark item as checked")
  .argument("<list>", "List name")
  .argument("<item>", "Item name")
  .option("--json", "Output as JSON")
  .action(
    async (
      listName: string,
      itemName: string,
      options: { json?: boolean }
    ) => {
      try {
        const client = await getAuthenticatedClient();
        const list = await getListByName(client, listName);

        if (!list) {
          printError(`List not found: ${listName}`);
          teardown();
          process.exit(ExitCode.Failure);
        }

        const item = await checkItem(list, itemName);
        teardown();

        if (!item) {
          printError(`Item not found: ${itemName}`);
          process.exit(ExitCode.Failure);
        }

        if (options.json) {
          console.log(JSON.stringify(item, null, 2));
        } else {
          printSuccess(`Checked "${item.name}"`);
        }
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(ExitCode.Failure);
      }
    }
  );

program
  .command("uncheck")
  .description("Mark item as unchecked")
  .argument("<list>", "List name")
  .argument("<item>", "Item name")
  .option("--json", "Output as JSON")
  .action(
    async (
      listName: string,
      itemName: string,
      options: { json?: boolean }
    ) => {
      try {
        const client = await getAuthenticatedClient();
        const list = await getListByName(client, listName);

        if (!list) {
          printError(`List not found: ${listName}`);
          teardown();
          process.exit(ExitCode.Failure);
        }

        const item = await uncheckItem(list, itemName);
        teardown();

        if (!item) {
          printError(`Item not found: ${itemName}`);
          process.exit(ExitCode.Failure);
        }

        if (options.json) {
          console.log(JSON.stringify(item, null, 2));
        } else {
          printSuccess(`Unchecked "${item.name}"`);
        }
      } catch (error) {
        printError(error instanceof Error ? error.message : String(error));
        process.exit(ExitCode.Failure);
      }
    }
  );

program
  .command("remove")
  .description("Remove item from a list")
  .argument("<list>", "List name")
  .argument("<item>", "Item name")
  .action(async (listName: string, itemName: string) => {
    try {
      const client = await getAuthenticatedClient();
      const list = await getListByName(client, listName);

      if (!list) {
        printError(`List not found: ${listName}`);
        teardown();
        process.exit(ExitCode.Failure);
      }

      const removed = await removeItem(list, itemName);
      teardown();

      if (!removed) {
        printError(`Item not found: ${itemName}`);
        process.exit(ExitCode.Failure);
      }

      printSuccess(`Removed "${itemName}" from ${list.name}`);
    } catch (error) {
      printError(error instanceof Error ? error.message : String(error));
      process.exit(ExitCode.Failure);
    }
  });

program
  .command("clear")
  .description("Remove all checked items from a list")
  .argument("<list>", "List name")
  .action(async (listName: string) => {
    try {
      const client = await getAuthenticatedClient();
      const list = await getListByName(client, listName);

      if (!list) {
        printError(`List not found: ${listName}`);
        teardown();
        process.exit(ExitCode.Failure);
      }

      const count = await clearChecked(list);
      teardown();

      if (count === 0) {
        console.log("No checked items to clear.");
      } else {
        printSuccess(
          `Cleared ${count} checked item${count === 1 ? "" : "s"} from ${list.name}`
        );
      }
    } catch (error) {
      printError(error instanceof Error ? error.message : String(error));
      process.exit(ExitCode.Failure);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// HELP COMMANDS
// ─────────────────────────────────────────────────────────────────────────────

program
  .command("categories")
  .description("List available item categories")
  .option("--json", "Output as JSON")
  .action((options: { json?: boolean }) => {
    const categories = Object.entries(ANYLIST_CATEGORIES).map(
      ([name, id]) => ({ name, id })
    );

    if (options.json) {
      console.log(JSON.stringify(categories, null, 2));
    } else {
      console.log("Available categories:\n");
      for (const { name, id } of categories) {
        console.log(`  ${name}${name !== id ? style.dim(` → ${id}`) : ""}`);
      }
    }
  });

// Parse and run
program.parse();
