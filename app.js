"use strict";
const client = require(`ari-client`),
    logger = require('./logger/logger'),
    config = require(`./config/config`),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    moment = require('moment'),
    util = require('util');

const LOCAL_ROUTING = 'RouteToLocalUser';
const DEFAULT_ROUTING = 'RouteToDefaultIncomingRoute';

const mongoDB = `mongodb://${config.mongo.host}:${config.mongo.port}/${config.mongo.db}`;
const userScheme = new Schema({ _id: String, company: String, fio: String, extension: String }, { versionKey: false });
const User = mongoose.model("phonebooks", userScheme);
mongoose.connect(mongoDB, { useUnifiedTopology: true, useNewUrlParser: true });

const connection = mongoose.connection;


connection.once("open", () => {
    console.log("MongoDB database connection established successfully");
});


async function searchPhoneNumber(number) {
    number = number.trim();
    try {
        const client = await User.findById(`${number}`);
        return client;
    } catch (err) {
        throw Error(err);
    }
}


client.connect(config.ari.host, config.ari.username, config.ari.secret,
    function(err, ari) {
        ari.on('StasisStart',
            function(event) {
                logger.info(`Вызов попал в Stasis ${util.inspect(event)}`);
                searchPhoneNumber('7' + event.channel.caller.number)
                    .then(
                        result => {
                            logger.info(`Со стороны базы вернулся результат ${util.inspect(result)}`);
                            if (result == null) {
                                logger.info(`Привязка не найдена ${result} вызов пошел по маршруту ${DEFAULT_ROUTING}`);
                                continueDialplan(event.channel.id, DEFAULT_ROUTING, '414232');
                            } else if (result['extension'] == '') {
                                logger.info(`Отсутствует добавочный номер ${result['extension']}  вызов пошел по маршруту ${LOCAL_ROUTING}`);
                                continueDialplan(event.channel.id, DEFAULT_ROUTING, '414232');
                            } else {
                                logger.info(`Был найден привязанный внутренний номер ${result['_id']}  ${result['company']}  ${result['fio']}  ${result['extension']}  вызов пошел по маршруту ${LOCAL_ROUTING}`);
                                continueDialplan(event.channel.id, LOCAL_ROUTING, result['extension']);
                            }
                        }
                    )
                    .catch(error => {
                        logger.error(`На запрос внутреннего номера вернулась ошибка ${error}`);
                        logger.error(`Ошибка, вызов идет по ${DEFAULT_ROUTING}`);
                        continueDialplan(event.channel.id, DEFAULT_ROUTING, '414232');
                    });
            });

        function continueDialplan(channelId, dialplanContext, dialExtension) {
            logger.info(`Перенаправляем вызов в по нужному маршруту ${channelId}  ${dialplanContext}  ${dialExtension}`);
            ari.channels.continueInDialplan({ channelId: channelId, context: dialplanContext, extension: dialExtension })
                .then(result => {
                    logger.info(`Результат отправки вызова в канал ${result}`);
                })
                .catch(function(err) {
                    logger.error(`Ошибка отправки вызова через ari ${err}`);
                });

        }

        ari.start('app');
    });