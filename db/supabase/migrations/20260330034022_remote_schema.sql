drop trigger if exists "handle_updated_at" on "public"."inventory";

drop policy "Enable full access for inventory" on "public"."inventory";

revoke delete on table "public"."business_cost" from "anon";

revoke insert on table "public"."business_cost" from "anon";

revoke update on table "public"."business_cost" from "anon";

revoke delete on table "public"."business_cost" from "authenticated";

revoke insert on table "public"."business_cost" from "authenticated";

revoke references on table "public"."business_cost" from "authenticated";

revoke trigger on table "public"."business_cost" from "authenticated";

revoke truncate on table "public"."business_cost" from "authenticated";

revoke update on table "public"."business_cost" from "authenticated";

revoke delete on table "public"."business_invoice" from "anon";

revoke insert on table "public"."business_invoice" from "anon";

revoke update on table "public"."business_invoice" from "anon";

revoke delete on table "public"."business_invoice" from "authenticated";

revoke insert on table "public"."business_invoice" from "authenticated";

revoke references on table "public"."business_invoice" from "authenticated";

revoke trigger on table "public"."business_invoice" from "authenticated";

revoke truncate on table "public"."business_invoice" from "authenticated";

revoke update on table "public"."business_invoice" from "authenticated";

revoke delete on table "public"."business_invoice_item" from "anon";

revoke insert on table "public"."business_invoice_item" from "anon";

revoke update on table "public"."business_invoice_item" from "anon";

revoke delete on table "public"."business_invoice_item" from "authenticated";

revoke insert on table "public"."business_invoice_item" from "authenticated";

revoke references on table "public"."business_invoice_item" from "authenticated";

revoke trigger on table "public"."business_invoice_item" from "authenticated";

revoke truncate on table "public"."business_invoice_item" from "authenticated";

revoke update on table "public"."business_invoice_item" from "authenticated";

revoke delete on table "public"."business_revenue" from "anon";

revoke insert on table "public"."business_revenue" from "anon";

revoke update on table "public"."business_revenue" from "anon";

revoke delete on table "public"."business_revenue" from "authenticated";

revoke insert on table "public"."business_revenue" from "authenticated";

revoke references on table "public"."business_revenue" from "authenticated";

revoke trigger on table "public"."business_revenue" from "authenticated";

revoke truncate on table "public"."business_revenue" from "authenticated";

revoke update on table "public"."business_revenue" from "authenticated";

revoke delete on table "public"."cities" from "anon";

revoke insert on table "public"."cities" from "anon";

revoke update on table "public"."cities" from "anon";

revoke delete on table "public"."container" from "anon";

revoke insert on table "public"."container" from "anon";

revoke update on table "public"."container" from "anon";

revoke delete on table "public"."container" from "authenticated";

revoke insert on table "public"."container" from "authenticated";

revoke references on table "public"."container" from "authenticated";

revoke trigger on table "public"."container" from "authenticated";

revoke truncate on table "public"."container" from "authenticated";

revoke update on table "public"."container" from "authenticated";

revoke delete on table "public"."container_condition_codes" from "anon";

revoke insert on table "public"."container_condition_codes" from "anon";

revoke update on table "public"."container_condition_codes" from "anon";

revoke delete on table "public"."container_event" from "anon";

revoke insert on table "public"."container_event" from "anon";

revoke update on table "public"."container_event" from "anon";

revoke delete on table "public"."container_event" from "authenticated";

revoke insert on table "public"."container_event" from "authenticated";

revoke references on table "public"."container_event" from "authenticated";

revoke trigger on table "public"."container_event" from "authenticated";

revoke truncate on table "public"."container_event" from "authenticated";

revoke update on table "public"."container_event" from "authenticated";

revoke delete on table "public"."container_number_rules" from "anon";

revoke insert on table "public"."container_number_rules" from "anon";

revoke update on table "public"."container_number_rules" from "anon";

revoke delete on table "public"."container_size_codes" from "anon";

revoke insert on table "public"."container_size_codes" from "anon";

revoke update on table "public"."container_size_codes" from "anon";

revoke delete on table "public"."container_type_codes" from "anon";

revoke insert on table "public"."container_type_codes" from "anon";

revoke update on table "public"."container_type_codes" from "anon";

revoke delete on table "public"."cost_codes" from "anon";

revoke insert on table "public"."cost_codes" from "anon";

revoke update on table "public"."cost_codes" from "anon";

revoke delete on table "public"."customers" from "anon";

revoke insert on table "public"."customers" from "anon";

revoke update on table "public"."customers" from "anon";

revoke delete on table "public"."depots" from "anon";

revoke insert on table "public"."depots" from "anon";

revoke update on table "public"."depots" from "anon";

revoke delete on table "public"."finance_record" from "anon";

revoke insert on table "public"."finance_record" from "anon";

revoke update on table "public"."finance_record" from "anon";

revoke delete on table "public"."finance_record" from "authenticated";

revoke insert on table "public"."finance_record" from "authenticated";

revoke references on table "public"."finance_record" from "authenticated";

revoke trigger on table "public"."finance_record" from "authenticated";

revoke truncate on table "public"."finance_record" from "authenticated";

revoke update on table "public"."finance_record" from "authenticated";

revoke delete on table "public"."inventory" from "anon";

revoke insert on table "public"."inventory" from "anon";

revoke references on table "public"."inventory" from "anon";

revoke select on table "public"."inventory" from "anon";

revoke trigger on table "public"."inventory" from "anon";

revoke truncate on table "public"."inventory" from "anon";

revoke update on table "public"."inventory" from "anon";

revoke delete on table "public"."inventory" from "authenticated";

revoke insert on table "public"."inventory" from "authenticated";

revoke references on table "public"."inventory" from "authenticated";

revoke select on table "public"."inventory" from "authenticated";

revoke trigger on table "public"."inventory" from "authenticated";

revoke truncate on table "public"."inventory" from "authenticated";

revoke update on table "public"."inventory" from "authenticated";

revoke delete on table "public"."inventory" from "service_role";

revoke insert on table "public"."inventory" from "service_role";

revoke references on table "public"."inventory" from "service_role";

revoke select on table "public"."inventory" from "service_role";

revoke trigger on table "public"."inventory" from "service_role";

revoke truncate on table "public"."inventory" from "service_role";

revoke update on table "public"."inventory" from "service_role";

revoke delete on table "public"."lease_bill" from "anon";

revoke insert on table "public"."lease_bill" from "anon";

revoke update on table "public"."lease_bill" from "anon";

revoke delete on table "public"."lease_bill" from "authenticated";

revoke insert on table "public"."lease_bill" from "authenticated";

revoke references on table "public"."lease_bill" from "authenticated";

revoke trigger on table "public"."lease_bill" from "authenticated";

revoke truncate on table "public"."lease_bill" from "authenticated";

revoke update on table "public"."lease_bill" from "authenticated";

revoke delete on table "public"."lease_contract" from "anon";

revoke insert on table "public"."lease_contract" from "anon";

revoke update on table "public"."lease_contract" from "anon";

revoke delete on table "public"."lease_contract" from "authenticated";

revoke insert on table "public"."lease_contract" from "authenticated";

revoke references on table "public"."lease_contract" from "authenticated";

revoke trigger on table "public"."lease_contract" from "authenticated";

