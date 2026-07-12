export const meta = {
  name: 'sl-cleanup-classify',
  description: 'Classify + adversarially verify ACT Standard-Ledger clean-up lines (nature, project, account, GST, receipt) and draft each "Your Comments" answer',
  phases: [
    { title: 'Classify', detail: 'batched agents classify each line with ACT domain context' },
    { title: 'Verify', detail: 'adversarial skeptics refute income / drawings / high-$ / receipt-mismatch calls' },
    { title: 'Synthesize', detail: 'merge, apply corrections, tie totals' },
  ],
}

const A = typeof args === 'string' ? JSON.parse(args) : args   // harness may pass args as a JSON string
const { domain, digestPath, idx } = A   // idx: [{i, amt, dir}]
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o }
const ranges = chunk(idx.map(x => x.i), 9)

const VERDICT_SCHEMA = {
  type: 'object', required: ['verdicts'],
  properties: { verdicts: { type: 'array', items: {
    type: 'object',
    required: ['i', 'nature', 'project_code', 'suggested_account', 'gst_treatment', 'receipt_status', 'your_comment', 'confidence', 'needs_ben', 'drawings_flag'],
    properties: {
      i: { type: 'integer' },
      nature: { type: 'string' },
      project_code: { type: 'string' },
      suggested_account: { type: 'string' },
      gst_treatment: { type: 'string', enum: ['GST on Expenses', 'GST Free Expenses', 'GST on Income', 'GST Free Income', 'BAS Excluded', 'No GST (transfer/drawings)', 'N/A'] },
      receipt_status: { type: 'string', enum: ['ON_FILE_CONFIRMED', 'RECEIPT_VENDOR_MISMATCH', 'GMAIL_CANDIDATE', 'NO_RECEIPT_EXPECTED', 'GAP_PLEASE_PROVIDE'] },
      your_comment: { type: 'string' },
      drawings_flag: { type: 'boolean' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      needs_ben: { type: 'boolean' },
    },
  } } },
}

phase('Classify')
const classified = await parallel(ranges.map((r, bi) => () =>
  agent(
    `You are an Australian bookkeeping classifier for A Curious Tractor (ACT). Read the file ${digestPath} (a JSON array of transaction lines, each with field "i"). Classify ONLY the lines whose "i" is in [${r.join(', ')}] and draft each "Your Comments" answer to the Standard Ledger (SL) question.\n\n` +
    `=== ACT DOMAIN CONTEXT ===\n${domain}\n\n` +
    `For EACH assigned line return a verdict. Rules:\n` +
    `- Use the grounded proj/acct_code/tax as a strong prior when present.\n` +
    `- your_comment must directly answer SL's question (nature + project + account + GST; or the office-vs-drawings / travel-vs-drawings / revenue-vs-grants decision). Write it as Ben would reply to his bookkeeper: concise, factual, no fluff, first person.\n` +
    `- RECEIPT TRAP: if has_receipt is true but the matched receipt vendor/subject does NOT share a word with the particulars, set receipt_status=RECEIPT_VENDOR_MISMATCH and do NOT claim a receipt exists.\n` +
    `- Bank P2P transfers (to a person; "Transfer Debit"/"Money Transfer") usually have NO tax invoice → NO_RECEIPT_EXPECTED; your_comment states the nature.\n` +
    `- gmail candidates (if present) are UNVERIFIED leads — if one clearly matches, set GMAIL_CANDIDATE and name it so Ben can forward it.\n` +
    `- needs_ben=true for anything requiring Ben's judgement (personal-vs-business, unknown-nature transfer, super contribution, which project a large payment belongs to).\n` +
    `You MAY query past coding for a vendor if useful, but the grounded data is usually enough. Return ONLY the schema object with verdicts for your assigned indices.`,
    { label: `classify:${r[0]}-${r[r.length - 1]}`, phase: 'Classify', schema: VERDICT_SCHEMA, effort: 'high' }
  ).then(x => x?.verdicts || [])
))
const allV = classified.flat().filter(Boolean)
const byI = new Map(allV.map(v => [v.i, v]))
log(`Classified ${byI.size}/${idx.length} lines`)

phase('Verify')
const amtOf = Object.fromEntries(idx.map(x => [x.i, x.amt]))
const dirOf = Object.fromEntries(idx.map(x => [x.i, x.dir]))
const toVerify = idx.filter(x => {
  const v = byI.get(x.i)
  return x.dir === 'received' || x.amt >= 1000 || v?.drawings_flag || v?.receipt_status === 'RECEIPT_VENDOR_MISMATCH'
}).map(x => x.i)
const VERIFY_SCHEMA = {
  type: 'object', required: ['i', 'agree', 'gst_ok', 'account_ok', 'note'],
  properties: {
    i: { type: 'integer' }, agree: { type: 'boolean' }, gst_ok: { type: 'boolean' }, account_ok: { type: 'boolean' },
    correction: { type: 'string' }, note: { type: 'string' },
  },
}
const verifications = await parallel(toVerify.map(i => () => {
  const v = byI.get(i)
  return agent(
    `You are a SKEPTICAL Australian tax/bookkeeping reviewer. Read line i=${i} from ${digestPath}. Try to REFUTE the proposed classification below. Default agree=false if anything is off (wrong GST, wrong account, a P2P transfer mislabelled as having a receipt, grant-vs-revenue error, personal item booked as business, owner capital booked as income).\n\n` +
    `=== ACT DOMAIN CONTEXT ===\n${domain}\n\n` +
    `=== PROPOSED CLASSIFICATION (line ${i}) ===\n${JSON.stringify(v, null, 1)}\n\n` +
    `If wrong, give a corrected your_comment. Return ONLY the schema object.`,
    { label: `verify:i${i}`, phase: 'Verify', schema: VERIFY_SCHEMA, effort: 'high' }
  )
}))
const verByI = new Map(verifications.filter(Boolean).map(x => [x.i, x]))
const disagree = [...verByI.values()].filter(x => !x.agree)
log(`Verified ${verByI.size} lines · ${disagree.length} corrected`)

phase('Synthesize')
const merged = idx.map(x => {
  const v = byI.get(x.i) || { i: x.i, your_comment: '(unclassified — please review)', confidence: 'low', needs_ben: true, receipt_status: 'GAP_PLEASE_PROVIDE', nature: '', project_code: 'n/a', suggested_account: '', gst_treatment: 'N/A', drawings_flag: false }
  const ver = verByI.get(x.i)
  if (ver && !ver.agree && ver.correction) return { ...v, your_comment: ver.correction, verify_note: ver.note, verified: false, needs_ben: true }
  return { ...v, verify_note: ver?.note || null, verified: ver ? ver.agree : null }
})
const spent = idx.filter(x => x.dir === 'spent').reduce((s, x) => s + x.amt, 0)
const received = idx.filter(x => x.dir === 'received').reduce((s, x) => s + x.amt, 0)
return {
  count: merged.length,
  totals: { spent: +spent.toFixed(2), received: +received.toFixed(2) },
  needs_ben_count: merged.filter(m => m.needs_ben).length,
  verdicts: merged,
}
