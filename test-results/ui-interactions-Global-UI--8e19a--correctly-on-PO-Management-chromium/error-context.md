# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-interactions.spec.ts >> Global UI Interactions >> Search Autocompletion behaves correctly on PO Management
- Location: e2e/ui-interactions.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.z-\\[80\\]').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.z-\\[80\\]').first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]: EW ERP
        - button "Collapse sidebar" [ref=e7] [cursor=pointer]:
          - img [ref=e8]
      - navigation [ref=e10]:
        - link "System Codes" [ref=e11] [cursor=pointer]:
          - /url: /basic-info
          - img [ref=e12]
          - generic [ref=e16]: System Codes
        - link "Inventory" [ref=e17] [cursor=pointer]:
          - /url: /inventory/center
          - img [ref=e18]
          - generic [ref=e22]: Inventory
        - link "Purchase" [ref=e23] [cursor=pointer]:
          - /url: /purchase
          - img [ref=e24]
          - generic [ref=e28]: Purchase
        - link "Partners" [ref=e29] [cursor=pointer]:
          - /url: /partners
          - img [ref=e30]
          - generic [ref=e35]: Partners
        - link "System Settings" [ref=e36] [cursor=pointer]:
          - /url: /settings
          - img [ref=e37]
          - generic [ref=e40]: System Settings
    - generic [ref=e41]:
      - tablist "Open pages" [ref=e42]:
        - tab "System Codes" [ref=e43] [cursor=pointer]
        - button "Close System Codes":
          - img
      - main [ref=e44]:
        - generic [ref=e47]:
          - generic [ref=e48]:
            - generic [ref=e49]:
              - generic [ref=e50]:
                - heading "PO Management" [level=1] [ref=e51]
                - paragraph [ref=e52]: Search, create, and review purchase orders across draft and confirmed workflows.
              - generic [ref=e53]:
                - link "Create PO" [ref=e54] [cursor=pointer]:
                  - /url: /purchase/po-management/new
                - button "Export CSV" [ref=e55] [cursor=pointer]:
                  - img
                  - text: Export CSV
            - generic [ref=e56]:
              - generic [ref=e57]:
                - generic [ref=e58]: Quick Filter
                - generic [ref=e59]:
                  - button "Today" [ref=e60] [cursor=pointer]
                  - button "Last 7 Days" [ref=e61] [cursor=pointer]
                  - button "Last 30 Days" [ref=e62] [cursor=pointer]
                  - button "This Month" [ref=e63] [cursor=pointer]
                  - button "Last Month" [ref=e64] [cursor=pointer]
              - generic [ref=e65]:
                - button "Search Filters" [expanded] [ref=e67] [cursor=pointer]:
                  - generic [ref=e68]: Search Filters
                  - img [ref=e69]
                - generic [ref=e71]:
                  - button "Search" [ref=e72] [cursor=pointer]:
                    - img
                    - text: Search
                  - button "Reset" [ref=e73] [cursor=pointer]:
                    - img
                    - text: Reset
              - generic [ref=e75]:
                - generic [ref=e76]:
                  - generic [ref=e77]: Vendor
                  - combobox "Vendor" [active] [ref=e78]: A
                - generic [ref=e79]:
                  - generic [ref=e80]: Location
                  - combobox "Location" [ref=e81]
                - generic [ref=e82]:
                  - generic [ref=e83]: Color
                  - combobox "Color" [ref=e84]
                - generic [ref=e85]:
                  - generic [ref=e86]: Size/Type
                  - combobox "Size/Type" [ref=e87]
                - generic [ref=e88]:
                  - generic [ref=e89]: Condition
                  - combobox "Condition" [ref=e90]
                - generic [ref=e91]:
                  - generic [ref=e92]: Order Date From
                  - textbox [ref=e93]
                - generic [ref=e94]:
                  - generic [ref=e95]: Order Date To
                  - textbox [ref=e96]
                - generic [ref=e97]:
                  - generic [ref=e98]: PO Status
                  - combobox [ref=e99] [cursor=pointer]:
                    - img [ref=e100]
                  - combobox [ref=e102]
          - generic [ref=e104]:
            - generic [ref=e105]:
              - generic [ref=e106]: Total Orders
              - generic [ref=e107]: "5"
            - generic [ref=e108]:
              - generic [ref=e109]: Planned Qty
              - generic [ref=e110]: "15"
            - generic [ref=e111]:
              - generic [ref=e112]: Available Qty
              - generic [ref=e113]: "0"
            - generic [ref=e114]:
              - generic [ref=e115]: Remaining Qty
              - generic [ref=e116]: "15"
            - generic [ref=e117]:
              - generic [ref=e118]: Cancelled Qty
              - generic [ref=e119]: "0"
            - generic [ref=e120]:
              - generic [ref=e121]: Prepaid Balance
              - generic [ref=e122]: "0.00"
          - generic [ref=e123]:
            - table [ref=e125]:
              - rowgroup [ref=e141]:
                - row "Order Date PO Number Vendor Location Size/Type Condition Color Planned Qty Available Qty Remaining Qty Cancelled Qty Prepaid Balance Status Actions" [ref=e142]:
                  - columnheader "Order Date" [ref=e143]:
                    - button "Order Date" [ref=e144] [cursor=pointer]:
                      - generic [ref=e145]: Order Date
                      - img [ref=e146]
                  - columnheader "PO Number" [ref=e149]:
                    - button "PO Number" [ref=e150] [cursor=pointer]:
                      - generic [ref=e151]: PO Number
                      - img [ref=e152]
                  - columnheader "Vendor" [ref=e155]:
                    - button "Vendor" [ref=e156] [cursor=pointer]:
                      - generic [ref=e157]: Vendor
                      - img [ref=e158]
                  - columnheader "Location" [ref=e161]:
                    - button "Location" [ref=e162] [cursor=pointer]:
                      - generic [ref=e163]: Location
                      - img [ref=e164]
                  - columnheader "Size/Type" [ref=e167]:
                    - button "Size/Type" [ref=e168] [cursor=pointer]:
                      - generic [ref=e169]: Size/Type
                      - img [ref=e170]
                  - columnheader "Condition" [ref=e173]:
                    - button "Condition" [ref=e174] [cursor=pointer]:
                      - generic [ref=e175]: Condition
                      - img [ref=e176]
                  - columnheader "Color" [ref=e179]:
                    - button "Color" [ref=e180] [cursor=pointer]:
                      - generic [ref=e181]: Color
                      - img [ref=e182]
                  - columnheader "Planned Qty" [ref=e185]:
                    - button "Planned Qty" [ref=e186] [cursor=pointer]:
                      - generic [ref=e187]: Planned Qty
                      - img [ref=e188]
                  - columnheader "Available Qty" [ref=e191]:
                    - button "Available Qty" [ref=e192] [cursor=pointer]:
                      - generic [ref=e193]: Available Qty
                      - img [ref=e194]
                  - columnheader "Remaining Qty" [ref=e197]:
                    - button "Remaining Qty" [ref=e198] [cursor=pointer]:
                      - generic [ref=e199]: Remaining Qty
                      - img [ref=e200]
                  - columnheader "Cancelled Qty" [ref=e203]:
                    - button "Cancelled Qty" [ref=e204] [cursor=pointer]:
                      - generic [ref=e205]: Cancelled Qty
                      - img [ref=e206]
                  - columnheader "Prepaid Balance" [ref=e209]:
                    - button "Prepaid Balance" [ref=e210] [cursor=pointer]:
                      - generic [ref=e211]: Prepaid Balance
                      - img [ref=e212]
                  - columnheader "Status" [ref=e215]:
                    - button "Status" [ref=e216] [cursor=pointer]:
                      - generic [ref=e217]: Status
                      - img [ref=e218]
                  - columnheader "Actions" [ref=e221]
              - rowgroup [ref=e222]:
                - row "2026-04-19 POYFK04191 预付款箱厂 USLAX 20FR Brand New RAL1001 1 0 1 0 0.00 SUBMITTED View Edit" [ref=e223]:
                  - cell "2026-04-19" [ref=e224]
                  - cell "POYFK04191" [ref=e225]
                  - cell "预付款箱厂" [ref=e226]
                  - cell "USLAX" [ref=e227]
                  - cell "20FR" [ref=e228]
                  - cell "Brand New" [ref=e229]
                  - cell "RAL1001" [ref=e230]
                  - cell "1" [ref=e231]
                  - cell "0" [ref=e232]
                  - cell "1" [ref=e233]
                  - cell "0" [ref=e234]
                  - cell "0.00" [ref=e235]
                  - cell "SUBMITTED" [ref=e236]:
                    - generic [ref=e237]: SUBMITTED
                  - cell "View Edit" [ref=e238]:
                    - generic [ref=e239]:
                      - link "View" [ref=e240] [cursor=pointer]:
                        - /url: /purchase/po-management/25c3a440-67ec-4f29-b5f7-3558e1413168
                        - img
                        - text: View
                      - link "Edit" [ref=e241] [cursor=pointer]:
                        - /url: /purchase/po-management/25c3a440-67ec-4f29-b5f7-3558e1413168/edit
                        - img
                        - text: Edit
                - row "2026-04-19 POGED04191 给额度箱厂 USLAX 20GP Brand New RAL1015 2 0 2 0 0.00 SUBMITTED View Edit" [ref=e242]:
                  - cell "2026-04-19" [ref=e243]
                  - cell "POGED04191" [ref=e244]
                  - cell "给额度箱厂" [ref=e245]
                  - cell "USLAX" [ref=e246]
                  - cell "20GP" [ref=e247]
                  - cell "Brand New" [ref=e248]
                  - cell "RAL1015" [ref=e249]
                  - cell "2" [ref=e250]
                  - cell "0" [ref=e251]
                  - cell "2" [ref=e252]
                  - cell "0" [ref=e253]
                  - cell "0.00" [ref=e254]
                  - cell "SUBMITTED" [ref=e255]:
                    - generic [ref=e256]: SUBMITTED
                  - cell "View Edit" [ref=e257]:
                    - generic [ref=e258]:
                      - link "View" [ref=e259] [cursor=pointer]:
                        - /url: /purchase/po-management/81f011af-8b47-4621-9a93-356ae04f055b
                        - img
                        - text: View
                      - link "Edit" [ref=e260] [cursor=pointer]:
                        - /url: /purchase/po-management/81f011af-8b47-4621-9a93-356ae04f055b/edit
                        - img
                        - text: Edit
                - row "2026-04-19 POFDJ04192 付定金箱厂 USLAX 20GP Brand New RAL1015 10 0 10 0 0.00 SUBMITTED View Edit" [ref=e261]:
                  - cell "2026-04-19" [ref=e262]
                  - cell "POFDJ04192" [ref=e263]
                  - cell "付定金箱厂" [ref=e264]
                  - cell "USLAX" [ref=e265]
                  - cell "20GP" [ref=e266]
                  - cell "Brand New" [ref=e267]
                  - cell "RAL1015" [ref=e268]
                  - cell "10" [ref=e269]
                  - cell "0" [ref=e270]
                  - cell "10" [ref=e271]
                  - cell "0" [ref=e272]
                  - cell "0.00" [ref=e273]
                  - cell "SUBMITTED" [ref=e274]:
                    - generic [ref=e275]: SUBMITTED
                  - cell "View Edit" [ref=e276]:
                    - generic [ref=e277]:
                      - link "View" [ref=e278] [cursor=pointer]:
                        - /url: /purchase/po-management/da31c901-165e-4753-80b6-8e743ab9b828
                        - img
                        - text: View
                      - link "Edit" [ref=e279] [cursor=pointer]:
                        - /url: /purchase/po-management/da31c901-165e-4753-80b6-8e743ab9b828/edit
                        - img
                        - text: Edit
                - row "2026-04-19 POFDJ04191 付定金箱厂 USLAX 20GP Brand New RAL1001 2 0 2 0 0.00 SUBMITTED View Edit" [ref=e280]:
                  - cell "2026-04-19" [ref=e281]
                  - cell "POFDJ04191" [ref=e282]
                  - cell "付定金箱厂" [ref=e283]
                  - cell "USLAX" [ref=e284]
                  - cell "20GP" [ref=e285]
                  - cell "Brand New" [ref=e286]
                  - cell "RAL1001" [ref=e287]
                  - cell "2" [ref=e288]
                  - cell "0" [ref=e289]
                  - cell "2" [ref=e290]
                  - cell "0" [ref=e291]
                  - cell "0.00" [ref=e292]
                  - cell "SUBMITTED" [ref=e293]:
                    - generic [ref=e294]: SUBMITTED
                  - cell "View Edit" [ref=e295]:
                    - generic [ref=e296]:
                      - link "View" [ref=e297] [cursor=pointer]:
                        - /url: /purchase/po-management/c876d7e6-9605-40c1-a885-9c8fa1e2b8ac
                        - img
                        - text: View
                      - link "Edit" [ref=e298] [cursor=pointer]:
                        - /url: /purchase/po-management/c876d7e6-9605-40c1-a885-9c8fa1e2b8ac/edit
                        - img
                        - text: Edit
                - row "2026-04-03 PO-RS-1776554507193 Reset Safe Vendor Alias 1776554507193 - - - - 0 0 0 0 0.00 CANCELLED View" [ref=e299]:
                  - cell "2026-04-03" [ref=e300]
                  - cell "PO-RS-1776554507193" [ref=e301]
                  - cell "Reset Safe Vendor Alias 1776554507193" [ref=e302]
                  - cell "-" [ref=e303]
                  - cell "-" [ref=e304]
                  - cell "-" [ref=e305]
                  - cell "-" [ref=e306]
                  - cell "0" [ref=e307]
                  - cell "0" [ref=e308]
                  - cell "0" [ref=e309]
                  - cell "0" [ref=e310]
                  - cell "0.00" [ref=e311]
                  - cell "CANCELLED" [ref=e312]:
                    - generic [ref=e313]: CANCELLED
                  - cell "View" [ref=e314]:
                    - link "View" [ref=e316] [cursor=pointer]:
                      - /url: /purchase/po-management/62aeb8e4-f775-42c5-8e1c-ee643b1ffd51
                      - img
                      - text: View
            - generic [ref=e317]:
              - generic [ref=e318]: Showing 1-5 of 5 purchase orders
              - generic [ref=e319]:
                - generic [ref=e320]: Page 1 of 1
                - button "Previous" [disabled]
                - button "Next" [disabled]
  - region "Notifications (F8)":
    - list
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Global UI Interactions', () => {
  4  |   test('Search Autocompletion behaves correctly on PO Management', async ({ page }) => {
  5  |     // Navigate to a page with complex filtering that supports autocomplete
  6  |     await page.goto('/purchase/po-management');
  7  | 
  8  |     // Find the vendor search input by placeholder
  9  |     const vendorInput = page.getByPlaceholder(/Vendor code or name/i).first();
  10 |     await expect(vendorInput).toBeVisible();
  11 |     await expect(vendorInput).toBeEnabled();
  12 | 
  13 |     // Next.js hydration race condition mitigation: wait briefly for React to attach event listeners
  14 |     await page.waitForTimeout(1000);
  15 | 
  16 |     // Click to focus and trigger the dropdown listbox
  17 |     await vendorInput.click();
  18 |     await vendorInput.pressSequentially('A', { delay: 100 });
  19 | 
  20 |     // The autocomplete renders a dropdown with z-[80]
  21 |     const dropdown = page.locator('.z-\\[80\\]').first();
> 22 |     await expect(dropdown).toBeVisible();
     |                            ^ Error: expect(locator).toBeVisible() failed
  23 |     
  24 |     // We expect some options to be visible, grab the first one
  25 |     const firstOption = dropdown.getByRole('option').first();
  26 |     await expect(firstOption).toBeVisible();
  27 |     
  28 |     // Save the text of the option we are selecting to verify it fills the input
  29 |     const optionText = await firstOption.textContent() || '';
  30 |     
  31 |     // Click the option
  32 |     await firstOption.click();
  33 |     
  34 |     // We expect the dropdown to be closed
  35 |     await expect(dropdown).toBeHidden();
  36 |     
  37 |     // Now press 'Enter' or click 'Search' to execute the search
  38 |     await page.getByText('Search', { exact: true }).click();
  39 |     
  40 |     // Verify that the table updates or a loading state occurs, 
  41 |     // and the active-filter summary appears if applicable.
  42 |     await expect(page.locator('table')).toBeVisible();
  43 |   });
  44 | });
  45 | 
```