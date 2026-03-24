const axios = require('axios');
const { vtApiKey } = require('../config.json'); //APIKEY OF abdulrahmanabusamhadaneh@gmail.com

async function scanUrl(target) {
    // Submit URL for scanning
    const submitRes = await axios.post(
        'https://www.virustotal.com/api/v3/urls',
        new URLSearchParams({ url: target }),
        { headers: { 'x-apikey': vtApiKey } }
    );

    const analysisId = submitRes.data.data.id;

    // Wait for analysis to complete
    await new Promise(res => setTimeout(res, 5000));

    // Get results
    const resultRes = await axios.get(
        `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
        { headers: { 'x-apikey': vtApiKey } }
    );

    const stats = resultRes.data.data.attributes.stats;
    const results = resultRes.data.data.attributes.results;
    const permalink = `https://www.virustotal.com/gui/url/${analysisId}`;

    // Get engines that detected something
    const detections = Object.entries(results)
        .filter(([_, v]) => v.category === 'malicious' || v.category === 'suspicious')
        .map(([engine, v]) => ({ engine, result: v.result }));

    return { stats, detections, permalink };
}

module.exports = { scanUrl };