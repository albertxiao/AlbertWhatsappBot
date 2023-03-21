const makeWASocket = require('@adiwajshing/baileys').default
const { DisconnectReason, useMultiFileAuthState } = require('@adiwajshing/baileys')
const { loadEnv, loadArrayStringEnv } = require('./libs/envloader');
const { getHolidays, isTodayHoliday } = require('./libs/holidayhelper');

const tz = loadEnv('TZ');
const countryCodeToReply = loadArrayStringEnv('COUNTRY_CODE_DAILY');
const countryCodeToReplyForHoliday = loadArrayStringEnv('COUNTRY_CODE_DAILY_HOLIDAY');
process.env.TZ = tz;

let replyLimit = -1;
let replyCount = 0;
let lastUserMessageLog = [];


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
        if (replyLimit == -1) {
            replyCount = -99;
        }

        if (!m.messages[0] || !m.messages[0].key || !m.messages[0].key.remoteJid || m.messages[0].key.fromMe) {
            return;
        }

        const msgTimeStamp = m.messages[0].messageTimestamp;
        const remoteJid = m.messages[0].key.remoteJid;
        const phone = remoteJid.split('@')[0];

        const curTime = Math.floor(Date.now() / 1000)
        const previousDayTime = curTime - 86400;
        const isNewMessage = msgTimeStamp > (curTime - 300);

        if (!isNewMessage) {
            console.warn('[warn] old message received');
            return;
        }

        if (replyCount < replyLimit && isNewMessage) {
            let curUserIdx = lastUserMessageLog.findIndex(i => i.remoteJid === remoteJid);
            let lastMsgTime = 1;
            if (curUserIdx > -1) {
                lastMsgTime = lastUserMessageLog[curUserIdx].lastMsgTime;
                lastUserMessageLog[curUserIdx].remoteJid = remoteJid;
                lastUserMessageLog[curUserIdx].lastMsgTime = msgTimeStamp;
            }
            else {
                lastUserMessageLog.push({
                    remoteJid: remoteJid,
                    lastMsgTime: msgTimeStamp
                })
                curUserIdx = lastUserMessageLog.findIndex(i => i.remoteJid === remoteJid);
            }

            const curHour = new Date().getHours();
            const isNight = curHour >= 21 || curHour <= 7
            let isValidSendNightMsg = isNight;
            if (isNight && lastUserMessageLog[curUserIdx].lastNightMsgTime && curTime - lastUserMessageLog[curUserIdx].lastNightMsgTime <= 43200) {
                isValidSendNightMsg = false;
            }

            const isHoliday = await isTodayHoliday();
            const isValidSendDailyMsg = (previousDayTime > lastMsgTime);
            const isValidSendDailyMsgHoliday = (previousDayTime > lastMsgTime && isHoliday);
            const isValidNumber = countryCodeToReply.some(elem => phone.match('^' + elem));
            const isValidNumberHoliday = countryCodeToReplyForHoliday.some(elem => phone.match('^' + elem));

            if (isValidSendNightMsg) {
                lastUserMessageLog[curUserIdx].lastNightMsgTime = msgTimeStamp;
                console.log('[night mode] replying to', remoteJid)
                await sock.sendMessage(remoteJid,
                    {
                        text: `[Auto-Reply] Thank you for your message. \n I'm currently not available. \n Just leave message & I will respond later!`
                    });
            }
            else if (!isNight && isValidSendDailyMsgHoliday && isValidNumberHoliday) {
                console.log('replying to', remoteJid)
                await sock.sendMessage(remoteJid,
                    {
                        text: `[Auto-Reply] Thank you for your message. \n I'm currently on leave / holiday. \n Just leave messages & I will respond later!`
                    });
                replyCount++;
            }
            else if (!isNight && isValidSendDailyMsg && isValidNumber) {
                console.log('replying to', remoteJid)
                await sock.sendMessage(remoteJid,
                    {
                        text: `[Auto-Balas] Halo! terima kasih sudah mengirimkan pesan \n Silahkan tinggalkan pesan, saya akan balas nanti!`
                    });
                replyCount++;
            }
        }
    })
}
// run in main file
connectToWhatsApp()