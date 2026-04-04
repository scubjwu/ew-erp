# EW ERP Task Flows

## Purpose

This document defines the current key user task flows for EW ERP and how future UX work should align to them.

The goal is to keep page design and implementation grounded in repeatable user work rather than isolated table CRUD.

## Current Core Task Families

### 1. Reference Data Maintenance

Primary module:

- `System Codes`

Primary user intent:

- create, update, and verify reference data that other workflows depend on

Core flow:

1. enter module center page
2. choose a data category
3. search or filter the list
4. inspect current records
5. create or edit a record
6. return to the list and verify the result
7. export if needed

### 2. Partner Master Data Maintenance

Primary module:

- `Partners`

Primary user intent:

- create, update, and review partner records such as customers, vendors, lessees, and owners

Core flow:

1. enter `Partners Center`
2. choose a partner category
3. search or filter the list
4. open detail or edit
5. update business details, contact details, attachments, or settlement-related fields
6. verify the saved result from detail or list
7. export if needed

### 3. User Administration

Primary module:

- `System Settings > Users`

Primary user intent:

- manage internal user records and operational account details

Core flow:

1. enter user management
2. search or filter users
3. open a detail page
4. create or edit user information
5. verify the updated state

### 4. Purchase Management and Drill-Down

Primary module:

- `Purchase`

Primary user intent today:

- find, review, and inspect purchase orders

Current flow:

1. enter `PO Management`
2. filter by business criteria
3. scan the result list
4. open PO detail
5. inspect business details, finance fields, and item-level information
6. drill down to item container records when needed

Current limitation:

- this is not yet a full create/edit/confirm transaction flow

### 5. Legacy Inventory Access

Primary module:

- `Inventory`

Primary user intent today:

- access the current legacy inventory UI

Current limitation:

- do not treat this flow as the future reference model for inventory-related UX planning

## Flow Design Rules

- Start design from the user task, not the table name.
- Every flow should have a clear entry, working surface, and post-save verification point.
- High-frequency tasks should minimize page switching and repeated data entry.
- Complex child records should use intentional drill-down rather than overloading a single page.
- Export should support a completed filter context, not bypass it.

## Post-Action Rules

Every create or edit flow should define what happens after success:

- return to list
- stay on detail
- continue editing
- open the next required child step

This must be intentional per workflow, not left to ad hoc implementation.

## Next UX Flow Backlog

These are the next major flow-definition tasks that should be clarified before or alongside implementation:

- `Purchase` create PO draft flow
- `Purchase` draft edit and status progression flow
- module maturity handling for partial and placeholder partner sections
- future container lifecycle flow once Inventory is redesigned around the event-driven target model

