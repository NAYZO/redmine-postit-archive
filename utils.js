const _ = require('lodash');
const fetch = require('node-fetch');
const querystring = require('querystring');
const config = require('./config');

module.exports = config => {
    const call = async ({ endpoint, params }) => {
        const headers = {
            "Authorization": 'Basic ' + Buffer.from(config.auth.username + ':' + config.auth.password).toString('base64')
        };
        const qs = querystring.stringify(_.merge(params, { key: config.auth.key }));
        const url = `${config.hostname}${endpoint}?${qs}`;
        //console.info(url);
        const res = await fetch(url, { headers });
        return await res.json();
    }
    return { call }
}