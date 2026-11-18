-- 1) Nama petugas untuk bukti terima/ambil barang (dibuat, diposting, diterima).
create or replace function public.document_people(p_document uuid)
returns table(created_email text, posted_email text, received_email text)
language plpgsql stable security definer set search_path = '' as $$
declare d record;
begin
  select * into d from public.documents where id = p_document;
  if d.id is null or not (
    public.can_access_warehouse(coalesce(d.warehouse_id, d.from_warehouse_id))
    or (d.to_warehouse_id is not null and public.can_access_warehouse(d.to_warehouse_id))
  ) then
    raise exception 'Anda tidak punya akses ke dokumen ini' using errcode = '42501';
  end if;
  return query
    select
      (select u.email::text from auth.users u join public.memberships m on m.user_id = u.id and m.tenant_id = d.tenant_id where u.id = d.created_by),
      (select u.email::text from auth.users u join public.memberships m on m.user_id = u.id and m.tenant_id = d.tenant_id where u.id = d.posted_by),
      (select u.email::text from auth.users u join public.memberships m on m.user_id = u.id and m.tenant_id = d.tenant_id where u.id = d.received_by);
end $$;
revoke execute on function public.document_people(uuid) from public, anon;
grant execute on function public.document_people(uuid) to authenticated;

-- 2) Pergerakan terakhir per barang & gudang (untuk laporan barang tidak bergerak).
-- security invoker: RLS stock_movements membatasi ke gudang yang boleh diakses.
create or replace function public.item_last_moves(p_tenant uuid)
returns table(item_id uuid, warehouse_id uuid, last_out timestamptz, last_in timestamptz, last_any timestamptz)
language sql stable security invoker set search_path = '' as $$
  select sm.item_id, sm.warehouse_id,
         max(sm.created_at) filter (where sm.movement_type in ('out', 'transfer_out', 'return_out')),
         max(sm.created_at) filter (where sm.movement_type in ('in', 'transfer_in', 'return_in')),
         max(sm.created_at) filter (where sm.movement_type <> 'void_reversal')
  from public.stock_movements sm
  left join public.documents d on d.id = sm.document_id
  where sm.tenant_id = p_tenant and public.is_tenant_member(p_tenant)
    and d.status is distinct from 'void'
  group by sm.item_id, sm.warehouse_id;
$$;
revoke execute on function public.item_last_moves(uuid) from public, anon;
grant execute on function public.item_last_moves(uuid) to authenticated;
