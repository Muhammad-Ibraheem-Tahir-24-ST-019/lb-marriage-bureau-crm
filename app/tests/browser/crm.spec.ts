import { test, expect } from "@playwright/test";
test("PHP-served compiled React: login, navigation, profile, proposal, family response, mobile and themes", async ({
    page,
    browser,
}) => {
    const profileName = "Browser Test " + Date.now();
    const proposalName = "Browser proposal " + Date.now();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/login");
    await page.getByLabel("Email address").fill("owner@demo.rishtahub.test");
    await page.getByLabel("Password", { exact: true }).fill("DemoBureau2026!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
        page.getByRole("heading", { name: /Good .*Amina/ }),
    ).toBeVisible();
    await page.screenshot({
        path: "screenshots/dashboard-desktop.png",
        fullPage: true,
    });
    for (const [nav, heading] of [
        ["Profiles", "Profiles"],
        ["Smart matching", "Smart matching"],
        ["Proposals", "Proposals"],
        ["Follow-ups", "Follow-ups"],
        ["Meetings", "Meetings"],
        ["Bureau network", "Bureau network"],
        ["Reports", "Reports & insights"],
        ["Staff & roles", "Staff & roles"],
        ["Settings", "Bureau settings"],
    ]) {
        await page
            .getByRole("navigation", { name: "Main navigation" })
            .getByRole("button", { name: new RegExp("^" + nav) })
            .click();
        await expect(
            page.getByRole("heading", { name: heading, exact: true }),
        ).toBeVisible();
    }
    await page
        .getByRole("navigation")
        .getByRole("button", { name: "Profiles", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Add profile", exact: true })
        .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Full name *", { exact: true }).fill(profileName);
    await dialog
        .getByLabel("Date of birth * (18+)", { exact: true })
        .fill("1997-05-20");
    await dialog.getByLabel("City *", { exact: true }).fill("Lahore");
    await dialog.getByLabel("Profession", { exact: true }).fill("Engineer");
    await dialog.getByLabel("Education", { exact: true }).fill("MBA");
    await dialog.getByRole("button", { name: "Notes & consent" }).click();
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Save profile" }).click();
    await expect(dialog).not.toBeVisible();
    await page.getByLabel("Search profiles").fill(profileName);
    await page
        .getByRole("button", { name: new RegExp(profileName + ".*RH-") })
        .click();
    await expect(
        page.getByRole("heading", { name: profileName, exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Find matches" }).click();
    await expect(
        page.getByRole("heading", { name: "Smart matching", exact: true }),
    ).toBeVisible();
    await page
        .getByRole("button", { name: "Propose", exact: true })
        .first()
        .click();
    await page.getByLabel("Proposal title *").fill(proposalName);
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Create proposal", exact: true })
        .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page
        .getByRole("navigation")
        .getByRole("button", { name: "Proposals", exact: true })
        .click();
    const proposal = page
        .locator(".proposal-card")
        .filter({ hasText: proposalName })
        .first();
    await proposal.getByRole("button", { name: "Share", exact: true }).click();
    await page.getByRole("button", { name: "Create secure link" }).click();
    const url = await page.getByLabel("Secure share link").inputValue();
    const familyContext = await browser.newContext();
    const family = await familyContext.newPage();
    await family.goto(url);
    await expect(
        family.getByRole("heading", {
            name: "A few thoughtful possibilities.",
        }),
    ).toBeVisible();
    await family
        .getByRole("button", { name: "Interested", exact: true })
        .click();
    await expect(family.getByText("Your response:")).toBeVisible();
    await family.screenshot({
        path: "screenshots/family-view.png",
        fullPage: true,
    });
    await familyContext.close();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page
        .getByRole("navigation")
        .getByRole("button", { name: "Overview", exact: true })
        .click();
    await page.getByRole("button", { name: "dark theme", exact: true }).click();
    await expect(page.locator("html")).toHaveClass("dark");
    await page.screenshot({
        path: "screenshots/dashboard-dark.png",
        fullPage: true,
    });
    await page
        .getByRole("button", { name: "light theme", exact: true })
        .click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
        page.getByRole("button", { name: "Open navigation" }),
    ).toBeVisible();
    await page.screenshot({
        path: "screenshots/dashboard-mobile.png",
        fullPage: true,
    });
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBeTruthy();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page
        .getByRole("navigation")
        .getByRole("button", { name: "Profiles", exact: true })
        .click();
    await expect(
        page.getByRole("heading", { name: "Profiles", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
});
test("marketing and registration render without a Node development server", async ({
    page,
}) => {
    await page.goto("/");
    await expect(
        page.getByRole("heading", { name: /Modern tools/ }),
    ).toBeVisible();
    await page.screenshot({
        path: "screenshots/marketing.png",
        fullPage: true,
    });
    await page.goto("/register");
    await expect(
        page.getByRole("heading", { name: "Your next chapter starts here." }),
    ).toBeVisible();
    await page.goto("/login");
    await page.screenshot({ path: "screenshots/login.png", fullPage: true });
    const scripts = await page
        .locator("script[src]")
        .evaluateAll((nodes) => nodes.map((n) => (n as HTMLScriptElement).src));
    expect(scripts.every((src) => src.includes("/build/assets/"))).toBeTruthy();
});
