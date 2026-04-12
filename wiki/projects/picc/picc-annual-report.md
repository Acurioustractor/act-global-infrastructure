---
title: PICC Annual Report
status: Active
code: picc-annual-report
---

# PICC Annual Report

> Community-controlled organisations are required to account to government funders. PICC turned this obligation into something else: a declaration that community keeps its own records, on its own terms.

**Status:** Active | **Code:** `picc-annual-report` | **Tier:** Studio
**Parent project:** [[picc|PICC (Palm Island Community Company)]]

## What It Is

The PICC Annual Report project is ACT's collaboration with [[picc|Palm Island Community Company]] to build an AI-powered annual reporting system from community-owned data. Rather than hiring external consultants to write reports for government funders, PICC compiles its own impact narrative — from the data it generates, in the language it uses, reflecting the priorities it sets.

The technical foundation follows the [[../concepts/llm-knowledge-base|Karpathy LLM Knowledge Base pattern]]: PICC's 20 years of operational history, service records, and community stories are being compiled into a structured wiki. The annual report is generated from this wiki — not from a template provided by a funder.

## Why It Matters

Most ACCO annual reports are written *for* funders, not *by* communities. The structure, language, and metrics are shaped by funding requirements: outputs, headcounts, cost-per-unit figures. Community priorities — the grandmother whose grandchildren now know her, the young man who didn't go to court, the family that stayed together — get flattened or discarded.

PICC's annual reporting practice inverts this. The community owns the data. The community sets the indicators. The AI system synthesizes from what PICC actually tracks — **2,491 photos documented, 74+ community stories captured, 60+ Storm Stories from the February 2025 flood response** — not from what external reporting templates can accommodate.

This is [[../concepts/ocap-principles|OCAP]] applied to accountability: community control over the data used to assess community performance.

## Technical Approach

The Annual Report system builds on PICC's broader digital infrastructure:

- **Source data:** PICC's operational database, story archive, workforce records, service delivery data
- **AI synthesis:** LLM compiles draft annual report sections from structured wiki and story archive
- **Human review:** PICC staff and Elders review and adjust the AI draft — the AI does the paperwork, not the decision-making
- **Output:** Annual report that meets funder requirements while reflecting community priorities

The 20th anniversary of PICC in 2027 is the target milestone for having this system fully operational — generating anniversary materials, funding submissions, and advocacy backed by two decades of community-owned intelligence.

## The Accountability Argument

PICC CEO [[rachel-atkinson|Rachel Atkinson]] (also Chairperson of QATSICPP) operates in a funding environment of overlapping funder requirements, 12-month contracts for long-term services, and reporting burden that consumes staff time that could go to service delivery.

The Annual Report project is partly a direct response to this burden: if the reporting system is intelligent enough to compile draft reports from existing data, the burden shifts from data entry and writing to review and approval. Community staff become editors of their own story, not transcribers of other people's templates.

## Backlinks

- [[picc|PICC]] — parent organisation
- [[rachel-atkinson|Rachel Atkinson]] — leadership context for the reporting burden
- [[../communities/palm-island|Palm Island (Bwgcolman)]] — community context
- [[../concepts/ocap-principles|OCAP Principles]] — data sovereignty framework
- [[../concepts/llm-knowledge-base|LLM Knowledge Base]] — the architecture pattern
- [[../technical/local-ai-architecture|Local AI Architecture]] — the sovereign AI build
