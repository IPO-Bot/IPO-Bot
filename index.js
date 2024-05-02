var axios = require('axios').default;
console.log('IPO Alert Bot!');
const { TwitterApi } = require('twitter-api-v2');
var config = require('./configTwit');
const client = new TwitterApi(config);
var CronJob = require('cron').CronJob;

var job = new CronJob('0 * * * *', function () {
    let date = new Date();
    var offset = -300; //Timezone offset for EST in minutes.
    var estDate = new Date(date.getTime() + offset * 60 * 1000);

    if (estDate.getDay() == 1 && estDate.getHours() == 8) {
        //Monday 9AM EST
        processIPOs();
    }
    if (isLastDayOfMonth(estDate) && estDate.getHours() == 8) {
        //Every Last Day Of the Month
        processWithdarawls();
    }
    if (estDate.getHours() == 8) {
        //Every day at 9AM EST
        publicCompanies();
    }
});
job.start();

async function processIPOs() {
    const date = getWeekDateRange();
    const IPOs = await getIPOdataV2(date);

    let tweetID;
    if (IPOs.length > 0) {
        console.log(`Here are this weeks upcoming IPO’s🧵\nTotal: ${IPOs.length} `);

        tweetID = await makeTweet(`Here are this weeks upcoming IPO’s🧵\nTotal: ${IPOs.length} `, false);
    } else {
        console.log('No IPOs to tweet about');
        return;
    }
    for (let IPO of IPOs) {
        let tweet = `Symbol: $${IPO.symbol}
Company: ${IPO.name}
Exchange: ${IPO.exchange}
Price: ${IPO.price} USD
Shares: ${IPO.numberOfShares}
Expected IPO Date: ${IPO.date}
Offer Amount: ${IPO.totalSharesValue} `;
        console.log(tweet);

        tweetID = await makeTweet(tweet, true, tweetID);
    }
}

async function processWithdarawls() {
    const date = getMonthDateRange();
    const withdrawns = await getWithdarawlsdata(date);
    const whiteCompanies = [];
    console.log(withdrawns);

    for (let IPO of withdrawns) {
        if (IPO.status == 'expected') {
            whiteCompanies.push(IPO);
        }
    }

    let tweetID;
    if (withdrawns.length > 0) {
        console.log(`Here are this months IPO withdraws🧵\nTotal: ${whiteCompanies.length}`);
        tweetID = await makeTweet(`Here are this months IPO withdraws🧵\nTotal: ${withdrawns.length} `, false);
    } else {
        console.log('No Withdarawls to tweet about');
        return;
    }
    for (let wtd of whiteCompanies) {
        let tweet = `Company: ${wtd.name}
Exchange: ${wtd.exchange}
Shares: ${wtd.numberOfShares}
Filled Date: ${wtd.date}
Offer Amount: ${wtd.totalSharesValue} `;
        tweetID = await makeTweet(tweet, true, tweetID);
        console.log(tweet);
    }
}

async function publicCompanies() {
    const date = getWeekDateRange();
    const IPOs = await getIPOdataV2(date);

    const whiteCompanies = [];

    for (let IPO of IPOs) {
        console.log(IPO);
        debugger;
        console.log(IPO.date);

        let proceed = isToday(IPO.date);
        console.log(proceed);
        if (proceed == true && IPO.status == 'expected') {
            whiteCompanies.push(IPO);
        }
    }

    //New Tweet Format
    let tweetID;
    if (whiteCompanies.length > 0) {
        console.log(`These companies are going public today!🧵\nTotal: ${whiteCompanies.length}`);

        tweetID = await makeTweet(`These companies are going public today!🧵\nTotal: ${whiteCompanies.length}`, false);
    } else {
        console.log('No Public Companies to tweet about!');
        return;
    }
    for (let IPO of whiteCompanies) {
        let tweet = `Symbol: $${IPO.proposedTickerSymbol}
Company: ${IPO.name}
Exchange: ${IPO.exchange}
Price: ${IPO.price} USD
Shares: ${IPO.numberOfShares}
Expected IPO Date: ${IPO.date}
Offer Amount: ${IPO.totalSharesValue} `;
        console.log(tweet);
        debugger;

        tweetID = await makeTweet(tweet, true, tweetID);
    }
}

async function getIPOdataV2(date) {
    let response;
    try {
        const options = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://finnhub.io/api/v1/calendar/ipo?from=${date[0]}&to=${date[1]}&token=coodgspr01qm6hd1gdl0coodgspr01qm6hd1gdlg`,
            headers: {},
        };

        response = await axios.request(options);
        console.log(response);

        if (response.data.ipoCalendar == null || response.data.ipoCalendar.length == 0) {
            return [];
        }
        return response.data.ipoCalendar;
    } catch (e) {
        return [];
    }
}

async function getWithdarawlsdata(date) {
    let response;
    try {
        const options = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://finnhub.io/api/v1/calendar/ipo?from=${date[0]}&to=${date[1]}&token=coodgspr01qm6hd1gdl0coodgspr01qm6hd1gdlg`,
            headers: {},
        };

        response = await axios.request(options);
        console.log(response);

        if (response.data.ipoCalendar == null || response.data.ipoCalendar.length == 0) {
            return [];
        }
        return response.data.ipoCalendar;
    } catch (e) {
        return [];
    }
}

async function makeTweet(tweet, isReply, tweetID) {
    //console.log(tweet);
    if (isReply == true) {
        const reply = await client.v2.reply(tweet, tweetID);
        console.log('Tweet Made: ' + JSON.stringify(reply));
        return reply.data.id;
    } else {
        const posted = await client.v2.tweet(tweet);
        console.log('Tweet Made: ' + JSON.stringify(posted));
        return posted.data.id;
    }
}

function isToday(someDate) {
    // Parse the input date string
    const [year, month, day] = someDate.split('-').map(Number);

    // Get today's date
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1; // Month is zero-indexed
    const todayDay = today.getDate();

    // Compare the input date with today's date
    return year === todayYear && month === todayMonth && day === todayDay;
}

function isLastDayOfMonth(date) {
    return date.getDate() == new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

//V2 DATE FUNCTIONS
function getWeekDateRange() {
    // Get today's date
    const today = new Date();

    // Calculate the date after one week
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Format dates as 'YYYY-MM-DD'
    const formattedToday = formatDate(today);
    const formattedNextWeek = formatDate(nextWeek);

    // Return the date range as an array
    return [formattedToday, formattedNextWeek];
}

function getMonthDateRange() {
    // Get today's date
    const today = new Date();

    // Calculate the date after one week
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 30); //this can be issue if range is not correct

    // Format dates as 'YYYY-MM-DD'
    const formattedToday = formatDate(today);
    const formattedNextWeek = formatDate(nextWeek);

    // Return the date range as an array
    return [formattedToday, formattedNextWeek];
}

// Function to format date as 'YYYY-MM-DD'
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
