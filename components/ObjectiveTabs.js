'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, MousePointer, DollarSign, Target, Eye, Video, ChevronDown, ChevronUp, BarChart2, Globe, Activity } from 'lucide-react';

// ─── BENCHMARKS ──────────────────────────────────────────────
const BENCHMARKS = {
  ctr: 0.4,
  websiteCtr: 0.4,
  engagementRate: 2.5,
  videoViewThroughRate: 35,
  videoCompletionRate: 1.7,
  leadFormCompletionRate: 6.65,
};

// ─── DATA: ENGAGEMENT ────────────────────────────────────────
const ENGAGEMENT_WEEKLY = [
  { week: 'Week 1', dates: 'Dec 01-07', impressions: 2529, clicks: 178, ctr: 7.038, cpc: 0.82, cpm: 57.97, landingPageCtr: 0.791, websiteVisits: 20, leads: 0, cpl: 0, engRate: 7.078, engagements: 179, videoViewRate: 0, cpv: 0, spend: 146.66, days: 7 },
  { week: 'Week 2', dates: 'Dec 08-14', impressions: 3506, clicks: 254, ctr: 7.245, cpc: 0.58, cpm: 41.87, landingPageCtr: 0.998, websiteVisits: 35, leads: 0, cpl: 0, engRate: 7.473, engagements: 262, videoViewRate: 0, cpv: 0, spend: 146.79, days: 7 },
  { week: 'Week 3', dates: 'Dec 15-21', impressions: 2524, clicks: 196, ctr: 7.765, cpc: 0.83, cpm: 64.79, landingPageCtr: 1.030, websiteVisits: 26, leads: 0, cpl: 0, engRate: 7.765, engagements: 196, videoViewRate: 0, cpv: 0, spend: 163.52, days: 7 },
  { week: 'Week 4', dates: 'Dec 22-28', impressions: 1909, clicks: 165, ctr: 8.643, cpc: 0.85, cpm: 73.84, landingPageCtr: 1.048, websiteVisits: 20, leads: 0, cpl: 0, engRate: 8.748, engagements: 167, videoViewRate: 0, cpv: 0, spend: 140.97, days: 7 },
  { week: 'Week 5', dates: 'Dec 29-Jan 04', impressions: 1751, clicks: 139, ctr: 7.938, cpc: 0.90, cpm: 71.37, landingPageCtr: 1.142, websiteVisits: 20, leads: 0, cpl: 0, engRate: 7.938, engagements: 139, videoViewRate: 0, cpv: 0, spend: 124.97, days: 6 },
  { week: 'Week 6', dates: 'Jan 05', impressions: 202, clicks: 23, ctr: 11.386, cpc: 0.81, cpm: 91.83, landingPageCtr: 2.475, websiteVisits: 5, leads: 0, cpl: 0, engRate: 11.881, engagements: 24, videoViewRate: 0, cpv: 0, spend: 18.55, days: 1 },
];

