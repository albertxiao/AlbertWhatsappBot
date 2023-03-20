const makeWASocket = require('@adiwajshing/baileys').default
const { DisconnectReason, useMultiFileAuthState } = require('@adiwajshing/baileys')

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('authstates')
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
        console.log(JSON.stringify(m, undefined, 2))

        // console.log('replying to', m.messages[0].key.remoteJid)
        //await sock.sendMessage(m.messages[0].key.remoteJid, { text: 'Hello there!' })
    })
}
// run in main file
connectToWhatsApp()