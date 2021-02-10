'use strict';
const axios = require('axios'),
    logger = require('../logger/logger');


class Endpoint {
    constructor(serverUrl, metod) {
        this.serverUrl = serverUrl;
        this.metod = metod;
    }

    async getInfoFrom1C() {

        let config = {
            method: this.metod,
            url: this.serverUrl,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        try {
            const res = await axios(config);
            const result = await res;

            if (!result) {
                logger.info('Отсутствует результат');
            } else {
                return result;
            }
        } catch (err) {
            logger.error(err);
        }

    };

};

module.exports = Endpoint;