const ENGAGEMENT_DAILY = [
  { week: 'Week 1 (Dec 01-07)', rows: [
    { date: 'Mon Dec 01', impressions: 421,  clicks: 27, ctr: '6.413%', cpc: '$0.90', cpm: '$57.93', landingPageCtr: '0.713%', websiteVisits: 3,  engRate: '6.413%', engagements: 27, spend: '$24.39' },
    { date: 'Tue Dec 02', impressions: 354,  clicks: 27, ctr: '7.627%', cpc: '$1.03', cpm: '$78.33', landingPageCtr: '1.130%', websiteVisits: 4,  engRate: '7.627%', engagements: 27, spend: '$27.73' },
    { date: 'Wed Dec 03', impressions: 515,  clicks: 29, ctr: '5.631%', cpc: '$0.87', cpm: '$48.99', landingPageCtr: '0.583%', websiteVisits: 3,  engRate: '5.631%', engagements: 29, spend: '$25.23' },
    { date: 'Thu Dec 04', impressions: 384,  clicks: 34, ctr: '8.854%', cpc: '$0.77', cpm: '$68.57', landingPageCtr: '1.302%', websiteVisits: 5,  engRate: '8.854%', engagements: 34, spend: '$26.33' },
    { date: 'Fri Dec 05', impressions: 399,  clicks: 31, ctr: '7.769%', cpc: '$0.71', cpm: '$55.24', landingPageCtr: '0.752%', websiteVisits: 3,  engRate: '8.020%', engagements: 32, spend: '$22.04' },
    { date: 'Sat Dec 06', impressions: 229,  clicks: 20, ctr: '8.734%', cpc: '$0.66', cpm: '$57.60', landingPageCtr: '0.873%', websiteVisits: 2,  engRate: '8.734%', engagements: 20, spend: '$13.19' },
    { date: 'Sun Dec 07', impressions: 227,  clicks: 10, ctr: '4.405%', cpc: '$0.78', cpm: '$34.14', landingPageCtr: '0.000%', websiteVisits: 0,  engRate: '4.405%', engagements: 10, spend: '$7.75'  },
  ]},
  { week: 'Week 2 (Dec 08-14)', rows: [
    { date: 'Mon Dec 08', impressions: 561,  clicks: 40, ctr: '7.130%', cpc: '$0.63', cpm: '$44.97', landingPageCtr: '0.713%', websiteVisits: 4,  engRate: '7.308%', engagements: 41, spend: '$25.23' },
    { date: 'Tue Dec 09', impressions: 702,  clicks: 45, ctr: '6.410%', cpc: '$0.58', cpm: '$37.28', landingPageCtr: '0.285%', websiteVisits: 2,  engRate: '6.553%', engagements: 46, spend: '$26.17' },
    { date: 'Wed Dec 10', impressions: 474,  clicks: 44, ctr: '9.283%', cpc: '$0.56', cpm: '$51.98', landingPageCtr: '1.266%', websiteVisits: 6,  engRate: '9.283%', engagements: 44, spend: '$24.64' },
    { date: 'Thu Dec 11', impressions: 461,  clicks: 35, ctr: '7.592%', cpc: '$0.65', cpm: '$49.41', landingPageCtr: '1.085%', websiteVisits: 5,  engRate: '8.026%', engagements: 37, spend: '$22.78' },
    { date: 'Fri Dec 12', impressions: 572,  clicks: 40, ctr: '6.993%', cpc: '$0.61', cpm: '$42.66', landingPageCtr: '1.399%', websiteVisits: 8,  engRate: '7.692%', engagements: 44, spend: '$24.40' },
    { date: 'Sat Dec 13', impressions: 530,  clicks: 33, ctr: '6.226%', cpc: '$0.46', cpm: '$28.60', landingPageCtr: '1.698%', websiteVisits: 9,  engRate: '6.226%', engagements: 33, spend: '$15.16' },
    { date: 'Sun Dec 14', impressions: 206,  clicks: 17, ctr: '8.252%', cpc: '$0.49', cpm: '$40.83', landingPageCtr: '0.485%', websiteVisits: 1,  engRate: '8.252%', engagements: 17, spend: '$8.41'  },
  ]},
  { week: 'Week 3 (Dec 15-21)', rows: [
    { date: 'Mon Dec 15', impressions: 408,  clicks: 33, ctr: '8.088%', cpc: '$0.86', cpm: '$69.80', landingPageCtr: '1.225%', websiteVisits: 5,  engRate: '8.088%', engagements: 33, spend: '$28.48' },
    { date: 'Tue Dec 16', impressions: 439,  clicks: 35, ctr: '7.973%', cpc: '$0.76', cpm: '$60.93', landingPageCtr: '0.228%', websiteVisits: 1,  engRate: '7.973%', engagements: 35, spend: '$26.75' },
    { date: 'Wed Dec 17', impressions: 413,  clicks: 28, ctr: '6.780%', cpc: '$0.90', cpm: '$60.82', landingPageCtr: '1.453%', websiteVisits: 6,  engRate: '6.780%', engagements: 28, spend: '$25.12' },
    { date: 'Thu Dec 18', impressions: 473,  clicks: 30, ctr: '6.342%', cpc: '$0.89', cpm: '$56.55', landingPageCtr: '0.846%', websiteVisits: 4,  engRate: '6.342%', engagements: 30, spend: '$26.75' },
    { date: 'Fri Dec 19', impressions: 372,  clicks: 31, ctr: '8.333%', cpc: '$0.78', cpm: '$64.86', landingPageCtr: '1.075%', websiteVisits: 4,  engRate: '8.333%', engagements: 31, spend: '$24.13' },
    { date: 'Sat Dec 20', impressions: 262,  clicks: 24, ctr: '9.160%', cpc: '$0.81', cpm: '$73.97', landingPageCtr: '1.145%', websiteVisits: 3,  engRate: '9.160%', engagements: 24, spend: '$19.39' },
    { date: 'Sun Dec 21', impressions: 157,  clicks: 15, ctr: '9.554%', cpc: '$0.86', cpm: '$82.17', landingPageCtr: '1.911%', websiteVisits: 3,  engRate: '9.554%', engagements: 15, spend: '$12.90' },
  ]},
  { week: 'Week 4 (Dec 22-28)', rows: [
    { date: 'Mon Dec 22', impressions: 268,  clicks: 31, ctr: '11.567%', cpc: '$0.75', cpm: '$87.24', landingPageCtr: '1.866%', websiteVisits: 5,  engRate: '11.567%', engagements: 31, spend: '$23.38' },
    { date: 'Tue Dec 23', impressions: 241,  clicks: 25, ctr: '10.373%', cpc: '$0.92', cpm: '$95.81', landingPageCtr: '0.830%', websiteVisits: 2,  engRate: '10.373%', engagements: 25, spend: '$23.09' },
    { date: 'Wed Dec 24', impressions: 357,  clicks: 32, ctr: '8.964%',  cpc: '$0.81', cpm: '$72.94', landingPageCtr: '1.961%', websiteVisits: 7,  engRate: '8.964%',  engagements: 32, spend: '$26.04' },
    { date: 'Thu Dec 25', impressions: 373,  clicks: 25, ctr: '6.702%',  cpc: '$0.96', cpm: '$64.13', landingPageCtr: '0.804%', websiteVisits: 3,  engRate: '6.702%',  engagements: 25, spend: '$23.92' },
    { date: 'Fri Dec 26', impressions: 315,  clicks: 21, ctr: '6.667%',  cpc: '$0.97', cpm: '$64.57', landingPageCtr: '0.317%', websiteVisits: 1,  engRate: '6.667%',  engagements: 21, spend: '$20.34' },
    { date: 'Sat Dec 27', impressions: 212,  clicks: 19, ctr: '8.962%',  cpc: '$0.93', cpm: '$83.58', landingPageCtr: '0.472%', websiteVisits: 1,  engRate: '8.962%',  engagements: 19, spend: '$17.72' },
    { date: 'Sun Dec 28', impressions: 143,  clicks: 12, ctr: '8.392%',  cpc: '$0.54', cpm: '$45.31', landingPageCtr: '0.699%', websiteVisits: 1,  engRate: '9.790%',  engagements: 14, spend: '$6.48'  },
  ]},
  { week: 'Week 5 (Dec 29-Jan 04)', rows: [
    { date: 'Mon Dec 29', impressions: 334,  clicks: 31, ctr: '9.281%',  cpc: '$0.71', cpm: '$65.81', landingPageCtr: '1.497%', websiteVisits: 5,  engRate: '9.281%',  engagements: 31, spend: '$21.98' },
    { date: 'Tue Dec 30', impressions: 314,  clicks: 25, ctr: '7.962%',  cpc: '$0.95', cpm: '$75.67', landingPageCtr: '1.592%', websiteVisits: 5,  engRate: '7.962%',  engagements: 25, spend: '$23.76' },
    { date: 'Thu Jan 01', impressions: 312,  clicks: 23, ctr: '7.372%',  cpc: '$0.94', cpm: '$69.36', landingPageCtr: '0.962%', websiteVisits: 3,  engRate: '7.372%',  engagements: 23, spend: '$21.64' },
    { date: 'Fri Jan 02', impressions: 451,  clicks: 25, ctr: '5.543%',  cpc: '$0.97', cpm: '$53.66', landingPageCtr: '0.665%', websiteVisits: 3,  engRate: '5.543%',  engagements: 25, spend: '$24.20' },
    { date: 'Sat Jan 03', impressions: 188,  clicks: 22, ctr: '11.702%', cpc: '$0.95', cpm: '$111.49', landingPageCtr: '1.064%', websiteVisits: 2, engRate: '11.702%', engagements: 22, spend: '$20.96' },
    { date: 'Sun Jan 04', impressions: 152,  clicks: 13, ctr: '8.553%',  cpc: '$0.96', cpm: '$81.78', landingPageCtr: '1.316%', websiteVisits: 2,  engRate: '8.553%',  engagements: 13, spend: '$12.43' },
  ]},
  { week: 'Week 6 (Jan 05)', rows: [
    { date: 'Mon Jan 05', impressions: 202, clicks: 23, ctr: '11.386%', cpc: '$0.81', cpm: '$91.83', landingPageCtr: '2.475%', websiteVisits: 5, engRate: '11.881%', engagements: 24, spend: '$18.55' },
  ]},
];

// ─── DATA: LEADS ─────────────────────────────────────────────
const LEADS_WEEKLY = [
  { week: 'Week 1', dates: 'Dec 04-10', leads: 2, cpl: 59.21,  spend: 118.43, days: 7 },
  { week: 'Week 2', dates: 'Dec 11-17', leads: 0, cpl: 0,      spend: 172.72, days: 7 },
  { week: 'Week 3', dates: 'Dec 18-24', leads: 1, cpl: 129.31, spend: 129.31, days: 7 },
  { week: 'Week 4', dates: 'Dec 25-31', leads: 2, cpl: 49.80,  spend: 99.59,  days: 7 },
  { week: 'Week 5', dates: 'Jan 01-06', leads: 2, cpl: 58.25,  spend: 116.51, days: 6 },
];

