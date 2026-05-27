#!/usr/bin/env python3
"""
Tag Goods revenue invoices with the canonical 'ACT-GD — Goods' Project Tracking option.

WHY: Goods revenue in Xero is split/under-tagged — some invoices carry the archived
legacy option 'Goods.', some carry no Project Tracking at all. This consolidates them
onto the active 'ACT-GD — Goods' option so the project P&L is correct.
See: thoughts/shared/finance/2026-05-27-goods-xero-project-tagging-cleanup.md

USAGE:
  python3 scripts/tag-goods-revenue-invoices.py            # DRY RUN (default): GET + report, no writes
  python3 scripts/tag-goods-revenue-invoices.py --apply    # WRITE to live Xero

PRE-REQS:
  - Fresh token: `node scripts/sync-xero-tokens.mjs` first (access tokens last 30 min)
  - Run from the act-global-infrastructure root (reads .xero-tokens.json + .env.local)

CAVEATS:
  - Candidates are paid/authorised ACCREC invoices the mirror tags ACT-GD. Xero MAY
    reject line-item edits on PAID invoices via API; --apply reports per-invoice success/fail.
  - Tagging fixes PROJECT attribution only. Some grant lines may be coded to non-income
    accounts (deferred), which is a separate bookkeeper classification question.
  - Conflicts on OTHER live projects are never auto-changed (only 'Goods.' -> canonical).
"""
import os, json, sys, time, urllib.request, urllib.parse, urllib.error

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOK = json.load(open(os.path.join(D, ".xero-tokens.json")))["access_token"]
def env(k): return [l.split("=",1)[1].strip().strip('"') for l in open(os.path.join(D,".env.local")) if l.startswith(k+"=")][0]
TENANT = env("XERO_TENANT_ID"); SB_KEY = env("SUPABASE_SERVICE_ROLE_KEY")
H = {"Authorization":"Bearer "+TOK, "Xero-tenant-id":TENANT, "Accept":"application/json"}
CAT = "1a1ad7c5-249a-4b1f-842d-06ba2a63a0fe"        # Project Tracking category
CANON = "ACT-GD — Goods"                             # canonical option (active)
LEGACY = {"Goods.", "Goods"}                         # archived legacy option(s) to migrate
APPLY = "--apply" in sys.argv

def sb_get(p): return json.load(urllib.request.urlopen(urllib.request.Request(f"https://tednluwflfhxyucgwigh.supabase.co/rest/v1/{p}", headers={"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY})))
def xget(p): return json.load(urllib.request.urlopen(urllib.request.Request("https://api.xero.com/api.xro/2.0/"+p, headers=H)))
def proj_opt(line):
    for t in (line.get("Tracking") or []):
        if t.get("Name") == "Project Tracking": return t.get("Option")
    return None

cand = sb_get("xero_invoices?select=invoice_number,xero_id,contact_name,status,total,income_type"
              "&type=eq.ACCREC&project_code=eq.ACT-GD&status=in.(AUTHORISED,PAID)&order=contact_name")
print(f"Candidate Goods revenue invoices (mirror ACT-GD, ACCREC, live): {len(cand)}  mode={'APPLY' if APPLY else 'DRY RUN'}\n")

work = []
for c in cand:
    try:
        inv = xget(f"Invoices/{c['xero_id']}")["Invoices"][0]
    except urllib.error.HTTPError as e:
        print(f"  ! {c['invoice_number']} GET {e.code}"); continue
    add = migrate = already = other = 0
    for li in inv.get("LineItems", []):
        opt = proj_opt(li)
        if opt == CANON: already += 1
        elif opt is None: add += 1
        elif opt in LEGACY: migrate += 1
        else: other += 1
    acts = []
    if add: acts.append(f"ADD {add}")
    if migrate: acts.append(f"MIGRATE 'Goods.' {migrate}")
    if already: acts.append(f"ok {already}")
    if other: acts.append(f"OTHER-PROJECT {other} (left alone)")
    print(f"  {inv.get('InvoiceNumber','?'):10} {(c['contact_name'] or '')[:26]:26} {inv.get('Status'):10} ${float(inv.get('Total') or 0):>9,.0f} it={c.get('income_type') or 'null':6} | {', '.join(acts)}")
    if add or migrate:
        work.append((c, inv))
    time.sleep(1.1)

print(f"\nWORKLIST: {len(work)} invoices need ADD and/or MIGRATE. 'OTHER-PROJECT' lines are never touched.")
if not APPLY:
    print("DRY RUN — nothing written. Re-run with --apply (after approval + fresh token) to write.")
    sys.exit(0)

print("\nAPPLYING to LIVE Xero...")
ok = fail = 0
for c, inv in work:
    lines = []
    for li in inv.get("LineItems", []):
        nl = {k: li[k] for k in ("LineItemID","Description","Quantity","UnitAmount","AccountCode","TaxType","ItemCode","DiscountRate") if li.get(k) is not None}
        tr = [t for t in (li.get("Tracking") or []) if not (t.get("Name")=="Project Tracking" and t.get("Option") in LEGACY)]
        if not any(t.get("Name")=="Project Tracking" for t in tr):
            tr.append({"TrackingCategoryID": CAT, "Name": "Project Tracking", "Option": CANON})
        nl["Tracking"] = tr
        lines.append(nl)
    body = {"Invoices": [{"InvoiceID": inv["InvoiceID"], "LineItems": lines}]}
    req = urllib.request.Request("https://api.xero.com/api.xro/2.0/Invoices", data=json.dumps(body).encode(), method="POST", headers={**H, "Content-Type":"application/json"})
    try:
        urllib.request.urlopen(req); ok += 1; print(f"  ok   {inv.get('InvoiceNumber')}")
    except urllib.error.HTTPError as e:
        fail += 1; print(f"  FAIL {inv.get('InvoiceNumber')} {e.code}: {e.read().decode()[:160]}")
    time.sleep(1.1)
print(f"\nDone. tagged {ok}, failed {fail}.")
