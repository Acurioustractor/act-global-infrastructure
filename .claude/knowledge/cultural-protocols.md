# Cultural Protocols - ACT Ecosystem

## OCAP Principles

All ACT projects follow **OCAP** (Ownership, Control, Access, Possession) principles for Indigenous data sovereignty:

### Ownership
- Communities own their cultural information
- Storytellers own their stories and can withdraw consent
- Organizations own their operational data

### Control
- Communities control how data is collected and used
- Storytellers control visibility of their content
- Elders can approve/reject sensitive content

### Access
- Communities decide who can access their data
- Privacy settings respect individual choices
- Multi-tenant isolation ensures data separation

### Possession
- Data physically resides in controlled infrastructure
- No third-party data sharing without explicit consent
- Export capabilities for data portability

## Cultural Review Requirements

### When Required
- Any feature displaying storyteller names or photos
- Content that references cultural practices
- Features involving community relationships
- Analytics or aggregations of community data

### Review Process
1. Develop feature with placeholder/anonymized data
2. Flag for cultural review in PR
3. Elder or cultural advisor reviews
4. Approval before deployment

### Red Flags (Never Do)
- Display sacred or ceremonial content publicly
- Aggregate data that could identify individuals
- Share data across organizations without consent
- Use AI to generate "cultural" content

## Privacy Defaults

### Storyteller Privacy
- Default: Private (opt-in to public)
- Granular controls for each content type
- Right to be forgotten (full deletion)

### Organization Privacy
- Tenant isolation at database level
- No cross-tenant data visibility
- Admin audit logs for access

## Language Considerations

- Avoid deficit framing ("helping" Indigenous communities)
- Use strength-based language
- Respect for traditional knowledge
- Acknowledge country/land where appropriate
