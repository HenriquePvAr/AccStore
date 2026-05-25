drop policy if exists "orders_insert_buyer" on public.orders;
create policy "orders_insert_buyer"
on public.orders for insert
to authenticated
with check (
  buyer_id = auth.uid()
  and payment_status = 'pending'
  and payment_provider is null
  and payment_provider_id is null
  and payment_url is null
  and pix_qr_code is null
  and pix_copy_paste is null
  and paid_at is null
  and expires_at is null
  and delivery_status = 'pending'
  and status = 'pending'
  and public.can_order_account(account_id, seller_id, amount)
);
