"use strict"
const fs = require('fs');
const { getHolidayCalendarific } = require('../calendarific');

const getHolidays = () => {
    return new Promise((resolve, reject) => {
        const curYear = new Date().getFullYear();
        let thisYearHoliday = [];
        const fileName = './holidays/' + curYear + '.json';

        fs.access(fileName, fs.constants.F_OK, async (err) => {
            //console.log(`${file} ${err ? 'does not exist' : 'exists'}`);
            if (err) { //not exists
                const calendarificHolidays = await getHolidayCalendarific(curYear);
                const curDate = new Date();
                const dateFormatter = Intl.DateTimeFormat('sv-SE');
                const curIsoDate = dateFormatter.format(curDate);
                thisYearHoliday = {
                    lastUpdate: curIsoDate,
                    holidays: calendarificHolidays
                }
                fs.writeFile(fileName, JSON.stringify(thisYearHoliday, null, 2), (err) => {
                    if (err) {
                        console.error('Error writing file: ' + err.toString())
                        reject(err);
                    }
                    else {
                        console.log(`holiday data: ${fileName} created`);
                        resolve(thisYearHoliday);
                    }
                });
            }
            else {
                fs.readFile(fileName, { encoding: 'utf8' }, (err, data) => {
                    if (err) {
                        console.error('Error read file: ' + err.toString())
                        reject(err);
                    }
                    else {
                        console.log(`holiday data: ${fileName} loaded`);
                        thisYearHoliday = JSON.parse(data);
                        resolve(thisYearHoliday);
                    }
                });
            }
        });
    });
}

const isTodayHoliday = async () => {
    const curDate = new Date();
    const dateFormatter = Intl.DateTimeFormat('sv-SE');
    const curIsoDate = dateFormatter.format(curDate);
    const holidayObject = await getHolidays();
    const holidays = holidayObject.holidays;
    const curHolidayIndex = holidays.findIndex(i => i.isoDate == curIsoDate);
    const isHoliday = curHolidayIndex > -1
    return isHoliday;
}

module.exports = {
    getHolidays,
    isTodayHoliday
}