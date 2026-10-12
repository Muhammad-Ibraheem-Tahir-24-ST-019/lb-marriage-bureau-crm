import { test, expect } from '@playwright/test';

test('expired session recovers the CSRF token and submits login once successfully', async ({page, context}) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('owner@demo.rishtahub.test');
    await page.getByLabel('Password', {exact:true}).fill('DemoBureau2026!');
    // Keep the stale page token while expiring the browser session.
    await context.clearCookies();
    const statuses: number[] = [];
    page.on('response', response => {
        if (response.url().endsWith('/api/login')) statuses.push(response.status());
    });
    await page.getByRole('button', {name:'Sign in', exact:true}).click();
    await expect(page).toHaveURL(/\/app$/);
    expect(statuses).toEqual([419, 200]);
});

test('uses current cookie when the page meta token is stale', async ({page}) => {
    await page.goto('/login');
    await page.evaluate(() => {
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')!.content = 'stale-token';
    });
    await page.getByLabel('Email address').fill('owner@demo.rishtahub.test');
    await page.getByLabel('Password', {exact:true}).fill('DemoBureau2026!');
    const result = page.waitForResponse(r => r.url().endsWith('/api/login'));
    await page.getByRole('button', {name:'Sign in', exact:true}).click();
    expect((await result).status()).toBe(200);
    await expect(page).toHaveURL(/\/app$/);
});
