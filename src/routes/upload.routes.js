const express = require('express');
const router = express.Router();

const { csvToJsonController } = require('../controllers/csvtojosnController');
const { generateAgeDistributionReport } = require('../controllers/reportController');

router.get('/convert-csv', csvToJsonController);
router.get('/age-distribution', generateAgeDistributionReport);

module.exports = router;
