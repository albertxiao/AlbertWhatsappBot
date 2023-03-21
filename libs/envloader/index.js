require('dotenv').config();


module.exports = {
    loadEnv: function (envName) {
        let envValue = process.env[envName] || null;
        return envValue;
    },
    loadArrayStringEnv: function (envName) {
        let envValueRaw = process.env[envName] || null;
        let envValueSplitted = [];
        if(envValueRaw) {
            const splittedVal = envValueRaw.split(',');
            splittedVal.forEach(element => {
                envValueSplitted.push(element.toString());
            });
        }
        return envValueSplitted;
    },
}