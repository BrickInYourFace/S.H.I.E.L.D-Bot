const axios = require('axios');
const https = require('https');
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// credentials
const TAILSCALE_IP = process.env.WAZUH_IP;           // server "local" ip
const WAZUH_USER   = process.env.WAZUH_USER;          // api username
const WAZUH_PASS   = process.env.WAZUH_PASS;          // api password
const INDEXER_USER = process.env.WAZUH_INDEXER_USER;  // dashboard/indexer username
const INDEXER_PASS = process.env.WAZUH_INDEXER_PASS;  // dashboard/indexer password

// agent cache
let agentCache    = [];
let agentCacheTime = 0;
const CACHE_TTL   = 60000; // 1 minute

// ── Wazuh server-down detector ─────────────────────────────────────────────────
// Returns true when the error looks like a connectivity failure rather than a
// logic/data error, so callers can show a friendly "server is down" message.
function isWazuhDown(err) {
    const code   = err.code || '';
    const status = err.response?.status;
    return (
        ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(code) ||
        err.message?.includes('timeout') ||
        status === 502 ||
        status === 503
    );
}

// ── Auth ───────────────────────────────────────────────────────────────────────
async function getWazuhToken() {
    const response = await axios.post(
        `https://${TAILSCALE_IP}:55000/security/user/authenticate`,
        {},
        {
            auth: { username: WAZUH_USER, password: WAZUH_PASS },
            httpsAgent
        }
    );
    return response.data.data.token;
}

// ── Agents ─────────────────────────────────────────────────────────────────────
// Uses a 1-minute cache to avoid hammering the API on every autocomplete call.
async function getAgents() {
    const now = Date.now();
    if (agentCache.length > 0 && now - agentCacheTime < CACHE_TTL) {
        return agentCache;
    }

    const token    = await getWazuhToken();
    const response = await axios.get(
        `https://${TAILSCALE_IP}:55000/agents`,
        {
            headers: { Authorization: `Bearer ${token}` },
            httpsAgent
        }
    );
    agentCache     = response.data.data.affected_items;
    agentCacheTime = now;
    return agentCache;
}

async function getAgentDetails(name) {
    const token    = await getWazuhToken();
    const response = await axios.get(
        `https://${TAILSCALE_IP}:55000/agents`,
        {
            headers: { Authorization: `Bearer ${token}` },
            params:  { search: name },
            httpsAgent
        }
    );
    return response.data.data.affected_items;
}

// ── Manager ────────────────────────────────────────────────────────────────────
async function getManagerStatus() {
    const token    = await getWazuhToken();
    const response = await axios.get(
        `https://${TAILSCALE_IP}:55000/manager/status`,
        {
            headers: { Authorization: `Bearer ${token}` },
            httpsAgent
        }
    );
    return response.data.data.affected_items[0];
}

// ── Alerts ─────────────────────────────────────────────────────────────────────
// Modified by Dana — added optional agentName param to filter alerts by a specific agent.
// If agentName is not provided, behaves exactly as before (all agents).
async function getAlerts(limit = 5, level = 1, agentName = null) {
    const must = [{ range: { 'rule.level': { gte: level } } }];
    if (agentName) must.push({ match: { 'agent.name': agentName } });

    const response = await axios.post(
        `https://${TAILSCALE_IP}:9200/wazuh-alerts-*/_search`,
        {
            size:  limit,
            sort:  [{ timestamp: { order: 'desc' } }],
            query: { bool: { must } }
        },
        {
            auth:    { username: INDEXER_USER, password: INDEXER_PASS },
            headers: { 'Content-Type': 'application/json' },
            httpsAgent
        }
    );
    return response.data.hits.hits.map(hit => ({ ...hit._source, _id: hit._id }));
}

// Added by Dana — used by /search command to fetch alerts filtered by exact rule ID.
async function getAlertsByRuleId(ruleId, limit = 5) {
    const response = await axios.post(
        `https://${TAILSCALE_IP}:9200/wazuh-alerts-*/_search`,
        {
            size:  limit,
            sort:  [{ timestamp: { order: 'desc' } }],
            query: { term: { 'rule.id': String(ruleId) } }
        },
        {
            auth:    { username: INDEXER_USER, password: INDEXER_PASS },
            headers: { 'Content-Type': 'application/json' },
            httpsAgent
        }
    );
    return response.data.hits.hits.map(h => ({ ...h._source, _id: h._id }));
}

