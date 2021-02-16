'use strict';
const mongoose = require("mongoose"),
    Phonebook = require('./models/phonebook'),
    Axios = require('./src/webserver'),
    sendEmail = require('./src/mail'),
    logger = require('./logger/logger'),
    config = require(`./config/config`),
    util = require('util');

const endpoint = new Axios(config.server1C.url, 'get');
const selenium = new Axios(config.externalServer, 'get');
const mongoDB = `mongodb://${config.mongo.externalHost}:${config.mongo.externalPort}/${config.mongo.externalDB}`;
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

const extiProcess = () => {
    setTimeout((function() {
        return process.exit(1);
    }), 10000);
};


async function setNewUserOn3cxPhonebook() {
    try {
        let resultSetNewUserOn3cxPhonebook = await selenium.getInfoFrom1C();
        if (resultSetNewUserOn3cxPhonebook == undefined) {
            logger.error('Проблемы с доступом в панель 3сх');
            let resultSendMail = await sendEmail.main('Ошибка синхронизации, ошибка с доступом в панель 3СХ');
            extiProcess();
        } else if (resultSetNewUserOn3cxPhonebook.data.status == 'error') {
            logger.error('Ошибка');
            let resultSendMail = await sendEmail.main('Ошибка синхронизации, ошибка с доступом в панель 3СХ');
            extiProcess();
        } else if (resultSetNewUserOn3cxPhonebook.data.status == 'ok') {
            logger.info('Данных для загрузки в телефонную книгу нет, либо были обновлены');
            let resultSendMail = await sendEmail.main('Синхронизация прошла успешно');
            extiProcess();
        }
    } catch (e) {
        logger.error(`Ошибка отправки запроса на синхронизацию БД с записной книгой 3СХ ${util.unspect(error)}`);
    }

};

const insertInMongo = (item) => {
    const user = new Phonebook({ _id: item.ClientPhone, company: item.ClientName, fio: item.ContactName, extension: item.ManagerLocPhone });
    user.save(function(err) {
        if (err) return;
    });
};

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

    if (count == 0) {
        setNewUserOn3cxPhonebook();
        count++;
    } else {
        setTimeout((function() {
            logger.info('Завершил');
            return process.exit(1);
        }), 10000);
    }
};

async function getContact() {
    try {
        let resultFrom1C = await endpoint.getInfoFrom1C();
        validateNumber(resultFrom1C.data);
    } catch (e) {
        logger.error(`Ошибка получения данных от 1С ${util.unspect(error)}`);
    }
};