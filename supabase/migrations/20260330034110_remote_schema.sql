revoke delete on table "public"."lease_bill_detail" from "anon";

revoke insert on table "public"."lease_bill_detail" from "anon";

revoke update on table "public"."lease_bill_detail" from "anon";

revoke delete on table "public"."lease_bill_detail" from "authenticated";

revoke insert on table "public"."lease_bill_detail" from "authenticated";

revoke references on table "public"."lease_bill_detail" from "authenticated";

revoke trigger on table "public"."lease_bill_detail" from "authenticated";

revoke truncate on table "public"."lease_bill_detail" from "authenticated";

revoke update on table "public"."lease_bill_detail" from "authenticated";

drop view if exists "public"."v_container_event";

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