// ── Rules ──────────────────────────────────────────────────────────────────────
async function getTopRules(limit = 5) {
    const response = await axios.post(
        `https://${TAILSCALE_IP}:9200/wazuh-alerts-*/_search`,
        {
            size: 0,
            aggs: {
                top_rules: {
                    terms: { field: 'rule.id', size: limit },
                    aggs: {
                        rule_desc:  { terms: { field: 'rule.description', size: 1 } },
                        rule_level: { terms: { field: 'rule.level',       size: 1 } }
                    }
                }
            }
        },
        {
            auth:    { username: INDEXER_USER, password: INDEXER_PASS },
            headers: { 'Content-Type': 'application/json' },
            httpsAgent
        }
    );

    return response.data.aggregations.top_rules.buckets.map(b => ({
        id:          b.key,
        count:       b.doc_count,
        description: b.rule_desc.buckets[0]?.key  ?? 'Unknown',
        level:       b.rule_level.buckets[0]?.key ?? 'N/A'
    }));
}

// ── Vulnerabilities ────────────────────────────────────────────────────────────
async function getVulnerabilities(agentName, severity = null) {
    const token    = await getWazuhToken();
    const agentRes = await axios.get(
        `https://${TAILSCALE_IP}:55000/agents`,
        {
            headers: { Authorization: `Bearer ${token}` },
            params:  { search: agentName },
            httpsAgent
        }
    );
    const agent = agentRes.data.data.affected_items[0];
    if (!agent) throw new Error(`Agent ${agentName} not found`);

    const severityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };

    const query = {
        size:  50,
        query: {
            bool: {
                must: [
                    { match: { 'agent.id': agent.id } },
                    ...(severity ? [{ match: { 'vulnerability.severity': severity } }] : [])
                ]
            }
        }
    };

    const response = await axios.post(
        `https://${TAILSCALE_IP}:9200/wazuh-states-vulnerabilities-*/_search`,
        query,
        {
            auth:    { username: INDEXER_USER, password: INDEXER_PASS },
            headers: { 'Content-Type': 'application/json' },
            httpsAgent
        }
    );

    // Sort by severity manually since the indexer sorts alphabetically
    const hits = response.data.hits.hits.map(h => h._source);
    hits.sort((a, b) => {
        const aScore = severityOrder[a.vulnerability?.severity] ?? 0;
        const bScore = severityOrder[b.vulnerability?.severity] ?? 0;
        return bScore - aScore;
    });

    return hits;
}

// ── Ports ──────────────────────────────────────────────────────────────────────
async function getOpenPorts(agentName, protocol = 'both') {
    const token    = await getWazuhToken();
    const agentRes = await axios.get(
        `https://${TAILSCALE_IP}:55000/agents`,
        {
            headers: { Authorization: `Bearer ${token}` },
            params:  { search: agentName },
            httpsAgent
        }
    );
    const agent = agentRes.data.data.affected_items[0];
    if (!agent) throw new Error(`Agent ${agentName} not found`);

    const params = { limit: 100, sort: '+local.port' };
    if (protocol !== 'both') params.protocol = protocol;

    const response = await axios.get(
        `https://${TAILSCALE_IP}:55000/syscollector/${agent.id}/ports`,
        {
            headers: { Authorization: `Bearer ${token}` },
            params,
            httpsAgent
        }
    );

    return response.data.data.affected_items;
}

// ── Threat Hunt ────────────────────────────────────────────────────────────────
async function threatHunt(query, limit = 5) {
    const response = await axios.post(
        `https://${TAILSCALE_IP}:9200/wazuh-alerts-*/_search`,
        {
            size: limit,
            sort: [{ timestamp: { order: 'desc' } }],
            query: {
                query_string: {
                    query: `*${query}*`,
                    fields: [
                        'rule.description',
                        'agent.name',
                        'data.srcip',
                        'data.dstip',
                        'data.srcuser',
                        'data.dstuser',
                        'data.win.system.message',
                        'data.win.system.computer',
                        'full_log',
                        'location'
                    ],
                    default_operator: 'OR'
                }
            }
        },
        {
            auth:    { username: INDEXER_USER, password: INDEXER_PASS },
            headers: { 'Content-Type': 'application/json' },
            httpsAgent
        }
    );
    return response.data.hits.hits.map(h => ({ ...h._source, _id: h._id }));
}

// ── Exports ────────────────────────────────────────────────────────────────────
module.exports = {
    isWazuhDown,        // used by interactionCreate.js to detect server-down errors
    getWazuhToken,
    getAgents,
    getAgentDetails,
    getManagerStatus,
    getAlerts,
    getAlertsByRuleId,  // Added by Dana, exported for /search command
    getTopRules,
    getVulnerabilities,
    getOpenPorts,
    threatHunt
};