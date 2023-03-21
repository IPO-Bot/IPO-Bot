var axios = require("axios").default;
console.log('IPO Alert Bot!');
const { TwitterApi } = require('twitter-api-v2');
var config = require('./configTwit');
const client = new TwitterApi(config);
var CronJob = require('cron').CronJob;

var job = new CronJob('0 * * * *', function () {
    let date = new Date();
    var offset = -300; //Timezone offset for EST in minutes.
    var estDate = new Date(date.getTime() + offset * 60 * 1000);

    if (estDate.getDay() == 1 && estDate.getHours() == 9) { //Monday 9AM EST
        processIPOs();
    }
    if (isLastDayOfMonth(estDate) && estDate.getHours() == 9) { //Every Last Day Of the Month
        processWithdarawls();
    }
    if (estDate.getHours() == 9) { //Every day at 9AM EST
        publicCompanies();
    }
});
job.start();

async function processIPOs() {
    const date = getDate();
    const IPOs = await getIPOdata(date);

    let tweetID;
    if (IPOs.length > 0) {
        tweetID = await makeTweet(`Here are this weeks upcoming IPO’s🧵\nTotal: ${IPOs.length} `, false);
    }
    else {
        console.log('No IPOs to tweet about');
        return;
    }
    for (let IPO of IPOs) {
        let tweet = `Symbol: $${IPO.proposedTickerSymbol}
Company: ${IPO.companyName}
Exchange: ${IPO.proposedExchange}
Price: ${IPO.proposedSharePrice} USD
Shares: ${IPO.sharesOffered}
Expected IPO Date: ${IPO.expectedPriceDate}
Offer Amount: ${IPO.dollarValueOfSharesOffered} `;
        tweetID = await makeTweet(tweet, true, tweetID);
    }
}

async function processWithdarawls() {
    const date = getDate();
    const withdrawns = await getWithdarawlsdata(date);

    let tweetID;
    if (withdrawns.length > 0) {
        tweetID = await makeTweet(`Here are this months IPO withdraws🧵\nTotal: ${withdrawns.length} `, false);
    }
    else {
        console.log('No Withdarawls to tweet about');
        return;
    }
    for (let wtd of withdrawns) {
        let tweet = `Company: ${wtd.companyName}
Exchange: ${wtd.proposedExchange}
Shares: ${wtd.sharesOffered}
Filled Date: ${wtd.filedDate}
Offer Amount: ${wtd.dollarValueOfSharesOffered} `;
        tweetID = await makeTweet(tweet, true, tweetID);
        console.log(tweet);
    }

}

async function publicCompanies() {
    const date = getDate();
    const IPOs = await getIPOdata(date);
    const withdrawns = await getWithdarawlsdata(date);
    const whiteCompanies = [];

    for (let IPO of IPOs) {
        let proceed = isToday(IPO.expectedPriceDate);
        if (proceed == true) {
            if (withdrawns.length > 0) {
                for (let wtd of withdrawns) {
                    if (wtd.companyName == IPO.companyName) {
                        proceed = false;
                    }
                }
            }
            if (proceed == true) {
                whiteCompanies.push(IPO);
            }
        }
    }

    //New Tweet Format
    let tweetID;
    if (whiteCompanies.length > 0) {
        tweetID = await makeTweet(`These companies are going public today!🧵\nTotal: ${whiteCompanies.length}`, false);
    }
    else {
        console.log('No Public Companies to tweet about!');
        return;
    }
    for (let IPO of whiteCompanies) {
        let tweet = `Symbol: $${IPO.proposedTickerSymbol}
Company: ${IPO.companyName}
Exchange: ${IPO.proposedExchange}
Price: ${IPO.proposedSharePrice} USD
Shares: ${IPO.sharesOffered}
Expected IPO Date: ${IPO.expectedPriceDate}
Offer Amount: ${IPO.dollarValueOfSharesOffered} `;
        tweetID = await makeTweet(tweet, true, tweetID);
    }

}

async function getIPOdata(date) {
    let response;
    try {

        const options = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `http://api.scraperapi.com?api_key=4a0f6b2783693c29a8fcf90483998c51&url=https://api.nasdaq.com/api/ipo/calendar?date=${date}`,
            headers: {}
        };

        response = await axios.request(options);
        console.log(response);

        if (response.data.data.upcoming.upcomingTable.rows == null) { return []; }
        return response.data.data.upcoming.upcomingTable.rows;
    }
    catch (e) {
        return [];
    }
}

async function getWithdarawlsdata(date) {
    let response;
    try {
        const options = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `http://api.scraperapi.com?api_key=4a0f6b2783693c29a8fcf90483998c51&url=https://api.nasdaq.com/api/ipo/calendar?date=${date}`,
            headers: {}
        };

        response = await axios.request(options);
        console.log(response);
        if (response.data.data.withdrawn.rows == null) { return []; }
        return response.data.data.withdrawn.rows;
    }
    catch (e) {
        return [];
    }
}

async function makeTweet(tweet, isReply, tweetID) {
    //console.log(tweet);
    if (isReply == true) {
        const reply = await client.v2.reply(tweet, tweetID);
        console.log('Tweet Made: ' + JSON.stringify(reply));
        return reply.data.id;
    }
    else {
        const posted = await client.v2.tweet(tweet);
        console.log('Tweet Made: ' + JSON.stringify(posted));
        return posted.data.id;
    }
}

function getDate() {
    let date = new Date();
    var offset = -300; //Timezone offset for EST in minutes.
    var estDate = new Date(date.getTime() + offset * 60 * 1000);
    estDate = estDate.toISOString();
    estDate = estDate.split('-');
    estDate = `${estDate[0]}-${estDate[1]} `;
    return estDate.trim();
}

function isToday(someDate) {

    const date = new Date();
    var offset = -300; //Timezone offset for EST in minutes.
    var estDate = new Date(date.getTime() + offset * 60 * 1000);

    estDate = estDate.toISOString().
        replace(/T/, ' ').
        replace(/\..+/, '')
    estDate = estDate.split(' ');
    estDate = estDate[0].split('-');
    estDate = `${estDate[1]}/${estDate[2]}/${estDate[0]}`;
    if (estDate.startsWith('0')) { estDate = estDate.replace('0', ''); }
    if (estDate == someDate) {
        return true;
    }
    return false;
}

function isLastDayOfMonth(date) {
    return date.getDate() == new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