const LEADS_DAILY = [
  { week: 'Week 1 (Dec 04-10)', rows: [
    { date: 'Thu Dec 04', leads: 0, cpl: 'EUR 0.00',  spend: 'EUR 14.20' },
    { date: 'Fri Dec 05', leads: 0, cpl: 'EUR 0.00',  spend: 'EUR 17.40' },
    { date: 'Sat Dec 06', leads: 1, cpl: 'EUR 12.60', spend: 'EUR 12.60' },
    { date: 'Sun Dec 07', leads: 0, cpl: 'EUR 0.00',  spend: 'EUR 12.80' },
    { date: 'Mon Dec 08', leads: 1, cpl: 'EUR 19.94', spend: 'EUR 19.94' },
    { date: 'Tue Dec 09', leads: 0, cpl: 'EUR 0.00',  spend: 'EUR 20.35' },
    { date: 'Wed Dec 10', leads: 0, cpl: 'EUR 0.00',  spend: 'EUR 21.14' },
  ]},
  { week: 'Week 2 (Dec 11-17)', rows: [
    { date: 'Thu Dec 11', leads: 0, cpl: 'EUR 0.00', spend: 'EUR 25.27' },
    { date: 'Fri Dec 12', leads: 0, cpl: 'EUR 0.00', spend: 'EUR 25.67' },
    { date: 'Sat Dec 13', leads: 0, cpl: 'EUR 0.00', spend: 'EUR 21.89' },
    { date: 'Sun Dec 14', leads: 0, cpl: 'EUR 0.00', spend: 'EUR 23.33' },
    { date: 'Mon Dec 15', leads: 0, cpl: 'EUR 0.00', spend: 'EUR 28.48' },
    { date: 'Tue Dec 16', leads: 0, cpl: 'EUR 0.00', spend: 'EUR 22.94' },
    { date: 'Wed Dec 17', leads: 0, cpl: 'EUR 0.00', spend: 'EUR 25.14' },
  ]},
  { week: 'Week 3 (Dec 18-24)', rows: [
    { date: 'Thu Dec 18', leads: 0, cpl: 'EUR 0.00',  spend: 'EUR 28.46' },
    { date: 'Fri Dec 19', leads: 0, cpl: 'EUR 0.00',  spend: 'EUR 27.38' },
    { date: 'Sat Dec 20', leads: 0, cpl: 'EUR 0.00',  spend: 'EUR 19.93' },
    { date: 'Sun Dec 21', leads: 0, cpl: 'EUR 0.00',  spend: 'EUR 15.92' },
    { date: 'Mon Dec 22', leads: 0, cpl: 'EUR 0.00',  spend: 'EUR 13.06' },
    { date: 'Tue Dec 23', leads: 0, cpl: 'EUR 0.00',  spend: 'EUR 13.84' },
    { date: 'Wed Dec 24', leads: 1, cpl: 'EUR 10.72', spend: 'EUR 10.72' },
  ]},
  { week: 'Week 4 (Dec 25-31)', rows: [
    { date: 'Thu Dec 25', leads: 0, cpl: 'EUR 0.00', spend: 'EUR 11.19' },
    { date: 'Fri Dec 26', leads: 0, cpl: 'EUR 0.00', spend: 'EUR 15.11' },
    { date: 'Sat Dec 27', leads: 2, cpl: 'EUR 6.57', spend: 'EUR 13.13' },
    { date: 'Sun Dec 28', leads: 0, cpl: 'EUR 0.00', spend: 'EUR 10.53' },
    { date: 'Mon Dec 29', leads: 0, cpl: 'EUR 0.00', spend: 'EUR 19.20' },
    { date: 'Tue Dec 30', leads: 0, cpl: 'EUR 0.00', spend: 'EUR 16.17' },
    { date: 'Wed Dec 31', leads: 0, cpl: 'EUR 0.00', spend: 'EUR 14.26' },
  ]},
  { week: 'Week 5 (Jan 01-06)', rows: [
    { date: 'Thu Jan 01', leads: 1, cpl: 'EUR 12.27', spend: 'EUR 12.27' },
    { date: 'Fri Jan 02', leads: 1, cpl: 'EUR 17.74', spend: 'EUR 17.74' },
    { date: 'Sat Jan 03', leads: 0, cpl: 'EUR 0.00',  spend: 'EUR 14.34' },
    { date: 'Sun Jan 04', leads: 0, cpl: 'EUR 0.00',  spend: 'EUR 17.13' },
    { date: 'Mon Jan 05', leads: 0, cpl: 'EUR 0.00',  spend: 'EUR 23.99' },
    { date: 'Tue Jan 06', leads: 0, cpl: 'EUR 0.00',  spend: 'EUR 31.04' },
  ]},
];

// ─── DATA: VIDEO ──────────────────────────────────────────────
const VIDEO_WEEKLY = [
  { week: 'Week 1', dates: 'Dec 01-07', impressions: 6725, views: 2227, viewRate: 33.12, cpv: 0.091, cpm: 30.20, plays: 6725, spend: 203.12, days: 7 },
  { week: 'Week 2', dates: 'Dec 08-14', impressions: 7342, views: 2325, viewRate: 31.67, cpv: 0.080, cpm: 25.48, plays: 7342, spend: 187.01, days: 7 },
  { week: 'Week 3', dates: 'Dec 15-21', impressions: 8532, views: 2899, viewRate: 33.98, cpv: 0.097, cpm: 32.79, plays: 8532, spend: 279.83, days: 7 },
  { week: 'Week 4', dates: 'Dec 22-28', impressions: 6243, views: 2152, viewRate: 34.47, cpv: 0.136, cpm: 47.01, plays: 6243, spend: 293.46, days: 7 },
  { week: 'Week 5', dates: 'Dec 29-Jan 04', impressions: 6304, views: 2400, viewRate: 38.07, cpv: 0.134, cpm: 51.04, plays: 6304, spend: 321.75, days: 7 },
  { week: 'Week 6', dates: 'Jan 05-06', impressions: 1619, views: 640, viewRate: 39.53, cpv: 0.118, cpm: 46.65, plays: 1619, spend: 75.53, days: 2 },
];

