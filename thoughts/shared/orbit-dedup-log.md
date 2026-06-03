
## Dedup community — 2026-06-03T10:42:44.121Z
- kristy.bloomfield@oonchiumpa.com.au: primary 0kEs9BJmkmi7ZUc5haEX (hist 1/3/0); unioned [goods-inquiry goods-partner source:inquiry]
  - DELETE c8w8llvao4ZDlu2y4dWu (empty) · recover-tags=[act-gd act-jh audience-partner audience-storyteller comms:goods-newsletter goods-inquiry goods-newsletter justicehub lane:community partner project:act-gd project:act-jh role:partner role:storyteller source:inquiry]
  - AFTER: 4 remain
- rachel atkinson: primary yZcX8GoQEqBYqcb5Uyjm (hist 1/8/0); unioned []
  - DELETE HNtvDrZWSxOewMPBL4hP (empty) · recover-tags=[act-gd audience-storyteller auto-created-from-xero comms:goods-newsletter goods goods-community goods-inquiry goods-newsletter lane:community project:act-gd role:community role:storyteller source:inquiry]
  - AFTER: 4 remain
- tanya.turner@oonchiumpa.com.au: primary lQ4ROlknfvUmlVbCJhVu (hist 1/0/0); unioned [goods-inquiry source:inquiry]
  - DELETE QhgHfrfKGaiw4NCYxl33 (empty) · recover-tags=[act-gd act-jh audience-partner audience-storyteller goods-inquiry goods-key-partner justicehub lane:community partner priority:high project:act-gd project:act-jh role:partner role:storyteller source:inquiry]
  - DELETE Rf8SfF8p8rt8hcHXW7wK (empty) · recover-tags=[act-gd act-jh audience-partner audience-storyteller goods-inquiry goods-key-partner justicehub lane:community partner priority:high project:act-gd project:act-jh role:partner role:storyteller source:inquiry]
  - DELETE zVGFRdoicSCztW62LgRq (empty) · recover-tags=[act-gd act-jh audience-partner audience-storyteller goods-inquiry goods-key-partner justicehub lane:community partner priority:high project:act-gd project:act-jh role:partner role:storyteller source:inquiry]
  - AFTER: 4 remain

## Verified-after (search-index lag corrected)
The "AFTER: N remain" lines above were read before GHL reindexed (search lag). Confirmed by direct GET (404 on all 5 deleted IDs) + a later search:
- Tanya: 1 record (was 4; 3 empties deleted) ✓ fully deduped
- Kristy: 3 records (was 4; 1 empty deleted; 3 carry opportunities → UI-merge to consolidate)
- Rachel: 3 records (was 4; 1 empty deleted; 3 carry opportunities incl. one with 8 opps → UI-merge)
deleteContact IS permitted for this private token (merge is not). The history-bearing records were correctly KEPT, not deleted.
