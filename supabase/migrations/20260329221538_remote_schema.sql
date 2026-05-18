create extension if not exists "moddatetime" with schema "extensions";

drop extension if exists "pg_net";


  create table "public"."business_cost" (
    "id" uuid not null default gen_random_uuid(),
    "business_type" text not null,
    "business_id" uuid not null,
    "container_id" uuid,
    "cost_type" text,
    "amount" numeric(14,2) not null,
    "currency" text not null default 'USD'::text,
    "occur_date" date not null,
    "remark" text,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "cost_code_id" uuid
      );


alter table "public"."business_cost" enable row level security;


  create table "public"."business_invoice" (
    "id" uuid not null default gen_random_uuid(),
    "business_type" text not null,
    "business_id" uuid not null,
    "invoice_type" text not null,
    "invoice_no" text not null,
    "invoice_date" date,
    "amount" numeric(14,2) not null,
    "currency" text not null default 'USD'::text,
    "invoice_status" text not null,
    "remark" text,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."business_invoice" enable row level security;


  create table "public"."business_invoice_item" (
    "id" uuid not null default gen_random_uuid(),
    "invoice_id" uuid not null,
    "revenue_id" uuid,
    "cost_id" uuid,
    "billed_amount" numeric(14,2) not null,
    "remark" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."business_invoice_item" enable row level security;


  create table "public"."business_revenue" (
    "id" uuid not null default gen_random_uuid(),
    "business_type" text not null,
    "business_id" uuid not null,
    "container_id" uuid,
    "revenue_type" text,
    "amount" numeric(14,2) not null,
    "currency" text not null default 'USD'::text,
    "occur_date" date not null,
    "remark" text,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "revenue_code_id" uuid
      );


alter table "public"."business_revenue" enable row level security;


  create table "public"."cities" (
    "id" uuid not null default gen_random_uuid(),
    "city_code" text not null,
    "city_name" text not null,
    "state" text,
    "country" text not null,
    "region" text,
    "cma_city_code" text,
    "oocl_city_code" text,
    "hmm_city_code" text,
    "zim_city_code" text,
    "msk_city_code" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "pic_id" uuid
      );


alter table "public"."cities" enable row level security;


  create table "public"."container" (
    "id" uuid not null default gen_random_uuid(),
    "container_number" text not null,
    "color" text,
    "machine_type" text,
    "flp" boolean not null default false,
    "lbx" boolean not null default false,
    "locking_bars" boolean not null default false,
    "vents" boolean not null default false,
    "manufacture_date" date,
    "owner_type" text not null,
    "owner_id" uuid,
    "lifecycle_stage" text not null,
    "status" text not null,
    "transit_business_type" text,
    "current_depot_id" uuid,
    "current_customer_id" uuid,
    "current_transfer_id" uuid,
    "current_lease_id" uuid,
    "current_sale_id" uuid,
    "last_event_id" uuid,
    "purchase_date" date,
    "purchase_price" numeric(14,2),
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "container_type_code_id" uuid not null,
    "container_condition_code_id" uuid,
    "container_size_code_id" uuid not null
      );


alter table "public"."container" enable row level security;


  create table "public"."container_condition_codes" (
    "id" uuid not null default gen_random_uuid(),
    "condition_code" text not null,
    "condition_name" text not null,
    "sort_order" integer not null default 999,
    "description" text,
    "status" text not null default 'ACTIVE'::text,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."container_condition_codes" enable row level security;


  create table "public"."container_event" (
    "id" uuid not null default gen_random_uuid(),
    "container_id" uuid not null,
    "event_type" text not null,
    "event_sub_type" text,
    "business_type" text,
    "business_id" uuid,
    "from_depot_id" uuid,
    "to_depot_id" uuid,
    "lifecycle_before" text,
    "lifecycle_after" text,
    "status_before" text,
    "status_after" text,
    "event_time" timestamp with time zone not null,
    "record_time" timestamp with time zone not null default now(),
    "operator_id" uuid,
    "operator_name" text,
    "amount" numeric(14,2),
    "currency" text default 'USD'::text,
    "remark" text,
    "extra_data" jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."container_event" enable row level security;


  create table "public"."container_number_rules" (
    "id" uuid not null default gen_random_uuid(),
    "prefix" text not null,
    "serial_length" integer not null,
    "start_serial" integer not null default 0,
    "end_serial" integer not null,
    "current_serial" integer not null default 0,
    "status" text not null default 'ACTIVE'::text,
    "example_container_number" text,
    "remark" text,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "container_size_code_id" uuid
      );


alter table "public"."container_number_rules" enable row level security;


  create table "public"."container_size_codes" (
    "id" uuid not null default gen_random_uuid(),
    "size_code" text not null,
    "remark" text,
    "sort_order" integer not null default 999,
    "status" text not null default 'ACTIVE'::text,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."container_size_codes" enable row level security;


  create table "public"."container_type_codes" (
    "id" uuid not null default gen_random_uuid(),
    "type_code" text not null,
    "remark" text,
    "sort_order" integer not null default 999,
    "status" text not null default 'ACTIVE'::text,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."container_type_codes" enable row level security;


  create table "public"."cost_codes" (
    "id" uuid not null default gen_random_uuid(),
    "cost_code" text not null,
    "cost_name" text not null,
    "description" text,
    "sort_order" integer not null default 999,
    "status" text not null default 'ACTIVE'::text,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."cost_codes" enable row level security;


  create table "public"."customers" (
    "id" uuid not null default gen_random_uuid(),
    "company_name" text not null,
    "customer_grade" text default 'C'::text,
    "status" text not null default 'Normal'::text,
    "contact_phone" text,
    "finance_emails" text[] default '{}'::text[],
    "ops_emails" text[] default '{}'::text[],
    "purchasing_emails" text[] default '{}'::text[],
    "credit_limit" numeric(12,2) not null default 0.00,
    "credit_term_days" integer not null default 3,
    "depot_info" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "customer_custom_id" text,
    "address" text,
    "notes" text,
    "assigned_sales_id" uuid
      );


alter table "public"."customers" enable row level security;


  create table "public"."depots" (
    "id" uuid not null default gen_random_uuid(),
    "depot_code" text not null,
    "depot_name" text not null,
    "region" text,
    "depot_type" text,
    "working_hour" text,
    "depot_address" text,
    "contact_person" text,
    "contact_email" text,
    "account_email" text,
    "depot_tel" text,
    "currency" text default 'USD'::text,
    "gate_in_out_cost" numeric(12,2) default 0.00,
    "lift_in_out_cost" numeric(12,2) default 0.00,
    "storage_rate_20" numeric(12,2) default 0.00,
    "storage_rate_40" numeric(12,2) default 0.00,
    "storage_rate_45" numeric(12,2) default 0.00,
    "storage_rate_53" numeric(12,2) default 0.00,
    "free_days" integer default 0,
    "digging_cost" numeric(12,2) default 0.00,
    "pti_cost" numeric(12,2) default 0.00,
    "labour_cost" numeric(12,2) default 0.00,
    "min_repair_cost" numeric(12,2) default 0.00,
    "survey_cost" numeric(12,2) default 0.00,
    "inspection_cost" numeric(12,2) default 0.00,
    "est_recovery_fee" numeric(12,2) default 0.00,
    "remark1" text,
    "remark2" text,
    "remark3" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "city_id" uuid
      );


alter table "public"."depots" enable row level security;


  create table "public"."finance_record" (
    "id" uuid not null default gen_random_uuid(),
    "business_type" text not null,
    "business_id" uuid not null,
    "record_type" text not null,
    "counterparty_type" text,
    "counterparty_id" uuid,
    "amount" numeric(14,2) not null,
    "paid_amount" numeric(14,2) not null default 0,
    "currency" text not null default 'USD'::text,
    "status" text not null,
    "due_date" date,
    "paid_date" date,
    "remark" text,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "invoice_id" uuid
      );


alter table "public"."finance_record" enable row level security;


  create table "public"."inventory" (
    "id" uuid not null default gen_random_uuid(),
    "unit_number" text not null,
    "container_type" text,
    "condition" text,
    "lifecycle_stage" text not null default 'Transit'::text,
    "status" text not null default 'Available'::text,
    "customer_id" uuid,
    "cost_price" numeric(12,2),
    "target_price" numeric(12,2),
    "sold_price" numeric(12,2),
    "logistics_data" jsonb default '{}'::jsonb,
    "container_specs" jsonb default '{}'::jsonb,
    "financial_data" jsonb default '{}'::jsonb,
    "remarks" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "sales" uuid,
    "container_size" text,
    "actual_depot_id" uuid,
    "color" text,
    "eta" timestamp with time zone,
    "purchase_date" date,
    "pol_id" uuid,
    "pod_id" uuid
      );


alter table "public"."inventory" enable row level security;


  create table "public"."lease_bill" (
    "id" uuid not null default gen_random_uuid(),
    "lease_contract_id" uuid not null,
    "bill_no" text not null,
    "bill_start_date" date not null,
    "bill_end_date" date not null,
    "amount" numeric(14,2) not null default 0,
    "currency" text not null default 'USD'::text,
    "bill_status" text not null,
    "due_date" date,
    "remark" text,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."lease_bill" enable row level security;


  create table "public"."lease_contract" (
    "id" uuid not null default gen_random_uuid(),
    "contract_no" text not null,
    "customer_id" uuid not null,
    "start_date" date not null,
    "end_date" date,
    "status" text not null,
    "settlement_currency" text not null default 'USD'::text,
    "remark" text,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."lease_contract" enable row level security;


  create table "public"."lease_item" (
    "id" uuid not null default gen_random_uuid(),
    "lease_contract_id" uuid not null,
    "container_id" uuid not null,
    "rent_price_per_day" numeric(14,2) not null default 0,
    "start_date" date not null,
    "end_date" date,
    "item_status" text not null,
    "remark" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."lease_item" enable row level security;


  create table "public"."purchase_order" (
    "id" uuid not null default gen_random_uuid(),
    "order_no" text not null,
    "purchase_type" text not null,
    "supplier_id" uuid not null,
    "depot_id" uuid,
    "liner_company" text,
    "business_owner_id" uuid,
    "purchase_date" date not null,
    "estimated_offline_date" date,
    "settlement_currency" text not null default 'USD'::text,
    "exchange_rate" numeric(14,6) not null default 1,
    "total_amount_payable" numeric(14,2) not null default 0,
    "total_amount_paid" numeric(14,2) not null default 0,
    "total_amount_unpaid" numeric(14,2) not null default 0,
    "order_status" text not null,
    "offline_status" text not null default 'NOT_STARTED'::text,
    "inbound_status" text not null default 'NOT_STARTED'::text,
    "remark" text,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."purchase_order" enable row level security;


  create table "public"."purchase_order_container" (
    "id" uuid not null default gen_random_uuid(),
    "purchase_order_id" uuid not null,
    "purchase_order_item_id" uuid not null,
    "container_id" uuid,
    "container_number" text,
    "country_code" text,
    "depot_id" uuid,
    "estimated_offline_time" timestamp with time zone,
    "actual_offline_time" timestamp with time zone,
    "inbound_time" timestamp with time zone,
    "item_status" text not null,
    "remark" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "container_type_code_id" uuid,
    "container_condition_code_id" uuid,
    "container_size_code_id" uuid
      );


alter table "public"."purchase_order_container" enable row level security;


  create table "public"."purchase_order_item" (
    "id" uuid not null default gen_random_uuid(),
    "purchase_order_id" uuid not null,
    "line_no" integer not null,
    "color" text,
    "manufacture_date" date,
    "machine_type" text,
    "planned_qty" integer not null,
    "unit_price" numeric(14,2) not null default 0,
    "operation_cost" numeric(14,2) not null default 0,
    "settlement_price" numeric(14,2) not null default 0,
    "line_amount" numeric(14,2) not null default 0,
    "flp" boolean not null default false,
    "lbx" boolean not null default false,
    "locking_bars" boolean not null default false,
    "vents" boolean not null default false,
    "remark" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "container_type_code_id" uuid,
    "container_condition_code_id" uuid,
    "container_size_code_id" uuid
      );


alter table "public"."purchase_order_item" enable row level security;


  create table "public"."revenue_codes" (
    "id" uuid not null default gen_random_uuid(),
    "revenue_code" text not null,
    "revenue_name" text not null,
    "description" text,
    "sort_order" integer not null default 999,
    "status" text not null default 'ACTIVE'::text,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."revenue_codes" enable row level security;


  create table "public"."sales_delivery" (
    "id" uuid not null default gen_random_uuid(),
    "sales_order_id" uuid not null,
    "delivery_no" text,
    "delivery_date" timestamp with time zone,
    "delivery_depot_id" uuid,
    "delivery_status" text not null,
    "remark" text,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."sales_delivery" enable row level security;


  create table "public"."sales_item" (
    "id" uuid not null default gen_random_uuid(),
    "sales_order_id" uuid not null,
    "container_id" uuid not null,
    "unit_price" numeric(14,2) not null default 0,
    "item_status" text not null,
    "remark" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."sales_item" enable row level security;


  create table "public"."sales_order" (
    "id" uuid not null default gen_random_uuid(),
    "order_no" text not null,
    "customer_id" uuid not null,
    "sale_date" date not null,
    "settlement_currency" text not null default 'USD'::text,
    "exchange_rate" numeric(14,6) not null default 1,
    "status" text not null,
    "total_amount" numeric(14,2) not null default 0,
    "remark" text,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."sales_order" enable row level security;


  create table "public"."suppliers" (
    "id" uuid not null default gen_random_uuid(),
    "supplier_code" text,
    "supplier_name" text not null,
    "status" text not null default 'NORMAL'::text,
    "contact_person" text,
    "contact_phone" text,
    "contact_email" text,
    "finance_emails" text[] not null default '{}'::text[],
    "purchasing_emails" text[] not null default '{}'::text[],
    "address" text,
    "currency" text not null default 'USD'::text,
    "payment_term_days" integer not null default 0,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."suppliers" enable row level security;


  create table "public"."transfer_item" (
    "id" uuid not null default gen_random_uuid(),
    "transfer_order_id" uuid not null,
    "container_id" uuid not null,
    "item_status" text not null,
    "remark" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."transfer_item" enable row level security;


  create table "public"."transfer_order" (
    "id" uuid not null default gen_random_uuid(),
    "order_no" text not null,
    "transfer_type" text,
    "from_depot_id" uuid,
    "to_depot_id" uuid,
    "customer_id" uuid,
    "status" text not null,
    "departure_time" timestamp with time zone,
    "arrival_time" timestamp with time zone,
    "total_cost" numeric(14,2) not null default 0,
    "total_revenue" numeric(14,2) not null default 0,
    "remark" text,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."transfer_order" enable row level security;


  create table "public"."users" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "full_name" text,
    "role" text not null default 'Sales'::text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."users" enable row level security;


  create table "public"."yard_record" (
    "id" uuid not null default gen_random_uuid(),
    "container_id" uuid not null,
    "depot_id" uuid not null,
    "enter_time" timestamp with time zone not null,
    "exit_time" timestamp with time zone,
    "record_status" text not null,
    "remark" text,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."yard_record" enable row level security;

CREATE UNIQUE INDEX business_cost_pkey ON public.business_cost USING btree (id);

CREATE UNIQUE INDEX business_invoice_business_type_business_id_invoice_no_key ON public.business_invoice USING btree (business_type, business_id, invoice_no);

CREATE UNIQUE INDEX business_invoice_item_pkey ON public.business_invoice_item USING btree (id);

CREATE UNIQUE INDEX business_invoice_pkey ON public.business_invoice USING btree (id);

CREATE UNIQUE INDEX business_revenue_pkey ON public.business_revenue USING btree (id);

CREATE UNIQUE INDEX cities_city_code_key ON public.cities USING btree (city_code);

CREATE UNIQUE INDEX cities_pkey ON public.cities USING btree (id);

CREATE UNIQUE INDEX container_condition_codes_condition_code_key ON public.container_condition_codes USING btree (condition_code);

CREATE UNIQUE INDEX container_condition_codes_pkey ON public.container_condition_codes USING btree (id);

CREATE UNIQUE INDEX container_container_number_key ON public.container USING btree (container_number);

CREATE UNIQUE INDEX container_event_pkey ON public.container_event USING btree (id);

CREATE UNIQUE INDEX container_number_rules_pkey ON public.container_number_rules USING btree (id);

CREATE UNIQUE INDEX container_pkey ON public.container USING btree (id);

CREATE UNIQUE INDEX container_size_codes_pkey ON public.container_size_codes USING btree (id);

CREATE UNIQUE INDEX container_size_codes_size_code_key ON public.container_size_codes USING btree (size_code);

CREATE UNIQUE INDEX container_type_codes_pkey ON public.container_type_codes USING btree (id);

CREATE UNIQUE INDEX container_type_codes_type_code_key ON public.container_type_codes USING btree (type_code);

CREATE UNIQUE INDEX cost_codes_cost_code_key ON public.cost_codes USING btree (cost_code);

CREATE UNIQUE INDEX cost_codes_pkey ON public.cost_codes USING btree (id);

CREATE UNIQUE INDEX customers_company_name_key ON public.customers USING btree (company_name);

CREATE UNIQUE INDEX customers_customer_custom_id_key ON public.customers USING btree (customer_custom_id);

CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id);

CREATE UNIQUE INDEX depots_depot_code_key ON public.depots USING btree (depot_code);

CREATE UNIQUE INDEX depots_pkey ON public.depots USING btree (id);

CREATE UNIQUE INDEX finance_record_pkey ON public.finance_record USING btree (id);

CREATE INDEX idx_business_cost_business ON public.business_cost USING btree (business_type, business_id);

CREATE INDEX idx_business_cost_code ON public.business_cost USING btree (cost_code_id);

CREATE INDEX idx_business_cost_container ON public.business_cost USING btree (container_id);

CREATE INDEX idx_business_cost_container_id ON public.business_cost USING btree (container_id);

CREATE INDEX idx_business_cost_date ON public.business_cost USING btree (occur_date);

CREATE INDEX idx_business_invoice_business ON public.business_invoice USING btree (business_type, business_id);

CREATE INDEX idx_business_invoice_type ON public.business_invoice USING btree (invoice_type);

CREATE INDEX idx_business_revenue_business ON public.business_revenue USING btree (business_type, business_id);

CREATE INDEX idx_business_revenue_code ON public.business_revenue USING btree (revenue_code_id);

CREATE INDEX idx_business_revenue_container ON public.business_revenue USING btree (container_id);

CREATE INDEX idx_business_revenue_container_id ON public.business_revenue USING btree (container_id);

CREATE INDEX idx_business_revenue_date ON public.business_revenue USING btree (occur_date);

CREATE INDEX idx_cities_city_code ON public.cities USING btree (city_code);

CREATE INDEX idx_cities_city_name ON public.cities USING btree (city_name);

CREATE INDEX idx_container_condition_code_id ON public.container USING btree (container_condition_code_id);

CREATE INDEX idx_container_condition_codes_code ON public.container_condition_codes USING btree (condition_code);

CREATE INDEX idx_container_container_condition_code_id ON public.container USING btree (container_condition_code_id);

CREATE INDEX idx_container_container_type_code_id ON public.container USING btree (container_type_code_id);

CREATE INDEX idx_container_current_customer_id ON public.container USING btree (current_customer_id);

CREATE INDEX idx_container_current_depot_id ON public.container USING btree (current_depot_id);

CREATE INDEX idx_container_current_lease_id ON public.container USING btree (current_lease_id);

CREATE INDEX idx_container_current_sale_id ON public.container USING btree (current_sale_id);

CREATE INDEX idx_container_current_transfer_id ON public.container USING btree (current_transfer_id);

CREATE INDEX idx_container_event_business ON public.container_event USING btree (business_type, business_id);

CREATE INDEX idx_container_event_container_time ON public.container_event USING btree (container_id, event_time DESC);

CREATE INDEX idx_container_event_from_depot ON public.container_event USING btree (from_depot_id);

CREATE INDEX idx_container_event_to_depot ON public.container_event USING btree (to_depot_id);

CREATE INDEX idx_container_event_type ON public.container_event USING btree (event_type);

CREATE INDEX idx_container_lifecycle ON public.container USING btree (lifecycle_stage);

CREATE INDEX idx_container_lifecycle_stage ON public.container USING btree (lifecycle_stage);

CREATE INDEX idx_container_size_code_id ON public.container USING btree (container_size_code_id);

CREATE INDEX idx_container_status ON public.container USING btree (status);

CREATE INDEX idx_container_type_code_id ON public.container USING btree (container_type_code_id);

CREATE INDEX idx_container_type_codes_code ON public.container_type_codes USING btree (type_code);

CREATE INDEX idx_cost_codes_cost_code ON public.cost_codes USING btree (cost_code);

CREATE INDEX idx_customers_company_name ON public.customers USING btree (company_name);

CREATE INDEX idx_customers_custom_id ON public.customers USING btree (customer_custom_id);

CREATE INDEX idx_depots_code ON public.depots USING btree (depot_code);

CREATE INDEX idx_depots_name ON public.depots USING btree (depot_name);

CREATE INDEX idx_finance_record_business ON public.finance_record USING btree (business_type, business_id);

CREATE INDEX idx_finance_record_counterparty ON public.finance_record USING btree (counterparty_type, counterparty_id);

CREATE INDEX idx_finance_record_status ON public.finance_record USING btree (status);

CREATE INDEX idx_inventory_actual_depot ON public.inventory USING btree (actual_depot_id);

CREATE INDEX idx_inventory_actual_depot_id ON public.inventory USING btree (actual_depot_id);

CREATE INDEX idx_inventory_container_size ON public.inventory USING btree (container_size);

CREATE INDEX idx_inventory_pod ON public.inventory USING btree (pod_id);

CREATE INDEX idx_inventory_pod_id ON public.inventory USING btree (pod_id);

CREATE INDEX idx_inventory_pol ON public.inventory USING btree (pol_id);

CREATE INDEX idx_inventory_pol_id ON public.inventory USING btree (pol_id);

CREATE INDEX idx_inventory_sales ON public.inventory USING btree (sales);

CREATE INDEX idx_inventory_unit_number ON public.inventory USING btree (unit_number);

CREATE INDEX idx_invoice_item_cost ON public.business_invoice_item USING btree (cost_id);

CREATE INDEX idx_invoice_item_invoice ON public.business_invoice_item USING btree (invoice_id);

CREATE INDEX idx_invoice_item_revenue ON public.business_invoice_item USING btree (revenue_id);

CREATE INDEX idx_lease_bill_contract ON public.lease_bill USING btree (lease_contract_id);

CREATE INDEX idx_lease_bill_lease_contract_id ON public.lease_bill USING btree (lease_contract_id);

CREATE INDEX idx_lease_bill_status ON public.lease_bill USING btree (bill_status);

CREATE INDEX idx_lease_contract_customer_id ON public.lease_contract USING btree (customer_id);

CREATE INDEX idx_lease_contract_status ON public.lease_contract USING btree (status);

CREATE INDEX idx_lease_item_container ON public.lease_item USING btree (container_id);

CREATE INDEX idx_lease_item_container_id ON public.lease_item USING btree (container_id);

CREATE INDEX idx_lease_item_contract ON public.lease_item USING btree (lease_contract_id);

CREATE INDEX idx_lease_item_lease_contract_id ON public.lease_item USING btree (lease_contract_id);

CREATE INDEX idx_lease_item_status ON public.lease_item USING btree (item_status);

CREATE INDEX idx_lease_status ON public.lease_contract USING btree (status);

CREATE INDEX idx_po_status ON public.purchase_order USING btree (order_status);

CREATE INDEX idx_purchase_order_business_owner_id ON public.purchase_order USING btree (business_owner_id);

CREATE INDEX idx_purchase_order_container_container_id ON public.purchase_order_container USING btree (container_id);

CREATE INDEX idx_purchase_order_container_depot_id ON public.purchase_order_container USING btree (depot_id);

CREATE INDEX idx_purchase_order_container_purchase_order_id ON public.purchase_order_container USING btree (purchase_order_id);

CREATE INDEX idx_purchase_order_container_purchase_order_item_id ON public.purchase_order_container USING btree (purchase_order_item_id);

CREATE INDEX idx_purchase_order_date ON public.purchase_order USING btree (purchase_date);

CREATE INDEX idx_purchase_order_depot_id ON public.purchase_order USING btree (depot_id);

CREATE INDEX idx_purchase_order_item_container_condition_code_id ON public.purchase_order_item USING btree (container_condition_code_id);

CREATE INDEX idx_purchase_order_item_container_type_code_id ON public.purchase_order_item USING btree (container_type_code_id);

CREATE INDEX idx_purchase_order_item_order ON public.purchase_order_item USING btree (purchase_order_id);

CREATE INDEX idx_purchase_order_item_purchase_order_id ON public.purchase_order_item USING btree (purchase_order_id);

CREATE INDEX idx_purchase_order_order_status ON public.purchase_order USING btree (order_status);

CREATE INDEX idx_purchase_order_supplier_id ON public.purchase_order USING btree (supplier_id);

CREATE INDEX idx_revenue_codes_revenue_code ON public.revenue_codes USING btree (revenue_code);

CREATE INDEX idx_sales_delivery_order ON public.sales_delivery USING btree (sales_order_id);

CREATE INDEX idx_sales_delivery_sales_order_id ON public.sales_delivery USING btree (sales_order_id);

CREATE INDEX idx_sales_delivery_status ON public.sales_delivery USING btree (delivery_status);

CREATE INDEX idx_sales_item_container ON public.sales_item USING btree (container_id);

CREATE INDEX idx_sales_item_container_id ON public.sales_item USING btree (container_id);

CREATE INDEX idx_sales_item_order ON public.sales_item USING btree (sales_order_id);

CREATE INDEX idx_sales_item_sales_order_id ON public.sales_item USING btree (sales_order_id);

CREATE INDEX idx_sales_item_status ON public.sales_item USING btree (item_status);

CREATE INDEX idx_sales_order_customer ON public.sales_order USING btree (customer_id);

CREATE INDEX idx_sales_order_customer_id ON public.sales_order USING btree (customer_id);

CREATE INDEX idx_sales_order_date ON public.sales_order USING btree (sale_date);

CREATE INDEX idx_sales_order_status ON public.sales_order USING btree (status);

CREATE INDEX idx_so_status ON public.sales_order USING btree (status);

CREATE INDEX idx_transfer_item_container ON public.transfer_item USING btree (container_id);

CREATE INDEX idx_transfer_item_container_id ON public.transfer_item USING btree (container_id);

CREATE INDEX idx_transfer_item_order ON public.transfer_item USING btree (transfer_order_id);

CREATE INDEX idx_transfer_item_transfer_order_id ON public.transfer_item USING btree (transfer_order_id);

CREATE INDEX idx_transfer_order_customer ON public.transfer_order USING btree (customer_id);

CREATE INDEX idx_transfer_order_customer_id ON public.transfer_order USING btree (customer_id);

CREATE INDEX idx_transfer_order_from_depot ON public.transfer_order USING btree (from_depot_id);

CREATE INDEX idx_transfer_order_from_depot_id ON public.transfer_order USING btree (from_depot_id);

CREATE INDEX idx_transfer_order_status ON public.transfer_order USING btree (status);

CREATE INDEX idx_transfer_order_to_depot ON public.transfer_order USING btree (to_depot_id);

CREATE INDEX idx_transfer_order_to_depot_id ON public.transfer_order USING btree (to_depot_id);

CREATE INDEX idx_transfer_status ON public.transfer_order USING btree (status);

CREATE INDEX idx_yard_record_container ON public.yard_record USING btree (container_id);

CREATE INDEX idx_yard_record_container_id ON public.yard_record USING btree (container_id);

CREATE INDEX idx_yard_record_container_time ON public.yard_record USING btree (container_id, enter_time DESC);

CREATE INDEX idx_yard_record_depot ON public.yard_record USING btree (depot_id);

CREATE INDEX idx_yard_record_depot_id ON public.yard_record USING btree (depot_id);

CREATE INDEX idx_yard_record_status ON public.yard_record USING btree (record_status);

CREATE UNIQUE INDEX inventory_pkey ON public.inventory USING btree (id);

CREATE UNIQUE INDEX inventory_unit_number_key ON public.inventory USING btree (unit_number);

CREATE UNIQUE INDEX lease_bill_bill_no_key ON public.lease_bill USING btree (bill_no);

CREATE UNIQUE INDEX lease_bill_pkey ON public.lease_bill USING btree (id);

CREATE UNIQUE INDEX lease_contract_contract_no_key ON public.lease_contract USING btree (contract_no);

CREATE UNIQUE INDEX lease_contract_pkey ON public.lease_contract USING btree (id);

CREATE UNIQUE INDEX lease_item_lease_contract_id_container_id_key ON public.lease_item USING btree (lease_contract_id, container_id);

CREATE UNIQUE INDEX lease_item_pkey ON public.lease_item USING btree (id);

CREATE UNIQUE INDEX purchase_order_container_pkey ON public.purchase_order_container USING btree (id);

CREATE UNIQUE INDEX purchase_order_item_pkey ON public.purchase_order_item USING btree (id);

CREATE UNIQUE INDEX purchase_order_item_purchase_order_id_line_no_key ON public.purchase_order_item USING btree (purchase_order_id, line_no);

CREATE UNIQUE INDEX purchase_order_order_no_key ON public.purchase_order USING btree (order_no);

CREATE UNIQUE INDEX purchase_order_pkey ON public.purchase_order USING btree (id);

CREATE UNIQUE INDEX revenue_codes_pkey ON public.revenue_codes USING btree (id);

CREATE UNIQUE INDEX revenue_codes_revenue_code_key ON public.revenue_codes USING btree (revenue_code);

CREATE UNIQUE INDEX sales_delivery_delivery_no_key ON public.sales_delivery USING btree (delivery_no);

CREATE UNIQUE INDEX sales_delivery_pkey ON public.sales_delivery USING btree (id);

CREATE UNIQUE INDEX sales_item_pkey ON public.sales_item USING btree (id);

CREATE UNIQUE INDEX sales_item_sales_order_id_container_id_key ON public.sales_item USING btree (sales_order_id, container_id);

CREATE UNIQUE INDEX sales_order_order_no_key ON public.sales_order USING btree (order_no);

CREATE UNIQUE INDEX sales_order_pkey ON public.sales_order USING btree (id);

CREATE UNIQUE INDEX suppliers_pkey ON public.suppliers USING btree (id);

CREATE UNIQUE INDEX suppliers_supplier_code_key ON public.suppliers USING btree (supplier_code);

CREATE UNIQUE INDEX suppliers_supplier_name_key ON public.suppliers USING btree (supplier_name);

CREATE UNIQUE INDEX transfer_item_pkey ON public.transfer_item USING btree (id);

CREATE UNIQUE INDEX transfer_item_transfer_order_id_container_id_key ON public.transfer_item USING btree (transfer_order_id, container_id);

CREATE UNIQUE INDEX transfer_order_order_no_key ON public.transfer_order USING btree (order_no);

CREATE UNIQUE INDEX transfer_order_pkey ON public.transfer_order USING btree (id);

CREATE UNIQUE INDEX uq_business_invoice_business_invoice_no ON public.business_invoice USING btree (business_type, business_id, invoice_no);

CREATE UNIQUE INDEX uq_container_event_one_per_business ON public.container_event USING btree (container_id, business_type, business_id, event_type) WHERE ((business_type IS NOT NULL) AND (business_id IS NOT NULL));

CREATE UNIQUE INDEX uq_container_number_rules_active_per_size ON public.container_number_rules USING btree (container_size_code_id) WHERE (status = 'ACTIVE'::text);

CREATE UNIQUE INDEX uq_invoice_item_invoice_cost ON public.business_invoice_item USING btree (invoice_id, cost_id) WHERE (cost_id IS NOT NULL);

CREATE UNIQUE INDEX uq_invoice_item_invoice_revenue ON public.business_invoice_item USING btree (invoice_id, revenue_id) WHERE (revenue_id IS NOT NULL);

CREATE UNIQUE INDEX uq_purchase_order_item_order_line ON public.purchase_order_item USING btree (purchase_order_id, line_no);

CREATE UNIQUE INDEX uq_transfer_item_order_container ON public.transfer_item USING btree (transfer_order_id, container_id);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_full_name_unique ON public.users USING btree (full_name);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX yard_record_pkey ON public.yard_record USING btree (id);

alter table "public"."business_cost" add constraint "business_cost_pkey" PRIMARY KEY using index "business_cost_pkey";

alter table "public"."business_invoice" add constraint "business_invoice_pkey" PRIMARY KEY using index "business_invoice_pkey";

alter table "public"."business_invoice_item" add constraint "business_invoice_item_pkey" PRIMARY KEY using index "business_invoice_item_pkey";

alter table "public"."business_revenue" add constraint "business_revenue_pkey" PRIMARY KEY using index "business_revenue_pkey";

alter table "public"."cities" add constraint "cities_pkey" PRIMARY KEY using index "cities_pkey";

alter table "public"."container" add constraint "container_pkey" PRIMARY KEY using index "container_pkey";

alter table "public"."container_condition_codes" add constraint "container_condition_codes_pkey" PRIMARY KEY using index "container_condition_codes_pkey";

alter table "public"."container_event" add constraint "container_event_pkey" PRIMARY KEY using index "container_event_pkey";

alter table "public"."container_number_rules" add constraint "container_number_rules_pkey" PRIMARY KEY using index "container_number_rules_pkey";

alter table "public"."container_size_codes" add constraint "container_size_codes_pkey" PRIMARY KEY using index "container_size_codes_pkey";

alter table "public"."container_type_codes" add constraint "container_type_codes_pkey" PRIMARY KEY using index "container_type_codes_pkey";

alter table "public"."cost_codes" add constraint "cost_codes_pkey" PRIMARY KEY using index "cost_codes_pkey";

alter table "public"."customers" add constraint "customers_pkey" PRIMARY KEY using index "customers_pkey";

alter table "public"."depots" add constraint "depots_pkey" PRIMARY KEY using index "depots_pkey";

alter table "public"."finance_record" add constraint "finance_record_pkey" PRIMARY KEY using index "finance_record_pkey";

alter table "public"."inventory" add constraint "inventory_pkey" PRIMARY KEY using index "inventory_pkey";

alter table "public"."lease_bill" add constraint "lease_bill_pkey" PRIMARY KEY using index "lease_bill_pkey";

alter table "public"."lease_contract" add constraint "lease_contract_pkey" PRIMARY KEY using index "lease_contract_pkey";

alter table "public"."lease_item" add constraint "lease_item_pkey" PRIMARY KEY using index "lease_item_pkey";

alter table "public"."purchase_order" add constraint "purchase_order_pkey" PRIMARY KEY using index "purchase_order_pkey";

alter table "public"."purchase_order_container" add constraint "purchase_order_container_pkey" PRIMARY KEY using index "purchase_order_container_pkey";

alter table "public"."purchase_order_item" add constraint "purchase_order_item_pkey" PRIMARY KEY using index "purchase_order_item_pkey";

alter table "public"."revenue_codes" add constraint "revenue_codes_pkey" PRIMARY KEY using index "revenue_codes_pkey";

alter table "public"."sales_delivery" add constraint "sales_delivery_pkey" PRIMARY KEY using index "sales_delivery_pkey";

alter table "public"."sales_item" add constraint "sales_item_pkey" PRIMARY KEY using index "sales_item_pkey";

alter table "public"."sales_order" add constraint "sales_order_pkey" PRIMARY KEY using index "sales_order_pkey";

alter table "public"."suppliers" add constraint "suppliers_pkey" PRIMARY KEY using index "suppliers_pkey";

alter table "public"."transfer_item" add constraint "transfer_item_pkey" PRIMARY KEY using index "transfer_item_pkey";

alter table "public"."transfer_order" add constraint "transfer_order_pkey" PRIMARY KEY using index "transfer_order_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."yard_record" add constraint "yard_record_pkey" PRIMARY KEY using index "yard_record_pkey";

alter table "public"."business_cost" add constraint "business_cost_business_type_check" CHECK ((business_type = ANY (ARRAY['PURCHASE'::text, 'TRANSFER'::text, 'YARD'::text, 'LEASE'::text, 'SALE'::text]))) not valid;

alter table "public"."business_cost" validate constraint "business_cost_business_type_check";

alter table "public"."business_cost" add constraint "business_cost_container_id_fkey" FOREIGN KEY (container_id) REFERENCES public.container(id) not valid;

alter table "public"."business_cost" validate constraint "business_cost_container_id_fkey";

alter table "public"."business_cost" add constraint "business_cost_cost_code_id_fkey" FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) not valid;

alter table "public"."business_cost" validate constraint "business_cost_cost_code_id_fkey";

alter table "public"."business_cost" add constraint "business_cost_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."business_cost" validate constraint "business_cost_created_by_fkey";

alter table "public"."business_cost" add constraint "business_cost_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."business_cost" validate constraint "business_cost_updated_by_fkey";

alter table "public"."business_cost" add constraint "chk_business_cost_type_or_code" CHECK (((cost_code_id IS NOT NULL) OR (cost_type IS NOT NULL))) not valid;

alter table "public"."business_cost" validate constraint "chk_business_cost_type_or_code";

alter table "public"."business_invoice" add constraint "business_invoice_business_type_business_id_invoice_no_key" UNIQUE using index "business_invoice_business_type_business_id_invoice_no_key";

alter table "public"."business_invoice" add constraint "business_invoice_business_type_check" CHECK ((business_type = ANY (ARRAY['PURCHASE'::text, 'TRANSFER'::text, 'YARD'::text, 'LEASE'::text, 'SALE'::text]))) not valid;

alter table "public"."business_invoice" validate constraint "business_invoice_business_type_check";

alter table "public"."business_invoice" add constraint "business_invoice_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."business_invoice" validate constraint "business_invoice_created_by_fkey";

alter table "public"."business_invoice" add constraint "business_invoice_invoice_status_check" CHECK ((invoice_status = ANY (ARRAY['DRAFT'::text, 'ISSUED'::text, 'VOID'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."business_invoice" validate constraint "business_invoice_invoice_status_check";

alter table "public"."business_invoice" add constraint "business_invoice_invoice_type_check" CHECK ((invoice_type = ANY (ARRAY['PAYABLE'::text, 'RECEIVABLE'::text]))) not valid;

alter table "public"."business_invoice" validate constraint "business_invoice_invoice_type_check";

alter table "public"."business_invoice" add constraint "business_invoice_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."business_invoice" validate constraint "business_invoice_updated_by_fkey";

alter table "public"."business_invoice" add constraint "uq_business_invoice_business_invoice_no" UNIQUE using index "uq_business_invoice_business_invoice_no";

alter table "public"."business_invoice_item" add constraint "business_invoice_item_cost_id_fkey" FOREIGN KEY (cost_id) REFERENCES public.business_cost(id) not valid;

alter table "public"."business_invoice_item" validate constraint "business_invoice_item_cost_id_fkey";

alter table "public"."business_invoice_item" add constraint "business_invoice_item_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.business_invoice(id) ON DELETE CASCADE not valid;

alter table "public"."business_invoice_item" validate constraint "business_invoice_item_invoice_id_fkey";

alter table "public"."business_invoice_item" add constraint "business_invoice_item_revenue_id_fkey" FOREIGN KEY (revenue_id) REFERENCES public.business_revenue(id) not valid;

alter table "public"."business_invoice_item" validate constraint "business_invoice_item_revenue_id_fkey";

alter table "public"."business_invoice_item" add constraint "chk_invoice_item_one_side" CHECK ((((revenue_id IS NOT NULL) AND (cost_id IS NULL)) OR ((revenue_id IS NULL) AND (cost_id IS NOT NULL)))) not valid;

alter table "public"."business_invoice_item" validate constraint "chk_invoice_item_one_side";

alter table "public"."business_revenue" add constraint "business_revenue_business_type_check" CHECK ((business_type = ANY (ARRAY['PURCHASE'::text, 'TRANSFER'::text, 'YARD'::text, 'LEASE'::text, 'SALE'::text]))) not valid;

alter table "public"."business_revenue" validate constraint "business_revenue_business_type_check";

alter table "public"."business_revenue" add constraint "business_revenue_container_id_fkey" FOREIGN KEY (container_id) REFERENCES public.container(id) not valid;

alter table "public"."business_revenue" validate constraint "business_revenue_container_id_fkey";

alter table "public"."business_revenue" add constraint "business_revenue_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."business_revenue" validate constraint "business_revenue_created_by_fkey";

alter table "public"."business_revenue" add constraint "business_revenue_revenue_code_id_fkey" FOREIGN KEY (revenue_code_id) REFERENCES public.revenue_codes(id) not valid;

alter table "public"."business_revenue" validate constraint "business_revenue_revenue_code_id_fkey";

alter table "public"."business_revenue" add constraint "business_revenue_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."business_revenue" validate constraint "business_revenue_updated_by_fkey";

alter table "public"."business_revenue" add constraint "chk_business_revenue_type_or_code" CHECK (((revenue_code_id IS NOT NULL) OR (revenue_type IS NOT NULL))) not valid;

alter table "public"."business_revenue" validate constraint "chk_business_revenue_type_or_code";

alter table "public"."cities" add constraint "cities_city_code_key" UNIQUE using index "cities_city_code_key";

alter table "public"."cities" add constraint "cities_pic_id_fkey" FOREIGN KEY (pic_id) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."cities" validate constraint "cities_pic_id_fkey";

alter table "public"."container" add constraint "chk_container_status_by_lifecycle" CHECK ((((lifecycle_stage = 'IN_YARD'::text) AND (status = ANY (ARRAY['AVAILABLE'::text, 'MNR'::text, 'RESERVED'::text, 'HOLD'::text]))) OR ((lifecycle_stage = 'IN_TRANSIT'::text) AND (status = ANY (ARRAY['ONHIRE_IN_TRANSIT'::text, 'GATEBUY_PENDING'::text, 'EW_DEPOT_PENDING'::text, 'MISUSE'::text, 'THIRD_PARTY_TRANSIT'::text]))) OR ((lifecycle_stage = 'LEASE'::text) AND (status = ANY (ARRAY['ONHIRE'::text, 'OVERDUE'::text]))) OR ((lifecycle_stage = 'SOLD'::text) AND (status = 'SOLD'::text)) OR ((lifecycle_stage = 'TOTAL_LOSS'::text) AND (status = 'TOTAL_LOSS'::text)))) not valid;

alter table "public"."container" validate constraint "chk_container_status_by_lifecycle";

alter table "public"."container" add constraint "container_container_condition_code_id_fkey" FOREIGN KEY (container_condition_code_id) REFERENCES public.container_condition_codes(id) not valid;

alter table "public"."container" validate constraint "container_container_condition_code_id_fkey";

alter table "public"."container" add constraint "container_container_number_key" UNIQUE using index "container_container_number_key";

alter table "public"."container" add constraint "container_container_size_code_id_fkey" FOREIGN KEY (container_size_code_id) REFERENCES public.container_size_codes(id) not valid;

alter table "public"."container" validate constraint "container_container_size_code_id_fkey";

alter table "public"."container" add constraint "container_container_type_code_id_fkey" FOREIGN KEY (container_type_code_id) REFERENCES public.container_type_codes(id) not valid;

alter table "public"."container" validate constraint "container_container_type_code_id_fkey";

alter table "public"."container" add constraint "container_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."container" validate constraint "container_created_by_fkey";

alter table "public"."container" add constraint "container_current_customer_id_fkey" FOREIGN KEY (current_customer_id) REFERENCES public.customers(id) not valid;

alter table "public"."container" validate constraint "container_current_customer_id_fkey";

alter table "public"."container" add constraint "container_current_depot_id_fkey" FOREIGN KEY (current_depot_id) REFERENCES public.depots(id) not valid;

alter table "public"."container" validate constraint "container_current_depot_id_fkey";

alter table "public"."container" add constraint "container_lifecycle_stage_check" CHECK ((lifecycle_stage = ANY (ARRAY['IN_YARD'::text, 'IN_TRANSIT'::text, 'LEASE'::text, 'SOLD'::text, 'TOTAL_LOSS'::text]))) not valid;

alter table "public"."container" validate constraint "container_lifecycle_stage_check";

alter table "public"."container" add constraint "container_owner_type_check" CHECK ((owner_type = ANY (ARRAY['OWN'::text, 'LEASED'::text]))) not valid;

alter table "public"."container" validate constraint "container_owner_type_check";

alter table "public"."container" add constraint "container_transit_business_type_check" CHECK ((transit_business_type = ANY (ARRAY['ONE_WAY_LEASE'::text, 'GATEBUY'::text, 'EW_DEPOT'::text, 'MISUSE'::text, 'THIRD_PARTY'::text]))) not valid;

alter table "public"."container" validate constraint "container_transit_business_type_check";

alter table "public"."container" add constraint "container_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."container" validate constraint "container_updated_by_fkey";

alter table "public"."container" add constraint "fk_container_current_lease" FOREIGN KEY (current_lease_id) REFERENCES public.lease_contract(id) not valid;

alter table "public"."container" validate constraint "fk_container_current_lease";

alter table "public"."container" add constraint "fk_container_current_sale" FOREIGN KEY (current_sale_id) REFERENCES public.sales_order(id) not valid;

alter table "public"."container" validate constraint "fk_container_current_sale";

alter table "public"."container" add constraint "fk_container_current_transfer" FOREIGN KEY (current_transfer_id) REFERENCES public.transfer_order(id) not valid;

alter table "public"."container" validate constraint "fk_container_current_transfer";

alter table "public"."container" add constraint "fk_container_last_event" FOREIGN KEY (last_event_id) REFERENCES public.container_event(id) not valid;

alter table "public"."container" validate constraint "fk_container_last_event";

alter table "public"."container_condition_codes" add constraint "container_condition_codes_condition_code_key" UNIQUE using index "container_condition_codes_condition_code_key";

alter table "public"."container_condition_codes" add constraint "container_condition_codes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."container_condition_codes" validate constraint "container_condition_codes_created_by_fkey";

alter table "public"."container_condition_codes" add constraint "container_condition_codes_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text]))) not valid;

alter table "public"."container_condition_codes" validate constraint "container_condition_codes_status_check";

alter table "public"."container_event" add constraint "container_event_business_type_check" CHECK ((business_type = ANY (ARRAY['PURCHASE'::text, 'TRANSFER'::text, 'YARD'::text, 'LEASE'::text, 'SALE'::text, 'REPAIR'::text, 'OTHER'::text]))) not valid;

alter table "public"."container_event" validate constraint "container_event_business_type_check";

alter table "public"."container_event" add constraint "container_event_container_id_fkey" FOREIGN KEY (container_id) REFERENCES public.container(id) ON DELETE CASCADE not valid;

alter table "public"."container_event" validate constraint "container_event_container_id_fkey";

alter table "public"."container_event" add constraint "container_event_event_type_check" CHECK ((event_type = ANY (ARRAY['PURCHASE'::text, 'YARD_ENTER'::text, 'YARD_EXIT'::text, 'TRANSFER_OUT'::text, 'TRANSFER_IN'::text, 'LEASE_ONHIRE'::text, 'LEASE_OFFHIRE'::text, 'SALE_CONTRACTED'::text, 'SALE_DELIVERED'::text, 'TOTAL_LOSS'::text, 'REPAIR'::text, 'SCRAP'::text]))) not valid;

alter table "public"."container_event" validate constraint "container_event_event_type_check";

alter table "public"."container_event" add constraint "container_event_from_depot_id_fkey" FOREIGN KEY (from_depot_id) REFERENCES public.depots(id) not valid;

alter table "public"."container_event" validate constraint "container_event_from_depot_id_fkey";

alter table "public"."container_event" add constraint "container_event_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES public.users(id) not valid;

alter table "public"."container_event" validate constraint "container_event_operator_id_fkey";

alter table "public"."container_event" add constraint "container_event_to_depot_id_fkey" FOREIGN KEY (to_depot_id) REFERENCES public.depots(id) not valid;

alter table "public"."container_event" validate constraint "container_event_to_depot_id_fkey";

alter table "public"."container_number_rules" add constraint "chk_container_number_rules_current" CHECK (((current_serial >= start_serial) AND (current_serial <= end_serial))) not valid;

alter table "public"."container_number_rules" validate constraint "chk_container_number_rules_current";

alter table "public"."container_number_rules" add constraint "chk_container_number_rules_range" CHECK ((end_serial >= start_serial)) not valid;

alter table "public"."container_number_rules" validate constraint "chk_container_number_rules_range";

alter table "public"."container_number_rules" add constraint "container_number_rules_container_size_code_id_fkey" FOREIGN KEY (container_size_code_id) REFERENCES public.container_size_codes(id) not valid;

alter table "public"."container_number_rules" validate constraint "container_number_rules_container_size_code_id_fkey";

alter table "public"."container_number_rules" add constraint "container_number_rules_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."container_number_rules" validate constraint "container_number_rules_created_by_fkey";

alter table "public"."container_number_rules" add constraint "container_number_rules_serial_length_check" CHECK ((serial_length > 0)) not valid;

alter table "public"."container_number_rules" validate constraint "container_number_rules_serial_length_check";

alter table "public"."container_number_rules" add constraint "container_number_rules_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text]))) not valid;

alter table "public"."container_number_rules" validate constraint "container_number_rules_status_check";

alter table "public"."container_size_codes" add constraint "container_size_codes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."container_size_codes" validate constraint "container_size_codes_created_by_fkey";

alter table "public"."container_size_codes" add constraint "container_size_codes_size_code_key" UNIQUE using index "container_size_codes_size_code_key";

alter table "public"."container_size_codes" add constraint "container_size_codes_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text]))) not valid;

alter table "public"."container_size_codes" validate constraint "container_size_codes_status_check";

alter table "public"."container_type_codes" add constraint "container_type_codes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."container_type_codes" validate constraint "container_type_codes_created_by_fkey";

alter table "public"."container_type_codes" add constraint "container_type_codes_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text]))) not valid;

alter table "public"."container_type_codes" validate constraint "container_type_codes_status_check";

alter table "public"."container_type_codes" add constraint "container_type_codes_type_code_key" UNIQUE using index "container_type_codes_type_code_key";

alter table "public"."cost_codes" add constraint "cost_codes_cost_code_key" UNIQUE using index "cost_codes_cost_code_key";

alter table "public"."cost_codes" add constraint "cost_codes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."cost_codes" validate constraint "cost_codes_created_by_fkey";

alter table "public"."cost_codes" add constraint "cost_codes_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text]))) not valid;

alter table "public"."cost_codes" validate constraint "cost_codes_status_check";

alter table "public"."customers" add constraint "customers_assigned_sales_id_fkey" FOREIGN KEY (assigned_sales_id) REFERENCES public.users(id) not valid;

alter table "public"."customers" validate constraint "customers_assigned_sales_id_fkey";

alter table "public"."customers" add constraint "customers_company_name_key" UNIQUE using index "customers_company_name_key";

alter table "public"."customers" add constraint "customers_customer_custom_id_key" UNIQUE using index "customers_customer_custom_id_key";

alter table "public"."depots" add constraint "depots_city_id_fkey" FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE RESTRICT not valid;

alter table "public"."depots" validate constraint "depots_city_id_fkey";

alter table "public"."depots" add constraint "depots_depot_code_key" UNIQUE using index "depots_depot_code_key";

alter table "public"."finance_record" add constraint "finance_record_business_type_check" CHECK ((business_type = ANY (ARRAY['PURCHASE'::text, 'TRANSFER'::text, 'YARD'::text, 'LEASE'::text, 'SALE'::text]))) not valid;

alter table "public"."finance_record" validate constraint "finance_record_business_type_check";

alter table "public"."finance_record" add constraint "finance_record_counterparty_type_check" CHECK (((counterparty_type IS NULL) OR (counterparty_type = ANY (ARRAY['SUPPLIER'::text, 'CUSTOMER'::text, 'DEPOT'::text, 'VENDOR'::text, 'OTHER'::text])))) not valid;

alter table "public"."finance_record" validate constraint "finance_record_counterparty_type_check";

alter table "public"."finance_record" add constraint "finance_record_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."finance_record" validate constraint "finance_record_created_by_fkey";

alter table "public"."finance_record" add constraint "finance_record_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.business_invoice(id) not valid;

alter table "public"."finance_record" validate constraint "finance_record_invoice_id_fkey";

alter table "public"."finance_record" add constraint "finance_record_record_type_check" CHECK ((record_type = ANY (ARRAY['PAYABLE'::text, 'RECEIVABLE'::text]))) not valid;

alter table "public"."finance_record" validate constraint "finance_record_record_type_check";

alter table "public"."finance_record" add constraint "finance_record_status_check" CHECK ((status = ANY (ARRAY['UNPAID'::text, 'PARTIAL'::text, 'PAID'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."finance_record" validate constraint "finance_record_status_check";

alter table "public"."finance_record" add constraint "finance_record_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."finance_record" validate constraint "finance_record_updated_by_fkey";

alter table "public"."inventory" add constraint "fk_inventory_customer" FOREIGN KEY (customer_id) REFERENCES public.customers(id) not valid;

alter table "public"."inventory" validate constraint "fk_inventory_customer";

alter table "public"."inventory" add constraint "inventory_actual_depot_id_fkey" FOREIGN KEY (actual_depot_id) REFERENCES public.depots(id) not valid;

alter table "public"."inventory" validate constraint "inventory_actual_depot_id_fkey";

alter table "public"."inventory" add constraint "inventory_pod_id_fkey" FOREIGN KEY (pod_id) REFERENCES public.cities(id) not valid;

alter table "public"."inventory" validate constraint "inventory_pod_id_fkey";

alter table "public"."inventory" add constraint "inventory_pol_id_fkey" FOREIGN KEY (pol_id) REFERENCES public.cities(id) not valid;

alter table "public"."inventory" validate constraint "inventory_pol_id_fkey";

alter table "public"."inventory" add constraint "inventory_unit_number_key" UNIQUE using index "inventory_unit_number_key";

alter table "public"."inventory" add constraint "rel_inventory_customer" FOREIGN KEY (customer_id) REFERENCES public.customers(id) not valid;

alter table "public"."inventory" validate constraint "rel_inventory_customer";

alter table "public"."inventory" add constraint "rel_inventory_sales" FOREIGN KEY (sales) REFERENCES public.users(id) not valid;

alter table "public"."inventory" validate constraint "rel_inventory_sales";

alter table "public"."lease_bill" add constraint "lease_bill_bill_no_key" UNIQUE using index "lease_bill_bill_no_key";

alter table "public"."lease_bill" add constraint "lease_bill_bill_status_check" CHECK ((bill_status = ANY (ARRAY['DRAFT'::text, 'ISSUED'::text, 'PARTIAL_PAID'::text, 'PAID'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."lease_bill" validate constraint "lease_bill_bill_status_check";

alter table "public"."lease_bill" add constraint "lease_bill_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."lease_bill" validate constraint "lease_bill_created_by_fkey";

alter table "public"."lease_bill" add constraint "lease_bill_lease_contract_id_fkey" FOREIGN KEY (lease_contract_id) REFERENCES public.lease_contract(id) ON DELETE CASCADE not valid;

alter table "public"."lease_bill" validate constraint "lease_bill_lease_contract_id_fkey";

alter table "public"."lease_bill" add constraint "lease_bill_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."lease_bill" validate constraint "lease_bill_updated_by_fkey";

alter table "public"."lease_contract" add constraint "lease_contract_contract_no_key" UNIQUE using index "lease_contract_contract_no_key";

alter table "public"."lease_contract" add constraint "lease_contract_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."lease_contract" validate constraint "lease_contract_created_by_fkey";

alter table "public"."lease_contract" add constraint "lease_contract_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) not valid;

alter table "public"."lease_contract" validate constraint "lease_contract_customer_id_fkey";

alter table "public"."lease_contract" add constraint "lease_contract_status_check" CHECK ((status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'FINISHED'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."lease_contract" validate constraint "lease_contract_status_check";

alter table "public"."lease_contract" add constraint "lease_contract_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."lease_contract" validate constraint "lease_contract_updated_by_fkey";

alter table "public"."lease_item" add constraint "lease_item_container_id_fkey" FOREIGN KEY (container_id) REFERENCES public.container(id) not valid;

alter table "public"."lease_item" validate constraint "lease_item_container_id_fkey";

alter table "public"."lease_item" add constraint "lease_item_item_status_check" CHECK ((item_status = ANY (ARRAY['ONHIRE'::text, 'OFFHIRE'::text, 'OVERDUE'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."lease_item" validate constraint "lease_item_item_status_check";

alter table "public"."lease_item" add constraint "lease_item_lease_contract_id_container_id_key" UNIQUE using index "lease_item_lease_contract_id_container_id_key";

alter table "public"."lease_item" add constraint "lease_item_lease_contract_id_fkey" FOREIGN KEY (lease_contract_id) REFERENCES public.lease_contract(id) ON DELETE CASCADE not valid;

alter table "public"."lease_item" validate constraint "lease_item_lease_contract_id_fkey";

alter table "public"."purchase_order" add constraint "purchase_order_business_owner_id_fkey" FOREIGN KEY (business_owner_id) REFERENCES public.users(id) not valid;

alter table "public"."purchase_order" validate constraint "purchase_order_business_owner_id_fkey";

alter table "public"."purchase_order" add constraint "purchase_order_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."purchase_order" validate constraint "purchase_order_created_by_fkey";

alter table "public"."purchase_order" add constraint "purchase_order_depot_id_fkey" FOREIGN KEY (depot_id) REFERENCES public.depots(id) not valid;

alter table "public"."purchase_order" validate constraint "purchase_order_depot_id_fkey";

alter table "public"."purchase_order" add constraint "purchase_order_inbound_status_check" CHECK ((inbound_status = ANY (ARRAY['NOT_STARTED'::text, 'PARTIAL'::text, 'COMPLETED'::text]))) not valid;

alter table "public"."purchase_order" validate constraint "purchase_order_inbound_status_check";

alter table "public"."purchase_order" add constraint "purchase_order_offline_status_check" CHECK ((offline_status = ANY (ARRAY['NOT_STARTED'::text, 'PARTIAL'::text, 'COMPLETED'::text]))) not valid;

alter table "public"."purchase_order" validate constraint "purchase_order_offline_status_check";

alter table "public"."purchase_order" add constraint "purchase_order_order_no_key" UNIQUE using index "purchase_order_order_no_key";

alter table "public"."purchase_order" add constraint "purchase_order_order_status_check" CHECK ((order_status = ANY (ARRAY['DRAFT'::text, 'CONFIRMED'::text, 'PARTIAL_RECEIVED'::text, 'COMPLETED'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."purchase_order" validate constraint "purchase_order_order_status_check";

alter table "public"."purchase_order" add constraint "purchase_order_purchase_type_check" CHECK ((purchase_type = ANY (ARRAY['FACTORY_ORDER'::text, 'USED_CONTAINER'::text]))) not valid;

alter table "public"."purchase_order" validate constraint "purchase_order_purchase_type_check";

alter table "public"."purchase_order" add constraint "purchase_order_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) not valid;

alter table "public"."purchase_order" validate constraint "purchase_order_supplier_id_fkey";

alter table "public"."purchase_order" add constraint "purchase_order_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."purchase_order" validate constraint "purchase_order_updated_by_fkey";

alter table "public"."purchase_order_container" add constraint "fk_poc_condition_code" FOREIGN KEY (container_condition_code_id) REFERENCES public.container_condition_codes(id) not valid;

alter table "public"."purchase_order_container" validate constraint "fk_poc_condition_code";

alter table "public"."purchase_order_container" add constraint "fk_poc_type_code" FOREIGN KEY (container_type_code_id) REFERENCES public.container_type_codes(id) not valid;

alter table "public"."purchase_order_container" validate constraint "fk_poc_type_code";

alter table "public"."purchase_order_container" add constraint "purchase_order_container_container_id_fkey" FOREIGN KEY (container_id) REFERENCES public.container(id) not valid;

alter table "public"."purchase_order_container" validate constraint "purchase_order_container_container_id_fkey";

alter table "public"."purchase_order_container" add constraint "purchase_order_container_container_size_code_id_fkey" FOREIGN KEY (container_size_code_id) REFERENCES public.container_size_codes(id) not valid;

alter table "public"."purchase_order_container" validate constraint "purchase_order_container_container_size_code_id_fkey";

alter table "public"."purchase_order_container" add constraint "purchase_order_container_depot_id_fkey" FOREIGN KEY (depot_id) REFERENCES public.depots(id) not valid;

alter table "public"."purchase_order_container" validate constraint "purchase_order_container_depot_id_fkey";

alter table "public"."purchase_order_container" add constraint "purchase_order_container_item_status_check" CHECK ((item_status = ANY (ARRAY['PLANNED'::text, 'BOX_NO_ASSIGNED'::text, 'OFFLINED'::text, 'INBOUND'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."purchase_order_container" validate constraint "purchase_order_container_item_status_check";

alter table "public"."purchase_order_container" add constraint "purchase_order_container_purchase_order_id_fkey" FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_order(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_order_container" validate constraint "purchase_order_container_purchase_order_id_fkey";

alter table "public"."purchase_order_container" add constraint "purchase_order_container_purchase_order_item_id_fkey" FOREIGN KEY (purchase_order_item_id) REFERENCES public.purchase_order_item(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_order_container" validate constraint "purchase_order_container_purchase_order_item_id_fkey";

alter table "public"."purchase_order_item" add constraint "purchase_order_item_container_condition_code_id_fkey" FOREIGN KEY (container_condition_code_id) REFERENCES public.container_condition_codes(id) not valid;

alter table "public"."purchase_order_item" validate constraint "purchase_order_item_container_condition_code_id_fkey";

alter table "public"."purchase_order_item" add constraint "purchase_order_item_container_size_code_id_fkey" FOREIGN KEY (container_size_code_id) REFERENCES public.container_size_codes(id) not valid;

alter table "public"."purchase_order_item" validate constraint "purchase_order_item_container_size_code_id_fkey";

alter table "public"."purchase_order_item" add constraint "purchase_order_item_container_type_code_id_fkey" FOREIGN KEY (container_type_code_id) REFERENCES public.container_type_codes(id) not valid;

alter table "public"."purchase_order_item" validate constraint "purchase_order_item_container_type_code_id_fkey";

alter table "public"."purchase_order_item" add constraint "purchase_order_item_planned_qty_check" CHECK ((planned_qty >= 0)) not valid;

alter table "public"."purchase_order_item" validate constraint "purchase_order_item_planned_qty_check";

alter table "public"."purchase_order_item" add constraint "purchase_order_item_purchase_order_id_fkey" FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_order(id) ON DELETE CASCADE not valid;

alter table "public"."purchase_order_item" validate constraint "purchase_order_item_purchase_order_id_fkey";

alter table "public"."purchase_order_item" add constraint "purchase_order_item_purchase_order_id_line_no_key" UNIQUE using index "purchase_order_item_purchase_order_id_line_no_key";

alter table "public"."purchase_order_item" add constraint "uq_purchase_order_item_order_line" UNIQUE using index "uq_purchase_order_item_order_line";

alter table "public"."revenue_codes" add constraint "revenue_codes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."revenue_codes" validate constraint "revenue_codes_created_by_fkey";

alter table "public"."revenue_codes" add constraint "revenue_codes_revenue_code_key" UNIQUE using index "revenue_codes_revenue_code_key";

alter table "public"."revenue_codes" add constraint "revenue_codes_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text]))) not valid;

alter table "public"."revenue_codes" validate constraint "revenue_codes_status_check";

alter table "public"."sales_delivery" add constraint "sales_delivery_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."sales_delivery" validate constraint "sales_delivery_created_by_fkey";

alter table "public"."sales_delivery" add constraint "sales_delivery_delivery_depot_id_fkey" FOREIGN KEY (delivery_depot_id) REFERENCES public.depots(id) not valid;

alter table "public"."sales_delivery" validate constraint "sales_delivery_delivery_depot_id_fkey";

alter table "public"."sales_delivery" add constraint "sales_delivery_delivery_no_key" UNIQUE using index "sales_delivery_delivery_no_key";

alter table "public"."sales_delivery" add constraint "sales_delivery_delivery_status_check" CHECK ((delivery_status = ANY (ARRAY['PLANNED'::text, 'IN_TRANSIT'::text, 'DELIVERED'::text, 'FAILED'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."sales_delivery" validate constraint "sales_delivery_delivery_status_check";

alter table "public"."sales_delivery" add constraint "sales_delivery_sales_order_id_fkey" FOREIGN KEY (sales_order_id) REFERENCES public.sales_order(id) ON DELETE CASCADE not valid;

alter table "public"."sales_delivery" validate constraint "sales_delivery_sales_order_id_fkey";

alter table "public"."sales_delivery" add constraint "sales_delivery_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."sales_delivery" validate constraint "sales_delivery_updated_by_fkey";

alter table "public"."sales_item" add constraint "sales_item_container_id_fkey" FOREIGN KEY (container_id) REFERENCES public.container(id) not valid;

alter table "public"."sales_item" validate constraint "sales_item_container_id_fkey";

alter table "public"."sales_item" add constraint "sales_item_item_status_check" CHECK ((item_status = ANY (ARRAY['CONTRACTED'::text, 'IN_DELIVERY'::text, 'DELIVERED'::text, 'FAILED'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."sales_item" validate constraint "sales_item_item_status_check";

alter table "public"."sales_item" add constraint "sales_item_sales_order_id_container_id_key" UNIQUE using index "sales_item_sales_order_id_container_id_key";

alter table "public"."sales_item" add constraint "sales_item_sales_order_id_fkey" FOREIGN KEY (sales_order_id) REFERENCES public.sales_order(id) ON DELETE CASCADE not valid;

alter table "public"."sales_item" validate constraint "sales_item_sales_order_id_fkey";

alter table "public"."sales_order" add constraint "sales_order_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."sales_order" validate constraint "sales_order_created_by_fkey";

alter table "public"."sales_order" add constraint "sales_order_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) not valid;

alter table "public"."sales_order" validate constraint "sales_order_customer_id_fkey";

alter table "public"."sales_order" add constraint "sales_order_order_no_key" UNIQUE using index "sales_order_order_no_key";

alter table "public"."sales_order" add constraint "sales_order_status_check" CHECK ((status = ANY (ARRAY['DRAFT'::text, 'CONTRACTED'::text, 'PARTIAL_DELIVERED'::text, 'COMPLETED'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."sales_order" validate constraint "sales_order_status_check";

alter table "public"."sales_order" add constraint "sales_order_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."sales_order" validate constraint "sales_order_updated_by_fkey";

alter table "public"."suppliers" add constraint "suppliers_status_check" CHECK ((status = ANY (ARRAY['NORMAL'::text, 'HOLD'::text, 'INACTIVE'::text]))) not valid;

alter table "public"."suppliers" validate constraint "suppliers_status_check";

alter table "public"."suppliers" add constraint "suppliers_supplier_code_key" UNIQUE using index "suppliers_supplier_code_key";

alter table "public"."suppliers" add constraint "suppliers_supplier_name_key" UNIQUE using index "suppliers_supplier_name_key";

alter table "public"."transfer_item" add constraint "transfer_item_container_id_fkey" FOREIGN KEY (container_id) REFERENCES public.container(id) not valid;

alter table "public"."transfer_item" validate constraint "transfer_item_container_id_fkey";

alter table "public"."transfer_item" add constraint "transfer_item_item_status_check" CHECK ((item_status = ANY (ARRAY['PLANNED'::text, 'IN_TRANSIT'::text, 'ARRIVED'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."transfer_item" validate constraint "transfer_item_item_status_check";

alter table "public"."transfer_item" add constraint "transfer_item_transfer_order_id_container_id_key" UNIQUE using index "transfer_item_transfer_order_id_container_id_key";

alter table "public"."transfer_item" add constraint "transfer_item_transfer_order_id_fkey" FOREIGN KEY (transfer_order_id) REFERENCES public.transfer_order(id) ON DELETE CASCADE not valid;

alter table "public"."transfer_item" validate constraint "transfer_item_transfer_order_id_fkey";

alter table "public"."transfer_item" add constraint "uq_transfer_item_order_container" UNIQUE using index "uq_transfer_item_order_container";

alter table "public"."transfer_order" add constraint "transfer_order_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."transfer_order" validate constraint "transfer_order_created_by_fkey";

alter table "public"."transfer_order" add constraint "transfer_order_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) not valid;

alter table "public"."transfer_order" validate constraint "transfer_order_customer_id_fkey";

alter table "public"."transfer_order" add constraint "transfer_order_from_depot_id_fkey" FOREIGN KEY (from_depot_id) REFERENCES public.depots(id) not valid;

alter table "public"."transfer_order" validate constraint "transfer_order_from_depot_id_fkey";

alter table "public"."transfer_order" add constraint "transfer_order_order_no_key" UNIQUE using index "transfer_order_order_no_key";

alter table "public"."transfer_order" add constraint "transfer_order_status_check" CHECK ((status = ANY (ARRAY['CREATED'::text, 'IN_TRANSIT'::text, 'COMPLETED'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."transfer_order" validate constraint "transfer_order_status_check";

alter table "public"."transfer_order" add constraint "transfer_order_to_depot_id_fkey" FOREIGN KEY (to_depot_id) REFERENCES public.depots(id) not valid;

alter table "public"."transfer_order" validate constraint "transfer_order_to_depot_id_fkey";

alter table "public"."transfer_order" add constraint "transfer_order_transfer_type_check" CHECK ((transfer_type = ANY (ARRAY['NORMAL'::text, 'ONE_WAY_LEASE'::text, 'REPOSITION'::text, 'THIRD_PARTY'::text]))) not valid;

alter table "public"."transfer_order" validate constraint "transfer_order_transfer_type_check";

alter table "public"."transfer_order" add constraint "transfer_order_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."transfer_order" validate constraint "transfer_order_updated_by_fkey";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

alter table "public"."users" add constraint "users_full_name_unique" UNIQUE using index "users_full_name_unique";

alter table "public"."yard_record" add constraint "yard_record_container_id_fkey" FOREIGN KEY (container_id) REFERENCES public.container(id) not valid;

alter table "public"."yard_record" validate constraint "yard_record_container_id_fkey";

alter table "public"."yard_record" add constraint "yard_record_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."yard_record" validate constraint "yard_record_created_by_fkey";

alter table "public"."yard_record" add constraint "yard_record_depot_id_fkey" FOREIGN KEY (depot_id) REFERENCES public.depots(id) not valid;

alter table "public"."yard_record" validate constraint "yard_record_depot_id_fkey";

alter table "public"."yard_record" add constraint "yard_record_record_status_check" CHECK ((record_status = ANY (ARRAY['IN_YARD'::text, 'EXITED'::text]))) not valid;

alter table "public"."yard_record" validate constraint "yard_record_record_status_check";

alter table "public"."yard_record" add constraint "yard_record_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."yard_record" validate constraint "yard_record_updated_by_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.lock_container(p_container_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  -- 对同一 container_id 加 advisory lock，避免并发更新快照/事件导致 last_event_id 错乱
  perform pg_advisory_xact_lock(hashtext(p_container_id::text));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

grant delete on table "public"."business_cost" to "anon";

grant insert on table "public"."business_cost" to "anon";

grant references on table "public"."business_cost" to "anon";

grant select on table "public"."business_cost" to "anon";

grant trigger on table "public"."business_cost" to "anon";

grant truncate on table "public"."business_cost" to "anon";

grant update on table "public"."business_cost" to "anon";

grant delete on table "public"."business_cost" to "authenticated";

grant insert on table "public"."business_cost" to "authenticated";

grant references on table "public"."business_cost" to "authenticated";

grant select on table "public"."business_cost" to "authenticated";

grant trigger on table "public"."business_cost" to "authenticated";

grant truncate on table "public"."business_cost" to "authenticated";

grant update on table "public"."business_cost" to "authenticated";

grant delete on table "public"."business_cost" to "service_role";

grant insert on table "public"."business_cost" to "service_role";

grant references on table "public"."business_cost" to "service_role";

grant select on table "public"."business_cost" to "service_role";

grant trigger on table "public"."business_cost" to "service_role";

grant truncate on table "public"."business_cost" to "service_role";

grant update on table "public"."business_cost" to "service_role";

grant delete on table "public"."business_invoice" to "anon";

grant insert on table "public"."business_invoice" to "anon";

grant references on table "public"."business_invoice" to "anon";

grant select on table "public"."business_invoice" to "anon";

grant trigger on table "public"."business_invoice" to "anon";

grant truncate on table "public"."business_invoice" to "anon";

grant update on table "public"."business_invoice" to "anon";

grant delete on table "public"."business_invoice" to "authenticated";

grant insert on table "public"."business_invoice" to "authenticated";

grant references on table "public"."business_invoice" to "authenticated";

grant select on table "public"."business_invoice" to "authenticated";

grant trigger on table "public"."business_invoice" to "authenticated";

grant truncate on table "public"."business_invoice" to "authenticated";

grant update on table "public"."business_invoice" to "authenticated";

grant delete on table "public"."business_invoice" to "service_role";

grant insert on table "public"."business_invoice" to "service_role";

grant references on table "public"."business_invoice" to "service_role";

grant select on table "public"."business_invoice" to "service_role";

grant trigger on table "public"."business_invoice" to "service_role";

grant truncate on table "public"."business_invoice" to "service_role";

grant update on table "public"."business_invoice" to "service_role";

grant delete on table "public"."business_invoice_item" to "anon";

grant insert on table "public"."business_invoice_item" to "anon";

grant references on table "public"."business_invoice_item" to "anon";

grant select on table "public"."business_invoice_item" to "anon";

grant trigger on table "public"."business_invoice_item" to "anon";

grant truncate on table "public"."business_invoice_item" to "anon";

grant update on table "public"."business_invoice_item" to "anon";

grant delete on table "public"."business_invoice_item" to "authenticated";

grant insert on table "public"."business_invoice_item" to "authenticated";

grant references on table "public"."business_invoice_item" to "authenticated";

grant select on table "public"."business_invoice_item" to "authenticated";

grant trigger on table "public"."business_invoice_item" to "authenticated";

grant truncate on table "public"."business_invoice_item" to "authenticated";

grant update on table "public"."business_invoice_item" to "authenticated";

grant delete on table "public"."business_invoice_item" to "service_role";

grant insert on table "public"."business_invoice_item" to "service_role";

grant references on table "public"."business_invoice_item" to "service_role";

grant select on table "public"."business_invoice_item" to "service_role";

grant trigger on table "public"."business_invoice_item" to "service_role";

grant truncate on table "public"."business_invoice_item" to "service_role";

grant update on table "public"."business_invoice_item" to "service_role";

grant delete on table "public"."business_revenue" to "anon";

grant insert on table "public"."business_revenue" to "anon";

grant references on table "public"."business_revenue" to "anon";

grant select on table "public"."business_revenue" to "anon";

grant trigger on table "public"."business_revenue" to "anon";

grant truncate on table "public"."business_revenue" to "anon";

grant update on table "public"."business_revenue" to "anon";

grant delete on table "public"."business_revenue" to "authenticated";

grant insert on table "public"."business_revenue" to "authenticated";

grant references on table "public"."business_revenue" to "authenticated";

grant select on table "public"."business_revenue" to "authenticated";

grant trigger on table "public"."business_revenue" to "authenticated";

grant truncate on table "public"."business_revenue" to "authenticated";

grant update on table "public"."business_revenue" to "authenticated";

grant delete on table "public"."business_revenue" to "service_role";

grant insert on table "public"."business_revenue" to "service_role";

grant references on table "public"."business_revenue" to "service_role";

grant select on table "public"."business_revenue" to "service_role";

grant trigger on table "public"."business_revenue" to "service_role";

grant truncate on table "public"."business_revenue" to "service_role";

grant update on table "public"."business_revenue" to "service_role";

grant delete on table "public"."cities" to "anon";

grant insert on table "public"."cities" to "anon";

grant references on table "public"."cities" to "anon";

grant select on table "public"."cities" to "anon";

grant trigger on table "public"."cities" to "anon";

grant truncate on table "public"."cities" to "anon";

grant update on table "public"."cities" to "anon";

grant delete on table "public"."cities" to "authenticated";

grant insert on table "public"."cities" to "authenticated";

grant references on table "public"."cities" to "authenticated";

grant select on table "public"."cities" to "authenticated";

grant trigger on table "public"."cities" to "authenticated";

grant truncate on table "public"."cities" to "authenticated";

grant update on table "public"."cities" to "authenticated";

grant delete on table "public"."cities" to "service_role";

grant insert on table "public"."cities" to "service_role";

grant references on table "public"."cities" to "service_role";

grant select on table "public"."cities" to "service_role";

grant trigger on table "public"."cities" to "service_role";

grant truncate on table "public"."cities" to "service_role";

grant update on table "public"."cities" to "service_role";

grant delete on table "public"."container" to "anon";

grant insert on table "public"."container" to "anon";

grant references on table "public"."container" to "anon";

grant select on table "public"."container" to "anon";

grant trigger on table "public"."container" to "anon";

grant truncate on table "public"."container" to "anon";

grant update on table "public"."container" to "anon";

grant delete on table "public"."container" to "authenticated";

grant insert on table "public"."container" to "authenticated";

grant references on table "public"."container" to "authenticated";

grant select on table "public"."container" to "authenticated";

grant trigger on table "public"."container" to "authenticated";

grant truncate on table "public"."container" to "authenticated";

grant update on table "public"."container" to "authenticated";

grant delete on table "public"."container" to "service_role";

grant insert on table "public"."container" to "service_role";

grant references on table "public"."container" to "service_role";

grant select on table "public"."container" to "service_role";

grant trigger on table "public"."container" to "service_role";

grant truncate on table "public"."container" to "service_role";

grant update on table "public"."container" to "service_role";

grant delete on table "public"."container_condition_codes" to "anon";

grant insert on table "public"."container_condition_codes" to "anon";

grant references on table "public"."container_condition_codes" to "anon";

grant select on table "public"."container_condition_codes" to "anon";

grant trigger on table "public"."container_condition_codes" to "anon";

grant truncate on table "public"."container_condition_codes" to "anon";

grant update on table "public"."container_condition_codes" to "anon";

grant delete on table "public"."container_condition_codes" to "authenticated";

grant insert on table "public"."container_condition_codes" to "authenticated";

grant references on table "public"."container_condition_codes" to "authenticated";

grant select on table "public"."container_condition_codes" to "authenticated";

grant trigger on table "public"."container_condition_codes" to "authenticated";

grant truncate on table "public"."container_condition_codes" to "authenticated";

grant update on table "public"."container_condition_codes" to "authenticated";

grant delete on table "public"."container_condition_codes" to "service_role";

grant insert on table "public"."container_condition_codes" to "service_role";

grant references on table "public"."container_condition_codes" to "service_role";

grant select on table "public"."container_condition_codes" to "service_role";

grant trigger on table "public"."container_condition_codes" to "service_role";

grant truncate on table "public"."container_condition_codes" to "service_role";

grant update on table "public"."container_condition_codes" to "service_role";

grant delete on table "public"."container_event" to "anon";

grant insert on table "public"."container_event" to "anon";

grant references on table "public"."container_event" to "anon";

grant select on table "public"."container_event" to "anon";

grant trigger on table "public"."container_event" to "anon";

grant truncate on table "public"."container_event" to "anon";

grant update on table "public"."container_event" to "anon";

grant delete on table "public"."container_event" to "authenticated";

grant insert on table "public"."container_event" to "authenticated";

grant references on table "public"."container_event" to "authenticated";

grant select on table "public"."container_event" to "authenticated";

grant trigger on table "public"."container_event" to "authenticated";

grant truncate on table "public"."container_event" to "authenticated";

grant update on table "public"."container_event" to "authenticated";

grant delete on table "public"."container_event" to "service_role";

grant insert on table "public"."container_event" to "service_role";

grant references on table "public"."container_event" to "service_role";

grant select on table "public"."container_event" to "service_role";

grant trigger on table "public"."container_event" to "service_role";

grant truncate on table "public"."container_event" to "service_role";

grant update on table "public"."container_event" to "service_role";

grant delete on table "public"."container_number_rules" to "anon";

grant insert on table "public"."container_number_rules" to "anon";

grant references on table "public"."container_number_rules" to "anon";

grant select on table "public"."container_number_rules" to "anon";

grant trigger on table "public"."container_number_rules" to "anon";

grant truncate on table "public"."container_number_rules" to "anon";

grant update on table "public"."container_number_rules" to "anon";

grant delete on table "public"."container_number_rules" to "authenticated";

grant insert on table "public"."container_number_rules" to "authenticated";

grant references on table "public"."container_number_rules" to "authenticated";

grant select on table "public"."container_number_rules" to "authenticated";

grant trigger on table "public"."container_number_rules" to "authenticated";

grant truncate on table "public"."container_number_rules" to "authenticated";

grant update on table "public"."container_number_rules" to "authenticated";

grant delete on table "public"."container_number_rules" to "service_role";

grant insert on table "public"."container_number_rules" to "service_role";

grant references on table "public"."container_number_rules" to "service_role";

grant select on table "public"."container_number_rules" to "service_role";

grant trigger on table "public"."container_number_rules" to "service_role";

grant truncate on table "public"."container_number_rules" to "service_role";

grant update on table "public"."container_number_rules" to "service_role";

grant delete on table "public"."container_size_codes" to "anon";

grant insert on table "public"."container_size_codes" to "anon";

grant references on table "public"."container_size_codes" to "anon";

grant select on table "public"."container_size_codes" to "anon";

grant trigger on table "public"."container_size_codes" to "anon";

grant truncate on table "public"."container_size_codes" to "anon";

grant update on table "public"."container_size_codes" to "anon";

grant delete on table "public"."container_size_codes" to "authenticated";

grant insert on table "public"."container_size_codes" to "authenticated";

grant references on table "public"."container_size_codes" to "authenticated";

grant select on table "public"."container_size_codes" to "authenticated";

grant trigger on table "public"."container_size_codes" to "authenticated";

grant truncate on table "public"."container_size_codes" to "authenticated";

grant update on table "public"."container_size_codes" to "authenticated";

grant delete on table "public"."container_size_codes" to "service_role";

grant insert on table "public"."container_size_codes" to "service_role";

grant references on table "public"."container_size_codes" to "service_role";

grant select on table "public"."container_size_codes" to "service_role";

grant trigger on table "public"."container_size_codes" to "service_role";

grant truncate on table "public"."container_size_codes" to "service_role";

grant update on table "public"."container_size_codes" to "service_role";

grant delete on table "public"."container_type_codes" to "anon";

grant insert on table "public"."container_type_codes" to "anon";

grant references on table "public"."container_type_codes" to "anon";

grant select on table "public"."container_type_codes" to "anon";

grant trigger on table "public"."container_type_codes" to "anon";

grant truncate on table "public"."container_type_codes" to "anon";

grant update on table "public"."container_type_codes" to "anon";

grant delete on table "public"."container_type_codes" to "authenticated";

grant insert on table "public"."container_type_codes" to "authenticated";

grant references on table "public"."container_type_codes" to "authenticated";

grant select on table "public"."container_type_codes" to "authenticated";

grant trigger on table "public"."container_type_codes" to "authenticated";

grant truncate on table "public"."container_type_codes" to "authenticated";

grant update on table "public"."container_type_codes" to "authenticated";

grant delete on table "public"."container_type_codes" to "service_role";

grant insert on table "public"."container_type_codes" to "service_role";

grant references on table "public"."container_type_codes" to "service_role";

grant select on table "public"."container_type_codes" to "service_role";

grant trigger on table "public"."container_type_codes" to "service_role";

grant truncate on table "public"."container_type_codes" to "service_role";

grant update on table "public"."container_type_codes" to "service_role";

grant delete on table "public"."cost_codes" to "anon";

grant insert on table "public"."cost_codes" to "anon";

grant references on table "public"."cost_codes" to "anon";

grant select on table "public"."cost_codes" to "anon";

grant trigger on table "public"."cost_codes" to "anon";

grant truncate on table "public"."cost_codes" to "anon";

grant update on table "public"."cost_codes" to "anon";

grant delete on table "public"."cost_codes" to "authenticated";

grant insert on table "public"."cost_codes" to "authenticated";

grant references on table "public"."cost_codes" to "authenticated";

grant select on table "public"."cost_codes" to "authenticated";

grant trigger on table "public"."cost_codes" to "authenticated";

grant truncate on table "public"."cost_codes" to "authenticated";

grant update on table "public"."cost_codes" to "authenticated";

grant delete on table "public"."cost_codes" to "service_role";

grant insert on table "public"."cost_codes" to "service_role";

grant references on table "public"."cost_codes" to "service_role";

grant select on table "public"."cost_codes" to "service_role";

grant trigger on table "public"."cost_codes" to "service_role";

grant truncate on table "public"."cost_codes" to "service_role";

grant update on table "public"."cost_codes" to "service_role";

grant delete on table "public"."customers" to "anon";

grant insert on table "public"."customers" to "anon";

grant references on table "public"."customers" to "anon";

grant select on table "public"."customers" to "anon";

grant trigger on table "public"."customers" to "anon";

grant truncate on table "public"."customers" to "anon";

grant update on table "public"."customers" to "anon";

grant delete on table "public"."customers" to "authenticated";

grant insert on table "public"."customers" to "authenticated";

grant references on table "public"."customers" to "authenticated";

grant select on table "public"."customers" to "authenticated";

grant trigger on table "public"."customers" to "authenticated";

grant truncate on table "public"."customers" to "authenticated";

grant update on table "public"."customers" to "authenticated";

grant delete on table "public"."customers" to "service_role";

grant insert on table "public"."customers" to "service_role";

grant references on table "public"."customers" to "service_role";

grant select on table "public"."customers" to "service_role";

grant trigger on table "public"."customers" to "service_role";

grant truncate on table "public"."customers" to "service_role";

grant update on table "public"."customers" to "service_role";

grant delete on table "public"."depots" to "anon";

grant insert on table "public"."depots" to "anon";

grant references on table "public"."depots" to "anon";

grant select on table "public"."depots" to "anon";

grant trigger on table "public"."depots" to "anon";

grant truncate on table "public"."depots" to "anon";

grant update on table "public"."depots" to "anon";

grant delete on table "public"."depots" to "authenticated";

grant insert on table "public"."depots" to "authenticated";

grant references on table "public"."depots" to "authenticated";

grant select on table "public"."depots" to "authenticated";

grant trigger on table "public"."depots" to "authenticated";

grant truncate on table "public"."depots" to "authenticated";

grant update on table "public"."depots" to "authenticated";

grant delete on table "public"."depots" to "service_role";

grant insert on table "public"."depots" to "service_role";

grant references on table "public"."depots" to "service_role";

grant select on table "public"."depots" to "service_role";

grant trigger on table "public"."depots" to "service_role";

grant truncate on table "public"."depots" to "service_role";

grant update on table "public"."depots" to "service_role";

grant delete on table "public"."finance_record" to "anon";

grant insert on table "public"."finance_record" to "anon";

grant references on table "public"."finance_record" to "anon";

grant select on table "public"."finance_record" to "anon";

grant trigger on table "public"."finance_record" to "anon";

grant truncate on table "public"."finance_record" to "anon";

grant update on table "public"."finance_record" to "anon";

grant delete on table "public"."finance_record" to "authenticated";

grant insert on table "public"."finance_record" to "authenticated";

grant references on table "public"."finance_record" to "authenticated";

grant select on table "public"."finance_record" to "authenticated";

grant trigger on table "public"."finance_record" to "authenticated";

grant truncate on table "public"."finance_record" to "authenticated";

grant update on table "public"."finance_record" to "authenticated";

grant delete on table "public"."finance_record" to "service_role";

grant insert on table "public"."finance_record" to "service_role";

grant references on table "public"."finance_record" to "service_role";

grant select on table "public"."finance_record" to "service_role";

grant trigger on table "public"."finance_record" to "service_role";

grant truncate on table "public"."finance_record" to "service_role";

grant update on table "public"."finance_record" to "service_role";

grant delete on table "public"."inventory" to "anon";

grant insert on table "public"."inventory" to "anon";

grant references on table "public"."inventory" to "anon";

grant select on table "public"."inventory" to "anon";

grant trigger on table "public"."inventory" to "anon";

grant truncate on table "public"."inventory" to "anon";

grant update on table "public"."inventory" to "anon";

grant delete on table "public"."inventory" to "authenticated";

grant insert on table "public"."inventory" to "authenticated";

grant references on table "public"."inventory" to "authenticated";

grant select on table "public"."inventory" to "authenticated";

grant trigger on table "public"."inventory" to "authenticated";

grant truncate on table "public"."inventory" to "authenticated";

grant update on table "public"."inventory" to "authenticated";

grant delete on table "public"."inventory" to "service_role";

grant insert on table "public"."inventory" to "service_role";

grant references on table "public"."inventory" to "service_role";

grant select on table "public"."inventory" to "service_role";

grant trigger on table "public"."inventory" to "service_role";

grant truncate on table "public"."inventory" to "service_role";

grant update on table "public"."inventory" to "service_role";

grant delete on table "public"."lease_bill" to "anon";

grant insert on table "public"."lease_bill" to "anon";

grant references on table "public"."lease_bill" to "anon";

grant select on table "public"."lease_bill" to "anon";

grant trigger on table "public"."lease_bill" to "anon";

grant truncate on table "public"."lease_bill" to "anon";

grant update on table "public"."lease_bill" to "anon";

grant delete on table "public"."lease_bill" to "authenticated";

grant insert on table "public"."lease_bill" to "authenticated";

grant references on table "public"."lease_bill" to "authenticated";

grant select on table "public"."lease_bill" to "authenticated";

grant trigger on table "public"."lease_bill" to "authenticated";

grant truncate on table "public"."lease_bill" to "authenticated";

grant update on table "public"."lease_bill" to "authenticated";

grant delete on table "public"."lease_bill" to "service_role";

grant insert on table "public"."lease_bill" to "service_role";

grant references on table "public"."lease_bill" to "service_role";

grant select on table "public"."lease_bill" to "service_role";

grant trigger on table "public"."lease_bill" to "service_role";

grant truncate on table "public"."lease_bill" to "service_role";

grant update on table "public"."lease_bill" to "service_role";

grant delete on table "public"."lease_contract" to "anon";

grant insert on table "public"."lease_contract" to "anon";

grant references on table "public"."lease_contract" to "anon";

grant select on table "public"."lease_contract" to "anon";

grant trigger on table "public"."lease_contract" to "anon";

grant truncate on table "public"."lease_contract" to "anon";

grant update on table "public"."lease_contract" to "anon";

grant delete on table "public"."lease_contract" to "authenticated";

grant insert on table "public"."lease_contract" to "authenticated";

grant references on table "public"."lease_contract" to "authenticated";

grant select on table "public"."lease_contract" to "authenticated";

grant trigger on table "public"."lease_contract" to "authenticated";

grant truncate on table "public"."lease_contract" to "authenticated";

grant update on table "public"."lease_contract" to "authenticated";

grant delete on table "public"."lease_contract" to "service_role";

grant insert on table "public"."lease_contract" to "service_role";

grant references on table "public"."lease_contract" to "service_role";

grant select on table "public"."lease_contract" to "service_role";

grant trigger on table "public"."lease_contract" to "service_role";

grant truncate on table "public"."lease_contract" to "service_role";

grant update on table "public"."lease_contract" to "service_role";

grant delete on table "public"."lease_item" to "anon";

grant insert on table "public"."lease_item" to "anon";

grant references on table "public"."lease_item" to "anon";

grant select on table "public"."lease_item" to "anon";

grant trigger on table "public"."lease_item" to "anon";

grant truncate on table "public"."lease_item" to "anon";

grant update on table "public"."lease_item" to "anon";

grant delete on table "public"."lease_item" to "authenticated";

grant insert on table "public"."lease_item" to "authenticated";

grant references on table "public"."lease_item" to "authenticated";

grant select on table "public"."lease_item" to "authenticated";

grant trigger on table "public"."lease_item" to "authenticated";

grant truncate on table "public"."lease_item" to "authenticated";

grant update on table "public"."lease_item" to "authenticated";

grant delete on table "public"."lease_item" to "service_role";

grant insert on table "public"."lease_item" to "service_role";

grant references on table "public"."lease_item" to "service_role";

grant select on table "public"."lease_item" to "service_role";

grant trigger on table "public"."lease_item" to "service_role";

grant truncate on table "public"."lease_item" to "service_role";

grant update on table "public"."lease_item" to "service_role";

grant delete on table "public"."purchase_order" to "anon";

grant insert on table "public"."purchase_order" to "anon";

grant references on table "public"."purchase_order" to "anon";

grant select on table "public"."purchase_order" to "anon";

grant trigger on table "public"."purchase_order" to "anon";

grant truncate on table "public"."purchase_order" to "anon";

grant update on table "public"."purchase_order" to "anon";

grant delete on table "public"."purchase_order" to "authenticated";

grant insert on table "public"."purchase_order" to "authenticated";

grant references on table "public"."purchase_order" to "authenticated";

grant select on table "public"."purchase_order" to "authenticated";

grant trigger on table "public"."purchase_order" to "authenticated";

grant truncate on table "public"."purchase_order" to "authenticated";

grant update on table "public"."purchase_order" to "authenticated";

grant delete on table "public"."purchase_order" to "service_role";

grant insert on table "public"."purchase_order" to "service_role";

grant references on table "public"."purchase_order" to "service_role";

grant select on table "public"."purchase_order" to "service_role";

grant trigger on table "public"."purchase_order" to "service_role";

grant truncate on table "public"."purchase_order" to "service_role";

grant update on table "public"."purchase_order" to "service_role";

grant delete on table "public"."purchase_order_container" to "anon";

grant insert on table "public"."purchase_order_container" to "anon";

grant references on table "public"."purchase_order_container" to "anon";

grant select on table "public"."purchase_order_container" to "anon";

grant trigger on table "public"."purchase_order_container" to "anon";

grant truncate on table "public"."purchase_order_container" to "anon";

grant update on table "public"."purchase_order_container" to "anon";

grant delete on table "public"."purchase_order_container" to "authenticated";

grant insert on table "public"."purchase_order_container" to "authenticated";

grant references on table "public"."purchase_order_container" to "authenticated";

grant select on table "public"."purchase_order_container" to "authenticated";

grant trigger on table "public"."purchase_order_container" to "authenticated";

grant truncate on table "public"."purchase_order_container" to "authenticated";

grant update on table "public"."purchase_order_container" to "authenticated";

grant delete on table "public"."purchase_order_container" to "service_role";

grant insert on table "public"."purchase_order_container" to "service_role";

grant references on table "public"."purchase_order_container" to "service_role";

grant select on table "public"."purchase_order_container" to "service_role";

grant trigger on table "public"."purchase_order_container" to "service_role";

grant truncate on table "public"."purchase_order_container" to "service_role";

grant update on table "public"."purchase_order_container" to "service_role";

grant delete on table "public"."purchase_order_item" to "anon";

grant insert on table "public"."purchase_order_item" to "anon";

grant references on table "public"."purchase_order_item" to "anon";

grant select on table "public"."purchase_order_item" to "anon";

grant trigger on table "public"."purchase_order_item" to "anon";

grant truncate on table "public"."purchase_order_item" to "anon";

grant update on table "public"."purchase_order_item" to "anon";

grant delete on table "public"."purchase_order_item" to "authenticated";

grant insert on table "public"."purchase_order_item" to "authenticated";

grant references on table "public"."purchase_order_item" to "authenticated";

grant select on table "public"."purchase_order_item" to "authenticated";

grant trigger on table "public"."purchase_order_item" to "authenticated";

grant truncate on table "public"."purchase_order_item" to "authenticated";

grant update on table "public"."purchase_order_item" to "authenticated";

grant delete on table "public"."purchase_order_item" to "service_role";

grant insert on table "public"."purchase_order_item" to "service_role";

grant references on table "public"."purchase_order_item" to "service_role";

grant select on table "public"."purchase_order_item" to "service_role";

grant trigger on table "public"."purchase_order_item" to "service_role";

grant truncate on table "public"."purchase_order_item" to "service_role";

grant update on table "public"."purchase_order_item" to "service_role";

grant delete on table "public"."revenue_codes" to "anon";

grant insert on table "public"."revenue_codes" to "anon";

grant references on table "public"."revenue_codes" to "anon";

grant select on table "public"."revenue_codes" to "anon";

grant trigger on table "public"."revenue_codes" to "anon";

grant truncate on table "public"."revenue_codes" to "anon";

grant update on table "public"."revenue_codes" to "anon";

grant delete on table "public"."revenue_codes" to "authenticated";

grant insert on table "public"."revenue_codes" to "authenticated";

grant references on table "public"."revenue_codes" to "authenticated";

grant select on table "public"."revenue_codes" to "authenticated";

grant trigger on table "public"."revenue_codes" to "authenticated";

grant truncate on table "public"."revenue_codes" to "authenticated";

grant update on table "public"."revenue_codes" to "authenticated";

grant delete on table "public"."revenue_codes" to "service_role";

grant insert on table "public"."revenue_codes" to "service_role";

grant references on table "public"."revenue_codes" to "service_role";

grant select on table "public"."revenue_codes" to "service_role";

grant trigger on table "public"."revenue_codes" to "service_role";

grant truncate on table "public"."revenue_codes" to "service_role";

grant update on table "public"."revenue_codes" to "service_role";

grant delete on table "public"."sales_delivery" to "anon";

grant insert on table "public"."sales_delivery" to "anon";

grant references on table "public"."sales_delivery" to "anon";

grant select on table "public"."sales_delivery" to "anon";

grant trigger on table "public"."sales_delivery" to "anon";

grant truncate on table "public"."sales_delivery" to "anon";

grant update on table "public"."sales_delivery" to "anon";

grant delete on table "public"."sales_delivery" to "authenticated";

grant insert on table "public"."sales_delivery" to "authenticated";

grant references on table "public"."sales_delivery" to "authenticated";

grant select on table "public"."sales_delivery" to "authenticated";

grant trigger on table "public"."sales_delivery" to "authenticated";

grant truncate on table "public"."sales_delivery" to "authenticated";

grant update on table "public"."sales_delivery" to "authenticated";

grant delete on table "public"."sales_delivery" to "service_role";

grant insert on table "public"."sales_delivery" to "service_role";

grant references on table "public"."sales_delivery" to "service_role";

grant select on table "public"."sales_delivery" to "service_role";

grant trigger on table "public"."sales_delivery" to "service_role";

grant truncate on table "public"."sales_delivery" to "service_role";

grant update on table "public"."sales_delivery" to "service_role";

grant delete on table "public"."sales_item" to "anon";

grant insert on table "public"."sales_item" to "anon";

grant references on table "public"."sales_item" to "anon";

grant select on table "public"."sales_item" to "anon";

grant trigger on table "public"."sales_item" to "anon";

grant truncate on table "public"."sales_item" to "anon";

grant update on table "public"."sales_item" to "anon";

grant delete on table "public"."sales_item" to "authenticated";

grant insert on table "public"."sales_item" to "authenticated";

grant references on table "public"."sales_item" to "authenticated";

grant select on table "public"."sales_item" to "authenticated";

grant trigger on table "public"."sales_item" to "authenticated";

grant truncate on table "public"."sales_item" to "authenticated";

grant update on table "public"."sales_item" to "authenticated";

grant delete on table "public"."sales_item" to "service_role";

grant insert on table "public"."sales_item" to "service_role";

grant references on table "public"."sales_item" to "service_role";

grant select on table "public"."sales_item" to "service_role";

grant trigger on table "public"."sales_item" to "service_role";

grant truncate on table "public"."sales_item" to "service_role";

grant update on table "public"."sales_item" to "service_role";

grant delete on table "public"."sales_order" to "anon";

grant insert on table "public"."sales_order" to "anon";

grant references on table "public"."sales_order" to "anon";

grant select on table "public"."sales_order" to "anon";

grant trigger on table "public"."sales_order" to "anon";

grant truncate on table "public"."sales_order" to "anon";

grant update on table "public"."sales_order" to "anon";

grant delete on table "public"."sales_order" to "authenticated";

grant insert on table "public"."sales_order" to "authenticated";

grant references on table "public"."sales_order" to "authenticated";

grant select on table "public"."sales_order" to "authenticated";

grant trigger on table "public"."sales_order" to "authenticated";

grant truncate on table "public"."sales_order" to "authenticated";

grant update on table "public"."sales_order" to "authenticated";

grant delete on table "public"."sales_order" to "service_role";

grant insert on table "public"."sales_order" to "service_role";

grant references on table "public"."sales_order" to "service_role";

grant select on table "public"."sales_order" to "service_role";

grant trigger on table "public"."sales_order" to "service_role";

grant truncate on table "public"."sales_order" to "service_role";

grant update on table "public"."sales_order" to "service_role";

grant delete on table "public"."suppliers" to "anon";

grant insert on table "public"."suppliers" to "anon";

grant references on table "public"."suppliers" to "anon";

grant select on table "public"."suppliers" to "anon";

grant trigger on table "public"."suppliers" to "anon";

grant truncate on table "public"."suppliers" to "anon";

grant update on table "public"."suppliers" to "anon";

grant delete on table "public"."suppliers" to "authenticated";

grant insert on table "public"."suppliers" to "authenticated";

grant references on table "public"."suppliers" to "authenticated";

grant select on table "public"."suppliers" to "authenticated";

grant trigger on table "public"."suppliers" to "authenticated";

grant truncate on table "public"."suppliers" to "authenticated";

grant update on table "public"."suppliers" to "authenticated";

grant delete on table "public"."suppliers" to "service_role";

grant insert on table "public"."suppliers" to "service_role";

grant references on table "public"."suppliers" to "service_role";

grant select on table "public"."suppliers" to "service_role";

grant trigger on table "public"."suppliers" to "service_role";

grant truncate on table "public"."suppliers" to "service_role";

grant update on table "public"."suppliers" to "service_role";

grant delete on table "public"."transfer_item" to "anon";

grant insert on table "public"."transfer_item" to "anon";

grant references on table "public"."transfer_item" to "anon";

grant select on table "public"."transfer_item" to "anon";

grant trigger on table "public"."transfer_item" to "anon";

grant truncate on table "public"."transfer_item" to "anon";

grant update on table "public"."transfer_item" to "anon";

grant delete on table "public"."transfer_item" to "authenticated";

grant insert on table "public"."transfer_item" to "authenticated";

grant references on table "public"."transfer_item" to "authenticated";

grant select on table "public"."transfer_item" to "authenticated";

grant trigger on table "public"."transfer_item" to "authenticated";

grant truncate on table "public"."transfer_item" to "authenticated";

grant update on table "public"."transfer_item" to "authenticated";

grant delete on table "public"."transfer_item" to "service_role";

grant insert on table "public"."transfer_item" to "service_role";

grant references on table "public"."transfer_item" to "service_role";

grant select on table "public"."transfer_item" to "service_role";

grant trigger on table "public"."transfer_item" to "service_role";

grant truncate on table "public"."transfer_item" to "service_role";

grant update on table "public"."transfer_item" to "service_role";

grant delete on table "public"."transfer_order" to "anon";

grant insert on table "public"."transfer_order" to "anon";

grant references on table "public"."transfer_order" to "anon";

grant select on table "public"."transfer_order" to "anon";

grant trigger on table "public"."transfer_order" to "anon";

grant truncate on table "public"."transfer_order" to "anon";

grant update on table "public"."transfer_order" to "anon";

grant delete on table "public"."transfer_order" to "authenticated";

grant insert on table "public"."transfer_order" to "authenticated";

grant references on table "public"."transfer_order" to "authenticated";

grant select on table "public"."transfer_order" to "authenticated";

grant trigger on table "public"."transfer_order" to "authenticated";

grant truncate on table "public"."transfer_order" to "authenticated";

grant update on table "public"."transfer_order" to "authenticated";

grant delete on table "public"."transfer_order" to "service_role";

grant insert on table "public"."transfer_order" to "service_role";

grant references on table "public"."transfer_order" to "service_role";

grant select on table "public"."transfer_order" to "service_role";

grant trigger on table "public"."transfer_order" to "service_role";

grant truncate on table "public"."transfer_order" to "service_role";

grant update on table "public"."transfer_order" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

grant delete on table "public"."yard_record" to "anon";

grant insert on table "public"."yard_record" to "anon";

grant references on table "public"."yard_record" to "anon";

grant select on table "public"."yard_record" to "anon";

grant trigger on table "public"."yard_record" to "anon";

grant truncate on table "public"."yard_record" to "anon";

grant update on table "public"."yard_record" to "anon";

grant delete on table "public"."yard_record" to "authenticated";

grant insert on table "public"."yard_record" to "authenticated";

grant references on table "public"."yard_record" to "authenticated";

grant select on table "public"."yard_record" to "authenticated";

grant trigger on table "public"."yard_record" to "authenticated";

grant truncate on table "public"."yard_record" to "authenticated";

grant update on table "public"."yard_record" to "authenticated";

grant delete on table "public"."yard_record" to "service_role";

grant insert on table "public"."yard_record" to "service_role";

grant references on table "public"."yard_record" to "service_role";

grant select on table "public"."yard_record" to "service_role";

grant trigger on table "public"."yard_record" to "service_role";

grant truncate on table "public"."yard_record" to "service_role";

grant update on table "public"."yard_record" to "service_role";


  create policy "Enable full access for customers"
  on "public"."customers"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Enable full access for inventory"
  on "public"."inventory"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Enable full access for users"
  on "public"."users"
  as permissive
  for all
  to public
using (true)
with check (true);


CREATE TRIGGER trg_business_cost_updated_at BEFORE UPDATE ON public.business_cost FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_business_invoice_updated_at BEFORE UPDATE ON public.business_invoice FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_business_revenue_updated_at BEFORE UPDATE ON public.business_revenue FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.cities FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER trg_container_updated_at BEFORE UPDATE ON public.container FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_container_condition_codes_updated_at BEFORE UPDATE ON public.container_condition_codes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_container_number_rules_updated_at BEFORE UPDATE ON public.container_number_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_container_size_codes_updated_at BEFORE UPDATE ON public.container_size_codes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_container_type_codes_updated_at BEFORE UPDATE ON public.container_type_codes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_cost_codes_updated_at BEFORE UPDATE ON public.cost_codes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.depots FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER trg_finance_record_updated_at BEFORE UPDATE ON public.finance_record FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER trg_lease_bill_updated_at BEFORE UPDATE ON public.lease_bill FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_lease_contract_updated_at BEFORE UPDATE ON public.lease_contract FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_lease_item_updated_at BEFORE UPDATE ON public.lease_item FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_purchase_order_updated_at BEFORE UPDATE ON public.purchase_order FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_purchase_order_container_updated_at BEFORE UPDATE ON public.purchase_order_container FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_purchase_order_item_updated_at BEFORE UPDATE ON public.purchase_order_item FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_revenue_codes_updated_at BEFORE UPDATE ON public.revenue_codes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_sales_delivery_updated_at BEFORE UPDATE ON public.sales_delivery FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_sales_item_updated_at BEFORE UPDATE ON public.sales_item FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_sales_order_updated_at BEFORE UPDATE ON public.sales_order FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_transfer_item_updated_at BEFORE UPDATE ON public.transfer_item FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_transfer_order_updated_at BEFORE UPDATE ON public.transfer_order FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_yard_record_updated_at BEFORE UPDATE ON public.yard_record FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


