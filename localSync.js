'use strict';
const mongoose = require("mongoose"),
    Phonebook = require('./models/phonebook'),
    Axios = require('./src/webserver'),
    logger = require('./logger/logger'),
    config = require(`./config/config`),
    util = require('util');


const endpoint = new Axios(config.server1C.url, 'get');
const mongoDB = `mongodb://${config.mongo.localHost}:${config.mongo.localPort}/${config.mongo.localDB}`;
mongoose.connect(mongoDB, { useUnifiedTopology: true, useNewUrlParser: true });
const connection = mongoose.connection;
let count = 0;


connection.once("open", () => {
    logger.info("Подключение к MongoDB успешно");
    getContact();
});

connection.once('error', err => {
    logger.error(`Ошибка подключения к Mongo ${util.inspect(err)}`);
})

const validateNumber = (json) => {
    json.forEach((item, i) => {
        if (item.ClientPhone.length == 10) {
            item.ClientPhone = `7${item.ClientPhone}`
            insertInMongo(item);
        } else {
            item.ClientPhone = item.ClientPhone.replace(/\)/g, '').replace(/\(/g, '')
            if (item.ClientPhone.length == 11) {
                item.ClientPhone = `7${item.ClientPhone.slice(1,11)}`
                insertInMongo(item);

            } else if (item.ClientPhone.length == 10) {
                item.ClientPhone = `7${item.ClientPhone}`
                insertInMongo(item);
            } else {
                logger.debug(`Не прошедшие валидацию ${util.inspect(item)}`);
            }
        }

    });

    setTimeout((function() {
        logger.info('Завершил');
        return process.exit(1);
    }), 10000);
};

const insertInMongo = (item) => {
    const user = new Phonebook({ _id: item.ClientPhone, company: item.ClientName, fio: item.ContactName, extension: item.ManagerLocPhone });
    user.save(function(err) {
        if (err) return;
    });
};

async function getContact() {
    try {
        let resultFrom1C = await endpoint.getInfoFrom1C();
        validateNumber(resultFrom1C.data);
    } catch (e) {
        logger.error(`Ошибка получения данных от 1С ${util.unspect(error)}`);
    }
};