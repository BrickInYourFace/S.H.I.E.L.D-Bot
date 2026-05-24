const axios = require('axios');
const FormData = require('form-data');
const vtApiKey = process.env.VT_API_KEY;
const headers = { 'x-apikey': vtApiKey };
const VT_BASE = 'https://www.virustotal.com/api/v3';


// Helper to build result object from analysis
function buildResult(attributes, analysisId, type) {
    const stats = attributes.stats;
    const results = attributes.results ?? {};

    const detections = Object.entries(results)
        .filter(([_, v]) => v.category === 'malicious' || v.category === 'suspicious')
        .map(([engine, v]) => ({ engine, result: v.result }));

    // ✅ For files, extract sha256 from meta if available, fallback to analysisId
    const fileHash = attributes.sha256 ?? analysisId;

    const permalink = type === 'file'
        ? `https://www.virustotal.com/gui/file/${fileHash}`
        : `https://www.virustotal.com/gui/url/${analysisId}`;

    return { stats, detections, permalink };
}

// ✅ Increased default timeout, poll every 5s instead of 3s
async function waitForAnalysis(analysisId, maxWait = 300000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
        const res = await axios.get(`${VT_BASE}/analyses/${analysisId}`, { headers });
        const data = res.data.data;
        const status = data.attributes.status;

        if (status === 'completed') return data.attributes;

        await new Promise(r => setTimeout(r, 5000)); // ✅ poll every 5s
    }
    throw new Error('Analysis timed out after 5 minutes. Try again later.');
}

// Scan URL or IP
async function scanUrl(target) {
    const urlId = Buffer.from(target).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
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

// Scan file hash
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
    const fileRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const fileBuffer = Buffer.from(fileRes.data);

    const form = new FormData();
    form.append('file', fileBuffer, { filename: fileName });

    const submitRes = await axios.post(
        `${VT_BASE}/files`,
        form,
        { headers: { ...headers, ...form.getHeaders() } }
    );

    const analysisId = submitRes.data.data.id;
    const attributes = await waitForAnalysis(analysisId, 300000); // ✅ 5 min timeout
    return buildResult(attributes, analysisId, 'file');
}

module.exports = { scanUrl, scanHash, scanFile };