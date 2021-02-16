const { Builder, By, Key, until } = require('selenium-webdriver'),
    express = require(`express`),
    PORT = process.env.PORT || 4545,
    app = express(),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    moment = require('moment'),
    logger = require('./logger/logger'),
    config = require(`./config/config`);


const mongoDB = `mongodb://${config.mongo.externalHost}:${config.mongo.externalPort}/${config.mongo.externalDB}`;
const userScheme = new Schema({ _id: String, company: String, fio: String, extension: String }, { versionKey: false });
const User = mongoose.model("phonebook", userScheme);
mongoose.connect(mongoDB, { useUnifiedTopology: true, useNewUrlParser: true });
const connection = mongoose.connection;


connection.once("open", () => {
    logger.info("Подключение к MongoDB успешно");

});

connection.once('error', err => {
    logger.error(`Ошибка подключения к Mongo ${util.inspect(err)}`);
})

app.use(express.json())
app.get(
    '/update3CXPhonebook',
    (req, res) => {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        if (ip == config.externIP) {
            getPhonebook(res);
        }

    }
);


async function getPhonebook(res) {
    const today = moment().startOf('day').format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
    const end = moment().endOf('day').format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
    console.log(today, end);
    const arr = await User.find({
        create: {
            "$gte": new Date(today),
            "$lt": new Date(end)
        }
    });
    logger.info(`Полученны новые данные из адресной книги ${arr}`);
    writeContactTo3CX(arr, res);
}


async function writeContactTo3CX(arr, res) {
    let driver = await new Builder().forBrowser('chrome').build();
    try {
        await driver.get(`https://${config.pbx.host}:${config.pbx.port}/#/login`);
        await driver.wait(until.elementLocated(By.className('btn btn-lg btn-primary btn-block ng-scope')), 10 * 10000);
        await driver.findElement(By.xpath("//input[@placeholder='User name or extension number']")).sendKeys(config.pbx.username);
        await driver.findElement(By.xpath("//input[@placeholder='Password']")).sendKeys(config.pbx.secret);
        console.log('Entering credentials...')
        await driver.findElement(By.className('btn btn-lg btn-primary btn-block ng-scope')).click();

        await driver.get(`https://${config.pbx.host}:${config.pbx.port}/#/app/contacts`);
        for (let key in arr) {
            await driver.wait(until.elementLocated(By.id('btnImport')), 10 * 10000);
            await driver.findElement(By.className('btn btn-sm btn-success btn-responsive ng-scope')).click();
            await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Pager']")), 10 * 10000);
            await driver.findElement(By.xpath("//input[@placeholder='First Name']")).sendKeys(`${arr[key]['fio']} ${arr[key]['company']}`);
            await driver.findElement(By.xpath("//input[@placeholder='Company']")).sendKeys(arr[key]['company']);
            await driver.findElement(By.xpath("//input[@placeholder='Home']")).sendKeys(arr[key]['_id']);
            await driver.findElement(By.className('btn m-l-lg m-b-xs w-xs btn-success ng-scope')).click();
            await driver.wait(until.elementLocated(By.id('btnImport')), 10 * 10000);
        }
    } catch (err) {
        logger.error(err);
        res.status(503).json({ status: "error" });
    } finally {
        logger.info('Данные в 3сх занесены успешно');
        res.status(200).json({ status: "ok" });
        await driver.sleep(5000);
        await driver.quit();

    }
}

app.listen(PORT, () => {
    logger.info(`Сервер слушается на порту ${PORT}`)
})