const VIDEO_DAILY = [
  { week: 'Week 1 (Dec 01-07)', rows: [
    { date: 'Mon Dec 01', impressions: 957,  views: 311, plays: 957,  viewRate: '32.50%', cpv: 'EUR 0.096', cpm: 'EUR 31.27', spend: 'EUR 29.93' },
    { date: 'Tue Dec 02', impressions: 898,  views: 313, plays: 898,  viewRate: '34.86%', cpv: 'EUR 0.095', cpm: 'EUR 33.14', spend: 'EUR 29.76' },
    { date: 'Wed Dec 03', impressions: 1201, views: 398, plays: 1201, viewRate: '33.14%', cpv: 'EUR 0.084', cpm: 'EUR 27.93', spend: 'EUR 33.54' },
    { date: 'Thu Dec 04', impressions: 1163, views: 395, plays: 1163, viewRate: '33.96%', cpv: 'EUR 0.088', cpm: 'EUR 29.89', spend: 'EUR 34.76' },
    { date: 'Fri Dec 05', impressions: 1197, views: 383, plays: 1197, viewRate: '32.00%', cpv: 'EUR 0.086', cpm: 'EUR 27.42', spend: 'EUR 32.82' },
    { date: 'Sat Dec 06', impressions: 746,  views: 235, plays: 746,  viewRate: '31.50%', cpv: 'EUR 0.092', cpm: 'EUR 29.12', spend: 'EUR 21.72' },
    { date: 'Sun Dec 07', impressions: 563,  views: 192, plays: 563,  viewRate: '34.10%', cpv: 'EUR 0.107', cpm: 'EUR 36.57', spend: 'EUR 20.59' },
  ]},
  { week: 'Week 2 (Dec 08-14)', rows: [
    { date: 'Mon Dec 08', impressions: 1067, views: 339, plays: 1067, viewRate: '31.77%', cpv: 'EUR 0.081', cpm: 'EUR 25.61', spend: 'EUR 27.33' },
    { date: 'Tue Dec 09', impressions: 1085, views: 349, plays: 1085, viewRate: '32.17%', cpv: 'EUR 0.080', cpm: 'EUR 25.72', spend: 'EUR 27.90' },
    { date: 'Wed Dec 10', impressions: 1056, views: 351, plays: 1056, viewRate: '33.24%', cpv: 'EUR 0.088', cpm: 'EUR 29.33', spend: 'EUR 30.97' },
    { date: 'Thu Dec 11', impressions: 1028, views: 349, plays: 1028, viewRate: '33.95%', cpv: 'EUR 0.092', cpm: 'EUR 31.30', spend: 'EUR 32.18' },
    { date: 'Fri Dec 12', impressions: 1592, views: 444, plays: 1592, viewRate: '27.89%', cpv: 'EUR 0.069', cpm: 'EUR 19.29', spend: 'EUR 30.71' },
    { date: 'Sat Dec 13', impressions: 865,  views: 261, plays: 865,  viewRate: '30.17%', cpv: 'EUR 0.079', cpm: 'EUR 23.85', spend: 'EUR 20.63' },
    { date: 'Sun Dec 14', impressions: 649,  views: 232, plays: 649,  viewRate: '35.75%', cpv: 'EUR 0.075', cpm: 'EUR 26.64', spend: 'EUR 17.29' },
  ]},
  { week: 'Week 3 (Dec 15-21)', rows: [
    { date: 'Mon Dec 15', impressions: 1249, views: 385, plays: 1249, viewRate: '30.82%', cpv: 'EUR 0.070', cpm: 'EUR 21.48', spend: 'EUR 26.83' },
    { date: 'Tue Dec 16', impressions: 1187, views: 374, plays: 1187, viewRate: '31.51%', cpv: 'EUR 0.073', cpm: 'EUR 23.15', spend: 'EUR 27.48' },
    { date: 'Wed Dec 17', impressions: 997,  views: 357, plays: 997,  viewRate: '35.81%', cpv: 'EUR 0.077', cpm: 'EUR 27.64', spend: 'EUR 27.56' },
    { date: 'Thu Dec 18', impressions: 1823, views: 562, plays: 1823, viewRate: '30.83%', cpv: 'EUR 0.097', cpm: 'EUR 30.02', spend: 'EUR 54.72' },
    { date: 'Fri Dec 19', impressions: 1580, views: 573, plays: 1580, viewRate: '36.27%', cpv: 'EUR 0.108', cpm: 'EUR 39.12', spend: 'EUR 61.61' },
    { date: 'Sat Dec 20', impressions: 899,  views: 345, plays: 899,  viewRate: '38.38%', cpv: 'EUR 0.122', cpm: 'EUR 46.75', spend: 'EUR 42.03' },
    { date: 'Sun Dec 21', impressions: 797,  views: 303, plays: 797,  viewRate: '38.02%', cpv: 'EUR 0.131', cpm: 'EUR 49.69', spend: 'EUR 39.60' },
  ]},
  { week: 'Week 4 (Dec 22-28)', rows: [
    { date: 'Mon Dec 22', impressions: 966,  views: 340, plays: 966,  viewRate: '35.20%', cpv: 'EUR 0.134', cpm: 'EUR 47.18', spend: 'EUR 45.58' },
    { date: 'Tue Dec 23', impressions: 973,  views: 347, plays: 973,  viewRate: '35.66%', cpv: 'EUR 0.136', cpm: 'EUR 48.41', spend: 'EUR 47.10' },
    { date: 'Wed Dec 24', impressions: 1055, views: 347, plays: 1055, viewRate: '32.89%', cpv: 'EUR 0.136', cpm: 'EUR 44.71', spend: 'EUR 47.17' },
    { date: 'Thu Dec 25', impressions: 915,  views: 320, plays: 915,  viewRate: '34.97%', cpv: 'EUR 0.138', cpm: 'EUR 48.20', spend: 'EUR 44.10' },
    { date: 'Fri Dec 26', impressions: 971,  views: 333, plays: 971,  viewRate: '34.29%', cpv: 'EUR 0.139', cpm: 'EUR 47.82', spend: 'EUR 46.43' },
    { date: 'Sat Dec 27', impressions: 746,  views: 243, plays: 746,  viewRate: '32.57%', cpv: 'EUR 0.133', cpm: 'EUR 43.16', spend: 'EUR 32.20' },
    { date: 'Sun Dec 28', impressions: 617,  views: 222, plays: 617,  viewRate: '35.98%', cpv: 'EUR 0.139', cpm: 'EUR 50.05', spend: 'EUR 30.88' },
  ]},
  { week: 'Week 5 (Dec 29-Jan 04)', rows: [
    { date: 'Mon Dec 29', impressions: 1038, views: 366, plays: 1038, viewRate: '35.26%', cpv: 'EUR 0.125', cpm: 'EUR 44.14', spend: 'EUR 45.82' },
    { date: 'Tue Dec 30', impressions: 917,  views: 355, plays: 917,  viewRate: '38.71%', cpv: 'EUR 0.136', cpm: 'EUR 52.50', spend: 'EUR 48.14' },
    { date: 'Wed Dec 31', impressions: 867,  views: 319, plays: 867,  viewRate: '36.79%', cpv: 'EUR 0.139', cpm: 'EUR 51.15', spend: 'EUR 44.35' },
    { date: 'Thu Jan 01', impressions: 956,  views: 367, plays: 956,  viewRate: '38.39%', cpv: 'EUR 0.136', cpm: 'EUR 52.40', spend: 'EUR 50.09' },
    { date: 'Fri Jan 02', impressions: 1052, views: 394, plays: 1052, viewRate: '37.45%', cpv: 'EUR 0.140', cpm: 'EUR 52.46', spend: 'EUR 55.19' },
    { date: 'Sat Jan 03', impressions: 697,  views: 286, plays: 697,  viewRate: '41.03%', cpv: 'EUR 0.134', cpm: 'EUR 55.06', spend: 'EUR 38.38' },
    { date: 'Sun Jan 04', impressions: 777,  views: 313, plays: 777,  viewRate: '40.28%', cpv: 'EUR 0.127', cpm: 'EUR 51.20', spend: 'EUR 39.78' },
  ]},
  { week: 'Week 6 (Jan 05-06)', rows: [
    { date: 'Mon Jan 05', impressions: 824, views: 304, plays: 824, viewRate: '36.89%', cpv: 'EUR 0.121', cpm: 'EUR 44.67', spend: 'EUR 36.81' },
    { date: 'Tue Jan 06', impressions: 795, views: 336, plays: 795, viewRate: '42.26%', cpv: 'EUR 0.115', cpm: 'EUR 48.70', spend: 'EUR 38.72' },
  ]},
];

