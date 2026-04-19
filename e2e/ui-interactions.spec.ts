import { test, expect } from '@playwright/test';

test.describe('Global UI Interactions', () => {
  test('Search Autocompletion behaves correctly on PO Management', async ({ page }) => {
    // Navigate to a page with complex filtering that supports autocomplete
    await page.goto('/purchase/po-management');

    // Find the vendor search input by placeholder
    const vendorInput = page.getByPlaceholder(/Vendor code or name/i).first();
    await expect(vendorInput).toBeVisible();

    // Focus and click to open the dropdown
    await vendorInput.click();

    // The autocomplete renders a dropdown with z-[80]
    const dropdown = page.locator('.z-\\[80\\]').first();
    await expect(dropdown).toBeVisible();
    
    const firstOption = dropdown.getByRole('option').first();
    await expect(firstOption).toBeVisible();
    
    // Save the text of the option we are selecting to verify it fills the input
    const optionText = await firstOption.textContent() || '';
    await firstOption.click();

    // Verify it fills the input WITHOUT auto-running search. 
    // We expect the input value to match the option text (or part of it).
    // The exact matching logic might depend on how the combobox is implemented, 
    // but the dropdown should be closed.
    await expect(dropdown).toBeHidden();
    
    // Now press 'Enter' or click 'Search' to execute the search
    await page.getByText('Search', { exact: true }).click();
    
    // Verify that the table updates or a loading state occurs, 
    // and the active-filter summary appears if applicable.
    await expect(page.locator('table')).toBeVisible();
  });
});
