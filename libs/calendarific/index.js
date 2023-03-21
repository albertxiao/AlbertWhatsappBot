const { loadEnv, loadArrayStringEnv } = require('../envloader');
const apiKey = loadEnv('CALENDARIFIC_API_KEY');
const countryId = loadEnv('CALENDARIFIC_COUNTRY_ID');
const excludedHolidayNames = loadArrayStringEnv('EXCLUDED_HOLIDAY_NAMES');

module.exports = {
    getHolidayCalendarific: async function (year) {
        let calendarificHolidays = [];
        const resp = await fetch(`https://calendarific.com/api/v2/holidays?&api_key=${apiKey}&country=${countryId}&year=${year}`, {
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
                    calendarificHolidays.push({
                        isoDate: element.date.iso,
                        name: element.name
                    });
                }
            });
        }
        return calendarificHolidays;
    }
}