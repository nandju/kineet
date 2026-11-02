-- SasPay payment-links never return a documented public URL field — only
-- checkout-sessions do (checkout_url). Billing now creates checkout sessions
-- instead, which gives a real shareable link and a directly trustworthy
-- status (no more guessing which transaction belongs to which link).

alter table organization_payment_links
  add column url text,
  add column customer_name text,
  add column customer_email text;
