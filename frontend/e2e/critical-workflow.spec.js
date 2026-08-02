import { expect, test } from "@playwright/test";

const password = "StreetCircleE2E!2026";

async function openAuth(page, mode) {
  await page.getByRole("button", { name: "Join StreetCircle" }).click();
  const loginDialog = page.getByRole("dialog", { name: "Welcome Back" });
  if (mode === "register" && await loginDialog.isVisible()) {
    await page.getByRole("button", { name: "Sign Up", exact: true }).click();
  }
  const registerDialog = page.getByRole("dialog", { name: "Join StreetCircle" });
  if (mode === "login" && await registerDialog.isVisible()) {
    await page.getByRole("button", { name: "Log In", exact: true }).click();
  }
}

async function register(page, username, email) {
  await openAuth(page, "register");
  await page.getByLabel("Username or email").fill(username);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password").fill(password);
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/register"));
  await page.getByRole("button", { name: "Sign Up", exact: true }).click();
  expect((await responsePromise).status()).toBe(201);
  await expect(page.getByText(username, { exact: true })).toBeVisible();
}

async function login(page, username) {
  await openAuth(page, "login");
  await page.getByLabel("Username or email").fill(username);
  await page.getByLabel("Password").fill(password);
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/login"));
  await page.getByRole("button", { name: "Log In", exact: true }).click();
  expect((await responsePromise).status()).toBe(200);
  await expect(page.getByText(username, { exact: true })).toBeVisible();
}

async function logout(page) {
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("button", { name: "Join StreetCircle" })).toBeVisible();
}

test("critical local MCT: auth, community, media listing, authorization, request, and notification", async ({ page }) => {
  const suffix = Date.now();
  const owner = `e2e_owner_${suffix}`;
  const member = `e2e_member_${suffix}`;
  const communityName = `E2E Circle ${suffix}`;
  const listingTitle = `E2E drill ${suffix}`;

  await page.goto("/");
  await register(page, owner, `${owner}@streetcircle.test`);
  await page.getByLabel("Name").fill(communityName);
  await page.getByLabel("Description").fill("A deterministic community created by the browser smoke test.");
  await page.getByRole("button", { name: "Create community" }).click();
  await expect(page.getByText(communityName, { exact: true })).toBeVisible();
  await logout(page);

  await register(page, member, `${member}@streetcircle.test`);
  const available = page.locator(".community-available article").filter({ hasText: communityName });
  await available.getByRole("button", { name: "Request to join" }).click();
  await expect(available.getByText("pending", { exact: true })).toBeVisible();
  await logout(page);

  await login(page, owner);
  await expect(page.getByText("New membership request", { exact: true })).toBeVisible();
  const review = page.locator(".membership-queue article").filter({ hasText: communityName });
  await review.getByRole("button", { name: "Approve" }).click();

  await page.getByRole("button", { name: "Post listing" }).click();
  const listingDialog = page.getByRole("dialog", { name: "Post new listing" });
  await listingDialog.getByLabel("Community").selectOption({ label: communityName });
  await listingDialog.getByLabel("Title").fill(listingTitle);
  await listingDialog.getByLabel("Category").fill("tools");
  await listingDialog.getByLabel("Description").fill("A drill with a real validated PNG uploaded by Playwright.");
  await listingDialog.getByLabel(/Images/).setInputFiles({
    name: "drill.png",
    mimeType: "image/png",
    buffer: Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from("playwright-image")]),
  });
  await listingDialog.getByRole("button", { name: "Post Listing" }).click();
  await page.getByRole("button", { name: "My listings" }).click();
  await expect(page.locator(".card").getByRole("heading", { name: listingTitle })).toBeVisible();
  await logout(page);

  await login(page, member);
  await page.getByRole("button", { name: "Community", exact: true }).click();
  await expect(page.locator(".card").getByRole("heading", { name: listingTitle })).toBeVisible();
  const unauthorizedStatus = await page.evaluate(async (title) => {
    const response = await fetch("http://127.0.0.1:5005/api/v1/listings?longitude=72.8777&latitude=19.076&radiusMeters=2000&limit=20", { credentials: "include" });
    const listing = (await response.json()).listings.find((item) => item.title === title);
    return (await fetch(`http://127.0.0.1:5005/api/v1/listings/${listing.id}`, {
      method: "DELETE", credentials: "include", headers: { origin: "http://127.0.0.1:5173" },
    })).status;
  }, listingTitle);
  expect(unauthorizedStatus).toBe(403);
  await page.getByRole("button", { name: `Request ${listingTitle}` }).click();
  await page.getByLabel("Message (optional)").fill("May I borrow this tomorrow?");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("May I borrow this tomorrow?", { exact: true })).toBeVisible();
  await logout(page);

  await login(page, owner);
  await expect(page.getByText("New listing request", { exact: true })).toBeVisible();
  const incoming = page.locator(".request-columns>div").first().locator(".request-row").filter({ hasText: "May I borrow this tomorrow?" });
  await incoming.getByRole("button", { name: "accepted" }).click();
  await expect(incoming.getByText("ACCEPTED", { exact: true })).toBeVisible();
  await logout(page);

  await login(page, member);
  await expect(page.getByText("Request status updated", { exact: true })).toBeVisible();
  await expect(page.locator(".request-columns>div").nth(1).getByText("ACCEPTED", { exact: true })).toBeVisible();
  await logout(page);
});