// ─── DATA: WEBSITE ────────────────────────────────────────────
const WEBSITE_WEEKLY = [
  { week: 'Week 1', dates: 'Dec 01-07', impressions: 7981,  clicks: 139, ctr: 4.838, cpc: 1.64, cpm: 27.77, landingPageCtr: 4.838, websiteVisits: 139, spend: 221.69, days: 7 },
  { week: 'Week 2', dates: 'Dec 08-14', impressions: 11307, clicks: 121, ctr: 1.224, cpc: 1.45, cpm: 16.39, landingPageCtr: 1.224, websiteVisits: 121, spend: 185.37, days: 7 },
  { week: 'Week 3', dates: 'Dec 15-21', impressions: 21045, clicks: 172, ctr: 0.836, cpc: 1.53, cpm: 12.38, landingPageCtr: 0.836, websiteVisits: 172, spend: 260.60, days: 7 },
  { week: 'Week 4', dates: 'Dec 22-28', impressions: 11366, clicks: 141, ctr: 1.249, cpc: 1.88, cpm: 23.45, landingPageCtr: 1.249, websiteVisits: 141, spend: 266.56, days: 7 },
  { week: 'Week 5', dates: 'Dec 29-Jan 04', impressions: 11140, clicks: 145, ctr: 1.375, cpc: 2.02, cpm: 26.36, landingPageCtr: 1.375, websiteVisits: 145, spend: 293.60, days: 7 },
  { week: 'Week 6', dates: 'Jan 05-06', impressions: 4687, clicks: 44, ctr: 0.941, cpc: 1.91, cpm: 17.95, landingPageCtr: 0.941, websiteVisits: 44, spend: 84.12, days: 2 },
];

const WEBSITE_DAILY = [
  { week: 'Week 1 (Dec 01-07)', rows: [
    { date: 'Mon Dec 01', impressions: 1384, clicks: 28, ctr: '2.023%',  cpc: 'EUR 1.59', cpm: 'EUR 32.20',  landingPageCtr: '2.023%',  websiteVisits: 28, spend: 'EUR 44.56' },
    { date: 'Tue Dec 02', impressions: 473,  clicks: 15, ctr: '3.171%',  cpc: 'EUR 2.37', cpm: 'EUR 75.24',  landingPageCtr: '3.171%',  websiteVisits: 15, spend: 'EUR 35.59' },
    { date: 'Wed Dec 03', impressions: 1699, clicks: 21, ctr: '1.236%',  cpc: 'EUR 1.84', cpm: 'EUR 22.79',  landingPageCtr: '1.236%',  websiteVisits: 21, spend: 'EUR 38.72' },
    { date: 'Thu Dec 04', impressions: 1597, clicks: 30, ctr: '1.879%',  cpc: 'EUR 1.29', cpm: 'EUR 24.25',  landingPageCtr: '1.879%',  websiteVisits: 30, spend: 'EUR 38.72' },
    { date: 'Fri Dec 05', impressions: 2262, clicks: 30, ctr: '1.326%',  cpc: 'EUR 1.24', cpm: 'EUR 16.45',  landingPageCtr: '1.326%',  websiteVisits: 30, spend: 'EUR 37.21' },
    { date: 'Sat Dec 06', impressions: 548,  clicks: 11, ctr: '2.007%',  cpc: 'EUR 2.06', cpm: 'EUR 41.28',  landingPageCtr: '2.007%',  websiteVisits: 11, spend: 'EUR 22.62' },
    { date: 'Sun Dec 07', impressions: 18,   clicks: 4,  ctr: '22.222%', cpc: 'EUR 1.07', cpm: 'EUR 237.22', landingPageCtr: '22.222%', websiteVisits: 4,  spend: 'EUR 4.27'  },
  ]},
  { week: 'Week 2 (Dec 08-14)', rows: [
    { date: 'Mon Dec 08', impressions: 1302, clicks: 22, ctr: '1.690%', cpc: 'EUR 1.40', cpm: 'EUR 23.69', landingPageCtr: '1.690%', websiteVisits: 22, spend: 'EUR 30.85' },
    { date: 'Tue Dec 09', impressions: 1773, clicks: 20, ctr: '1.128%', cpc: 'EUR 1.72', cpm: 'EUR 19.44', landingPageCtr: '1.128%', websiteVisits: 20, spend: 'EUR 34.47' },
    { date: 'Wed Dec 10', impressions: 1666, clicks: 20, ctr: '1.200%', cpc: 'EUR 1.72', cpm: 'EUR 20.69', landingPageCtr: '1.200%', websiteVisits: 20, spend: 'EUR 34.47' },
    { date: 'Thu Dec 11', impressions: 1705, clicks: 23, ctr: '1.349%', cpc: 'EUR 1.50', cpm: 'EUR 20.22', landingPageCtr: '1.349%', websiteVisits: 23, spend: 'EUR 34.47' },
    { date: 'Fri Dec 12', impressions: 3458, clicks: 18, ctr: '0.521%', cpc: 'EUR 1.48', cpm: 'EUR 7.71',  landingPageCtr: '0.521%', websiteVisits: 18, spend: 'EUR 26.66' },
    { date: 'Sat Dec 13', impressions: 644,  clicks: 13, ctr: '2.019%', cpc: 'EUR 1.60', cpm: 'EUR 32.23', landingPageCtr: '2.019%', websiteVisits: 13, spend: 'EUR 20.76' },
    { date: 'Sun Dec 14', impressions: 759,  clicks: 5,  ctr: '0.659%', cpc: 'EUR 0.74', cpm: 'EUR 4.86',  landingPageCtr: '0.659%', websiteVisits: 5,  spend: 'EUR 3.69'  },
  ]},
  { week: 'Week 3 (Dec 15-21)', rows: [
    { date: 'Mon Dec 15', impressions: 3322, clicks: 20, ctr: '0.602%', cpc: 'EUR 1.46', cpm: 'EUR 8.76',  landingPageCtr: '0.602%', websiteVisits: 20, spend: 'EUR 29.11' },
    { date: 'Tue Dec 16', impressions: 3074, clicks: 19, ctr: '0.618%', cpc: 'EUR 1.45', cpm: 'EUR 8.95',  landingPageCtr: '0.618%', websiteVisits: 19, spend: 'EUR 27.52' },
    { date: 'Wed Dec 17', impressions: 1655, clicks: 19, ctr: '1.148%', cpc: 'EUR 1.58', cpm: 'EUR 18.12', landingPageCtr: '1.148%', websiteVisits: 19, spend: 'EUR 29.98' },
    { date: 'Thu Dec 18', impressions: 4517, clicks: 34, ctr: '0.753%', cpc: 'EUR 1.62', cpm: 'EUR 12.18', landingPageCtr: '0.753%', websiteVisits: 34, spend: 'EUR 55.01' },
    { date: 'Fri Dec 19', impressions: 3761, clicks: 41, ctr: '1.090%', cpc: 'EUR 1.39', cpm: 'EUR 15.19', landingPageCtr: '1.090%', websiteVisits: 41, spend: 'EUR 57.12' },
    { date: 'Sat Dec 20', impressions: 2663, clicks: 23, ctr: '0.864%', cpc: 'EUR 1.56', cpm: 'EUR 13.47', landingPageCtr: '0.864%', websiteVisits: 23, spend: 'EUR 35.86' },
    { date: 'Sun Dec 21', impressions: 2053, clicks: 16, ctr: '0.779%', cpc: 'EUR 1.63', cpm: 'EUR 12.66', landingPageCtr: '0.779%', websiteVisits: 16, spend: 'EUR 26.00' },
  ]},
  { week: 'Week 4 (Dec 22-28)', rows: [
    { date: 'Mon Dec 22', impressions: 2059, clicks: 23, ctr: '1.117%', cpc: 'EUR 1.68', cpm: 'EUR 18.72', landingPageCtr: '1.117%', websiteVisits: 23, spend: 'EUR 38.55' },
    { date: 'Tue Dec 23', impressions: 2196, clicks: 23, ctr: '1.047%', cpc: 'EUR 1.81', cpm: 'EUR 18.91', landingPageCtr: '1.047%', websiteVisits: 23, spend: 'EUR 41.53' },
    { date: 'Wed Dec 24', impressions: 2034, clicks: 28, ctr: '1.377%', cpc: 'EUR 1.91', cpm: 'EUR 26.23', landingPageCtr: '1.377%', websiteVisits: 28, spend: 'EUR 53.36' },
    { date: 'Thu Dec 25', impressions: 1905, clicks: 28, ctr: '1.470%', cpc: 'EUR 1.98', cpm: 'EUR 29.03', landingPageCtr: '1.470%', websiteVisits: 28, spend: 'EUR 55.31' },
    { date: 'Fri Dec 26', impressions: 1869, clicks: 22, ctr: '1.177%', cpc: 'EUR 2.08', cpm: 'EUR 24.53', landingPageCtr: '1.177%', websiteVisits: 22, spend: 'EUR 45.85' },
    { date: 'Sat Dec 27', impressions: 738,  clicks: 11, ctr: '1.491%', cpc: 'EUR 1.92', cpm: 'EUR 28.56', landingPageCtr: '1.491%', websiteVisits: 11, spend: 'EUR 21.08' },
    { date: 'Sun Dec 28', impressions: 565,  clicks: 6,  ctr: '1.062%', cpc: 'EUR 1.81', cpm: 'EUR 19.26', landingPageCtr: '1.062%', websiteVisits: 6,  spend: 'EUR 10.88' },
  ]},
  { week: 'Week 5 (Dec 29-Jan 04)', rows: [
    { date: 'Mon Dec 29', impressions: 1596, clicks: 25, ctr: '1.566%', cpc: 'EUR 2.00', cpm: 'EUR 31.29', landingPageCtr: '1.566%', websiteVisits: 25, spend: 'EUR 49.94' },
    { date: 'Tue Dec 30', impressions: 2180, clicks: 18, ctr: '0.826%', cpc: 'EUR 2.06', cpm: 'EUR 17.01', landingPageCtr: '0.826%', websiteVisits: 18, spend: 'EUR 37.08' },
    { date: 'Wed Dec 31', impressions: 1832, clicks: 24, ctr: '1.310%', cpc: 'EUR 2.04', cpm: 'EUR 26.76', landingPageCtr: '1.310%', websiteVisits: 24, spend: 'EUR 49.02' },
    { date: 'Thu Jan 01', impressions: 1762, clicks: 27, ctr: '1.532%', cpc: 'EUR 2.01', cpm: 'EUR 30.77', landingPageCtr: '1.532%', websiteVisits: 27, spend: 'EUR 54.22' },
    { date: 'Fri Jan 02', impressions: 1625, clicks: 25, ctr: '1.538%', cpc: 'EUR 2.03', cpm: 'EUR 31.26', landingPageCtr: '1.538%', websiteVisits: 25, spend: 'EUR 50.80' },
    { date: 'Sat Jan 03', impressions: 1607, clicks: 16, ctr: '0.996%', cpc: 'EUR 2.10', cpm: 'EUR 20.94', landingPageCtr: '0.996%', websiteVisits: 16, spend: 'EUR 33.66' },
    { date: 'Sun Jan 04', impressions: 538,  clicks: 10, ctr: '1.859%', cpc: 'EUR 1.89', cpm: 'EUR 35.09', landingPageCtr: '1.859%', websiteVisits: 10, spend: 'EUR 18.88' },
  ]},
  { week: 'Week 6 (Jan 05-06)', rows: [
    { date: 'Mon Jan 05', impressions: 2263, clicks: 23, ctr: '1.016%', cpc: 'EUR 1.91', cpm: 'EUR 19.43', landingPageCtr: '1.016%', websiteVisits: 23, spend: 'EUR 43.98' },
    { date: 'Tue Jan 06', impressions: 2424, clicks: 21, ctr: '0.866%', cpc: 'EUR 1.91', cpm: 'EUR 16.55', landingPageCtr: '0.866%', websiteVisits: 21, spend: 'EUR 40.14' },
  ]},
];

