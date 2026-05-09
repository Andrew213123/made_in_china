import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, "..");
const externalBaseUrl = process.argv[2] || "";
const outputPath =
  process.argv[3] || path.join(__dirname, "..", "tmp", "compact-path-report.json");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".xml": "application/xml; charset=utf-8",
};

async function startStaticServer(root) {
  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
      const pathname = decodeURIComponent(requestUrl.pathname);
      const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
      const resolvedPath = path.resolve(root, relativePath);

      if (!resolvedPath.startsWith(root)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      const stat = await fs.stat(resolvedPath).catch(() => null);
      if (!stat || stat.isDirectory()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const body = await fs.readFile(resolvedPath);
      const ext = path.extname(resolvedPath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      if (req.method !== "HEAD") {
        res.end(body);
      } else {
        res.end();
      }
    } catch (error) {
      res.writeHead(500);
      res.end(String(error));
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to determine static server address.");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}/`,
  };
}

function normalizeUrl(input) {
  const url = new URL(input);
  return `${url.pathname}${url.search}`;
}

function unique(items) {
  return [...new Set(items)];
}

function matchPaths(paths, pattern) {
  return paths.filter((item) => pattern.test(item));
}

async function main() {
  const localServer = externalBaseUrl ? null : await startStaticServer(rootDir);
  const baseUrl = externalBaseUrl || localServer.baseUrl;
  let browser;
  try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const requestPaths = [];
  const responseStatus = new Map();
  const consoleMessages = [];
  const pageErrors = [];

  page.on("requestfinished", (request) => {
    const url = request.url();
    if (url.includes("/public/data/") || url.endsWith("/dashboard_processed.js")) {
      requestPaths.push(normalizeUrl(url));
    }
  });

  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/public/data/") || url.endsWith("/dashboard_processed.js")) {
      responseStatus.set(normalizeUrl(url), response.status());
    }
  });

  page.on("console", (message) => {
    consoleMessages.push({ type: message.type(), text: message.text() });
  });

  page.on("pageerror", (error) => {
    pageErrors.push(String(error));
  });

  async function settle() {
    try {
      await page.waitForLoadState("networkidle", { timeout: 15000 });
    } catch {
      // Cesium and large data pages can keep a few background requests alive.
      // For path verification we only need a stable-enough state.
    }
    await page.waitForTimeout(1200);
  }

  async function captureStep(name, action) {
    const before = requestPaths.length;
    await action();
    await settle();
    return {
      name,
      requests: unique(requestPaths.slice(before)),
    };
  }

  await page.goto(baseUrl, { waitUntil: "load" });
  await settle();

  const initialRequests = unique([...requestPaths]);

  const countryStep = await captureStep("country", async () => {
    await page.locator("#countrySelect").selectOption("JPN");
  });

  const countryTabStep = await captureStep("country_tab", async () => {
    await page.locator(".tab[data-section='country']").click();
  });

  await page.locator(".tab[data-section='overview']").click();
  await settle();

  const minorStep = await captureStep("analysis_minor", async () => {
    await page.locator("#categoryDimensionSelect").selectOption("analysis_minor");
    await page.waitForTimeout(400);
    await page.locator("#categorySelect").selectOption({ index: 1 });
  });

  const minorSelection = await page.locator("#categorySelect").inputValue();

  const topicStep = await captureStep("target_topic", async () => {
    await page.locator(".tab[data-section='target']").click();
    await page.waitForTimeout(400);
    await page.locator("#targetTopicTagSelect").selectOption({ index: 1 });
  });

  const topicSelection = await page.locator("#targetTopicTagSelect").inputValue();

  const allRequests = unique(requestPaths);
  const heavyPatterns = [
    /\/public\/data\/processed\/country_category_matrix_\d+\.csv$/i,
    /\/public\/data\/processed\/country_topic_matrix_\d+\.csv$/i,
    /\/public\/data\/processed\/product_vulnerability_\d+\.csv$/i,
  ];

  const heavyRequests = unique(
    heavyPatterns.flatMap((pattern) => matchPaths(allRequests, pattern))
  );

  const report = {
    baseUrl,
    initialRequests,
    steps: {
      country: countryStep,
      country_tab: countryTabStep,
      analysis_minor: { ...minorStep, selected: minorSelection },
      target_topic: { ...topicStep, selected: topicSelection },
    },
    responseStatus: Object.fromEntries([...responseStatus.entries()].sort()),
    heavyRequests,
    consoleMessages,
    pageErrors,
    summary: {
      initialAnnualRequests: unique(
        initialRequests.filter((item) => item.includes("/public/data/processed/annual/2024/"))
      ),
      initialDrilldownRequests: unique(
        initialRequests.filter((item) => item.includes("/public/data/processed/drilldown/"))
      ),
      passed: heavyRequests.length === 0 && pageErrors.length === 0,
    },
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
  await new Promise((resolve, reject) => {
    if (!localServer) {
      resolve();
      return;
    }
    localServer.server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