revoke truncate on table "public"."lease_contract" from "authenticated";

revoke update on table "public"."lease_contract" from "authenticated";

revoke delete on table "public"."lease_item" from "anon";

revoke insert on table "public"."lease_item" from "anon";

revoke update on table "public"."lease_item" from "anon";

revoke delete on table "public"."lease_item" from "authenticated";

revoke insert on table "public"."lease_item" from "authenticated";

revoke references on table "public"."lease_item" from "authenticated";

revoke trigger on table "public"."lease_item" from "authenticated";

revoke truncate on table "public"."lease_item" from "authenticated";

revoke update on table "public"."lease_item" from "authenticated";

revoke delete on table "public"."purchase_order" from "anon";

revoke insert on table "public"."purchase_order" from "anon";

revoke update on table "public"."purchase_order" from "anon";

revoke delete on table "public"."purchase_order" from "authenticated";

revoke insert on table "public"."purchase_order" from "authenticated";

revoke references on table "public"."purchase_order" from "authenticated";

revoke trigger on table "public"."purchase_order" from "authenticated";

revoke truncate on table "public"."purchase_order" from "authenticated";

revoke update on table "public"."purchase_order" from "authenticated";

revoke delete on table "public"."purchase_order_container" from "anon";

revoke insert on table "public"."purchase_order_container" from "anon";

revoke update on table "public"."purchase_order_container" from "anon";

revoke delete on table "public"."purchase_order_container" from "authenticated";

revoke insert on table "public"."purchase_order_container" from "authenticated";

revoke references on table "public"."purchase_order_container" from "authenticated";

revoke trigger on table "public"."purchase_order_container" from "authenticated";

revoke truncate on table "public"."purchase_order_container" from "authenticated";

revoke update on table "public"."purchase_order_container" from "authenticated";

revoke delete on table "public"."purchase_order_item" from "anon";

revoke insert on table "public"."purchase_order_item" from "anon";

revoke update on table "public"."purchase_order_item" from "anon";

revoke delete on table "public"."purchase_order_item" from "authenticated";

revoke insert on table "public"."purchase_order_item" from "authenticated";

revoke references on table "public"."purchase_order_item" from "authenticated";

revoke trigger on table "public"."purchase_order_item" from "authenticated";

revoke truncate on table "public"."purchase_order_item" from "authenticated";

revoke update on table "public"."purchase_order_item" from "authenticated";

revoke delete on table "public"."revenue_codes" from "anon";

revoke insert on table "public"."revenue_codes" from "anon";

revoke update on table "public"."revenue_codes" from "anon";

revoke delete on table "public"."sales_delivery" from "anon";

revoke insert on table "public"."sales_delivery" from "anon";

revoke update on table "public"."sales_delivery" from "anon";

revoke delete on table "public"."sales_delivery" from "authenticated";

revoke insert on table "public"."sales_delivery" from "authenticated";

revoke references on table "public"."sales_delivery" from "authenticated";

revoke trigger on table "public"."sales_delivery" from "authenticated";

revoke truncate on table "public"."sales_delivery" from "authenticated";

revoke update on table "public"."sales_delivery" from "authenticated";

revoke delete on table "public"."sales_item" from "anon";

revoke insert on table "public"."sales_item" from "anon";

revoke update on table "public"."sales_item" from "anon";

revoke delete on table "public"."sales_item" from "authenticated";

revoke insert on table "public"."sales_item" from "authenticated";

revoke references on table "public"."sales_item" from "authenticated";

revoke trigger on table "public"."sales_item" from "authenticated";

revoke truncate on table "public"."sales_item" from "authenticated";

revoke update on table "public"."sales_item" from "authenticated";

revoke delete on table "public"."sales_order" from "anon";

revoke insert on table "public"."sales_order" from "anon";

revoke update on table "public"."sales_order" from "anon";

revoke delete on table "public"."sales_order" from "authenticated";

revoke insert on table "public"."sales_order" from "authenticated";

revoke references on table "public"."sales_order" from "authenticated";

revoke trigger on table "public"."sales_order" from "authenticated";

revoke truncate on table "public"."sales_order" from "authenticated";

revoke update on table "public"."sales_order" from "authenticated";

revoke delete on table "public"."suppliers" from "anon";

revoke insert on table "public"."suppliers" from "anon";

revoke update on table "public"."suppliers" from "anon";

revoke delete on table "public"."transfer_item" from "anon";

revoke insert on table "public"."transfer_item" from "anon";

revoke update on table "public"."transfer_item" from "anon";

revoke delete on table "public"."transfer_item" from "authenticated";

revoke insert on table "public"."transfer_item" from "authenticated";

revoke references on table "public"."transfer_item" from "authenticated";

revoke trigger on table "public"."transfer_item" from "authenticated";

revoke truncate on table "public"."transfer_item" from "authenticated";

revoke update on table "public"."transfer_item" from "authenticated";

revoke delete on table "public"."transfer_order" from "anon";

revoke insert on table "public"."transfer_order" from "anon";

revoke update on table "public"."transfer_order" from "anon";

revoke delete on table "public"."transfer_order" from "authenticated";

revoke insert on table "public"."transfer_order" from "authenticated";

revoke references on table "public"."transfer_order" from "authenticated";

revoke trigger on table "public"."transfer_order" from "authenticated";

revoke truncate on table "public"."transfer_order" from "authenticated";

revoke update on table "public"."transfer_order" from "authenticated";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

revoke delete on table "public"."users" from "authenticated";

revoke insert on table "public"."users" from "authenticated";

revoke update on table "public"."users" from "authenticated";

revoke delete on table "public"."yard_record" from "anon";

revoke insert on table "public"."yard_record" from "anon";

revoke update on table "public"."yard_record" from "anon";

revoke delete on table "public"."yard_record" from "authenticated";

revoke insert on table "public"."yard_record" from "authenticated";

revoke references on table "public"."yard_record" from "authenticated";

revoke trigger on table "public"."yard_record" from "authenticated";

revoke truncate on table "public"."yard_record" from "authenticated";

revoke update on table "public"."yard_record" from "authenticated";

alter table "public"."business_invoice" drop constraint "business_invoice_business_type_business_id_invoice_no_key";

alter table "public"."inventory" drop constraint "fk_inventory_customer";

alter table "public"."inventory" drop constraint "inventory_actual_depot_id_fkey";

alter table "public"."inventory" drop constraint "inventory_pod_id_fkey";

alter table "public"."inventory" drop constraint "inventory_pol_id_fkey";

alter table "public"."inventory" drop constraint "inventory_unit_number_key";

alter table "public"."inventory" drop constraint "rel_inventory_customer";

alter table "public"."inventory" drop constraint "rel_inventory_sales";

alter table "public"."suppliers" drop constraint "suppliers_supplier_code_key";

alter table "public"."container_event" drop constraint "container_event_event_type_check";

drop function if exists "public"."rpc_rebuild_container_side_effects"(p_container_id uuid, p_operator_id uuid);

alter table "public"."inventory" drop constraint "inventory_pkey";

drop index if exists "public"."business_invoice_business_type_business_id_invoice_no_key";

drop index if exists "public"."idx_business_cost_container";

drop index if exists "public"."idx_business_revenue_container";

drop index if exists "public"."idx_inventory_actual_depot";