// ─── SHARED COMPONENTS ───────────────────────────────────────

function BenchmarkBadge({ value, benchmark, higherIsBetter = true }) {
  const passing = higherIsBetter ? value >= benchmark : value <= benchmark;
  return passing ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
      Above {benchmark}% benchmark
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
      Below {benchmark}% benchmark
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, benchmark, benchmarkValue, higherIsBetter = true }) {
  return (
    <div className="bg-white rounded-xl p-4 border-2 border-gray-100 hover:border-blue-200 transition-all">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight">{label}</span>
        <Icon className="w-4 h-4 text-blue-500 flex-shrink-0 ml-1" />
      </div>
      <div className="text-xl font-bold text-gray-900 mb-1">{value}</div>
      {sub && <p className="text-xs text-gray-400 mb-1">{sub}</p>}
      {benchmark !== undefined && (
        <BenchmarkBadge value={benchmark} benchmark={benchmarkValue} higherIsBetter={higherIsBetter} />
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
      {children}
    </h3>
  );
}

function StatusBadge({ ok }) {
  return ok
    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Active</span>
    : <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Review</span>;
}

function CampaignBanner({ objective, campaign, budget, period, color }) {
  const colors = {
    blue:    'border-l-blue-500 bg-blue-50',
    indigo:  'border-l-indigo-500 bg-indigo-50',
    violet:  'border-l-violet-500 bg-violet-50',
    emerald: 'border-l-emerald-500 bg-emerald-50',
  };
  return (
    <div className={`border-l-4 rounded-r-xl p-4 mb-6 ${colors[color]}`}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Objective</span>
          <p className="text-sm font-bold text-gray-900">{objective}</p>
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign</span>
          <p className="text-sm text-gray-700">{campaign}</p>
        </div>
        <div className="ml-auto text-right">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Budget / Period</span>
          <p className="text-sm text-gray-700">{budget} / {period}</p>
        </div>
      </div>
    </div>
  );
}

function WeeklyTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 mb-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            {columns.map(c => (
              <th key={c} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-3 text-gray-700 whitespace-nowrap text-sm">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DailyAccordion({ weeks, columns, getRow }) {
  const [openWeeks, setOpenWeeks] = useState({});
  const toggle = (i) => setOpenWeeks(prev => ({ ...prev, [i]: !prev[i] }));
  return (
    <div className="space-y-2">
      {weeks.map((week, i) => (
        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
          <button onClick={() => toggle(i)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
            <span className="text-sm font-semibold text-gray-800">{week.week}</span>
            {openWeeks[i] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {openWeeks[i] && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white border-t border-gray-100">
                    {columns.map(c => (
                      <th key={c} className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {week.rows.map((row, j) => (
                    <tr key={j} className="border-t border-gray-50 hover:bg-gray-50">
                      {getRow(row).map((cell, k) => (
                        <td key={k} className="px-3 py-2 text-gray-700 whitespace-nowrap text-sm">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── TAB: ENGAGEMENT ─────────────────────────────────────────
function EngagementTab() {
  return (
    <div>
      <CampaignBanner objective="Engagement" campaign="Ben v Cornell | Boosted User Post | ICP 1 | ABM | Mgmt | C02877" budget="$13.85/day" period="Dec 01 2025 - Jan 05 2026" color="indigo" />
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-8">
        <KpiCard label="Impressions"      value="12,421"  sub="6 weeks total"     icon={Eye} />
        <KpiCard label="Clicks"           value="955"     sub="6 weeks total"     icon={MousePointer} />
        <KpiCard label="CTR"              value="7.69%"   sub="Avg weekly"        icon={TrendingUp}  benchmark={7.69} benchmarkValue={BENCHMARKS.ctr} />
        <KpiCard label="Spent"            value="$741.46" sub="6 weeks total"     icon={DollarSign} />
        <KpiCard label="CPM"              value="$59.70"  sub="Avg weekly"        icon={BarChart2} />
        <KpiCard label="CPC"              value="$0.78"   sub="Avg weekly"        icon={DollarSign} />
        <KpiCard label="Landing Page CTR" value="1.01%"   sub="Avg weekly"        icon={Globe}       benchmark={1.01} benchmarkValue={BENCHMARKS.websiteCtr} />
        <KpiCard label="Website Visits"   value="126"     sub="Total web clicks"  icon={Globe} />
        <KpiCard label="Leads"            value="0"       sub="Not tracked"       icon={Target} />
        <KpiCard label="CPL"              value="N/A"     sub="No leads"          icon={DollarSign} />
        <KpiCard label="Engagement Rate"  value="7.79%"   sub="967 engagements"   icon={Activity}    benchmark={7.79} benchmarkValue={BENCHMARKS.engagementRate} />
        <KpiCard label="Engagements"      value="967"     sub="6 weeks total"     icon={Activity} />
        <KpiCard label="Video View Rate"  value="N/A"     sub="Not applicable"    icon={Video} />
        <KpiCard label="CPV"              value="N/A"     sub="Not applicable"    icon={Video} />
      </div>
      <SectionTitle><TrendingUp className="w-4 h-4 text-blue-500" /> Week-by-Week Summary</SectionTitle>
      <WeeklyTable
        columns={['Week', 'Impressions', 'Clicks', 'CTR', 'Spent', 'CPM', 'CPC', 'LP CTR', 'Web Visits', 'Leads', 'CPL', 'Eng Rate', 'Engagements', 'View Rate', 'CPV', 'Status']}
        rows={ENGAGEMENT_WEEKLY.map(w => [
          <span key={w.week}><span className="font-semibold text-gray-900">{w.week}</span><br /><span className="text-xs text-gray-400">{w.dates}</span></span>,
          w.impressions.toLocaleString(), w.clicks, `${w.ctr.toFixed(3)}%`,
          `$${w.spend.toFixed(2)}`, `$${w.cpm.toFixed(2)}`, `$${w.cpc.toFixed(2)}`,
          `${w.landingPageCtr.toFixed(3)}%`, w.websiteVisits, w.leads,
          w.cpl > 0 ? `$${w.cpl.toFixed(2)}` : 'N/A',
          `${w.engRate.toFixed(3)}%`, w.engagements, 'N/A', 'N/A',
          <StatusBadge ok={true} key="s" />,
        ])}
      />
      <SectionTitle><Eye className="w-4 h-4 text-blue-500" /> Daily Breakdown</SectionTitle>
      <DailyAccordion
        weeks={ENGAGEMENT_DAILY}
        columns={['Date', 'Impressions', 'Clicks', 'CTR', 'Spent', 'CPM', 'CPC', 'LP CTR', 'Web Visits', 'Eng Rate', 'Engagements']}
        getRow={r => [r.date, r.impressions.toLocaleString(), r.clicks, r.ctr, r.spend, r.cpm, r.cpc, r.landingPageCtr, r.websiteVisits, r.engRate, r.engagements]}
      />
    </div>
  );
}

// ─── TAB: LEADS ──────────────────────────────────────────────
function LeadsTab() {
  return (
    <div>
      <CampaignBanner objective="Lead Generation" campaign="cTrader | Message | AWARE: Brokers | All Custom Audiences | C03510" budget="EUR 27.85/day" period="Dec 04 2025 - Jan 06 2026" color="blue" />
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-8">
        <KpiCard label="Impressions"      value="N/A"      sub="Not in source data" icon={Eye} />
        <KpiCard label="Clicks"           value="N/A"      sub="Not in source data" icon={MousePointer} />
        <KpiCard label="CTR"              value="N/A"      sub="Not in source data" icon={TrendingUp} />
        <KpiCard label="Spent"            value="EUR 636.56" sub="5 weeks total"    icon={DollarSign} />
        <KpiCard label="CPM"              value="N/A"      sub="Not in source data" icon={BarChart2} />
        <KpiCard label="CPC"              value="N/A"      sub="Not in source data" icon={DollarSign} />
        <KpiCard label="Landing Page CTR" value="N/A"      sub="Not in source data" icon={Globe} />
        <KpiCard label="Website Visits"   value="N/A"      sub="Not in source data" icon={Globe} />
        <KpiCard label="Leads"            value="7"        sub="5 weeks total"      icon={Target} />
        <KpiCard label="CPL"              value="EUR 90.94" sub="Avg cost per lead" icon={DollarSign} />
        <KpiCard label="Engagement Rate"  value="N/A"      sub="Not in source data" icon={Activity} />
        <KpiCard label="Engagements"      value="N/A"      sub="Not in source data" icon={Activity} />
        <KpiCard label="Video View Rate"  value="N/A"      sub="Not applicable"     icon={Video} />
        <KpiCard label="CPV"              value="N/A"      sub="Not applicable"     icon={Video} />
      </div>
      <SectionTitle><TrendingUp className="w-4 h-4 text-blue-500" /> Week-by-Week Summary</SectionTitle>
      <WeeklyTable
        columns={['Week', 'Impressions', 'Clicks', 'CTR', 'Spent', 'CPM', 'CPC', 'LP CTR', 'Web Visits', 'Leads', 'CPL', 'Eng Rate', 'Engagements', 'View Rate', 'CPV', 'Status']}
        rows={LEADS_WEEKLY.map(w => [
          <span key={w.week}><span className="font-semibold text-gray-900">{w.week}</span><br /><span className="text-xs text-gray-400">{w.dates}</span></span>,
          'N/A', 'N/A', 'N/A',
          `EUR ${w.spend.toFixed(2)}`,
          'N/A', 'N/A', 'N/A', 'N/A',
          w.leads,
          w.cpl > 0 ? `EUR ${w.cpl.toFixed(2)}` : 'EUR 0.00',
          'N/A', 'N/A', 'N/A', 'N/A',
          <StatusBadge ok={w.leads > 0} key="s" />,
        ])}
      />
      <SectionTitle><Eye className="w-4 h-4 text-blue-500" /> Daily Breakdown</SectionTitle>
      <DailyAccordion
        weeks={LEADS_DAILY}
        columns={['Date', 'Leads', 'CPL', 'Spent']}
        getRow={r => [r.date, r.leads, r.cpl, r.spend]}
      />
    </div>
  );
}

// ─── TAB: VIDEO VIEWS ────────────────────────────────────────
function VideoTab() {
  return (
    <div>
      <CampaignBanner objective="Video Views" campaign="Cold Unaware | ICP 1.1: Brokers-Ops, F,P | Video Ad" budget="EUR 30.00/day" period="Dec 01 2025 - Jan 06 2026" color="violet" />
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-8">
        <KpiCard label="Impressions"      value="36,765"     sub="Total plays"        icon={Eye} />
        <KpiCard label="Clicks"           value="N/A"        sub="Not tracked"        icon={MousePointer} />
        <KpiCard label="CTR"              value="N/A"        sub="Not tracked"        icon={TrendingUp} />
        <KpiCard label="Spent"            value="EUR 1,360.70" sub="6 weeks total"    icon={DollarSign} />
        <KpiCard label="CPM"              value="EUR 37.01"  sub="Avg weekly"         icon={BarChart2} />
        <KpiCard label="CPC"              value="N/A"        sub="Not tracked"        icon={DollarSign} />
        <KpiCard label="Landing Page CTR" value="N/A"        sub="Not tracked"        icon={Globe} />
        <KpiCard label="Website Visits"   value="N/A"        sub="Not tracked"        icon={Globe} />
        <KpiCard label="Leads"            value="N/A"        sub="Not applicable"     icon={Target} />
        <KpiCard label="CPL"              value="N/A"        sub="Not applicable"     icon={DollarSign} />
        <KpiCard label="Engagement Rate"  value="N/A"        sub="Not tracked"        icon={Activity} />
        <KpiCard label="Engagements"      value="N/A"        sub="Not tracked"        icon={Activity} />
        <KpiCard label="Video View Rate"  value="34.39%"     sub="12,643 of 36,765"  icon={Video}      benchmark={34.39} benchmarkValue={BENCHMARKS.videoViewThroughRate} />
        <KpiCard label="CPV"              value="EUR 0.108"  sub="Avg cost per view"  icon={Video} />
      </div>
      <SectionTitle><TrendingUp className="w-4 h-4 text-blue-500" /> Week-by-Week Summary</SectionTitle>
      <WeeklyTable
        columns={['Week', 'Impressions', 'Clicks', 'CTR', 'Spent', 'CPM', 'CPC', 'LP CTR', 'Web Visits', 'Leads', 'CPL', 'Eng Rate', 'Engagements', 'View Rate', 'CPV', 'Status']}
        rows={VIDEO_WEEKLY.map(w => [
          <span key={w.week}><span className="font-semibold text-gray-900">{w.week}</span><br /><span className="text-xs text-gray-400">{w.dates}</span></span>,
          w.impressions.toLocaleString(),
          'N/A', 'N/A',
          `EUR ${w.spend.toFixed(2)}`,
          `EUR ${w.cpm.toFixed(2)}`,
          'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A',
          `${w.viewRate.toFixed(2)}%`,
          `EUR ${w.cpv.toFixed(3)}`,
          <StatusBadge ok={true} key="s" />,
        ])}
      />
      <SectionTitle><Eye className="w-4 h-4 text-blue-500" /> Daily Breakdown</SectionTitle>
      <DailyAccordion
        weeks={VIDEO_DAILY}
        columns={['Date', 'Impressions', 'Video Views', 'Video Plays', 'View Rate', 'CPV', 'CPM', 'Spent']}
        getRow={r => [r.date, r.impressions.toLocaleString(), r.views.toLocaleString(), r.plays.toLocaleString(), r.viewRate, r.cpv, r.cpm, r.spend]}
      />
    </div>
  );
}

// ─── TAB: WEBSITE VISITS ─────────────────────────────────────
function WebsiteTab() {
  return (
    <div>
      <CampaignBanner objective="Website Visits" campaign="Pain Points | Single Image | ICP 1.1: Brokers-Ops, F,P | Manual | C03482" budget="EUR 33.87/day" period="Dec 01 2025 - Jan 06 2026" color="emerald" />
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-8">
        <KpiCard label="Impressions"      value="67,526"     sub="6 weeks total"     icon={Eye} />
        <KpiCard label="Clicks"           value="762"        sub="6 weeks total"     icon={MousePointer} />
        <KpiCard label="CTR"              value="1.74%"      sub="Avg weekly"        icon={TrendingUp}  benchmark={1.74} benchmarkValue={BENCHMARKS.ctr} />
        <KpiCard label="Spent"            value="EUR 1,311.94" sub="6 weeks total"   icon={DollarSign} />
        <KpiCard label="CPM"              value="EUR 19.43"  sub="Avg weekly"        icon={BarChart2} />
        <KpiCard label="CPC"              value="EUR 1.74"   sub="Avg weekly"        icon={DollarSign} />
        <KpiCard label="Landing Page CTR" value="1.74%"      sub="Avg weekly"        icon={Globe}       benchmark={1.74} benchmarkValue={BENCHMARKS.websiteCtr} />
        <KpiCard label="Website Visits"   value="762"        sub="6 weeks total"     icon={Globe} />
        <KpiCard label="Leads"            value="0"          sub="Not tracked"       icon={Target} />
        <KpiCard label="CPL"              value="N/A"        sub="No leads"          icon={DollarSign} />
        <KpiCard label="Engagement Rate"  value="N/A"        sub="Not tracked"       icon={Activity} />
        <KpiCard label="Engagements"      value="N/A"        sub="Not tracked"       icon={Activity} />
        <KpiCard label="Video View Rate"  value="N/A"        sub="Not applicable"    icon={Video} />
        <KpiCard label="CPV"              value="N/A"        sub="Not applicable"    icon={Video} />
      </div>
      <SectionTitle><TrendingUp className="w-4 h-4 text-blue-500" /> Week-by-Week Summary</SectionTitle>
      <WeeklyTable
        columns={['Week', 'Impressions', 'Clicks', 'CTR', 'Spent', 'CPM', 'CPC', 'LP CTR', 'Web Visits', 'Leads', 'CPL', 'Eng Rate', 'Engagements', 'View Rate', 'CPV', 'Status']}
        rows={WEBSITE_WEEKLY.map(w => [
          <span key={w.week}><span className="font-semibold text-gray-900">{w.week}</span><br /><span className="text-xs text-gray-400">{w.dates}</span></span>,
          w.impressions.toLocaleString(), w.clicks,
          `${w.ctr.toFixed(3)}%`,
          `EUR ${w.spend.toFixed(2)}`,
          `EUR ${w.cpm.toFixed(2)}`,
          `EUR ${w.cpc.toFixed(2)}`,
          `${w.landingPageCtr.toFixed(3)}%`,
          w.websiteVisits, '0', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A',
          <StatusBadge ok={w.ctr >= BENCHMARKS.ctr} key="s" />,
        ])}
      />
      <SectionTitle><Eye className="w-4 h-4 text-blue-500" /> Daily Breakdown</SectionTitle>
      <DailyAccordion
        weeks={WEBSITE_DAILY}
        columns={['Date', 'Impressions', 'Clicks', 'CTR', 'Spent', 'CPM', 'CPC', 'LP CTR', 'Web Visits']}
        getRow={r => [r.date, r.impressions.toLocaleString(), r.clicks, r.ctr, r.spend, r.cpm, r.cpc, r.landingPageCtr, r.websiteVisits]}
      />
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────
const TABS = [
  { id: 'engagement', label: 'Engagement',    icon: Activity, component: EngagementTab },
  { id: 'leads',      label: 'Leads',          icon: Target,   component: LeadsTab },
  { id: 'video',      label: 'Video Views',    icon: Video,    component: VideoTab },
  { id: 'website',    label: 'Website Visits', icon: Globe,    component: WebsiteTab },
];

export default function ObjectiveTabs() {
  const [activeTab, setActiveTab] = useState('engagement');
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component ?? EngagementTab;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                  active ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-6">
        <ActiveComponent />
      </div>
    </div>
  );
}