'use strict';
const mongoose = require("mongoose"),
    Phonebook = require('./models/phonebook'),
    Axios = require('./src/webserver'),
    logger = require('./logger/logger'),
    config = require(`./config/config`),
    util = require('util');


const endpoint = new Axios(config.server1C.url, 'get');
const selenium = new Axios('http://95.31.37.172:3000/update', 'get');
const mongoDB = `mongodb://${config.mongo.host}:${config.mongo.port}/${config.mongo.db}`;
mongoose.connect(mongoDB, {
    useUnifiedTopology: true,
    useNewUrlParser: true
});
mongoose.set('useUnifiedTopology', true);
const connection = mongoose.connection;
let count = 0;


connection.once("open", () => {
    logger.info("MongoDB database connection established successfully");
    getContact();
});

connection.once('error', err => {
    logger.error(`Mongo connect error ${util.inspect(err)}`);
})

const setNewUserOn3cxPhonebook = () => {
    selenium.getInfoFrom1C()
        .then(result => {
            if (result == undefined) {
                logger.error('Проблемы с доступом в панель 3сх');
            } else if (result.data.status == 'error') {
                logger.error('Ошибка');
            } else if (result.data.status == 'ok') {
                logger.info('Данных для загрузки в телефонную книгу нет, либо были обновлены');
                dropDB();
            }
        })
        .catch(function(error) {
            console.log(error);
        });
};

const dropDB = () => {
    mongoose.connection.db.dropCollection('phonebooks', function(err, result) {
        if (err) {
            logger.error(`Ошибка удаление Collection Phpnebooks  ${err}`);
            return process.exit(1);
        }
        setTimeout((function() {
            logger.info('Collection Phonebook удалена');
            getContact();
        }), 10000);
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


const insertInMongo = (item) => {
    const user = new Phonebook({ _id: item.ClientPhone, company: item.ClientName, fio: item.ContactName, extension: item.ManagerLocPhone });
    user.save(function(err) {
        if (err) return;
        //logger.info(user);
    });
};

const getContact = () => {
    endpoint.getInfoFrom1C()
        .then(function(response) {
            validateNumber(response.data);
        })
        .catch(function(error) {
            logger.error(error);
        });
};