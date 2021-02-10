const { Builder, By, Key, until } = require('selenium-webdriver'),
    express = require(`express`),
    PORT = process.env.PORT || 9090,
    app = express(),
    logger = require('./logger/logger'),
    config = require(`./config/config`);


app.use(express.json())
app.post(
    '/1cContact',
    (req, res) => {
        logger.info(`Новые контакты ${req.body}`);
        writeContactTo3CX(req.body, res);

    }
)

async function writeContactTo3CX(json, res) {
    let driver = await new Builder().forBrowser('chrome').build();
    try {
        await driver.get(`https://${config.pbx.host}:${config.pbx.port}/#/login`);
        await driver.wait(until.elementLocated(By.className('btn btn-lg btn-primary btn-block ng-scope')), 10 * 10000);
        await driver.findElement(By.xpath("//input[@placeholder='User name or extension number']")).sendKeys(config.pbx.username);
        await driver.findElement(By.xpath("//input[@placeholder='Password']")).sendKeys(config.pbx.secret);
        console.log('Entering credentials...')
        await driver.findElement(By.className('btn btn-lg btn-primary btn-block ng-scope')).click();

        await driver.get(`https://${config.pbx.host}:${config.pbx.port}/#/app/contacts`);
        for (const item of json) {
            await driver.wait(until.elementLocated(By.id('btnImport')), 10 * 10000);
            await driver.findElement(By.className('btn btn-sm btn-success btn-responsive ng-scope')).click();
            await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Pager']")), 10 * 10000);
            await driver.findElement(By.xpath("//input[@placeholder='First Name']")).sendKeys(item.company);
            await driver.findElement(By.xpath("//input[@placeholder='Last Name']")).sendKeys(item.company);
            await driver.findElement(By.xpath("//input[@placeholder='Company']")).sendKeys(item.company);
            await driver.findElement(By.xpath("//input[@placeholder='Home']")).sendKeys(item['_id']);
            await driver.findElement(By.className('btn m-l-lg m-b-xs w-xs btn-success ng-scope')).click();

        }
    } catch (err) {
        logger.error(err);
        res.sendStatus(500);
    } finally {
        await driver.quit();
        logger.info('Данные в 3сх занесены успешно');
        res.sendStatus(200);
    }
}

app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`)
})