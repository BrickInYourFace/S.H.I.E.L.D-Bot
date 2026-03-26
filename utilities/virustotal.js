const axios = require('axios');
const FormData = require('form-data');
const { vtApiKey } = require('../config.json');

const VT_BASE = 'https://www.virustotal.com/api/v3';
const headers = { 'x-apikey': vtApiKey };

// Helper to build result object from analysis
function buildResult(attributes, analysisId, type) {
    const stats = attributes.stats;
    const results = attributes.results ?? {};

    const detections = Object.entries(results)
        .filter(([_, v]) => v.category === 'malicious' || v.category === 'suspicious')
        .map(([engine, v]) => ({ engine, result: v.result }));

    const permalink = type === 'file'
        ? `https://www.virustotal.com/gui/file/${analysisId}`
        : `https://www.virustotal.com/gui/url/${analysisId}`;

    return { stats, detections, permalink };
}

// Wait for analysis to finish
async function waitForAnalysis(analysisId, maxWait = 30000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
        const res = await axios.get(`${VT_BASE}/analyses/${analysisId}`, { headers });
        const status = res.data.data.attributes.status;
        if (status === 'completed') return res.data.data.attributes;
        await new Promise(r => setTimeout(r, 3000));
    }
    throw new Error('Analysis timed out. Try again in a moment.');
}

// Scan URL or IP
async function scanUrl(target) {
    // VirusTotal requires base64url encoded URL for lookups
    const urlId = Buffer.from(target).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // First check if already analyzed
    try {
        const existing = await axios.get(`${VT_BASE}/urls/${urlId}`, { headers });
        const attrs = existing.data.data.attributes;
        const stats = attrs.last_analysis_stats;
        const results = attrs.last_analysis_results ?? {};
        const detections = Object.entries(results)
            .filter(([_, v]) => v.category === 'malicious' || v.category === 'suspicious')
            .map(([engine, v]) => ({ engine, result: v.result }));
        return {
            stats,
            detections,
            permalink: `https://www.virustotal.com/gui/url/${urlId}`
        };
    } catch {
        // Not found, submit for fresh scan
        const submitRes = await axios.post(
            `${VT_BASE}/urls`,
            new URLSearchParams({ url: target }),
            { headers }
        );
        const analysisId = submitRes.data.data.id;
        const attributes = await waitForAnalysis(analysisId);
        return buildResult(attributes, analysisId, 'url');
    }
}

// Scan file hash (MD5, SHA1, SHA256)
async function scanHash(hash) {
    const res = await axios.get(`${VT_BASE}/files/${hash}`, { headers });
    const attrs = res.data.data.attributes;
    const stats = attrs.last_analysis_stats;
    const results = attrs.last_analysis_results ?? {};

    const detections = Object.entries(results)
        .filter(([_, v]) => v.category === 'malicious' || v.category === 'suspicious')
        .map(([engine, v]) => ({ engine, result: v.result }));

    return {
        stats,
        detections,
        permalink: `https://www.virustotal.com/gui/file/${hash}`
    };
}

// Scan file attachment
async function scanFile(fileUrl, fileName) {
    // Download file from Discord CDN
    const fileRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const fileBuffer = Buffer.from(fileRes.data);

    // Upload to VirusTotal
    const form = new FormData();
    form.append('file', fileBuffer, { filename: fileName });

    const submitRes = await axios.post(
        `${VT_BASE}/files`,
        form,
        { headers: { ...headers, ...form.getHeaders() } }
    );

    const analysisId = submitRes.data.data.id;
    const attributes = await waitForAnalysis(analysisId, 60000); // files take longer
    return buildResult(attributes, analysisId, 'file');
}

module.exports = { scanUrl, scanHash, scanFile };