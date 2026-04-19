import { test, expect } from '@playwright/test';

test.describe('System Codes', () => {
  test('navigates to Basic Info (System Codes) center', async ({ page }) => {
    await page.goto('/');
    
    // It redirects to /basic-info
    await expect(page).toHaveURL(/.*\/basic-info/);

    // Look for some of the known cards/links
    await expect(page.getByRole('link', { name: /Region Codes/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /City Codes/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Depot Codes/i })).toBeVisible();
  });

  const routes = [
    { path: '/basic-info/regions', title: 'Region Codes' },
    { path: '/basic-info/cities', title: 'City Codes' },
    { path: '/basic-info/depots', title: 'Depot Codes' },
    { path: '/basic-info/container-number-rules', title: 'Container Number Rules' },
    { path: '/basic-info/cost-codes', title: 'Expense Codes' },
    { path: '/basic-info/operation-prices', title: 'Operation Price Configs' }
  ];

  for (const route of routes) {
    test(`loads ${route.title} page with basic elements`, async ({ page }) => {
      await page.goto(route.path);
      
      // Page should have the main title
      await expect(page.getByRole('heading', { name: route.title, exact: false })).toBeVisible();

      // Check for export CSV button which is standard across these lists
      await expect(page.getByRole('button', { name: /Export/i }).or(page.getByText('Export CSV'))).toBeVisible();
    });
  }
});
