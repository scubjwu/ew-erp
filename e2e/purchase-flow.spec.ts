import { test, expect } from '@playwright/test';

test.describe('Purchase Flow', () => {
  test('PO Management filters and dashboard', async ({ page }) => {
    await page.goto('/purchase/po-management');
    
    // Page Title
    await expect(page.getByRole('heading', { name: 'PO Management' }).first()).toBeVisible();
    
    // Prepaid Balance summary card or column
    await expect(page.getByRole('button', { name: 'Prepaid Balance' })).toBeVisible();

    // Check that standard filters exist
    await expect(page.getByPlaceholder(/Vendor code or name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/City code or name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/RAL color code/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible();
  });

  test('PO Detail and Container Detail views', async ({ page }) => {
    // We navigate to PO Management and click the first 'View' link
    await page.goto('/purchase/po-management');
    
    const firstViewLink = page.getByRole('link', { name: /View/i }).first();
    await expect(firstViewLink).toBeVisible();
    await firstViewLink.click();

    // Ensure we are on PO Detail page
    await expect(page).toHaveURL(/.*\/purchase\/po-management\/[a-zA-Z0-9-]/);
    await expect(page.getByRole('heading', { name: 'Purchase Order Detail', exact: true })).toBeVisible();
    await expect(page.getByText('Finance Status')).toBeVisible();

    // Now look for 'View Containers' to go one level deeper
    const viewContainersLink = page.getByRole('link', { name: /View Containers/i }).first();
    await expect(viewContainersLink).toBeVisible();
    await viewContainersLink.click();

    // Ensure we are on Container Detail page
    await expect(page).toHaveURL(/.*\/items\/[a-zA-Z0-9-]+\/containers/);
    await expect(page.getByText('Container Details')).toBeVisible();
  });
});