drop index if exists "public"."idx_inventory_actual_depot_id";

drop index if exists "public"."idx_inventory_container_size";

drop index if exists "public"."idx_inventory_pod";

drop index if exists "public"."idx_inventory_pod_id";

drop index if exists "public"."idx_inventory_pol";

drop index if exists "public"."idx_inventory_pol_id";

drop index if exists "public"."idx_inventory_sales";

drop index if exists "public"."idx_inventory_unit_number";

drop index if exists "public"."inventory_pkey";

drop index if exists "public"."inventory_unit_number_key";

drop index if exists "public"."suppliers_supplier_code_key";

drop index if exists "public"."uq_container_event_one_per_business";

drop table "public"."inventory";


  create table "public"."lease_bill_detail" (
    "id" uuid not null default gen_random_uuid(),
    "bill_id" uuid not null,
    "lease_item_id" uuid not null,
    "billed_start_date" date not null,
    "billed_end_date" date not null,
    "billed_days" integer not null,
    "amount" numeric(14,2) not null,
    "remark" text,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "updated_by" uuid,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."lease_bill_detail" enable row level security;

alter table "public"."business_cost" add column "base_currency_amount" numeric(14,2) default 0;

alter table "public"."business_revenue" add column "base_currency_amount" numeric(14,2) default 0;

alter table "public"."container" add column "book_value" numeric(14,2) default 0;

alter table "public"."container_event" drop column "record_time";

alter table "public"."container_event" add column "is_void" boolean not null default false;

alter table "public"."container_event" add column "void_reason" text;

alter table "public"."container_event" add column "voided_at" timestamp with time zone;

alter table "public"."container_event" add column "voided_by" uuid;

alter table "public"."container_number_rules" alter column "container_size_code_id" set not null;

alter table "public"."finance_record" add column "base_currency_amount" numeric(14,2) default 0;

alter table "public"."lease_item" add column "created_by" uuid;

alter table "public"."lease_item" add column "updated_by" uuid;

alter table "public"."sales_item" add column "created_by" uuid;

alter table "public"."sales_item" add column "updated_by" uuid;

alter table "public"."suppliers" alter column "supplier_code" set not null;

alter table "public"."transfer_item" add column "created_by" uuid;

alter table "public"."transfer_item" add column "updated_by" uuid;

alter table "public"."users" add column "updated_at" timestamp with time zone not null default now();

CREATE INDEX IF NOT EXISTS idx_container_condition_code_id ON public.container USING btree (container_condition_code_id);

CREATE INDEX IF NOT EXISTS idx_container_current_lease ON public.container USING btree (current_lease_id);

CREATE INDEX IF NOT EXISTS idx_container_current_lease_id ON public.container USING btree (current_lease_id);

CREATE INDEX IF NOT EXISTS idx_container_current_sale ON public.container USING btree (current_sale_id);

CREATE INDEX IF NOT EXISTS idx_container_current_sale_id ON public.container USING btree (current_sale_id);

CREATE INDEX IF NOT EXISTS idx_container_current_transfer ON public.container USING btree (current_transfer_id);

CREATE INDEX IF NOT EXISTS idx_container_current_transfer_id ON public.container USING btree (current_transfer_id);

CREATE INDEX IF NOT EXISTS idx_container_event_valid_time ON public.container_event USING btree (container_id, event_time DESC) WHERE (is_void = false);

CREATE INDEX IF NOT EXISTS idx_container_lifecycle_stage ON public.container USING btree (lifecycle_stage);

CREATE INDEX IF NOT EXISTS idx_container_yard_filter ON public.container USING btree (current_depot_id, lifecycle_stage, status);

CREATE INDEX IF NOT EXISTS idx_lease_bill_detail_bill ON public.lease_bill_detail USING btree (bill_id);

CREATE INDEX IF NOT EXISTS idx_lease_bill_detail_item ON public.lease_bill_detail USING btree (lease_item_id);

CREATE INDEX IF NOT EXISTS idx_lease_bill_lease_contract_id ON public.lease_bill USING btree (lease_contract_id);

CREATE INDEX IF NOT EXISTS idx_lease_item_container_id ON public.lease_item USING btree (container_id);

CREATE INDEX IF NOT EXISTS idx_lease_item_lease_contract_id ON public.lease_item USING btree (lease_contract_id);

CREATE INDEX IF NOT EXISTS idx_lease_status ON public.lease_contract USING btree (status);

CREATE INDEX IF NOT EXISTS idx_sales_delivery_sales_order_id ON public.sales_delivery USING btree (sales_order_id);

CREATE INDEX IF NOT EXISTS idx_sales_item_container_id ON public.sales_item USING btree (container_id);

CREATE INDEX IF NOT EXISTS idx_sales_item_sales_order_id ON public.sales_item USING btree (sales_order_id);

CREATE INDEX IF NOT EXISTS idx_sales_order_customer_id ON public.sales_order USING btree (customer_id);

CREATE INDEX IF NOT EXISTS idx_so_status ON public.sales_order USING btree (status);

CREATE INDEX IF NOT EXISTS idx_transfer_item_container_id ON public.transfer_item USING btree (container_id);

CREATE INDEX IF NOT EXISTS idx_transfer_item_transfer_order_id ON public.transfer_item USING btree (transfer_order_id);

CREATE INDEX IF NOT EXISTS idx_transfer_order_customer_id ON public.transfer_order USING btree (customer_id);

CREATE INDEX IF NOT EXISTS idx_transfer_order_from_depot_id ON public.transfer_order USING btree (from_depot_id);

CREATE INDEX IF NOT EXISTS idx_transfer_order_to_depot_id ON public.transfer_order USING btree (to_depot_id);

CREATE INDEX IF NOT EXISTS idx_transfer_status ON public.transfer_order USING btree (status);

CREATE INDEX IF NOT EXISTS idx_yard_record_container_id ON public.yard_record USING btree (container_id);

CREATE INDEX IF NOT EXISTS idx_yard_record_depot_id ON public.yard_record USING btree (depot_id);

CREATE UNIQUE INDEX IF NOT EXISTS lease_bill_detail_pkey ON public.lease_bill_detail USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_supplier_code ON public.suppliers USING btree (supplier_code);

CREATE UNIQUE INDEX IF NOT EXISTS uq_yard_record_one_active_per_container ON public.yard_record USING btree (container_id) WHERE (record_status = 'IN_YARD'::text);

CREATE UNIQUE INDEX IF NOT EXISTS uq_yard_record_one_active_per_container2 ON public.yard_record USING btree (container_id) WHERE ((exit_time IS NULL) AND (record_status = 'IN_YARD'::text));

CREATE UNIQUE INDEX IF NOT EXISTS uq_container_event_one_per_business ON public.container_event USING btree (container_id, business_type, business_id, event_type) WHERE ((is_void = false) AND (business_type IS NOT NULL) AND (business_id IS NOT NULL));

alter table "public"."lease_bill_detail" add constraint "lease_bill_detail_pkey" PRIMARY KEY using index "lease_bill_detail_pkey";

alter table "public"."business_cost" add constraint "chk_business_cost_base_currency" CHECK (((currency = 'USD'::text) OR (base_currency_amount <> (0)::numeric))) not valid;

alter table "public"."business_cost" validate constraint "chk_business_cost_base_currency";

alter table "public"."business_revenue" add constraint "chk_business_revenue_base_currency" CHECK (((currency = 'USD'::text) OR (base_currency_amount <> (0)::numeric))) not valid;

alter table "public"."business_revenue" validate constraint "chk_business_revenue_base_currency";

alter table "public"."container_event" add constraint "container_event_voided_by_fkey" FOREIGN KEY (voided_by) REFERENCES public.users(id) not valid;

alter table "public"."container_event" validate constraint "container_event_voided_by_fkey";

alter table "public"."finance_record" add constraint "chk_finance_record_base_currency" CHECK (((currency = 'USD'::text) OR (base_currency_amount <> (0)::numeric))) not valid;

alter table "public"."finance_record" validate constraint "chk_finance_record_base_currency";

alter table "public"."lease_bill_detail" add constraint "lease_bill_detail_bill_id_fkey" FOREIGN KEY (bill_id) REFERENCES public.lease_bill(id) ON DELETE CASCADE not valid;

alter table "public"."lease_bill_detail" validate constraint "lease_bill_detail_bill_id_fkey";

alter table "public"."lease_bill_detail" add constraint "lease_bill_detail_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."lease_bill_detail" validate constraint "lease_bill_detail_created_by_fkey";

alter table "public"."lease_bill_detail" add constraint "lease_bill_detail_lease_item_id_fkey" FOREIGN KEY (lease_item_id) REFERENCES public.lease_item(id) not valid;

alter table "public"."lease_bill_detail" validate constraint "lease_bill_detail_lease_item_id_fkey";

alter table "public"."lease_bill_detail" add constraint "lease_bill_detail_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."lease_bill_detail" validate constraint "lease_bill_detail_updated_by_fkey";

alter table "public"."lease_item" add constraint "lease_item_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."lease_item" validate constraint "lease_item_created_by_fkey";

alter table "public"."lease_item" add constraint "lease_item_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."lease_item" validate constraint "lease_item_updated_by_fkey";

alter table "public"."sales_item" add constraint "sales_item_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."sales_item" validate constraint "sales_item_created_by_fkey";

alter table "public"."sales_item" add constraint "sales_item_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."sales_item" validate constraint "sales_item_updated_by_fkey";

alter table "public"."transfer_item" add constraint "transfer_item_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."transfer_item" validate constraint "transfer_item_created_by_fkey";

alter table "public"."transfer_item" add constraint "transfer_item_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."transfer_item" validate constraint "transfer_item_updated_by_fkey";

alter table "public"."container_event" add constraint "container_event_event_type_check" CHECK ((event_type = ANY (ARRAY['PURCHASE'::text, 'YARD_ENTER'::text, 'YARD_EXIT'::text, 'TRANSFER_OUT'::text, 'TRANSFER_IN'::text, 'LEASE_ONHIRE'::text, 'LEASE_OFFHIRE'::text, 'SALE_CONTRACTED'::text, 'SALE_DELIVERED'::text, 'TOTAL_LOSS'::text, 'REPAIR'::text, 'SCRAP'::text]))) not valid;

alter table "public"."container_event" validate constraint "container_event_event_type_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select role from public.users where id = auth.uid()), 'Anonymous');
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.current_user_role() = 'Admin';
$function$
;

create or replace view "public"."v_container_event" as  SELECT id,
    container_id,
    event_type,
    event_sub_type,
    business_type,
    business_id,
    from_depot_id,
    to_depot_id,
    lifecycle_before,
    lifecycle_after,
    status_before,
    status_after,
    event_time,
    operator_id,
    operator_name,
    amount,
    currency,
    remark,
    extra_data,
    created_at,
    is_void,
    voided_by,
    voided_at,
    void_reason
   FROM public.container_event
  WHERE (is_void = false);


CREATE OR REPLACE FUNCTION public.lock_container(p_container_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  b bytea;
  k1 int;
  k2 int;
begin
  b := uuid_send(p_container_id);

  -- Build two 32-bit signed ints from the 16 UUID bytes
  k1 := (get_byte(b,0)<<24) | (get_byte(b,1)<<16) | (get_byte(b,2)<<8) | get_byte(b,3);
  k2 := (get_byte(b,4)<<24) | (get_byte(b,5)<<16) | (get_byte(b,6)<<8) | get_byte(b,7);

  perform pg_advisory_xact_lock(k1, k2);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_lease_offhire(p_lease_contract_id uuid, p_container_id uuid, p_return_depot_id uuid, p_offhire_time timestamp with time zone DEFAULT now(), p_status_after text DEFAULT 'AVAILABLE'::text, p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_remark text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  select id into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'LEASE'
    and business_id = p_lease_contract_id
    and event_type = 'LEASE_OFFHIRE'
  order by event_time desc, created_at desc
  limit 1;

  if v_existing_event_id is not null then
    update public.lease_item
    set item_status = 'OFFHIRE',
        updated_by = p_operator_id,
        updated_at = now()
    where lease_contract_id = p_lease_contract_id
      and container_id = p_container_id;

    if not exists (
      select 1 from public.yard_record
      where container_id = p_container_id
        and depot_id = p_return_depot_id
        and enter_time = p_offhire_time
        and record_status = 'IN_YARD'
    ) then
      insert into public.yard_record(
        container_id, depot_id, enter_time, record_status,
        remark, created_by, updated_by
      )
      values(
        p_container_id, p_return_depot_id, p_offhire_time, 'IN_YARD',
        p_remark, p_operator_id, p_operator_id
      );
    end if;

    update public.container
    set lifecycle_stage = 'IN_YARD',
        status = p_status_after,
        current_depot_id = p_return_depot_id,
        current_lease_id = null,
        updated_by = p_operator_id,
        updated_at = now(),
        last_event_id = v_existing_event_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  update public.lease_item
  set item_status = 'OFFHIRE',
      updated_by = p_operator_id,
      updated_at = now()
  where lease_contract_id = p_lease_contract_id
    and container_id = p_container_id;

  if not found then
    raise exception 'lease_item not found for lease_contract % and container %', p_lease_contract_id, p_container_id;
  end if;

  insert into public.container_event(
    container_id, event_type, business_type, business_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'LEASE_OFFHIRE', 'LEASE', p_lease_contract_id,
    v_lifecycle_before, 'IN_YARD',
    v_status_before, p_status_after,
    p_offhire_time, p_operator_id, p_operator_name, p_remark
  )
  returning id into v_event_id;

  insert into public.yard_record(
    container_id, depot_id, enter_time, record_status,
    remark, created_by, updated_by
  )
  values(
    p_container_id, p_return_depot_id, p_offhire_time, 'IN_YARD',
    p_remark, p_operator_id, p_operator_id
  );

  update public.container
  set lifecycle_stage = 'IN_YARD',
      status = p_status_after,
      current_depot_id = p_return_depot_id,
      current_lease_id = null,
      updated_by = p_operator_id,
      updated_at = now(),
      last_event_id = v_event_id
  where id = p_container_id;

  return v_event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_lease_onhire(p_lease_contract_id uuid, p_container_id uuid, p_onhire_time timestamp with time zone DEFAULT now(), p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_remark text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_customer_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  select id into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'LEASE'
    and business_id = p_lease_contract_id
    and event_type = 'LEASE_ONHIRE'
  order by event_time desc, created_at desc
  limit 1;

  select customer_id into v_customer_id
  from public.lease_contract
  where id = p_lease_contract_id;

  if not found then
    raise exception 'lease_contract not found: %', p_lease_contract_id;
  end if;

  if v_existing_event_id is not null then
    update public.lease_item
    set item_status = 'ONHIRE',
        updated_by = p_operator_id,
        updated_at = now()
    where lease_contract_id = p_lease_contract_id
      and container_id = p_container_id;

    update public.container
    set lifecycle_stage = 'LEASE',
        status = 'ONHIRE',
        current_lease_id = p_lease_contract_id,
        current_customer_id = v_customer_id,
        current_transfer_id = null,
        updated_by = p_operator_id,
        updated_at = now(),
        last_event_id = v_existing_event_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  update public.lease_item
  set item_status = 'ONHIRE',
      updated_by = p_operator_id,
      updated_at = now()
  where lease_contract_id = p_lease_contract_id
    and container_id = p_container_id;

  if not found then
    raise exception 'lease_item not found for lease_contract % and container %', p_lease_contract_id, p_container_id;
  end if;

  update public.container
  set lifecycle_stage = 'LEASE',
      status = 'ONHIRE',
      current_lease_id = p_lease_contract_id,
      current_customer_id = v_customer_id,
      current_transfer_id = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  insert into public.container_event(
    container_id, event_type, business_type, business_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'LEASE_ONHIRE', 'LEASE', p_lease_contract_id,
    v_lifecycle_before, 'LEASE',
    v_status_before, 'ONHIRE',
    p_onhire_time, p_operator_id, p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  update public.container
  set last_event_id = v_event_id,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  return v_event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_rebuild_container_snapshot(p_container_id uuid, p_operator_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_last_event_id uuid;
  v_lifecycle text;
  v_status text;
  v_business_type text;
  v_business_id uuid;
  v_from_depot uuid;
  v_to_depot uuid;

  v_customer_id uuid;
  v_depot_id uuid;
begin
  perform public.lock_container(p_container_id);

  -- 1) pick latest non-void event as the snapshot source
  select id, lifecycle_after, status_after, business_type, business_id, from_depot_id, to_depot_id
    into v_last_event_id, v_lifecycle, v_status, v_business_type, v_business_id, v_from_depot, v_to_depot
  from public.container_event
  where container_id = p_container_id
    and is_void = false
  order by event_time desc, created_at desc
  limit 1;

  if v_last_event_id is null then
    raise exception 'no valid event for container: %', p_container_id;
  end if;

  -- 2) rebuild current_customer_id from the latest business doc
  v_customer_id := null;

  if v_business_type = 'LEASE' and v_business_id is not null then
    select customer_id into v_customer_id
    from public.lease_contract
    where id = v_business_id;

  elsif v_business_type = 'SALE' and v_business_id is not null then
    select customer_id into v_customer_id
    from public.sales_order
    where id = v_business_id;

  elsif v_business_type = 'TRANSFER' and v_business_id is not null then
    select customer_id into v_customer_id
    from public.transfer_order
    where id = v_business_id;
  end if;

  -- 3) rebuild current_depot_id
  v_depot_id := null;

  if v_lifecycle = 'IN_YARD' then
    -- Prefer the authoritative active yard_record (you have unique index enforcing single active row)
    select depot_id into v_depot_id
    from public.yard_record
    where container_id = p_container_id
      and record_status = 'IN_YARD'
    order by enter_time desc
    limit 1;

    -- Fallback: latest non-void YARD_ENTER event
    if v_depot_id is null then
      select to_depot_id into v_depot_id
      from public.container_event
      where container_id = p_container_id
        and is_void = false
        and event_type = 'YARD_ENTER'
      order by event_time desc, created_at desc
      limit 1;
    end if;

    -- Last fallback: whatever depot fields the last event carried
    v_depot_id := coalesce(v_depot_id, v_to_depot, v_from_depot);
  end if;

  -- 4) update core snapshot first (must satisfy chk_container_status_by_lifecycle)
  update public.container
  set lifecycle_stage = v_lifecycle,
      status = v_status,
      last_event_id = v_last_event_id,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  -- 5) refill current pointers
  update public.container
  set current_transfer_id = case when v_business_type='TRANSFER' then v_business_id else null end,
      current_sale_id     = case when v_business_type='SALE' then v_business_id else null end,
      current_lease_id    = case when v_business_type='LEASE' then v_business_id else null end,
      current_customer_id = v_customer_id,
      current_depot_id    = v_depot_id
  where id = p_container_id;

  return v_last_event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_sale_contract(p_sales_order_id uuid, p_container_id uuid, p_contracted_time timestamp with time zone DEFAULT now(), p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_remark text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_customer_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  select id into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'SALE'
    and business_id = p_sales_order_id
    and event_type = 'SALE_CONTRACTED'
  order by event_time desc, created_at desc
  limit 1;

  select customer_id into v_customer_id
  from public.sales_order
  where id = p_sales_order_id;

  if not found then
    raise exception 'sales_order not found: %', p_sales_order_id;
  end if;

  if v_existing_event_id is not null then
    update public.sales_item
    set item_status='CONTRACTED',
        updated_by=p_operator_id,
        updated_at=now()
    where sales_order_id = p_sales_order_id
      and container_id = p_container_id;

    update public.container
    set current_sale_id = p_sales_order_id,
        current_customer_id = v_customer_id,
        updated_by = p_operator_id,
        updated_at = now(),
        last_event_id = v_existing_event_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id=p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  update public.sales_item
  set item_status='CONTRACTED',
      updated_by=p_operator_id,
      updated_at=now()
  where sales_order_id = p_sales_order_id
    and container_id = p_container_id;

  if not found then
    raise exception 'sales_item not found for sales_order % and container %', p_sales_order_id, p_container_id;
  end if;

  update public.container
  set current_sale_id = p_sales_order_id,
      current_customer_id = v_customer_id,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  insert into public.container_event(
    container_id, event_type, business_type, business_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'SALE_CONTRACTED', 'SALE', p_sales_order_id,
    v_lifecycle_before, v_lifecycle_before,
    v_status_before, v_status_before,
    p_contracted_time, p_operator_id, p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  update public.container
  set last_event_id=v_event_id,
      updated_at=now(),
      updated_by=p_operator_id
  where id=p_container_id;

  return v_event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_sale_deliver(p_sales_order_id uuid, p_container_id uuid, p_delivery_id uuid DEFAULT NULL::uuid, p_delivered_time timestamp with time zone DEFAULT now(), p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_remark text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_customer_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  -- idempotency: only consider non-void SALE_DELIVERED
  select id into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'SALE'
    and business_id = p_sales_order_id
    and event_type = 'SALE_DELIVERED'
  order by event_time desc, created_at desc
  limit 1;

  select customer_id into v_customer_id
  from public.sales_order
  where id = p_sales_order_id;

  if not found then
    raise exception 'sales_order not found: %', p_sales_order_id;
  end if;

  if v_existing_event_id is not null then
    -- retry: repair side effects + snapshot
    update public.sales_item
    set item_status = 'DELIVERED',
        updated_by = p_operator_id,
        updated_at = now()
    where sales_order_id = p_sales_order_id
      and container_id = p_container_id;

    if p_delivery_id is not null then
      update public.sales_delivery
      set delivery_status = 'DELIVERED',
          delivery_date = coalesce(delivery_date, p_delivered_time),
          updated_by = p_operator_id,
          updated_at = now()
      where id = p_delivery_id
        and sales_order_id = p_sales_order_id;
    end if;

    update public.container
    set lifecycle_stage = 'SOLD',
        status = 'SOLD',
        current_sale_id = p_sales_order_id,
        current_customer_id = v_customer_id,
        current_transfer_id = null,
        current_lease_id = null,
        updated_by = p_operator_id,
        updated_at = now(),
        last_event_id = v_existing_event_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  -- lock current snapshot
  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  -- sales_item must exist
  update public.sales_item
  set item_status = 'DELIVERED',
      updated_by = p_operator_id,
      updated_at = now()
  where sales_order_id = p_sales_order_id
    and container_id = p_container_id;

  if not found then
    raise exception 'sales_item not found for sales_order % and container %', p_sales_order_id, p_container_id;
  end if;

  -- delivery optional
  if p_delivery_id is not null then
    update public.sales_delivery
    set delivery_status = 'DELIVERED',
        delivery_date = coalesce(delivery_date, p_delivered_time),
        updated_by = p_operator_id,
        updated_at = now()
    where id = p_delivery_id
      and sales_order_id = p_sales_order_id;
  end if;

  -- now truly SOLD
  update public.container
  set lifecycle_stage = 'SOLD',
      status = 'SOLD',
      current_sale_id = p_sales_order_id,
      current_customer_id = v_customer_id,
      current_transfer_id = null,
      current_lease_id = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  insert into public.container_event(
    container_id, event_type, business_type, business_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'SALE_DELIVERED', 'SALE', p_sales_order_id,
    v_lifecycle_before, 'SOLD',
    v_status_before, 'SOLD',
    p_delivered_time, p_operator_id, p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  update public.container
  set last_event_id = v_event_id,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  return v_event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_sale_fail(p_sales_order_id uuid, p_container_id uuid, p_failed_time timestamp with time zone DEFAULT now(), p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_contracted_event_id uuid;
begin
  perform public.lock_container(p_container_id);

  -- must have a non-void contracted event
  select id into v_contracted_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'SALE'
    and business_id = p_sales_order_id
    and event_type = 'SALE_CONTRACTED'
  order by event_time desc, created_at desc
  limit 1;

  if v_contracted_event_id is null then
    raise exception 'Cannot fail sale: non-void SALE_CONTRACTED event not found for sales_order % and container %',
      p_sales_order_id, p_container_id;
  end if;

  update public.sales_item
  set item_status = 'FAILED',
      updated_by = p_operator_id,
      updated_at = now()
  where sales_order_id = p_sales_order_id
    and container_id = p_container_id;

  -- clear bindings (do not change lifecycle/status)
  update public.container
  set current_sale_id = null,
      current_customer_id = null,
      updated_by = p_operator_id,
      updated_at = now(),
      last_event_id = v_contracted_event_id
  where id = p_container_id;

  -- annotate contracted event (no new event to avoid uniqueness conflict)
  update public.container_event
  set remark = coalesce(remark,'')
              || ' | SALE FAILED at ' || p_failed_time::text
              || ' reason=' || coalesce(p_reason,''),
      operator_id = coalesce(operator_id, p_operator_id),
      operator_name = coalesce(operator_name, p_operator_name)
  where id = v_contracted_event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_transfer_cancel_item(p_transfer_order_id uuid, p_container_id uuid, p_operator_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.lock_container(p_container_id);

  update public.transfer_item
  set item_status='CANCELLED',
      updated_by=p_operator_id,
      updated_at=now()
  where transfer_order_id=p_transfer_order_id
    and container_id=p_container_id;

  if not found then
    raise exception 'transfer_item not found for transfer_order % and container %', p_transfer_order_id, p_container_id;
  end if;

  update public.transfer_item
  set remark = coalesce(remark,'') || ' | CANCEL reason=' || coalesce(p_reason,''),
      updated_by=p_operator_id,
      updated_at=now()
  where transfer_order_id=p_transfer_order_id
    and container_id=p_container_id;

  update public.container
  set current_transfer_id = case when current_transfer_id = p_transfer_order_id then null else current_transfer_id end,
      updated_by=p_operator_id,
      updated_at=now()
  where id=p_container_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_transfer_complete_if_all_arrived(p_transfer_order_id uuid, p_complete_time timestamp with time zone DEFAULT now(), p_operator_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_remaining int;
  v_current_status text;
  b bytea;
  k1 int;
  k2 int;
begin
  b := uuid_send(p_transfer_order_id);
  k1 := (get_byte(b,0)<<24) | (get_byte(b,1)<<16) | (get_byte(b,2)<<8) | get_byte(b,3);
  k2 := (get_byte(b,4)<<24) | (get_byte(b,5)<<16) | (get_byte(b,6)<<8) | get_byte(b,7);
  perform pg_advisory_xact_lock(k1, k2);

  select status into v_current_status
  from public.transfer_order
  where id = p_transfer_order_id
  for update;

  if not found then
    raise exception 'transfer_order not found: %', p_transfer_order_id;
  end if;

  if v_current_status in ('COMPLETED', 'CANCELLED') then
    return false;
  end if;

  select count(*) into v_remaining
  from public.transfer_item
  where transfer_order_id = p_transfer_order_id
    and item_status in ('PLANNED', 'IN_TRANSIT');

  if v_remaining = 0 then
    update public.transfer_order
    set status = 'COMPLETED',
        arrival_time = coalesce(arrival_time, p_complete_time),
        updated_by = p_operator_id,
        updated_at = now()
    where id = p_transfer_order_id;

    return true;
  end if;

  return false;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_transfer_in(p_transfer_order_id uuid, p_container_id uuid, p_arrival_time timestamp with time zone DEFAULT now(), p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_remark text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_from_depot uuid;
  v_to_depot uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  select id into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'TRANSFER'
    and business_id = p_transfer_order_id
    and event_type = 'TRANSFER_IN'
  order by event_time desc, created_at desc
  limit 1;

  if v_existing_event_id is not null then
    update public.container
    set last_event_id = v_existing_event_id,
        updated_at = now(),
        updated_by = p_operator_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  select from_depot_id, to_depot_id
    into v_from_depot, v_to_depot
  from public.transfer_order
  where id = p_transfer_order_id;

  if not found then
    raise exception 'transfer_order not found: %', p_transfer_order_id;
  end if;

  insert into public.transfer_item(
    transfer_order_id, container_id, item_status, remark,
    created_by, updated_by, created_at, updated_at
  )
  values (p_transfer_order_id, p_container_id, 'PLANNED', p_remark, p_operator_id, p_operator_id, now(), now())
  on conflict (transfer_order_id, container_id) do nothing;

  update public.transfer_item
  set item_status = 'ARRIVED',
      updated_by = p_operator_id,
      updated_at = now()
  where transfer_order_id = p_transfer_order_id
    and container_id = p_container_id;

  update public.transfer_order
  set arrival_time = coalesce(arrival_time, p_arrival_time),
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_transfer_order_id;

  insert into public.container_event(
    container_id, event_type, business_type, business_id,
    from_depot_id, to_depot_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'TRANSFER_IN', 'TRANSFER', p_transfer_order_id,
    v_from_depot, v_to_depot,
    v_lifecycle_before, v_lifecycle_before,
    v_status_before, v_status_before,
    p_arrival_time, p_operator_id, p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  update public.container
  set last_event_id = v_event_id,
      updated_at = now(),
      updated_by = p_operator_id
  where id = p_container_id;

  return v_event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_transfer_out(p_transfer_order_id uuid, p_container_id uuid, p_departure_time timestamp with time zone DEFAULT now(), p_status_after text DEFAULT 'EW_DEPOT_PENDING'::text, p_transit_business_type text DEFAULT 'EW_DEPOT'::text, p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_remark text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_from_depot uuid;
  v_to_depot uuid;
  v_lifecycle_before text;
  v_status_before text;
  v_current_depot uuid;
begin
  perform public.lock_container(p_container_id);

  select id into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'TRANSFER'
    and business_id = p_transfer_order_id
    and event_type = 'TRANSFER_OUT'
  order by event_time desc, created_at desc
  limit 1;

  if v_existing_event_id is not null then
    update public.container
    set lifecycle_stage = 'IN_TRANSIT',
        status = p_status_after,
        transit_business_type = p_transit_business_type,
        current_transfer_id = p_transfer_order_id,
        current_depot_id = null,
        updated_by = p_operator_id,
        updated_at = now(),
        last_event_id = v_existing_event_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  select lifecycle_stage, status, current_depot_id
    into v_lifecycle_before, v_status_before, v_current_depot
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  select from_depot_id, to_depot_id
    into v_from_depot, v_to_depot
  from public.transfer_order
  where id = p_transfer_order_id;

  if not found then
    raise exception 'transfer_order not found: %', p_transfer_order_id;
  end if;

  if v_from_depot is not null and v_current_depot is distinct from v_from_depot then
    raise exception 'container current_depot_id (%) not match transfer from_depot_id (%)', v_current_depot, v_from_depot;
  end if;

  update public.yard_record
  set exit_time = p_departure_time,
      record_status = 'EXITED',
      updated_by = p_operator_id,
      updated_at = now()
  where container_id = p_container_id
    and depot_id = v_from_depot
    and record_status = 'IN_YARD';

  insert into public.transfer_item(
    transfer_order_id, container_id, item_status, remark,
    created_by, updated_by, created_at, updated_at
  )
  values (
    p_transfer_order_id, p_container_id, 'PLANNED', p_remark,
    p_operator_id, p_operator_id, now(), now()
  )
  on conflict (transfer_order_id, container_id) do nothing;

  update public.transfer_item
  set item_status = 'IN_TRANSIT',
      updated_by = p_operator_id,
      updated_at = now()
  where transfer_order_id = p_transfer_order_id
    and container_id = p_container_id;

  update public.transfer_order
  set status = case when status = 'CREATED' then 'IN_TRANSIT' else status end,
      departure_time = coalesce(departure_time, p_departure_time),
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_transfer_order_id;

  update public.container
  set lifecycle_stage = 'IN_TRANSIT',
      status = p_status_after,
      transit_business_type = p_transit_business_type,
      current_transfer_id = p_transfer_order_id,
      current_depot_id = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  insert into public.container_event(
    container_id, event_type, business_type, business_id,
    from_depot_id, to_depot_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'TRANSFER_OUT', 'TRANSFER', p_transfer_order_id,
    v_from_depot, v_to_depot,
    v_lifecycle_before, 'IN_TRANSIT',
    v_status_before, p_status_after,
    p_departure_time, p_operator_id, p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  update public.container
  set last_event_id = v_event_id,
      updated_at = now(),
      updated_by = p_operator_id
  where id = p_container_id;

  return v_event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_void_container_event(p_event_id uuid, p_reason text, p_operator_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_container_id uuid;
begin
  select container_id into v_container_id
  from public.container_event
  where id = p_event_id
  for update;

  if not found then
    raise exception 'event not found: %', p_event_id;
  end if;

  perform public.lock_container(v_container_id);

  update public.container_event
  set is_void = true,
      voided_by = p_operator_id,
      voided_at = now(),
      void_reason = p_reason
  where id = p_event_id
    and is_void = false;

  -- 幂等：如果已经 void，直接返回
  if not found then
    return p_event_id;
  end if;

  -- 重建快照回滚
  perform public.rpc_rebuild_container_snapshot(v_container_id, p_operator_id);

  return p_event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_yard_enter(p_container_id uuid, p_depot_id uuid, p_enter_time timestamp with time zone DEFAULT now(), p_status_after text DEFAULT 'AVAILABLE'::text, p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_business_type text DEFAULT 'YARD'::text, p_business_id uuid DEFAULT NULL::uuid, p_remark text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  if p_business_id is not null then
    select id into v_existing_event_id
    from public.container_event
    where container_id = p_container_id
      and is_void = false
      and business_type = p_business_type
      and business_id = p_business_id
      and event_type = 'YARD_ENTER'
    order by event_time desc, created_at desc
    limit 1;

    if v_existing_event_id is not null then
      update public.container
      set lifecycle_stage = 'IN_YARD',
          status = p_status_after,
          current_depot_id = p_depot_id,
          current_transfer_id = null,
          updated_by = p_operator_id,
          updated_at = now(),
          last_event_id = v_existing_event_id
      where id = p_container_id;

      return v_existing_event_id;
    end if;
  end if;

  -- (弱幂等保持不动，但 event 查询也加 is_void=false)
  if p_business_id is null then
    if exists (
      select 1 from public.yard_record
      where container_id = p_container_id
        and depot_id = p_depot_id
        and enter_time = p_enter_time
        and record_status = 'IN_YARD'
    ) then
      select id into v_existing_event_id
      from public.container_event
      where container_id = p_container_id
        and is_void = false
        and event_type = 'YARD_ENTER'
        and to_depot_id = p_depot_id
        and event_time = p_enter_time
      order by created_at desc
      limit 1;

      if v_existing_event_id is not null then
        update public.container
        set lifecycle_stage='IN_YARD',
            status=p_status_after,
            current_depot_id=p_depot_id,
            current_transfer_id=null,
            updated_by=p_operator_id,
            updated_at=now(),
            last_event_id=v_existing_event_id
        where id=p_container_id;

        return v_existing_event_id;
      end if;
    end if;
  end if;

  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  if not exists (
    select 1 from public.yard_record
    where container_id = p_container_id
      and depot_id = p_depot_id
      and enter_time = p_enter_time
      and record_status = 'IN_YARD'
  ) then
    insert into public.yard_record(
      container_id, depot_id, enter_time, record_status, remark, created_by, updated_by
    )
    values(
      p_container_id, p_depot_id, p_enter_time, 'IN_YARD', p_remark, p_operator_id, p_operator_id
    );
  end if;

  update public.container
  set lifecycle_stage = 'IN_YARD',
      status = p_status_after,
      current_depot_id = p_depot_id,
      current_transfer_id = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  insert into public.container_event(
    container_id, event_type, business_type, business_id,
    to_depot_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'YARD_ENTER', p_business_type, p_business_id,
    p_depot_id,
    v_lifecycle_before, 'IN_YARD',
    v_status_before, p_status_after,
    p_enter_time, p_operator_id, p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  update public.container
  set last_event_id = v_event_id,
      updated_at = now(),
      updated_by = p_operator_id
  where id = p_container_id;

  return v_event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_yard_exit(p_container_id uuid, p_depot_id uuid, p_exit_time timestamp with time zone DEFAULT now(), p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_business_type text DEFAULT 'YARD'::text, p_business_id uuid DEFAULT NULL::uuid, p_remark text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  if p_business_id is not null then
    select id into v_existing_event_id
    from public.container_event
    where container_id = p_container_id
      and is_void = false
      and business_type = p_business_type
      and business_id = p_business_id
      and event_type = 'YARD_EXIT'
    order by event_time desc, created_at desc
    limit 1;

    if v_existing_event_id is not null then
      update public.container
      set last_event_id = v_existing_event_id,
          updated_at = now(),
          updated_by = p_operator_id
      where id = p_container_id;

      return v_existing_event_id;
    end if;
  end if;

  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  update public.yard_record
  set exit_time = p_exit_time,
      record_status = 'EXITED',
      updated_by = p_operator_id,
      updated_at = now()
  where container_id = p_container_id
    and depot_id = p_depot_id
    and record_status = 'IN_YARD';

  update public.container
  set current_depot_id = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  insert into public.container_event(
    container_id, event_type, business_type, business_id,
    from_depot_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'YARD_EXIT', p_business_type, p_business_id,
    p_depot_id,
    v_lifecycle_before, v_lifecycle_before,
    v_status_before, v_status_before,
    p_exit_time, p_operator_id, p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  update public.container
  set last_event_id = v_event_id,
      updated_at = now(),
      updated_by = p_operator_id
  where id = p_container_id;

  return v_event_id;
end;
$function$
;

grant references on table "public"."lease_bill_detail" to "anon";

grant select on table "public"."lease_bill_detail" to "anon";

grant trigger on table "public"."lease_bill_detail" to "anon";

grant truncate on table "public"."lease_bill_detail" to "anon";

grant select on table "public"."lease_bill_detail" to "authenticated";

grant delete on table "public"."lease_bill_detail" to "service_role";

grant insert on table "public"."lease_bill_detail" to "service_role";

grant references on table "public"."lease_bill_detail" to "service_role";

grant select on table "public"."lease_bill_detail" to "service_role";

grant trigger on table "public"."lease_bill_detail" to "service_role";

grant truncate on table "public"."lease_bill_detail" to "service_role";

grant update on table "public"."lease_bill_detail" to "service_role";


  create policy "business_cost_select_all"
  on "public"."business_cost"
  as permissive
  for select
  to authenticated
using (true);



  create policy "business_invoice_select_all"
  on "public"."business_invoice"
  as permissive
  for select
  to authenticated
using (true);



  create policy "business_invoice_item_select_all"
  on "public"."business_invoice_item"
  as permissive
  for select
  to authenticated
using (true);



  create policy "business_revenue_select_all"
  on "public"."business_revenue"
  as permissive
  for select
  to authenticated
using (true);



  create policy "cities_admin_write"
  on "public"."cities"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "cities_select_all"
  on "public"."cities"
  as permissive
  for select
  to authenticated
using (true);



  create policy "container_admin_write"
  on "public"."container"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "container_select_all"
  on "public"."container"
  as permissive
  for select
  to authenticated
using (true);



  create policy "container_condition_codes_admin_write"
  on "public"."container_condition_codes"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "container_condition_codes_select_all"
  on "public"."container_condition_codes"
  as permissive
  for select
  to authenticated
using (true);



  create policy "container_event_select_all"
  on "public"."container_event"
  as permissive
  for select
  to authenticated
using (true);



  create policy "container_number_rules_admin_write"
  on "public"."container_number_rules"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "container_number_rules_select_all"
  on "public"."container_number_rules"
  as permissive
  for select
  to authenticated
using (true);



  create policy "container_size_codes_admin_write"
  on "public"."container_size_codes"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "container_size_codes_select_all"
  on "public"."container_size_codes"
  as permissive
  for select
  to authenticated
using (true);



  create policy "container_type_codes_admin_write"
  on "public"."container_type_codes"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "container_type_codes_select_all"
  on "public"."container_type_codes"
  as permissive
  for select
  to authenticated
using (true);



  create policy "cost_codes_admin_write"
  on "public"."cost_codes"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "cost_codes_select_all"
  on "public"."cost_codes"
  as permissive
  for select
  to authenticated
using (true);



  create policy "customers_admin_write"
  on "public"."customers"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "customers_select_all"
  on "public"."customers"
  as permissive
  for select
  to authenticated
using (true);



  create policy "depots_admin_write"
  on "public"."depots"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "depots_select_all"
  on "public"."depots"
  as permissive
  for select
  to authenticated
using (true);



  create policy "finance_record_select_all"
  on "public"."finance_record"
  as permissive
  for select
  to authenticated
using (true);



  create policy "lease_bill_select_all"
  on "public"."lease_bill"
  as permissive
  for select
  to authenticated
using (true);



  create policy "lease_bill_detail_select_all"
  on "public"."lease_bill_detail"
  as permissive
  for select
  to authenticated
using (true);



  create policy "lease_contract_select_all"
  on "public"."lease_contract"
  as permissive
  for select
  to authenticated
using (true);



  create policy "lease_item_select_all"
  on "public"."lease_item"
  as permissive
  for select
  to authenticated
using (true);



  create policy "purchase_order_select_all"
  on "public"."purchase_order"
  as permissive
  for select
  to authenticated
using (true);



  create policy "purchase_order_container_select_all"
  on "public"."purchase_order_container"
  as permissive
  for select
  to authenticated
using (true);



  create policy "purchase_order_item_select_all"
  on "public"."purchase_order_item"
  as permissive
  for select
  to authenticated
using (true);



  create policy "revenue_codes_admin_write"
  on "public"."revenue_codes"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "revenue_codes_select_all"
  on "public"."revenue_codes"
  as permissive
  for select
  to authenticated
using (true);



  create policy "sales_delivery_select_all"
  on "public"."sales_delivery"
  as permissive
  for select
  to authenticated
using (true);



  create policy "sales_item_select_all"
  on "public"."sales_item"
  as permissive
  for select
  to authenticated
using (true);



  create policy "sales_order_select_all"
  on "public"."sales_order"
  as permissive
  for select
  to authenticated
using (true);



  create policy "suppliers_admin_write"
  on "public"."suppliers"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "suppliers_select_all"
  on "public"."suppliers"
  as permissive
  for select
  to authenticated
using (true);



  create policy "transfer_item_select_all"
  on "public"."transfer_item"
  as permissive
  for select
  to authenticated
using (true);



  create policy "transfer_order_select_all"
  on "public"."transfer_order"
  as permissive
  for select
  to authenticated
using (true);



  create policy "users_admin_write"
  on "public"."users"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "users_select_self"
  on "public"."users"
  as permissive
  for select
  to authenticated
using (((id = auth.uid()) OR public.is_admin()));



  create policy "yard_record_select_all"
  on "public"."yard_record"
  as permissive
  for select
  to authenticated
using (true);


CREATE TRIGGER trg_lease_bill_detail_updated_at BEFORE UPDATE ON public.lease_bill_detail FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

