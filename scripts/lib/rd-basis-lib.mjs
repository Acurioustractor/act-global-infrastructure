// FY26 R&D-basis pure functions — no env, no network.
//
// Founder DRAWINGS are R&D-INELIGIBLE (they sit in equity), yet ~$238K of the FY26 rd_eligible flag
// is founder payments. The defensible basis STRIPS them; the 43.5% offset is computed on the
// defensible basis ONLY, never the gross flag.
//
// isFounder mirrors the classifier in scripts/reconciliation-worklist.mjs — keep the two in sync.
//
// IMPORTANT: defensibleBasis is a CEILING, not a bankable figure. Standard Ledger review of the
// remaining rows AND the "nothing on paper" gap (contemporaneous records 15078–81 absent, checklist
// unchecked, decision log DRAFT) can push it lower — the documented collapse-to-~$55K risk. The
// loader (build-rd-basis.mjs) carries those caveats and the display gate; this fn just does the math.

const FOUNDER_RE = /marchesi|^nicholas|^nic\b/i;

export function isFounder(contactName) {
  return FOUNDER_RE.test(String(contactName || ''));
}

const R_AND_D_OFFSET_RATE = 0.435; // 43.5% refundable R&D Tax Incentive

export function computeRdBasis(rows) {
  let grossFlagged = 0;
  let founderDrawings = 0;
  let founderRows = 0;
  for (const r of rows || []) {
    const amt = Number(r?.amount) || 0;
    grossFlagged += amt;
    if (isFounder(r?.contact_name)) {
      founderDrawings += amt;
      founderRows += 1;
    }
  }
  grossFlagged = Number(grossFlagged.toFixed(2));
  founderDrawings = Number(founderDrawings.toFixed(2));
  const defensibleBasis = Number((grossFlagged - founderDrawings).toFixed(2));
  const founderPct = grossFlagged > 0 ? (founderDrawings / grossFlagged) * 100 : 0;
  const offset435 = Number((defensibleBasis * R_AND_D_OFFSET_RATE).toFixed(2));
  return { grossFlagged, founderDrawings, founderRows, defensibleBasis, founderPct, offset435 };
}
