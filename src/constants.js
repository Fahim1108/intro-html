'use strict';

const WEBSITE_TYPES = Object.freeze([
  'Portfolio Website',
  'Business Website',
  'E-commerce Website',
  'Hospital / Clinic Website',
  'Dental Chamber Website',
  'Doctor / Professional Website',
  'Educational Website',
  'Personal Brand Website',
  'Custom Website',
]);

const BUDGET_RANGES = Object.freeze([
  'Under ৳5,000',
  '৳5,000 – ৳10,000',
  '৳10,000 – ৳15,000',
  '৳15,000 – ৳25,000',
  '৳25,000+',
]);

const INQUIRY_STATUSES = Object.freeze([
  'NEW',
  'CONTACTED',
  'IN DISCUSSION',
  'CONFIRMED',
  'REJECTED',
]);

const DEFAULT_STATUS = 'NEW';

module.exports = {
  WEBSITE_TYPES,
  BUDGET_RANGES,
  INQUIRY_STATUSES,
  DEFAULT_STATUS,
};
