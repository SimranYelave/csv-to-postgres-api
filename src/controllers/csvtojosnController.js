const fs = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const readline = require('readline');
require('dotenv').config();
const pool = require('../config/database');

const pipeAsync = promisify(pipeline);

const propCache = new Map();

const setNestedProp = (obj, path, value) => {
    let keyList = propCache.get(path);
    if (!keyList) {
        keyList = path.split('.');
        propCache.set(path, keyList);
    }

    let temp = obj;
    const finalIdx = keyList.length - 1;

    for (let idx = 0; idx < finalIdx; idx++) {
        const k = keyList[idx];
        temp = temp[k] || (temp[k] = {});
    }

    temp[keyList[finalIdx]] = value;
};

const parseRow = (row) => {
    const vals = [];
    let str = '';
    let quoted = false;
    const rowLen = row.length;

    for (let idx = 0; idx < rowLen; idx++) {
        const ch = row[idx];

        if (ch === '"') {
            quoted = !quoted;
        } else if (ch === ',' && !quoted) {
            vals.push(str);
            str = '';
        } else {
            str += ch;
        }
    }

    vals.push(str);
    return vals;
};

const convertVal = (value) => {
    if (!value) return value === '' ? '' : null;

    if (value.charCodeAt(0) === 34 && value.charCodeAt(value.length - 1) === 34) {
        value = value.slice(1, -1);
    }

    if (value === 'null' || value === 'undefined') return null;

    const numVal = Number(value);
    if (!isNaN(numVal) && value.trim() !== '') return numVal;

    const lowerVal = value.toLowerCase();
    if (lowerVal === 'true') return true;
    if (lowerVal === 'false') return false;

    return value;
};

const transformRecord = (jsonObj) => {
    const fName = jsonObj.name?.firstName || '';
    const lName = jsonObj.name?.lastName || '';

    const record = {
        name: fName && lName ? `${fName} ${lName}` : fName || lName,
        age: jsonObj.age || null,
        address: null,
        additional_info: null
    };

    if (jsonObj.address && Object.keys(jsonObj.address).length > 0) {
        record.address = jsonObj.address;
    }

    const extraKeys = Object.keys(jsonObj).filter(
        k => k !== 'name' && k !== 'age' && k !== 'address'
    );

    if (extraKeys.length > 0) {
        record.additional_info = {};
        for (const k of extraKeys) {
            record.additional_info[k] = jsonObj[k];
        }
    }

    return record;
};

const insertUserBatch = async (records, size = process.env.BATCH_SIZE || 1000) => {
    const conn = await pool.connect();
    let count = 0;

    try {
        await conn.query('BEGIN');

        const total = records.length;
        const maxBatch = Math.min(parseInt(size), 10000);

        for (let idx = 0; idx < total; idx += maxBatch) {
            const chunk = records.slice(idx, Math.min(idx + maxBatch, total));
            const chunkLen = chunk.length;

            const params = [];
            const placeholderArr = [];

            for (let j = 0; j < chunkLen; j++) {
                const rec = chunk[j];
                const base = j * 4; // 4 params per record
                placeholderArr.push(`($${base + 1}, $${base + 2}, $${base + 3}::jsonb, $${base + 4}::jsonb)`);

                params.push(
                    rec.name,
                    rec.age,
                    rec.address ? JSON.stringify(rec.address) : null,
                    rec.additional_info ? JSON.stringify(rec.additional_info) : null
                );
            }

            const sql = `
                INSERT INTO public.users (name, age, address, additional_info)
                VALUES ${placeholderArr.join(', ')}
            `;

            await conn.query(sql, params);
            count += chunkLen;

            if (total > 5000 && idx % 5000 === 0 && idx > 0) {
                console.log(`Progress: ${idx}/${total} records inserted`);
            }
        }

        await conn.query('COMMIT');
        console.log(`Progress: ${total}/${total} records inserted`);
        return count;

    } catch (err) {
        await conn.query('ROLLBACK');
        throw err;
    } finally {
        conn.release();
    }
};

const processLargeFile = async (filePath) => {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 64 * 1024 });
        const rl = readline.createInterface({
            input: stream,
            crlfDelay: Infinity
        });

        let cols = null;
        const data = [];
        let rowNum = 0;

        rl.on('line', (line) => {
            if (!line.trim()) return;

            if (!cols) {
                cols = parseRow(line);
                return;
            }

            const vals = parseRow(line);
            if (vals.length !== cols.length) return;

            const item = {};
            const colLen = cols.length;

            for (let idx = 0; idx < colLen; idx++) {
                const col = cols[idx];
                const val = convertVal(vals[idx]);

                if (col.includes('.')) {
                    setNestedProp(item, col, val);
                } else {
                    item[col] = val;
                }
            }

            data.push(item);
            rowNum++;
        });

        rl.on('close', () => {
            resolve({ jsonData: data, lineCount: rowNum });
        });

        rl.on('error', reject);
    });
};

const csvToJsonController = async (req, res) => {
    const start = Date.now();

    try {
        const filePath = process.env.CSV_FILE_PATH;

        if (!filePath) {
            return res.status(400).json({
                success: false,
                message: 'CSV_FILE_PATH not configured in environment variables',
            });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: `CSV file not found at path: ${filePath}`,
            });
        }

        const fileStats = fs.statSync(filePath);
        const sizeMB = fileStats.size / (1024 * 1024);

        console.log(`Processing CSV file: ${sizeMB.toFixed(2)} MB`);

        let data;
        let rows;

        const fileContent = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
        const allLines = fileContent.split(/\r?\n/);
        const validLines = allLines.filter(line => line.trim());

        if (validLines > 20000) {
            console.log('Using stream-based processing for large file...');
            const result = await processLargeFile(filePath);
            data = result.jsonData;
            rows = result.lineCount;
        } else {
            if (validLines.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'CSV file is empty',
                });
            }

            const cols = parseRow(validLines[0]);
            const colCount = cols.length;
            data = [];

            for (let idx = 1; idx < validLines.length; idx++) {
                const vals = parseRow(validLines[idx]);
                if (vals.length !== colCount) continue;

                const item = {};
                for (let j = 0; j < colCount; j++) {
                    const col = cols[j];
                    const val = convertVal(vals[j]);

                    if (col.includes('.')) {
                        setNestedProp(item, col, val);
                    } else {
                        item[col] = val;
                    }
                }
                data.push(item);
            }

            rows = data.length;
        }

        if (data.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid records found in CSV',
            });
        }

        console.log(`Parsed ${rows} records, transforming to DB format...`);

        const dbData = new Array(data.length);
        for (let idx = 0; idx < data.length; idx++) {
            dbData[idx] = transformRecord(data[idx]);
        }

        console.log(`Inserting ${dbData.length} records into database...`);

        const inserted = await insertUserBatch(dbData);

        const end = Date.now();
        const elapsed = ((end - start) / 1000).toFixed(2);

        console.log(`✅ Completed in ${elapsed}s - Inserted ${inserted} records`);

        return res.status(200).json({
            success: true,
            message: `Successfully processed ${rows} records and inserted ${inserted} into database`,
            totalRecords: rows,
            insertedRecords: inserted,
            processingTimeSeconds: parseFloat(elapsed),
            fileSizeMB: parseFloat(sizeMB.toFixed(2)),
            sampleRecord: dbData[0] || null
        });

    } catch (err) {
        console.error('❌ Error processing CSV:', err);
        return res.status(500).json({
            success: false,
            message: 'Error processing CSV file',
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};


module.exports = {
    csvToJsonController,
};