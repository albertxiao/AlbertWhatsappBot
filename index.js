const makeWASocket = require('@adiwajshing/baileys').default
const { DisconnectReason, useMultiFileAuthState } = require('@adiwajshing/baileys')
const fs = require('fs');


let replyLimit = -1;
let replyCount = 0;
let lastUserMessageLog = [];
let countryCodeToReply = ['65', '1'];
let excludedHolidayNames = ['Maha Shivaratri', 'Holi', 'March Equinox', 'June Solstice', 'Raksha Bandhan', 'Janmashtami', 'Ganesh Chaturthi',
    'September Equinox', 'Navaratri', 'Dussehra', 'Diwali / Deepavali', 'December Solstice']
let tz = 'Asia/Jakarta'
process.env.TZ = tz;


async function getHolidayCalendarific(year) {
    let holidays = [];
    const resp = await fetch("https://calendarific.com/api/v2/holidays?&api_key=4b9a11ffd075c2a12df25b1aaf8ca53f905afb8d&country=ID&year=" + year, {
        "headers": {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7,zh-CN;q=0.6,zh;q=0.5,ja;q=0.4",
            "sec-ch-ua": "\"Google Chrome\";v=\"111\", \"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"111\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "cookie": "PHPSESSID=v3hcibnhkulv1pumu0i23mndto"
        },
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET"
    });
    const content = await resp.json();
    if (content.response && content.response.holidays) {
        content.response.holidays.forEach(element => {
            if (excludedHolidayNames.indexOf(element.name) == -1) {
                holidays.push({
                    isoDate: element.date.iso,
                    name: element.name
                });
            }
        });
    }
    return holidays;
}

async function getHolidays() {

    return new Promise((resolve, reject) => {
        const curYear = new Date().getFullYear();
        let thisYearHoliday = [];
        const fileName = './holidays/' + curYear + '.json';

        fs.access(fileName, fs.constants.F_OK, async (err) => {
            //console.log(`${file} ${err ? 'does not exist' : 'exists'}`);
            if (err) { //not exists
                thisYearHoliday = await getHolidayCalendarific(curYear);
                fs.writeFile(fileName, JSON.stringify(thisYearHoliday, null, 2), (err) => {
                    if (err) {
                        console.error('Error writing file: ' + err.toString())
                        reject(err);
                    }
                });
                resolve(thisYearHoliday);
            }
            else {
                fs.readFile(fileName, { encoding: 'utf8' }, (err, data) => {
                    if (err) {
                        console.error('Error read file: ' + err.toString())
                        reject(err);
                    }
                    else {
                        thisYearHoliday = JSON.parse(data);
                        resolve(thisYearHoliday);
                    }
                });
            }
        });
    });
}

async function isTodayHoliday() {
    const curDate = new Date();
    const dateFormatter = Intl.DateTimeFormat('sv-SE');
    const curIsoDate = dateFormatter.format(curDate);
    const holidays = await getHolidays();
    const curHolidayIndex = holidays.findIndex(i => i.isoDate == curIsoDate);
    const isHoliday = curHolidayIndex > -1
    return isHoliday;
}
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('authstates')
    await getHolidays(); //run on first start to populate current year data
    // will use the given state to connect

    // so if valid credentials are available -- it'll connect without QR
    const sock = makeWASocket({
        // can provide additional config here
        auth: state,
        printQRInTerminal: true
    })
    // this will be called as soon as the credentials are updated
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to ' + lastDisconnect.error + ', reconnecting ' + shouldReconnect)
            // reconnect if not logged out
            if (shouldReconnect) {
                connectToWhatsApp()
            }
        } else if (connection === 'open') {
            console.log('opened connection')
        }
    })
    sock.ev.on('messages.upsert', async (m) => {
        // console.log(JSON.stringify(m, undefined, 2));
        let isValidToReply = true;
        if (replyLimit == -1) {
            replyCount = -99;
        }
        if (replyCount < replyLimit && m.messages[0].key.remoteJid && !m.messages[0].key.fromMe) {
            let curUserIdx = lastUserMessageLog.findIndex(i => i.remoteJid === m.messages[0].key.remoteJid);
            let lastMsgTime = 1;
            if (curUserIdx > -1) {
                lastMsgTime = lastUserMessageLog[curUserIdx].lastMsgTime;
                lastUserMessageLog[curUserIdx].remoteJid = m.messages[0].key.remoteJid;
                lastUserMessageLog[curUserIdx].lastMsgTime = m.messages[0].messageTimestamp;
            }
            else {
                lastUserMessageLog.push({
                    remoteJid: m.messages[0].key.remoteJid,
                    lastMsgTime: m.messages[0].messageTimestamp
                })
                curUserIdx = lastUserMessageLog.findIndex(i => i.remoteJid === m.messages[0].key.remoteJid);
            }
            // const curMsgTime = m.messages[0].messageTimestamp
            const curTime = Math.floor(Date.now() / 1000)
            const previousDayTime = curTime - 86400;

            const curHour = new Date().getHours();
            const isNight = curHour >= 21 || curHour <= 7
            let isValidSendNightMsg = isNight;
            if (isNight && lastUserMessageLog[curUserIdx].lastNightMsgTime && curTime - lastUserMessageLog[curUserIdx].lastNightMsgTime <= 43200) {
                isValidSendNightMsg = false;
            }

            const isHoliday = isTodayHoliday();
            const isValidSendDailyMsg = (previousDayTime > lastMsgTime && isHoliday);
            const isValidNumber = countryCodeToReply.some(elem => phone.match('^' + elem));

            if (isValidSendNightMsg) {
                lastUserMessageLog[curUserIdx].lastNightMsgTime = m.messages[0].messageTimestamp;
                console.log('[night mode] replying to', m.messages[0].key.remoteJid)
                await sock.sendMessage(m.messages[0].key.remoteJid,
                    {
                        text: `[Auto-Reply] Thank you for your message. \n I'm currently not available. \n Just leave message & I will respond later!`
                    });
            }
            else if (!isNight && isValidSendDailyMsg && isValidNumber) {
                console.log('replying to', m.messages[0].key.remoteJid)
                await sock.sendMessage(m.messages[0].key.remoteJid,
                    {
                    text: `[Auto-Reply] Thank you for your message. \n I'm currently on leave. \n Just leave message & I will respond later!`
                });
                // await sock.sendMessage(m.messages[0].key.remoteJid,
                //     {
                //         text: `[Auto-Reply] Thank you for your message. \n I'm currently not available. \n Just leave message & I will respond later!`
                //     });
                replyCount++;
            }
        }
    })
}
// run in main file
connectToWhatsApp()