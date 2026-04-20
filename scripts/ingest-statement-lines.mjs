#!/usr/bin/env node
/**
 * Ingest bank statement lines from Xero UI export into Supabase.
 * These are the RAW bank feed lines that the Xero API cannot expose.
 *
 * Usage:
 *   node scripts/ingest-statement-lines.mjs
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// All statement lines from Xero UI — Nov 20 to Dec 31, 2025
// Parsed from Ben's two pastes on 2026-04-13
const LINES = [
  // === PASTE 2: Nov 20 - Dec 9 (reverse chron, I'll enter chronologically) ===
  // Nov 20
  { date: '2025-11-20', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 508.18, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-20', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (SC)', amount: 0.52, direction: 'debit', status: 'reconciled' },
  // Nov 21
  { date: '2025-11-21', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 4.85, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'Qantas', particulars: 'QANTAS AIR 081HQBWFHKJTQMASCOT', amount: 289.80, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'Indigo', particulars: 'INDIGO BADUNG KAB.', amount: 199.17, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 0.05, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 0.05, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'Qantas', particulars: 'QANTAS AIR 081HQBJ2WXCZ3MASCOT', amount: 122.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'Intex Stand Canggu', particulars: 'INTEX STAND CANGGU BALI BADUNG', amount: 69.32, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'GoPayID', particulars: 'GoPayID DKI Jakarta', amount: 1.29, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-21', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 196.27, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 2.43, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.93, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 458.28, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 281.70, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 281.70, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'Admission Badung', particulars: 'ADMISSION BADUNG - BALI', amount: 138.56, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-21', payee: 'Urban Bites', particulars: 'URBAN BITES Badung (Kab)', amount: 55.22, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'Qantas', particulars: 'QANTAS AIR 081HQBG9MAPERMASCOT', amount: 122.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 0.05, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 6.97, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'Qantas', particulars: 'QANTAS AIR 081HQBQ4Y39HWMASCOT', amount: 532.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'Internet Payment', particulars: 'INTERNET PAYMENT Linked Acc Trns', amount: 6159.00, direction: 'credit', status: 'unreconciled' },
  { date: '2025-11-21', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 819.57, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 621.65, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 443.30, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-21', payee: 'GoPayID', particulars: 'GoPayID DKI Jakarta', amount: 1.48, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-21', payee: 'GoPayID', particulars: 'GoPayID DKI Jakarta', amount: 1.48, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-21', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 443.30, direction: 'debit', status: 'reconciled' },
  // Nov 24
  { date: '2025-11-24', payee: 'GoPayID', particulars: 'GoPayID DKI Jakarta', amount: 1.57, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 15.67, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 0.05, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'Squarespace', particulars: 'SQSP* DOMAIN#210630189 SQUARESPACE.CNY', amount: 72.90, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-24', payee: 'Uber', particulars: 'UBER *BUSINESS HELP.UBER.Sydney', amount: 63.05, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'Qantas', particulars: 'QANTAS AIR 081HQARQ2CGPAMASCOT', amount: 144.06, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'Carriageworks', particulars: 'Carriageworks Sydney', amount: 224.98, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'GoPayID', particulars: 'GoPayID DKI Jakarta', amount: 1.39, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-24', payee: 'GoPayID', particulars: 'GoPayID DKI Jakarta', amount: 1.39, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-24', payee: 'Internet Payment', particulars: 'INTERNET PAYMENT Linked Acc Trns', amount: 30000.00, direction: 'credit', status: 'unreconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 3.41, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 5.82, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 0.04, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 0.04, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 0.05, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 0.05, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'Gojek', particulars: 'GOJEK RECURRING NON3DS JAKARTA SELAT', amount: 1.21, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-24', payee: 'Webflow', particulars: 'WEBFLOW.COM WEBFLOW.COM CA', amount: 45.18, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'Hatch Electrical', particulars: 'HATCH ELECTRICAL ZILLMERE', amount: 27201.35, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-24', payee: 'Descript', particulars: 'DESCRIPT DESCRIPT.COM CA', amount: 447.62, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-24', payee: 'Arthefact', particulars: 'ARTHEFACT 1 BANDUNG KOT.', amount: 348.93, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'GoPayID', particulars: 'GoPayID DKI Jakarta', amount: 1.39, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-24', payee: 'Dar Teta', particulars: 'DAR TETA Colac', amount: 41.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.74, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 6.20, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 12.21, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 0.05, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 0.05, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 0.05, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 0.06, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'The Conscious Society', particulars: 'THE CONSCIOUS SOCIETY HO BADUNG', amount: 177.12, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'La Porchetta', particulars: 'WWW.LAPORCHETTA.COM TRUGANINA', amount: 135.17, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'Emme Mac Black', particulars: 'SQ *EMME MAC BLACK Chiltern', amount: 112.09, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-24', payee: 'Webflow', particulars: 'WEBFLOW.COM WEBFLOW.COM CA', amount: 42.20, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (SC)', amount: 0.41, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.48, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.58, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'Squarespace', particulars: 'SQSP* WORKSP#210305590 SQUARESPACE.CNY', amount: 11.80, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-24', payee: 'GoHighLevel', particulars: 'HIGHLEVEL * TRIAL OVER GOHIGHLEVEL.CTX', amount: 166.23, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'Little Rosebery Cafe', particulars: 'LS Little Rosebery Caf Altona Meadow', amount: 11.15, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'Webflow', particulars: 'WEBFLOW.COM WEBFLOW.COM CA', amount: 49.70, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'Railway', particulars: 'RAILWAY RAILWAY.COM CA', amount: 1.60, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'Dext', particulars: 'RB AU T/A DEXT SYDNEY', amount: 42.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'GoPayID', particulars: 'GoPayID DKI Jakarta', amount: 1.20, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-24', payee: 'GoPayID', particulars: 'GoPayID DKI Jakarta', amount: 1.39, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-24', payee: 'GoPayID', particulars: 'GoPayID DKI Jakarta', amount: 1.44, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-24', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (SC)', amount: 2.55, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-24', payee: 'Supabase', particulars: 'SUPABASE SINGAPORE', amount: 97.44, direction: 'debit', status: 'reconciled' },
  // Nov 25
  { date: '2025-11-25', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 1636.08, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-25', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 593.20, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-25', payee: 'BP', particulars: 'BP EXP THE TULLA 1684 MELBOURNE AIR', amount: 50.92, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-25', payee: 'La Porchetta', particulars: 'LA PORCHETTA COLAC COLAC', amount: 15.65, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-25', payee: 'Uber', particulars: 'UBER *BUSINESS HELP.UBER.Sydney', amount: 41.63, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-25', payee: 'Uber', particulars: 'UBER *BUSINESS HELP.UBER.Sydney', amount: 19.33, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-25', payee: 'IGA Colac East', particulars: 'IGA COLAC EAST COLAC EAST', amount: 17.49, direction: 'debit', status: 'reconciled' },
  // Nov 26
  { date: '2025-11-26', payee: 'Mighty Networks', particulars: 'MIGHTY NETWORKS MIGHTYNETWORKCA', amount: 76.34, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-26', payee: 'Internet Payment', particulars: 'INTERNET PAYMENT Linked Acc Trns', amount: 1974.50, direction: 'credit', status: 'unreconciled' },
  { date: '2025-11-26', payee: 'Audible', particulars: 'Audible Limited AU MELBOURNE', amount: 16.45, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-26', payee: 'Internet Payment', particulars: 'INTERNET PAYMENT Linked Acc Trns', amount: 5163.46, direction: 'credit', status: 'unreconciled' },
  { date: '2025-11-26', payee: 'Budget Rent A Car', particulars: 'BUDGET RENT A CAR MASCOT', amount: 148.03, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-26', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 17.03, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-26', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 2.67, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-26', payee: 'Delaware North', particulars: 'DELAWARE NORTH RETAI MELBOURNE AIR', amount: 25.50, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-26', payee: 'United Carrara', particulars: 'UNITED CARRARA CARRARA', amount: 21.00, direction: 'debit', status: 'unreconciled' },
  // Nov 27
  { date: '2025-11-27', payee: 'Internet Transfer', particulars: 'INTERNET TRANSFER Linked Acc Trns', amount: 1166.00, direction: 'debit', status: 'unreconciled', analysis_code: 'Credit Card Cash Advance' },
  { date: '2025-11-27', payee: 'GoGet', particulars: 'GOGET SYDNEY', amount: 114.35, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-27', payee: 'RNM Carpentry', particulars: 'RNM CARPENTRY BALD HILLS', amount: 6865.65, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-27', payee: 'Allclass', particulars: 'ALLCLASS YANDINA', amount: 3536.35, direction: 'debit', status: 'unreconciled' },
  { date: '2025-11-27', payee: 'Internet Payment', particulars: 'INTERNET PAYMENT Linked Acc Trns', amount: 20000.00, direction: 'credit', status: 'unreconciled' },
  // Nov 28
  { date: '2025-11-28', payee: 'Webflow', particulars: 'WEBFLOW.COM WEBFLOW.COM CA', amount: 40.85, direction: 'debit', status: 'reconciled' },
  { date: '2025-11-28', payee: 'Airbnb', particulars: 'AIRBNB * HMNFDHSXP9 SURRY HILLS', amount: 2324.80, direction: 'credit', status: 'unreconciled' },
  { date: '2025-11-28', payee: 'Airbnb', particulars: 'AIRBNB * HMNFDHSXP9 SURRY HILLS', amount: 151.11, direction: 'credit', status: 'unreconciled' },
  { date: '2025-11-28', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.43, direction: 'debit', status: 'reconciled' },
  // Dec 1
  { date: '2025-12-01', payee: 'Uber', particulars: 'UBER *BUSINESS HELP.UBER.Sydney', amount: 24.54, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'Uber', particulars: 'UBER *BUSINESS HELP.UBER.Sydney', amount: 42.66, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 45.07, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'Dialpad', particulars: 'DIALPAD INC 4158429989 CA', amount: 56.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'Apple', particulars: 'APPLE.COM/BILL SYDNEY', amount: 29.99, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'Garmin', particulars: 'Garmin Eastern Creek', amount: 25.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-01', payee: 'Figma', particulars: 'FIGMA FIGMA.COM CA', amount: 33.75, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'Kennards Hire', particulars: 'KENNARDS HIRE HO QLD SEVEN HILLS', amount: 3745.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-01', payee: 'OpenAI', particulars: 'OPENAI *CHATGPT SUBSCR OPENAI.COM CA', amount: 33.75, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-01', payee: 'Woolworths', particulars: 'WOOLWORTHS/W/FRONT PDE & IDALIA', amount: 425.57, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-01', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 32.84, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 47.51, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'Linkt Avis Budget', particulars: 'Linkt Avis Budget Grou Sydney', amount: 9.84, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-01', payee: 'Sydney Tools', particulars: 'SYDNEY TOOLS PTY LTD Garbutt', amount: 2342.90, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'Bargain Car Rentals', particulars: 'BARGAINCARRENTALS HOBART', amount: 809.29, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-01', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 56.98, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 8.28, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'JB Hi-Fi', particulars: 'JB HI FI KEDRON HOME KEDRON', amount: 1491.90, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-01', payee: 'Little Pegs', particulars: 'SQ *LITTLE PEGS Hermit Park', amount: 60.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-01', payee: 'Polola', particulars: 'POLOLA TOWNSVILLE TOWNSVILLE', amount: 549.05, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-01', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.18, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.18, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (SC)', amount: 1.96, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'Internet Payment', particulars: 'INTERNET PAYMENT Linked Acc Trns', amount: 30000.00, direction: 'credit', status: 'unreconciled' },
  { date: '2025-12-01', payee: 'Bargain Car Rentals', particulars: 'BARGAINCARRENTALS HOBART', amount: 998.94, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-01', payee: 'Uber', particulars: 'UberDirectAU_PASS SYDNEY', amount: 81.60, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'Bloom Espresso', particulars: 'SQ *BLOOM ESPRESSO Pimlico', amount: 9.65, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-01', payee: 'P & J Mabasa', particulars: 'P & J MABASA PL ALICE SPRINGS', amount: 674.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-01', payee: 'Airbnb', particulars: 'AIRBNB * HMFNBDYS2D SURRY HILLS', amount: 4621.18, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-01', payee: 'Defy Design', particulars: 'DEFYDESIGN.ORG SYDNEY', amount: 1894.10, direction: 'debit', status: 'unreconciled' },
  // Dec 2
  { date: '2025-12-02', payee: 'DocPlay', particulars: 'DOCPLAY*PREMIUM docplay.com', amount: 9.99, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-02', payee: 'Good Morning Coffee', particulars: 'Good Morning Coffee Tr Townsville', amount: 55.96, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-02', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 975.23, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-02', payee: 'TSV Magg', particulars: 'ZLR*TSVMAGG Garbutt', amount: 19.27, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-02', payee: 'Shorehouse', particulars: 'SHOREHOUSE NORTH WARD', amount: 486.19, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-02', payee: 'Linktree', particulars: 'LINKTREE COLLINGWOOD', amount: 16.23, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-02', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 26.08, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-02', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 24.11, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-02', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 27.27, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-02', payee: 'Sunset Snack Foods', particulars: 'SUNSET SNACK FOODS PTY LTPALM ISLAND', amount: 89.30, direction: 'debit', status: 'reconciled' },
  // Dec 3
  { date: '2025-12-03', payee: 'Uber', particulars: 'UBER *EATS HELP.UBER.COM Sydney', amount: 55.61, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-03', payee: 'Dominos', particulars: 'Dominos Estore Kirwan dominos.com.a', amount: 330.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-03', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (SC)', amount: 0.53, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-03', payee: 'EG Group', particulars: 'EG GROUP/CNR LAKESIDE DR CLUDEN', amount: 101.45, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-03', payee: 'Officeworks', particulars: 'OFFICEWORKS 0407 HERMIT PARK', amount: 536.97, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-03', payee: 'Bunnings', particulars: 'BUNNINGS 399000 BURDELL', amount: 632.52, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-03', payee: 'Starlink', particulars: 'STARLINK INTERNET Sydney', amount: 108.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-03', payee: 'X Corp', particulars: 'X CORP. PAID FEATURES ABOUT.X.COM TX', amount: 15.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-03', payee: 'Bunnings', particulars: 'BUNNINGS 759000 TOWNSVILLE', amount: 1204.31, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-03', payee: 'Bunnings', particulars: 'BUNNINGS 416000 GARBUTT', amount: 398.43, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-03', payee: 'Good Morning Coffee', particulars: 'Good Morning Coffee Tr Townsville', amount: 138.20, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-03', payee: 'Google', particulars: 'Google GSUITE_theharvestwSydney', amount: 67.98, direction: 'debit', status: 'reconciled' },
  // Dec 4
  { date: '2025-12-04', payee: 'Bunnings', particulars: 'BUNNINGS 416000 GARBUTT', amount: 131.58, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-04', payee: 'Townsville City Council', particulars: 'TOWNSVILLE CITY COUNCI STUART', amount: 44.90, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-04', payee: 'Edmonds Landscaping', particulars: 'EDMONDS LANDSCAPING BOHLE PLAINS', amount: 240.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-04', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 0.64, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-04', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 5.36, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-04', payee: 'Belong', particulars: 'BELONG MELBOURNE', amount: 35.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-04', payee: 'Liberty', particulars: 'LIBERTY IDALIA IDALIA', amount: 61.42, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-04', payee: 'DTF Direct', particulars: 'SP DTF DIRECT NEWSTEAD', amount: 288.49, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-04', payee: 'UWEI', particulars: 'UWEI PTY LTD THURINGOWA', amount: 142.80, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-04', payee: 'Edmonds Landscaping', particulars: 'EDMONDS LANDSCAPING BOHLE PLAINS', amount: 264.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-04', payee: 'Edmonds Landscaping', particulars: 'EDMONDS LANDSCAPING BOHLE PLAINS', amount: 240.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-04', payee: 'Claude.AI', particulars: 'CLAUDE.AI SUBSCRIPTION ANTHROPIC.COMCA', amount: 153.05, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-04', payee: 'Coles', particulars: 'COLES 4527 KIRWAN', amount: 88.64, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-04', payee: 'Edmonds Landscaping', particulars: 'EDMONDS LANDSCAPING BOHLE PLAINS', amount: 120.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-04', payee: 'Bunnings', particulars: 'BUNNINGS 416000 GARBUTT', amount: 2885.90, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-04', payee: 'Edmonds Landscaping', particulars: 'EDMONDS LANDSCAPING BOHLE PLAINS', amount: 48.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-04', payee: 'Napkin AI', particulars: 'NAPKIN AI NAPKIN.AI CA', amount: 18.37, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-04', payee: 'Good Morning Coffee', particulars: 'Good Morning Coffee Tr Townsville', amount: 58.74, direction: 'debit', status: 'unreconciled' },
  // Dec 5
  { date: '2025-12-05', payee: 'Good Morning Coffee', particulars: 'Good Morning Coffee Tr Townsville', amount: 48.17, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-05', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.77, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-05', payee: 'Splash Bar', particulars: 'Splash Bar Townsville', amount: 178.42, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-05', payee: 'Nightowl', particulars: 'NIGHTOWL HERVEY RANG KIRWAN', amount: 124.79, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-05', payee: 'Zapier', particulars: 'ZAPIER.COM/CHARGE ZAPIER.COM CA', amount: 50.49, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-05', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 24.85, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-05', payee: 'Bunnings', particulars: 'BUNNINGS 416000 GARBUTT', amount: 1288.68, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-05', payee: 'Nightowl', particulars: 'NIGHTOWL BEGIAN GARDENS Belgian Garde', amount: 47.60, direction: 'debit', status: 'reconciled' },
  // Dec 8
  { date: '2025-12-08', payee: 'News Pty Limited', particulars: 'NEWS PTY LIMITED SURRY HILLS', amount: 24.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-08', payee: 'LinkedIn', particulars: 'LinkedInPreC *71571784 16506873555', amount: 74.99, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-08', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 67.50, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-08', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 12.69, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-08', payee: 'Bunnings', particulars: 'BUNNINGS 759000 TOWNSVILLE', amount: 501.62, direction: 'credit', status: 'unreconciled' },
  { date: '2025-12-08', payee: 'Apple', particulars: 'APPLE.COM/BILL SYDNEY', amount: 14.99, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-08', payee: 'Uber', particulars: 'UBER *ONE MEMBERSHIP SYDNEY', amount: 9.99, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-08', payee: 'Relay', particulars: 'RELAY GARBUTT', amount: 43.62, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-08', payee: 'Apple', particulars: 'APPLE R466 BRISBANE BRISBANE', amount: 1268.37, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-08', payee: 'Audible', particulars: 'Audible Limited AU MELBOURNE', amount: 16.45, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-08', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 68.55, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-08', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 15.50, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-08', payee: 'DTF Direct', particulars: 'SP DTF DIRECT NEWSTEAD', amount: 87.89, direction: 'credit', status: 'unreconciled' },
  { date: '2025-12-08', payee: 'AGL', particulars: 'AGL SALES PTY LTD SYDNEY', amount: 290.11, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-08', payee: 'Cactus Jacks', particulars: 'CACTUS JACKS RESTAUR TOWNSVILLE', amount: 717.50, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-08', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 91.83, direction: 'debit', status: 'reconciled' },
  // Dec 9
  { date: '2025-12-09', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 46.25, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-09', payee: 'Uber', particulars: 'UBER *EATS HELP.UBER.COM Sydney', amount: 3.94, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-09', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 58.63, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-09', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 47.44, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-09', payee: 'Product Of Italy Minchoury', particulars: '', amount: 61.00, direction: 'debit', status: 'reconciled', source: 'user' },
  { date: '2025-12-09', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 39.37, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-09', payee: 'Uber', particulars: 'UBER *EATS HELP.UBER.COM Sydney', amount: 26.62, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-09', payee: 'Container Options', particulars: 'CONTAINER OPTIONS STRATHFIELD S', amount: 5904.05, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-09', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 32.07, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-09', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 177.48, direction: 'debit', status: 'reconciled' },

  // === PASTE 1: Dec 9 - Dec 31 ===
  // Dec 10
  { date: '2025-12-10', payee: 'Cup of Eden Cafe', particulars: 'Cup of Eden Cafe Mount Druitt', amount: 39.41, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-10', payee: 'Uber', particulars: 'UBER* TRIP WWW.UBER.COM/', amount: 74.48, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-10', payee: 'Kennards Hire', particulars: 'KENNARDS HIRE HO QLD SEVEN HILLS', amount: 2871.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-10', payee: 'Celebrants Australia', particulars: 'CELEBRANTS AUSTRALIA WEST BALLINA', amount: 100.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-10', payee: 'Uber', particulars: 'UBER *EATS HELP.UBER.COM Sydney', amount: 17.77, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-10', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 46.22, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-10', payee: 'Internet Payment', particulars: 'INTERNET PAYMENT Linked Acc Trns', amount: 40000.00, direction: 'credit', status: 'unreconciled' },
  { date: '2025-12-10', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 16.10, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-10', payee: 'Poi Minchinbury', particulars: 'Poi Minchinbury Minchinbury', amount: 62.01, direction: 'debit', status: 'unreconciled' },
  // Dec 11
  { date: '2025-12-11', payee: 'Webflow', particulars: 'WEBFLOW.COM WEBFLOW.COM CA', amount: 43.85, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-11', payee: 'The Sand Yard', particulars: 'THE SAND YARD PTY LTD LONDONDERRY', amount: 913.50, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-11', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.53, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-11', payee: 'Kennards Hire', particulars: 'KENNARDS HIRE HO NSW 2 SEVEN HILLS', amount: 1714.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-11', payee: 'Bunnings', particulars: 'BUNNINGS 634000 MINCHINBURY', amount: 1614.88, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-11', payee: 'Thai Hanuman Ramakien', particulars: 'THAI HANUMAN RAMAKIEN MINCHINBURY', amount: 65.59, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-11', payee: 'Bunnings', particulars: 'BUNNINGS 634000 MINCHINBURY', amount: 1182.18, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-11', payee: 'The Sand Yard', particulars: 'THE SAND YARD PTY LTD LONDONDERRY', amount: 1068.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-11', payee: 'The Ritual Espresso', particulars: 'LS The ritual espresso Mount Druitt', amount: 11.01, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-11', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 2.80, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-11', payee: 'Colyton Hotel', particulars: 'COLYTON HOTEL COLYTON', amount: 436.24, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-11', payee: 'Notion Labs', particulars: 'NOTION LABS, INC. NOTION.SO CA', amount: 79.90, direction: 'debit', status: 'reconciled' },
  // Dec 12
  { date: '2025-12-12', payee: 'Q Eats', particulars: 'SQ *Q EATS Alice Springs', amount: 133.10, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-12', payee: 'Repco', particulars: 'REPCO ALICE SPRINGS', amount: 96.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-12', payee: 'Bunnings', particulars: 'BUNNINGS 634000 MINCHINBURY', amount: 942.96, direction: 'credit', status: 'unreconciled' },
  { date: '2025-12-12', payee: 'Bunnings', particulars: 'BUNNINGS 634000 MINCHINBURY', amount: 44.96, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-12', payee: 'The Sand Yard', particulars: 'THE SAND YARD PTY LTD LONDONDERRY', amount: 1029.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-12', payee: 'Hatch Electrical', particulars: 'HATCH ELECTRICAL ZILLMERE', amount: 3732.43, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-12', payee: 'Bunnings', particulars: 'BUNNINGS 634000 MINCHINBURY', amount: 548.81, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-12', payee: 'Kmart', particulars: 'KMART 1104 ALICE SPRINGS', amount: 9.50, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-12', payee: 'The Sand Yard', particulars: 'THE SAND YARD PTY LTD LONDONDERRY', amount: 373.52, direction: 'debit', status: 'unreconciled' },
  // Dec 15
  { date: '2025-12-15', payee: 'Alice Springs Casino', particulars: 'ALICE SPRINGS CASINO O ALICE SPRINGS', amount: 4.57, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'Kennards Hire', particulars: 'KENNARDS HIRE HO WA SEVEN HILLS', amount: 424.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'The Roastery Cafe', particulars: 'SQ *THE ROASTERY CAFE Ciccone', amount: 19.23, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'The Roastery Cafe', particulars: 'SQ *THE ROASTERY CAFE Ciccone', amount: 81.97, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'NRMA Insurance', particulars: 'NRMA Insurance nrma.com.au', amount: 635.05, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'Virgin Australia', particulars: 'VIRGIN AUSTRALIA BRISBANE', amount: 407.27, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'Kmart', particulars: 'KMART 1104 ALICE SPRINGS', amount: 22.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 2.44, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'Duyu Coffee Roasters', particulars: 'SQ *DUYU COFFEE ROASTERS Ciccone', amount: 73.67, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'Reddy Express', particulars: 'Reddy Express 1903 Alice Springs', amount: 122.71, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'Bay Leaf Cafe', particulars: 'SQ *BAY LEAF CAFE Tennant Creek', amount: 31.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'Xero', particulars: 'XERO AU INV-48632847 HAWTHORN', amount: 75.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'Codeguide', particulars: 'CODEGUIDE.DEV WWW.CODEGUIDEDE', amount: 43.78, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'Webflow', particulars: 'WEBFLOW.COM WEBFLOW.COM CA', amount: 69.66, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'Kmart', particulars: 'KMART 1104 ALICE SPRINGS', amount: 21.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.53, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 6.28, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'OpenAI', particulars: 'OPENAI *CHATGPT SUBSCR OPENAI.COM CA', amount: 90.58, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'Alice Springs Casino', particulars: 'ALICE SPRINGS CASINO O ALICE SPRINGS', amount: 298.92, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'Memories Bistro', particulars: 'SQ *MEMORIES BISTRO Tennant Creek', amount: 77.22, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'Bay Leaf Cafe', particulars: 'SQ *BAY LEAF CAFE Tennant Creek', amount: 12.65, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'Mighty Networks', particulars: 'MIGHTY NETWORKS MIGHTYNETWORKCA', amount: 179.43, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'Qantas', particulars: 'QANTAS AIR 081HQBMYVKZPQMASCOT', amount: 171.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'Qantas', particulars: 'QANTAS AIR 081HQAPCTKVQ6MASCOT', amount: 135.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'Alice Springs Casino', particulars: 'ALICE SPRINGS CASINO O ALICE SPRINGS', amount: 147.25, direction: 'credit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'Kennards Hire', particulars: 'KENNARDS HIRE HO WA SEVEN HILLS', amount: 318.00, direction: 'credit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 3.17, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'Tennant Creek Retreat', particulars: 'SQ *TENNANT CREEK RETREATTennant Creek', amount: 370.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'Tennant Creek Memorial', particulars: 'NXT*Tennant Creek Memor Tennant Creek', amount: 6.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'Memories Bistro', particulars: 'SQ *MEMORIES BISTRO Tennant Creek', amount: 60.96, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'Alice Silver Passenger', particulars: 'ALICE SILVER PASSENGER CICCONE', amount: 40.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'Firecrawl', particulars: 'FIRECRAWL.DEV WWW.FIRECRAWLDE', amount: 28.68, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'Budget Rent A Car', particulars: 'BUDGET RENT A CAR MASCOT', amount: 177.36, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'Vezina', particulars: 'VEZINA PL MASCOT', amount: 42.83, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-15', payee: 'Adobe', particulars: 'Adobe Sydney', amount: 56.73, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-15', payee: 'Kennards Hire', particulars: 'KENNARDS HIRE HO NSW 2 SEVEN HILLS', amount: 570.00, direction: 'credit', status: 'unreconciled' },
  // Dec 16-31 from paste 1
  { date: '2025-12-16', payee: 'BP', particulars: 'BP CMPLX TENNANT CRK TENNANT CREEK', amount: 21.47, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-16', payee: 'Tennant Food Barn', particulars: 'TENNANT FOOD BARN TENNANT CREEK', amount: 41.28, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-16', payee: 'Yo! Sushi', particulars: 'ZLR*YO! Sushi Brisbane Air', amount: 21.30, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-16', payee: 'Hinterland Aviation', particulars: 'Hinterland Aviation Cairns', amount: 375.36, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-16', payee: 'T60023', particulars: 'ZLR*T60023 Kelso', amount: 28.50, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-16', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 69.41, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-16', payee: 'J R Rowden', particulars: 'J R ROWDEN AND F V SNO ALICE SPRINGS', amount: 37.84, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-16', payee: 'Amazon Prime', particulars: 'AMZNPRIMEAU MEMBERSHIP SYDNEY SOUTH', amount: 9.99, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-16', payee: 'BP', particulars: 'BP CMPLX TENNANT CRK TENNANT CREEK', amount: 137.33, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-16', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 70.71, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-16', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 11.98, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-16', payee: 'TI Tree', particulars: 'TI TREE RH 9787 TI TREE', amount: 156.97, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-16', payee: 'The Beet Bar', particulars: 'SQ *THE BEET BAR 1800595310', amount: 10.31, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-16', payee: 'The Beet Bar', particulars: 'SQ *THE BEET BAR 1800595310', amount: 7.21, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-16', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 114.33, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-16', payee: 'Woolworths', particulars: 'WOOLWORTHS/126 STURT STRETOWNSVILLE', amount: 59.68, direction: 'debit', status: 'unreconciled' },
  // Dec 17
  { date: '2025-12-17', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 19.49, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-17', payee: 'Bunnings', particulars: 'BUNNINGS 396000 ALICE SPRINGS', amount: 596.96, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-17', payee: 'ATO', particulars: 'ATO Payment Adelaide', amount: 13345.90, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-17', payee: 'Iris Todd Operations', particulars: 'IRIS TODD OPERATIONS P ALICE SPRINGS', amount: 197.47, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-17', payee: 'Epilogue Enterprises', particulars: 'EPILOGUE ENTERPRISES ALICE SPRINGS', amount: 82.17, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-17', payee: 'Happy Boy Restaurant', particulars: 'Happy Boy Restaurant Fortitude Val', amount: 197.99, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-17', payee: 'Hanuman Restaurant', particulars: 'Hanuman Restaurant Ali Alice Springs', amount: 77.72, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-17', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 2.44, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-17', payee: 'BP', particulars: 'BP ALICE SPRINGS 1104 ALICE SPRINGS', amount: 95.65, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-17', payee: 'Duyu Coffee Roasters', particulars: 'SQ *DUYU COFFEE ROASTERS Ciccone', amount: 22.26, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-17', payee: 'Webflow', particulars: 'WEBFLOW.COM WEBFLOW.COM CA', amount: 69.66, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-17', payee: 'Apple', particulars: 'APPLE.COM/BILL SYDNEY', amount: 119.99, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-17', payee: 'Apple', particulars: 'APPLE.COM/BILL SYDNEY', amount: 11.99, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-17', payee: 'Linkt Avis Budget', particulars: 'Linkt Avis Budget Grou Sydney', amount: 34.22, direction: 'debit', status: 'unreconciled' },
  // Dec 18
  { date: '2025-12-18', payee: 'Uber', particulars: 'UBER *EATS HELP.UBER.COM Sydney', amount: 52.36, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-18', payee: 'Bunnings', particulars: 'BUNNINGS 396000 ALICE SPRINGS', amount: 228.64, direction: 'credit', status: 'unreconciled' },
  { date: '2025-12-18', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 65.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-18', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 130.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-18', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 22.92, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-18', payee: 'Nightowl', particulars: 'NIGHTOWL CONVENIENCE TOWNTOWNSVILLE', amount: 11.69, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-18', payee: 'Woolworths', particulars: 'WOOLWORTHS/126 STURT STRETOWNSVILLE', amount: 28.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-18', payee: 'The Beet Bar', particulars: 'SQ *THE BEET BAR 1800595310', amount: 6.19, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-18', payee: 'Polola', particulars: 'POLOLA TOWNSVILLE TOWNSVILLE', amount: 21.27, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-18', payee: 'Amazon', particulars: 'AMAZON RETA* AMAZON AU SYDNEY', amount: 58.99, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-18', payee: 'Telstra', particulars: 'TELSTRA SERVICES MELBOURNE', amount: 80.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-18', payee: 'The Beet Bar', particulars: 'SQ *THE BEET BAR 1800595310', amount: 9.28, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-18', payee: 'The Beach Hotel', particulars: 'LS The Beach Hotel Tow North Ward', amount: 8.13, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-18', payee: 'The Beet Bar', particulars: 'SQ *THE BEET BAR 1800595310', amount: 29.90, direction: 'debit', status: 'reconciled' },
  // Dec 19
  { date: '2025-12-19', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 259.16, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-19', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 56.37, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-19', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 242.23, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-19', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.06, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-19', payee: 'Alice Springs Casino', particulars: 'ALICE SPRINGS CASINO O ALICE SPRINGS', amount: 50.75, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-19', payee: 'Vercel', particulars: 'VERCEL INC. VERCEL.COM CA', amount: 30.23, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-19', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 23.16, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-19', payee: 'Uber', particulars: 'UBER *TRIP HELP.UBER.COM Sydney', amount: 66.12, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-19', payee: 'Alice Springs Casino', particulars: 'ALICE SPRINGS CASINO O ALICE SPRINGS', amount: 8.78, direction: 'debit', status: 'unreconciled' },
  // Dec 22
  { date: '2025-12-22', payee: 'Booking.com', particulars: 'Hotel at Booking.com Amsterdam', amount: 89.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-22', payee: 'The Source Bulk Foods', particulars: 'The Source Bulk Foods Maleny', amount: 57.15, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-22', payee: 'Dext', particulars: 'RB AU T/A DEXT SYDNEY', amount: 42.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-22', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 4.19, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-22', payee: 'Ezviz', particulars: 'EZVIZ INTERNATIONAL LI WAN CHAI', amount: 14.99, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-22', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (SC)', amount: 0.52, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-22', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.69, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-22', payee: 'Squarespace', particulars: 'SQSP* WORKSP#214868627 SQUARESPACE.CNY', amount: 11.80, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-22', payee: 'Yianis Greek Restaurant', particulars: 'YIANIS GREEK RESTAURAN COOLUM BEACH', amount: 139.06, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-22', payee: 'Updoc', particulars: 'UPDOC.COM.AU -REWMZOMC SURRY HILLS', amount: 39.95, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-22', payee: 'Booking.com', particulars: 'Hotel at Booking.com Amsterdam', amount: 220.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-22', payee: 'Confession', particulars: 'SQ *CONFESSION Mount Gambier', amount: 17.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-22', payee: 'Webflow', particulars: 'WEBFLOW.COM WEBFLOW.COM CA', amount: 48.36, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-22', payee: 'BP', particulars: 'ZLR*BP Meningie meningie', amount: 155.72, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-22', payee: 'Supabase', particulars: 'SUPABASE SINGAPORE', amount: 119.77, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-22', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (SC)', amount: 3.12, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-22', payee: 'Defy Design', particulars: 'DEFYDESIGN.ORG SYDNEY', amount: 3260.63, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-22', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (SC)', amount: 7.70, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-22', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (SC)', amount: 0.41, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-22', payee: 'Blair Robertson', particulars: 'SQ *BLAIR ROBERTSON - OAKPort Fairy', amount: 299.29, direction: 'debit', status: 'unreconciled' },
  // Dec 23
  { date: '2025-12-23', payee: 'Ampol', particulars: 'AMPOL 44480 MILLICENT', amount: 138.07, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-23', payee: 'Pholklore', particulars: 'PHOLKLORE - TORQUAY TORQUAY', amount: 129.78, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-23', payee: 'Internet Payment', particulars: 'INTERNET PAYMENT Up', amount: 15000.00, direction: 'credit', status: 'unreconciled' },
  { date: '2025-12-23', payee: 'Permewans', particulars: 'PERMEWANS HAMILTON HAMILTON', amount: 54.90, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-23', payee: 'Bank St + Co', particulars: 'Bank St + Co Port Fairy', amount: 67.70, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-23', payee: 'The Roxburgh', particulars: 'The Roxburgh Hamilton', amount: 45.46, direction: 'debit', status: 'unreconciled' },
  // Dec 24
  { date: '2025-12-24', payee: 'Defy Design', particulars: 'DEFYDESIGN.ORG SYDNEY', amount: 3598.09, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-24', payee: 'Gurcharan Singh', particulars: 'GURCHARAN SINGH HAMILTON', amount: 159.74, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-24', payee: 'Airbnb', particulars: 'AIRBNB * HMD82J3A3J SURRY HILLS', amount: 369.82, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-24', payee: 'Telford Smith Engine', particulars: 'TELFORD SMITH ENGINE DANDENONG SOU', amount: 19800.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-24', payee: 'Mortadeli', particulars: 'SQ *MORTADELI Hughesdale', amount: 42.35, direction: 'debit', status: 'unreconciled' },
  // Dec 29
  { date: '2025-12-29', payee: 'BOE Design', particulars: 'BOE DESIGN PTY LTD SALISBURY', amount: 750.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-29', payee: 'Webflow', particulars: 'WEBFLOW.COM WEBFLOW.COM CA', amount: 39.43, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.68, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.15, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 0.26, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'Mighty Networks', particulars: 'MIGHTY NETWORKS MIGHTYNETWORKCA', amount: 73.66, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-29', payee: 'BP', particulars: 'BP LAVERTON 4744 LAVERTON NORT', amount: 131.18, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-29', payee: 'Woolworths', particulars: 'WOOLWORTHS/2 BUNYA ST MALENY', amount: 59.90, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-29', payee: 'Chocolate Country', particulars: 'Chocolate Country Montville', amount: 36.88, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-29', payee: 'Railway', particulars: 'RAILWAY RAILWAY.COM CA', amount: 7.57, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'Apple', particulars: 'APPLE.COM/BILL SYDNEY', amount: 29.99, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-29', payee: 'OpenAI', particulars: 'OPENAI OPENAI.COM CA', amount: 14.94, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'Dialpad', particulars: 'DIALPAD INC 4158429989 CA', amount: 56.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-29', payee: 'Woolworths', particulars: 'WOOLWORTHS/2 BUNYA ST MALENY', amount: 48.95, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-29', payee: 'GoHighLevel', particulars: 'HIGHLEVEL AGENCY SUB GOHIGHLEVEL.CTX', amount: 146.90, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'OpenAI', particulars: 'OPENAI *CHATGPT SUBSCR OPENAI.COM CA', amount: 32.86, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-29', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 5.14, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'Qantas', particulars: 'QANTAS AIR 081HQAEY3JWVAMASCOT', amount: 289.00, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.38, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 2.58, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'Audible', particulars: 'Audible Limited AU MELBOURNE', amount: 16.45, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-29', payee: 'Webflow', particulars: 'WEBFLOW.COM WEBFLOW.COM CA', amount: 43.60, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'Webflow', particulars: 'WEBFLOW.COM WEBFLOW.COM CA', amount: 47.96, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'Woodfordia', particulars: 'WOODFORDIA INC WOODFORD', amount: 151.73, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-29', payee: 'Woodfordia', particulars: 'WOODFORDIA INC WOODFORD', amount: 751.23, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'AIG Australia', particulars: 'AIG Australia -', amount: 826.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-29', payee: 'Internet Payment', particulars: 'INTERNET PAYMENT Linked Acc Trns', amount: 10000.00, direction: 'credit', status: 'unreconciled' },
  { date: '2025-12-29', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 1.53, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (MC)', amount: 0.52, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-29', payee: 'NAB International Fee', particulars: 'NAB INTNL TRAN FEE - (SC)', amount: 1.96, direction: 'debit', status: 'reconciled' },
  // Dec 30
  { date: '2025-12-30', payee: 'BP', particulars: 'BP CON CABLTR NTH 1672 CABOOLTURE', amount: 96.17, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-30', payee: 'Bionic Storage', particulars: 'BIONIC STORAGE MERIDAN PLAIN', amount: 12375.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-30', payee: 'Woodfordia', particulars: 'WOODFORDIA INC WOODFORD', amount: 24.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-30', payee: 'Garmin', particulars: 'Garmin Eastern Creek', amount: 25.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-30', payee: 'Internet Payment', particulars: 'INTERNET PAYMENT Linked Acc Trns', amount: 10000.00, direction: 'credit', status: 'unreconciled' },
  { date: '2025-12-30', payee: 'Qantas', particulars: 'QANTAS AIRW MASCOT', amount: 1242.84, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-30', payee: 'Piggyback', particulars: 'PIGGYBACK PALMWOODS', amount: 160.30, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-30', payee: 'Fresh & Save', particulars: 'FRESH & SAVE BEERWAH BEERWAH', amount: 12.78, direction: 'debit', status: 'reconciled' },
  { date: '2025-12-30', payee: 'Nude Juice', particulars: 'SQ *NUDE JUICE Runcorn', amount: 12.24, direction: 'debit', status: 'reconciled' },
  // Dec 31
  { date: '2025-12-31', payee: 'Bionic Storage', particulars: 'BIONIC STORAGE MERIDAN PLAIN', amount: 2420.00, direction: 'debit', status: 'unreconciled' },
  { date: '2025-12-31', payee: 'Liberty', particulars: 'LIBERTY MALENY Maleny', amount: 277.34, direction: 'debit', status: 'unreconciled' },
];

async function main() {
  console.log(`Ingesting ${LINES.length} statement lines...`);

  // Set defaults
  const rows = LINES.map(l => ({
    date: l.date,
    type: l.direction === 'credit' ? 'Credit' : 'Debit',
    payee: l.payee || null,
    particulars: l.particulars || null,
    reference: l.reference || null,
    analysis_code: l.analysis_code || 'Credit Card Purchase',
    amount: l.amount,
    direction: l.direction,
    source: l.source || 'bank_feed',
    status: l.status || 'unreconciled',
    bank_account: 'NAB Visa ACT #8815',
    card_last4: '1656',
  }));

  // Batch insert with upsert
  let inserted = 0;
  let skipped = 0;
  const BATCH = 50;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { data, error } = await sb.from('bank_statement_lines')
      .upsert(batch, { onConflict: 'date,payee,amount,direction,particulars', ignoreDuplicates: true });

    if (error) {
      console.error(`Batch ${i}-${i+BATCH}: ${error.message}`);
      // Try one by one
      for (const row of batch) {
        const { error: e2 } = await sb.from('bank_statement_lines')
          .upsert([row], { onConflict: 'date,payee,amount,direction,particulars', ignoreDuplicates: true });
        if (e2) {
          console.error(`  Skip: ${row.date} ${row.payee} $${row.amount} — ${e2.message}`);
          skipped++;
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`);

  // Summary
  const { data: summary } = await sb.from('bank_statement_lines')
    .select('status, direction')
    .then(({ data }) => {
      const reconciled = data.filter(d => d.status === 'reconciled');
      const unreconciled = data.filter(d => d.status === 'unreconciled');
      const debits = data.filter(d => d.direction === 'debit');
      const credits = data.filter(d => d.direction === 'credit');
      return { data: { total: data.length, reconciled: reconciled.length, unreconciled: unreconciled.length, debits: debits.length, credits: credits.length } };
    });

  console.log('\nSummary:', JSON.stringify(summary, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
