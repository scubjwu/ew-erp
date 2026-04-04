# EW ERP Information Architecture

## Purpose

This document defines the current UX information architecture for EW ERP and the rules for extending it.

Use it to keep:

- top-level navigation coherent
- module entry points aligned with user intent
- canonical route ownership clear
- delivered and non-delivered areas distinguishable

## Current IA Shape

EW ERP currently works best as a business system with four UX layers:

1. `Master Data`
- `System Codes`
- `Partners`
- `System Settings > Users`

2. `Transaction Management`
- `Purchase`

3. `Transitional / Legacy`
- `Inventory`

4. `Future workflow expansion`
- operations and finance flows not yet delivered as stable end-to-end UX

This IA should be reflected in navigation, page naming, and workflow planning.

## Top-Level Navigation Rules

- Top-level navigation should use business-domain labels, not technical module labels.
- Entry labels should describe the work users do there.
- The navigation should not imply equal delivery maturity across all modules.
- New top-level items should only be introduced when they represent a distinct business domain rather than a single table or narrow admin page.

## Current Module Roles

### System Codes

Primary role:

- maintain foundational reference data used by the rest of the system

Expected user mental model:

- "I come here to maintain reference codes and business configuration."

### Partners

Primary role:

- manage counterparty master data

Expected user mental model:

- "I come here to maintain customers, vendors, owners, and related business entities."

### Purchase

Primary role:

- manage and inspect purchase orders

Expected user mental model:

- "I come here to find, review, and later create purchase orders."

Current maturity note:

- treat this as a management flow first, not yet a fully delivered transaction execution flow

### Inventory

Primary role today:

- expose current legacy inventory behavior

Current maturity note:

- do not treat current Inventory IA as the future canonical model for container lifecycle workflows

### System Settings

Primary role:

- maintain system-level administrative data such as users

Expected user mental model:

- "I come here for administrative configuration and internal user setup."

## Center Page Rules

Center pages exist to orient users into a business domain.

They should:

- explain the domain in business language
- show useful counts where they help users choose the right section
- guide users to the next real working surface quickly

They should not:

- act as decorative landing pages without clear task routing
- blur the difference between delivered and placeholder sections
- expose implementation ownership or developer shorthand

## Section Exposure Rules

- Delivered sections may be shown as standard navigation destinations.
- Partial sections may be shown if their incomplete scope is clearly legible in copy and layout.
- Placeholder-only sections should not look equivalent to delivered CRUD areas.
- Legacy redirects may exist, but only one route family should be presented as canonical in the UX.

## Canonical Route Rules

- Each business area should have one canonical route family.
- Legacy paths may redirect, but they should not remain peer UX destinations.
- Child routes should match business hierarchy rather than arbitrary implementation grouping.

Current canonical examples:

- `Customers`: `/partners/customers`
- `Vendors`: `/partners/vendors`
- `System Codes`: `/basic-info/...` while the business-facing label remains `System Codes`
- `Purchase`: `/purchase/po-management` as the current delivered management entry

## Maturity Labels

When planning or describing sections, use these meanings consistently:

- `Delivered`: usable for the intended business task
- `Partial`: usable for a meaningful subset of the intended task
- `Placeholder`: establishes future scope or navigation only
- `Legacy / Transitional`: still exists, but must not be treated as future workflow truth

These labels should shape design decisions even when they are not shown verbatim in the UI.

## IA Decision Checklist

Before adding or restructuring a module, confirm:

1. what business domain the item belongs to
2. whether it should be top-level, center-page section, or subordinate workflow
3. whether the target route is canonical
4. what maturity state the experience is in
5. whether the proposed placement helps users reach a real task faster

