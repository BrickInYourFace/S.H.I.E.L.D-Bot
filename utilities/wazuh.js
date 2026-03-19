const axios = require('axios');
const https = require('https');

const TAILSCALE_IP = '100.127.115.15';
const WAZUH_USER = 'wazuh-wui';
const WAZUH_PASS = 'wazuh-wui';

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

async function getOverview() {
    const token = await getWazuhToken();
    const response = await axios.get(
        `https://${TAILSCALE_IP}:55000/overview/agents`,
        {
            headers: { Authorization: `Bearer ${token}` },
            httpsAgent
        }
    );
    return response.data.data;
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

module.exports = { getAgents, getOverview, getManagerStatus, getAlerts };