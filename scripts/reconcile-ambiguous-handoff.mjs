#!/usr/bin/env node
// READ-ONLY: build the SL handoff + walkthrough for the ambiguous cluster. For each
// pair, fully check: dates, references (is the bill an auto-pushed dext phantom?),
// both-sides coding, then classify into A/B/C/D with a recommended action.
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';
import { readFileSync, writeFileSync } from 'fs';
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
const xero=await createXeroClient(sb);
const plan=JSON.parse(readFileSync('thoughts/shared/recon-pack/ambiguous-plan.json','utf8'));
const code=x=>{const l=x?.LineItems?.[0]; return {acct:l?.AccountCode||'?', proj:(l?.Tracking||[]).map(t=>t.Option).join('/')||'-'};};
const isCatchall=c=>/ACT-IN/i.test(c.proj)||c.proj==='-'||c.acct==='429';
const dd=(a,b)=>Math.round(Math.abs((new Date(a)-new Date(b))/86400000));

const rows=[]; let n=0;
for(const p of plan){
  try{
    const t=(await xero.get(`BankTransactions/${p.txnId}`)).BankTransactions?.[0];
    const b=(await xero.get(`Invoices/${p.billId}`)).Invoices?.[0];
    if(t?.Status==='DELETED'||t?.IsReconciled===true||b?.Status!=='AUTHORISED'){rows.push({...p,skip:`sm=${t?.Status}/${t?.IsReconciled} bill=${b?.Status}`});continue;}
    const sc=code(t), bc=code(b);
    const sd=t?.DateString?.slice(0,10), bd=b?.DateString?.slice(0,10);
    const autodext=/dext_import/i.test(b?.Reference||'');
    let cls, action;
    if(!autodext){cls='D'; action='VERIFY: bill is NOT auto-dext — is it a real separate payable? SL/Ben check before voiding.';}
    else if(sc.acct===bc.acct && sc.proj===bc.proj){cls='A'; action=`VOID bill, keep spend-money (coding agrees: ${sc.acct}·${sc.proj}).`;}
    else if(isCatchall(bc) && !isCatchall(sc)){cls='B'; action=`VOID bill, keep spend-money (its coding ${sc.acct}·${sc.proj} beats the catch-all bill ${bc.acct}·${bc.proj}).`;}
    else {cls='C'; action=`VOID bill, keep spend-money — but BEN CONFIRM PROJECT: ${sc.proj} (spend-money) vs ${bc.proj} (bill).`;}
    rows.push({...p, sd, bd, datedelta:dd(sd,bd), sm_ref:t?.Reference||'', autodext, sm_acct:sc.acct, sm_proj:sc.proj, bill_acct:bc.acct, bill_proj:bc.proj, sm_att:t?.HasAttachments, bill_att:b?.HasAttachments, cls, action});
  }catch(e){rows.push({...p,skip:'err '+(e.message||'').slice(0,40)});}
  if(++n%15===0) console.log(`  …${n}/${plan.length}`);
}
const live=rows.filter(r=>!r.skip);
const G=c=>live.filter(r=>r.cls===c).sort((a,b)=>b.amount-a.amount);
const sum=a=>a.reduce((s,r)=>s+r.amount,0).toFixed(2);
const out=['# Standard Ledger handoff — NAB Visa #8815 ambiguous cluster (void-bill + keep spend-money)','',
  '**What these are:** each is ONE purchase recorded twice — an unpaid AUTHORISED bill (an `auto-pushed dext_import` phantom) + an unreconciled card spend-money (real vendor ref). **Resolution: VOID the phantom bill, keep the spend-money** (BAS-neutral — bills unpaid on cash basis; clears phantom AP). Then the card statement line matches the spend-money.','',
  `**Totals:** ${live.length} pairs, $${sum(live)}. A(agree)=${G('A').length} · B(spend-money coding wins)=${G('B').length} · C(BEN project call)=${G('C').length} · D(not auto-dext, verify)=${G('D').length}.`,''];
const tbl=(title,arr,extra)=>{out.push(`## ${title} — ${arr.length} ($${sum(arr)})`,'',`| $ | date | vendor | sm ref | dates Δ | spend-money code | bill code | action |`,'|--:|---|---|---|--:|---|---|---|'); for(const r of arr) out.push(`| ${r.amount} | ${r.sd} | ${r.vendor||'(none)'} | ${r.sm_ref} | ${r.datedelta}d | ${r.sm_acct}·${r.sm_proj} | ${r.bill_acct}·${r.bill_proj} | ${r.cls} |`); out.push('');};
tbl('C — BEN must confirm project (both sides specific, conflicting)', G('C'));
tbl('D — NOT auto-dext: verify real-vs-phantom before voiding', G('D'));
tbl('B — spend-money coding wins (bill is catch-all) → SL voids bill', G('B'));
tbl('A — coding agrees → SL voids bill', G('A'));
if(rows.some(r=>r.skip)){out.push('## changed/skipped since plan',''); for(const r of rows.filter(r=>r.skip)) out.push(`- ${r.amount} ${r.vendor} — ${r.skip}`);}
writeFileSync('thoughts/shared/recon-pack/SL-handoff-ambiguous.md', out.join('\n'));
writeFileSync('thoughts/shared/recon-pack/ambiguous-classified.json', JSON.stringify(live.map(r=>({txnId:r.txnId,billId:r.billId,amount:r.amount,vendor:r.vendor,cls:r.cls,sm_proj:r.sm_proj,bill_proj:r.bill_proj,sm_acct:r.sm_acct,bill_acct:r.bill_acct})),null,2));
console.log(`\nA=${G('A').length} B=${G('B').length} C=${G('C').length} D=${G('D').length} · skipped ${rows.filter(r=>r.skip).length} · total $${sum(live)}`);
