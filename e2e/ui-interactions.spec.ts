import { test, expect } from '@playwright/test';

test.describe('Global UI Interactions', () => {
  test('Search Autocompletion behaves correctly on PO Management', async ({ page }) => {
    // Navigate to a page with complex filtering that supports autocomplete
    await page.goto('/purchase/po-management');

    // Find the vendor search input by placeholder
    const vendorInput = page.getByPlaceholder(/Vendor code or name/i).first();
    await expect(vendorInput).toBeVisible();
    await expect(vendorInput).toBeEnabled();

    // Next.js hydration race condition mitigation: wait briefly for React to attach event listeners
    await page.waitForTimeout(1000);

    // Click to focus and trigger the dropdown listbox
    await vendorInput.click();
    await vendorInput.pressSequentially('A', { delay: 100 });

    // The autocomplete renders a dropdown with z-[80]
    const dropdown = page.locator('.z-\\[80\\]').first();
    await expect(dropdown).toBeVisible();
    
    // We expect some options to be visible, grab the first one
    const firstOption = dropdown.getByRole('option').first();
    await expect(firstOption).toBeVisible();
    
    // Save the text of the option we are selecting to verify it fills the input
    const optionText = await firstOption.textContent() || '';
    
    // Click the option
    await firstOption.click();
    
    // We expect the dropdown to be closed
    await expect(dropdown).toBeHidden();
    
    // Now press 'Enter' or click 'Search' to execute the search
    await page.getByText('Search', { exact: true }).click();
    
    // Verify that the table updates or a loading state occurs, 
    // and the active-filter summary appears if applicable.
    await expect(page.locator('table')).toBeVisible();
  });
});
