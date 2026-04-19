import { test, expect } from '@playwright/test';

test.describe('Partners Module', () => {
  test('navigates to Partners center', async ({ page }) => {
    await page.goto('/partners');
    
    // Look for cards
    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vendors', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Container Owners' })).toBeVisible();
  });

  const partnerTypes = [
    { path: '/partners/customers', title: 'Customers' },
    { path: '/partners/vendors', title: 'Vendors' },
    { path: '/partners/material-vendors', title: 'Material Vendors' },
    { path: '/partners/lessee', title: 'Lessee' },
    { path: '/partners/container-owners', title: 'Container Owners' },
  ];

  for (const p of partnerTypes) {
    test(`loads ${p.title} list page and basic controls`, async ({ page }) => {
      await page.goto(p.path);
      
      // Page should have the main title
      await expect(page.getByRole('heading', { name: p.title, exact: false }).first()).toBeVisible();

      // Check for export CSV button
      await expect(page.getByRole('button', { name: /Export/i }).or(page.getByText('Export CSV'))).toBeVisible();

      // Check for Add New / Create button
      await expect(page.getByRole('link', { name: /New/i }).or(page.getByRole('button', { name: /New/i }))).toBeVisible();
    });
  }
});
