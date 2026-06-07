# ACT Voice Skill

Draft content in ACT's brand voice. All outputs follow the guidelines in `/config/brand.md`.

## Commands

### /draft linkedin [topic]
Draft a LinkedIn post in ACT's voice.

**Examples:**
- `/draft linkedin JusticeHub's work with young people`
- `/draft linkedin Beautiful Obsolescence philosophy`
- `/draft linkedin partnership with Mingaminga Rangers`

**Output:** 150-300 word post, grounded yet visionary tone.

### /draft x [topic]
Draft an X/Twitter post in ACT's voice.

**Examples:**
- `/draft x Beautiful Obsolescence`
- `/draft x community ownership of stories`
- `/draft x regenerative economics`

**Output:** Under 280 characters, provocative + brief tone.

### /draft email [contact] [purpose]
Draft an email in ACT's voice.

**Examples:**
- `/draft email Sarah warm follow-up about grant meeting`
- `/draft email Mike cold intro about regenerative agriculture`
- `/draft email foundation manager JusticeHub partnership inquiry`

**Output:** Full email with subject line. Warm or cold tone based on context.

### /draft grant [program] [topic]
Draft grant application content.

**Examples:**
- `/draft grant AusIndustry Empathy Ledger tech development`
- `/draft grant Arts Council Black Cockatoo Valley cultural program`

**Output:** Impact-focused content with specific outcomes, humble tone.

### /draft announcement [topic]
Draft an internal or external announcement.

**Examples:**
- `/draft announcement new partnership with QIMR`
- `/draft announcement Harvest gathering next month`

**Output:** Clear, concise announcement with appropriate formality.

---

## Voice Principles

All drafts should:

1. **Use "we" not "I"** when speaking for ACT
2. **Avoid deficit framing** (no "vulnerable populations", "giving back")
3. **Be specific** about outcomes, not vague claims
4. **Match channel tone** (X=brief, LinkedIn=visionary, email=warm)
5. **Include farm metaphors** where natural (seeds, soil, harvest)
6. **Design for obsolescence** - communities lead, we support

---

## Placeholders

Drafts may include `[PLACEHOLDER]` for items needing customization:

- `[SPECIFIC_OUTCOME]` - fill in with real numbers/results
- `[DATE]` - add actual date
- `[CONTACT_NAME]` - personalize with name
- `[RECENT_EVENT]` - reference specific meeting/event

---

## Integration

This skill connects to:
- **Scribe agent** - for content drafts
- **Cultivator agent** - for relationship outreach
- **Herald agent** - for announcements

All agents reference `/config/brand.md` for voice consistency.
