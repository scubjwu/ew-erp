import { test, expect } from '@playwright/test';

test.describe('System Settings', () => {
  test('navigates to User Management', async ({ page }) => {
    await page.goto('/settings/users');
    
    // Page Title
    await expect(page.getByRole('heading', { name: 'User Management' }).first()).toBeVisible();

    // Check for standard list UI
    await expect(page.getByPlaceholder('Search user code')).toBeVisible();
    await expect(page.getByRole('button', { name: /Export/i }).or(page.getByText('Export CSV'))).toBeVisible();

    // Check for management-facing fields (assuming table headers exist)
    await expect(page.getByText(/Status/i).first()).toBeVisible();
    await expect(page.getByText(/Email/i).first()).toBeVisible();
  });

  test('User Detail views', async ({ page }) => {
    await page.goto('/settings/users');
    
    // Click on the first View link
    const firstViewLink = page.getByRole('link', { name: /View/i }).first();
    await expect(firstViewLink).toBeVisible();
    await firstViewLink.click();

    // Ensure we are on User detail page
    await expect(page).toHaveURL(/.*\/settings\/users\/[a-zA-Z0-9-]/);
    
    // It should have tabbed navigation or fields
    await expect(page.getByText(/User Detail/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Edit/i })).toBeVisible();
  });
});
