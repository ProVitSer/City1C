"use strict";
const nodemailer = require("nodemailer"),
    logger = require('../logger/logger'),
    config = require(`../config/config`),
    util = require('util');

async function main(body) {
    let testAccount = await nodemailer.createTestAccount();

    let transporter = nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: false
    });


    let info = await transporter.sendMail({
        from: config.mail.fromEmail,
        to: config.mail.email,
        subject: "Информация по синхронизации 1С с адресной книгой",
        text: body,
    });

    logger.info("Message sent: %s", info.messageId);
    logger.info("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

module.exports = { main };