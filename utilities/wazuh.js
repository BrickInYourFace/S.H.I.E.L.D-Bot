const axios = require('axios');
const https = require('https');

const TAILSCALE_IP = '100.127.115.15'; //server ip
const WAZUH_USER = 'wazuh-wui'; //wazuh api username
const WAZUH_PASS = 'wazuh-wui'; // wazuh api password

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

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

async function getAgents() {
    const token = await getWazuhToken();
    const response = await axios.get(
        `https://${TAILSCALE_IP}:55000/agents`,
        {
            headers: { Authorization: `Bearer ${token}` },
            httpsAgent
        }
    );
    return response.data.data.affected_items;
}

async function getManagerStatus() {
    const token = await getWazuhToken();
    const response = await axios.get(
        `https://${TAILSCALE_IP}:55000/manager/status`,
        {
            headers: { Authorization: `Bearer ${token}` },
            httpsAgent
        }
    );
    return response.data.data.affected_items[0];
}

async function getAlerts(limit = 5, level = 1) {
    const response = await axios.post(
        `https://${TAILSCALE_IP}:9200/wazuh-alerts-*/_search`,
        {
            size: limit,
            sort: [{ timestamp: { order: 'desc' } }],
            query: {
                range: {
                    'rule.level': {
                        gte: level
                    }
                }
            }
        },
        {
            auth: { username: 'admin', password: 'Unub-1234' },
            headers: { 'Content-Type': 'application/json' },
            httpsAgent
        }
    );
    return response.data.hits.hits.map(hit => hit._source);
}

async function getAgentDetails(name) {
    const token = await getWazuhToken();
    const response = await axios.get(
        `https://${TAILSCALE_IP}:55000/agents`,
        {
            headers: { Authorization: `Bearer ${token}` },
            params: { search: name },
            httpsAgent
        }
    );
    return response.data.data.affected_items;
}

async function getTopRules(limit = 5) {
    const response = await axios.post(
        `https://${TAILSCALE_IP}:9200/wazuh-alerts-*/_search`,
        {
            size: 0,
            aggs: {
                top_rules: {
                    terms: { field: 'rule.id', size: limit },
                    aggs: {
                        rule_desc: { terms: { field: 'rule.description', size: 1 } },
                        rule_level: { terms: { field: 'rule.level', size: 1 } }
                    }
                }
            }
        },
        {
            auth: { username: 'admin', password: 'Unub-1234' },
            headers: { 'Content-Type': 'application/json' },
            httpsAgent
        }
    );

    return response.data.aggregations.top_rules.buckets.map(b => ({
        id: b.key,
        count: b.doc_count,
        description: b.rule_desc.buckets[0]?.key ?? 'Unknown',
        level: b.rule_level.buckets[0]?.key ?? 'N/A'
    }));
}

async function getVulnerabilities(agentName, severity = null) {
    const token = await getWazuhToken();

    // First get agent ID from name
    const agentRes = await axios.get(
        `https://${TAILSCALE_IP}:55000/agents`,
        {
            headers: { Authorization: `Bearer ${token}` },
            params: { search: agentName },
            httpsAgent
        }
    );
    const agent = agentRes.data.data.affected_items[0];
    if (!agent) throw new Error(`Agent ${agentName} not found`);

    const params = { limit: 50 };
    if (severity) params.severity = severity;

    const response = await axios.get(
        `https://${TAILSCALE_IP}:55000/vulnerability/${agent.id}`,
        {
            headers: { Authorization: `Bearer ${token}` },
            params,
            httpsAgent
        }
    );
    return response.data.data.affected_items;
}

module.exports = {
    getAgents,
    getManagerStatus,
    getAlerts,
    getAgentDetails,
    getTopRules,
    getVulnerabilities
};