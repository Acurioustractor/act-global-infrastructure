# Research Report: codeguide.dev
Generated: 2026-01-24

## Summary
codeguide.dev is an **AI-powered documentation platform** that helps developers create project documentation for use with AI coding tools like Claude, Cursor, and others. It generates PRDs (Product Requirements Documents), tech specs, prompts, and project plans from plain English descriptions. The service is hosted on Vercel and uses Supabase for content storage.

## Questions Answered

### Q1: What is codeguide.dev?
**Answer:** CodeGuide is an AI documentation companion tool that helps developers write project documentation specifically designed for AI coding assistants. It transforms ideas into comprehensive documentation kits that AI tools can reference when generating code.

**Source:** [codeguide.dev website](https://codeguide.dev)
**Confidence:** High

### Q2: What service does it provide?
**Answer:** CodeGuide provides the following services:
- **Project Planning:** Turn ideas into production-ready project plans
- **Documentation Generation:** Creates PRDs, technical specifications, wireframes, and prompts
- **Codebase Analysis:** Analyzes existing GitHub projects and generates documentation
- **AI Tool Integration:** Generates optimized prompts for AI coding tools (Claude, Cursor, etc.)
- **Starter Kits:** Pre-built templates for common project types (Fullstack, Lite versions)

**Source:** [codeguide.dev website](https://codeguide.dev)
**Confidence:** High

### Q3: Is it related to ACT tools or Claude Code?
**Answer:** **No.** CodeGuide is NOT related to:
- Claude Code (Anthropic's CLI tool)
- ACT global infrastructure
- Your existing ACT dashboard or tools

CodeGuide is a standalone third-party SaaS product that helps optimize how you use AI coding tools. It may be useful *with* Claude Code or Cursor, but it is not an official Anthropic product nor part of your ACT ecosystem.

**Source:** DNS records show Vercel hosting, Supabase storage - both third-party services
**Confidence:** High

### Q4: How to cancel/manage the subscription?
**Answer:** To manage or cancel your CodeGuide subscription:

1. **Visit:** [https://codeguide.dev](https://codeguide.dev) or [https://codeguide.io](https://codeguide.io) (note: OG meta tags reference .io)
2. **Login:** Look for a login/signup option on the site
3. **Billing:** Most Vercel-hosted SaaS products use Stripe for billing - check your email for:
   - Subscription confirmation emails from CodeGuide
   - Stripe receipts/invoices
   - Credit card statements showing "codeguide.dev" or "codeguide.io"
4. **Cancel:** Access account settings on the website or contact support via the website

**Source:** DNS records show Vercel infrastructure (nameservers and A records)
**Confidence:** Medium - actual cancellation steps may vary

## Technical Details

### Hosting Infrastructure
| Component | Value |
|-----------|-------|
| Hosting Platform | Vercel |
| DNS CNAME | 1f838b123a7cc3e5.vercel-dns-016.com |
| IP Addresses | 216.150.1.1, 216.150.1.193, 216.150.16.193 |
| Database | Supabase (oysobuovfjbhatncldwh.supabase.co) |
| Email | smtp.google.com (Google Workspace) |
| Registrar | registrar-servers.com |

### Domain Information
- **Domain:** codeguide.dev
- **SOA:** dns1.registrar-servers.com
- **Nameservers:** dns1.registrar-servers.com, dns2.registrar-servers.com

## Recommendations

### For This Codebase
1. **Not ACT-related:** CodeGuide is a standalone third-party tool, not part of your infrastructure
2. **Potential Integration:** If you want to use it, you could integrate its output documentation into your workflow, but it requires manual copy-paste
3. **Budget Consideration:** If you don't use it, cancel the subscription to save costs

### How to Identify the Charge
- **Statement descriptor:** Likely appears as "CODESGUIDE.DEV" or similar
- **Amount:** Check your credit card statement for recurring charges from this merchant
- **Email:** Search for emails from "codeguide.dev" or "noreply@codeguide.dev"

## Sources
1. [codeguide.dev](https://codeguide.dev) - Official website
2. [WHOIS Lookup - Who.is](https://who.is/whois/codeguide.dev) - Domain registration info
3. [DNS Records - Who.is](https://who.is/dns/codeguide.dev) - DNS configuration

## Open Questions
- Exact pricing tiers (not visible in scraped content)
- Whether there's a CLI tool or API for integration
- Specific refund/cancellation policy details
