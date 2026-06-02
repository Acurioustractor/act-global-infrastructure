#!/usr/bin/env node
// READ-ONLY: for each live-ambiguous pair, compare spend-money vs bill coding
// (account + project) + reference type, split into AGREE (safe uniform resolve)
// vs DIVERGE (needs Ben's project call). The bill is consistently an
// "auto-pushed dext_import" phantom payable; the spend-money has the real vendor ref.
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';
import { readFileSync, writeFileSync } from 'fs';
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
const xero=await createXeroClient(sb);
const plan=JSON.parse(readFileSync('thoughts/shared/recon-pack/ambiguous-plan.json','utf8'));
const code=x=>{const l=x?.LineItems?.[0]; return {acct:l?.AccountCode||'?', proj:(l?.Tracking||[]).map(t=>t.Option).join('/')||'-'};};
const rows=[]; let n=0;
for(const p of plan){
  try{
    const t=(await xero.get(`BankTransactions/${p.txnId}`)).BankTransactions?.[0];
    const b=(await xero.get(`Invoices/${p.billId}`)).Invoices?.[0];
    if(t?.Status==='DELETED'||t?.IsReconciled===true||b?.Status!=='AUTHORISED') { rows.push({...p, skip:`sm=${t?.Status}/${t?.IsReconciled} bill=${b?.Status}`}); continue; }
    const sc=code(t), bc=code(b);
    rows.push({...p, sm_ref:t?.Reference||'', bill_dext:/dext_import/i.test(b?.Reference||''),
      sm_acct:sc.acct, sm_proj:sc.proj, bill_acct:bc.acct, bill_proj:bc.proj,
      diverge: sc.acct!==bc.acct || sc.proj!==bc.proj });
  }catch(e){rows.push({...p, skip:'err '+(e.message||'').slice(0,40)});}
  if(++n%15===0) console.log(`  …${n}/${plan.length}`);
}
const live=rows.filter(r=>!r.skip);
const agree=live.filter(r=>!r.diverge), diverge=live.filter(r=>r.diverge);
const sum=a=>a.reduce((s,r)=>s+r.amount,0).toFixed(2);
const md=['# Ambiguous coding divergence — void-bill+keep-spend resolution', '',
  `Bills are auto-pushed dext_import phantom payables; spend-money has the real vendor ref → keep spend-money, void bill.`,
  `**AGREE (coding matches — safe to resolve uniformly): ${agree.length} ($${sum(agree)})**`,
  `**DIVERGE (spend-money vs bill code to different account/project — YOUR call): ${diverge.length} ($${sum(diverge)})**`,'',
  '## DIVERGE — needs your project decision','','| $ | vendor | keep spend-money → | vs bill → |','|--:|---|---|---|'];
for(const r of diverge.sort((a,b)=>b.amount-a.amount)) md.push(`| ${r.amount} | ${r.vendor} | ${r.sm_acct} · ${r.sm_proj} | ${r.bill_acct} · ${r.bill_proj} |`);
md.push('','## AGREE — uniform void-bill+keep-spend','','| $ | vendor | coding |','|--:|---|---|');
for(const r of agree.sort((a,b)=>b.amount-a.amount)) md.push(`| ${r.amount} | ${r.vendor} | ${r.sm_acct} · ${r.sm_proj} |`);
if(rows.some(r=>r.skip)){md.push('','## changed/skipped',''); for(const r of rows.filter(r=>r.skip)) md.push(`- ${r.amount} ${r.vendor} — ${r.skip}`);}
writeFileSync('thoughts/shared/recon-pack/ambiguous-divergence.md', md.join('\n'));
writeFileSync('thoughts/shared/recon-pack/ambiguous-agree.json', JSON.stringify(agree.map(r=>({txnId:r.txnId,billId:r.billId,amount:r.amount,vendor:r.vendor,acct:r.sm_acct,proj:r.sm_proj})),null,2));
console.log(`\nAGREE ${agree.length} ($${sum(agree)}) · DIVERGE ${diverge.length} ($${sum(diverge)}) · skipped ${rows.filter(r=>r.skip).length}`);
console.log('Bills auto-pushed-dext: '+live.filter(r=>r.bill_dext).length+'/'+live.length);
