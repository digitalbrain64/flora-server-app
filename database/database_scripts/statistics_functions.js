/* Statistic Functions Module */
const fs = require('fs');

// using npm mysql package for mysql db managment
const mysql = require('mysql');

// using mysql connection pool to manage connections and keep the connections to mysql db alive
var mysqlPool = mysql.createPool("mysql://bbf377481226a0:eaef03fd@us-cdbr-iron-east-02.cleardb.net/heroku_99593e22b69be93?reconnect=true");

var timers = [];
/* Statistics include:
1. calories counter - how much calories the device user burned in the past hour/day
   basis on avg speed, pulse, distance.
2. percentage of health risk - basis on weather information from the erea where user is currently at
   and avg pulse measurments in the past hour/day.
3. distance that the user walked in the past hour/day.

all statistics data is stored in: database -> tables -> stats_per_hour
updates with new data every 3 seconds and resets all data each hour (and starts over)

*/


// main function that starts the statistics infinite data proccessing
async function start_stat(jsonObj,time_stamp){
    getUserInfoAndCreateStatFile(jsonObj,time_stamp);
    console.log(`statistics started for device ${jsonObj.GSTSerial}`);
    

    // set interval triggers a function every 1 minute (60000 ms)
    var timer_id = setInterval(function(){
        // step one: read the data collected inside the ./database/database_files/devices_stats/stats_device_${jsonObj.GSTSerial}.txt
        // other functions added data to this file every time a GST device sent an update with all newest device data
        var jsonDataFromFile;
                try {
                    var data = fs.readFileSync(`./database/database_files/devices_stats/stats_device_${jsonObj.GSTSerial}.txt`);
                    jsonDataFromFile = JSON.parse(data); // parsing the data from the file to JSON
                    console.log(`statistic file parsed correctly`);
                    

                } catch (error) {
                    getUserInfoAndCreateStatFile(jsonObj,time_stamp);
                    var data = fs.readFileSync(`./database/database_files/devices_stats/stats_device_${jsonObj.GSTSerial}.txt`);
                    jsonDataFromFile = JSON.parse(data); // parsing the data from the file to JSON
                    console.log(`server error ${error} - reseting device ${jsonObj.GSTSerial} statistics`);
                }
                        
                // statistic will be reset by the end of the day
                // data dateTimeFromFile stores the dateTime when the statistic started for the current device
                // (this inclides date and time when statistic started)
                var dateTimeFromFile = new Date(jsonDataFromFile[0].stat_start_time);
                // day from file is the day in the week when the statistic started
                var dayFromFile = dateTimeFromFile.getDay();

                // dateTimeCurrent is the current dateTime object from the location where the server is located
                // cloud services are often located in different time zones
                var dateTimeCurrent = new Date();
                dateTimeCurrent.setHours(dateTimeCurrent.getHours());
                var currentDay = dateTimeCurrent.getDay();

                //console.log(hourFromFile, currentHour);
                // if day has passed - reset the data of the file
                // statistic data will be reset ONLY in local file, database will still have the latest data and will not be reset
                // new statistic data will sumply overwrite the old data 
                //if(dateTimeFromFile.getHours() != dateTimeCurrent.getHours()){

                if(dayFromFile != currentDay){

                    // saving daily statistic report for the previous day

                    // stripping away the date - getting rid of hours, minutes, milliseconds
                    // leaving only the date in the correct format
                    var reportDate = dateTimeFromFile;
                    reportDate.setHours(0);
                    reportDate.setMinutes(0);
                    reportDate.setMilliseconds(0);

                    // daving the daily stat for the previous day in the database
                    mysqlPool.query(`INSERT INTO device_statistic_daily_reports(device_sn, avg_pulse, distance, avg_speed, calories, date)
                    VALUES(${jsonDataFromFile[0].device_id}, ${jsonDataFromFile[0].avg_pulse_daily}, ${parseFloat(jsonDataFromFile[0].total_distance).toFixed(3)}, ${parseFloat(jsonDataFromFile[0].avg_speed).toFixed(3)} ,${parseFloat(jsonDataFromFile[0].approx_calories).toFixed(2)}, "${reportDate.toISOString().slice(0, 19).replace('T', ' ')}")`, function(err, result, fields){
                        if(err) throw err;
                    })
                    // resseting the stat file before moving to the next day
                    jsonDataFromFile[0].stat_start_time = dateTimeCurrent;
                    jsonDataFromFile[0].avg_pulse_daily = 0;
                    jsonDataFromFile[0].total_distance = 0;
                    jsonDataFromFile[0].total_pulse = jsonDataFromFile[0].avg_steps;
                    jsonDataFromFile[0].update_counter = 0;
                    jsonDataFromFile[0].approx_calories = 0;
                    jsonDataFromFile[0].avg_speed = 0;
                    jsonDataFromFile[0].avg_steps = 0;
                    jsonDataFromFile[0].distance = 0;
                    jsonDataFromFile[0].avg_pulse = 0;



                    // update the database table with current statistic data
                    mysqlPool.query(`UPDATE device_statistic
                    SET avg_pulse = 0,
                    avg_pulse_daily = 0,
                    total_distance = 0,
                    avg_speed = 0,
                    steps_count = 0,
                    calories_burn = 0,
                    stats_start_time = "${reportDate.toISOString().slice(0, 19).replace('T', ' ')}",
                    minutes_since_stats_start = 0
                    WHERE device_sn = ${jsonDataFromFile[0].device_id};`, function(err, result, fields){
                        if(err) throw err;
                        else{
                            console.log(`statistic for device: ${jsonDataFromFile[0].device_id}  -  updated`);
                        }
                    });
                }
                // if day has not passed then simply update the data in the file and update the database table
                else{
                    // difference in milliseconds = currenct date (date and time from where the server is located) - date time from the file (when statistic started)
                    var diffInMS = dateTimeCurrent.getTime() - dateTimeFromFile.getTime(); //milliseconds
                    var diffInHours = (diffInMS/(1000*60*60))%24; // difference in hours

                    var durationPerTimeSlice = parseInt(((diffInMS / (1000*60)) % 60)); // minutes since start of measurement


                    // average pulse per minute = total sum of pulse measurements per minute (approx. every 3 seconds) devided by pulse counter (number of pulse updates per minute)
                    // if pulse counter for the passed minute is NOT 0:
                    // calculate the average pulse for the passed minute
                    // add one minute to pulse minute counter (one minute with successful pulse data recieved)
                    // add average pulse to total pulse daily
                    if(jsonDataFromFile[0].pulse_counter != 0){
                        jsonDataFromFile[0].avg_pulse = jsonDataFromFile[0].total_pulse/jsonDataFromFile[0].pulse_counter;
                        jsonDataFromFile[0].pulse_minute_counter+=1; // add one minute
                        jsonDataFromFile[0].total_pulse_daily+=jsonDataFromFile[0].avg_pulse;
                    }
                    // if pulse counter for the passed minute is 0 (all pulse measurements for the past minute were 0)
                    // add 0 to total pulse daily
                    // average pulse for the passed minute is 0
                    else{
                        jsonDataFromFile[0].total_pulse_daily+=0;
                        jsonDataFromFile[0].avg_pulse = 0;
                    }

                    // average pulse for the whole time is total pulse for the whole time / daily pulse counter (minutes with succesful pulse data)
                    if(jsonDataFromFile[0].pulse_counter!=0){
                        jsonDataFromFile[0].avg_pulse_daily = parseInt(jsonDataFromFile[0].total_pulse_daily/jsonDataFromFile[0].pulse_minute_counter);
                    }
                    


                    // total distance will store the total distance that has been passed by the user until this point
                    // every device update simply adds distance passed to total_distance
                    jsonDataFromFile[0].total_distance += jsonDataFromFile[0].distance; 
                    

                    // average speed is calculated by taking the total distance and devide it by difference in hours
                    var avgSpeedPerTimeSlice = jsonDataFromFile[0].total_distance/diffInHours; // average speed of user per time slice (in km/h)

                    jsonDataFromFile[0].avg_speed = avgSpeedPerTimeSlice;


                    // normal heart rate according to the age of the device user
                    // this numbers were taken from https://www.health.harvard.edu/heart-health/what-your-heart-rate-is-telling-you arcticle
                    // numbers represent the normal heart rate levels according to age age group

                    // calories burned calculation:
                    // to measure the accurate calories burned we need to use:
                    // 1. age
                    var userAge = jsonDataFromFile[0].user_age;
                            
                    // 2. weight
                    var userWeightInKg = jsonDataFromFile[0].user_weight;

                    // 3. sex
                    var userGender = jsonDataFromFile[0].user_gender; // 0 - male  ,  1 - female

                    // 4. duration of activity (in minutes)
                    //durationPerTimeSlice

                    // 5. pulse (heart rate)
                    var avgPulsePerTimeSlice = jsonDataFromFile[0].avg_pulse;



                    /* The formulas provided by: Journal of Sport Science (url: http://www.calories-calculator.net/Calculator_Formulars.html) */
                    // Accurate Calorie Burned Calculator Formula for Men(kCal):
                    /* Calorie Burned = [ (AGE_IN_YEAR x 0.2017) + (WEIGHT_IN_KILOGRAM x 0.1988)+ (HEART_BEAT_PER_MINUTE x 0.6309) - 55.0969] x DURATION_IN_MINUTE / 4.184 */

                    // Accurate Calorie Burned Calculator Formula for Women(kCal):
                    /* Calorie Burned = [ (AGE_IN_YEAR x 0.074) + (WEIGHT_IN_KILOGRAM x 0.1263) + (HEART_BEAT_PER_MINUTE x 0.4472) - 20.4022] x DURATION_IN_MINUTE / 4.184 */

                    // for Woman
                    var calories;
                    if(userGender){
                        calories = [ (userAge * 0.074) + (userWeightInKg * 0.1263) + (avgPulsePerTimeSlice * 0.4472) - 20.4022 ] * 1 / 4.184;
                    }
                    // for Men
                    else{
                        calories = [ (userAge * 0.2017) + (userWeightInKg * 0.1988) + (avgPulsePerTimeSlice * 0.6309) - 55.0969 ] * 1 / 4.184;
                    }

                    // add calories to file
                    if(calories < 0){
                        calories = 0;
                    }
                    jsonDataFromFile[0].approx_calories += calories;

                    jsonDataFromFile[0].avg_steps = parseFloat(jsonDataFromFile[0].total_distance) * 1250; // approx. number of steps in 1 km for average person

                    // update the database table with current statistic data
                    mysqlPool.query(`UPDATE device_statistic
                    SET avg_pulse = ${parseInt(jsonDataFromFile[0].avg_pulse)},
                    avg_pulse_daily = ${parseInt(jsonDataFromFile[0].avg_pulse_daily)},
                    total_distance = ${parseFloat(jsonDataFromFile[0].total_distance).toFixed(3)},
                    user_age = ${userAge},
                    avg_speed = ${parseFloat(jsonDataFromFile[0].avg_speed).toFixed(2)},
                    steps_count = ${parseInt(jsonDataFromFile[0].avg_steps)},
                    calories_burn = ${parseFloat(jsonDataFromFile[0].approx_calories).toFixed(2)},
                    stats_start_time = "${jsonDataFromFile[0].stat_start_time}",
                    minutes_since_stats_start = ${durationPerTimeSlice}
                    WHERE device_sn = ${jsonDataFromFile[0].device_id};`, function(err, result, fields){
                        if(err) throw err;
                        else{
                            console.log(`statistic for device: ${jsonDataFromFile[0].device_id}  -  updated`);
                            
                        }
                    });

                    if(jsonDataFromFile[0].avg_pulse != 0){
                        updateMaxMinPulse(jsonDataFromFile[0]);
                    }
                    

                    // statistic report teminal logs
                    console.log(`\n\n################\n`);
                    console.log(`device [${jsonDataFromFile[0].device_id}] statistic report for passed minute:\n`);
                    console.log(`@ Pulse:\n`);
                    console.log(`success pulse countings for past 1 minute: ${jsonDataFromFile[0].pulse_counter} times`);
                    console.log(`total minutes with successful pulse countings: ${jsonDataFromFile[0].pulse_minute_counter} minutes`);
                    console.log(`average pulse for past 1 minute: ${jsonDataFromFile[0].avg_pulse} bpm`);
                    console.log(`average pulse for the whole day: ${jsonDataFromFile[0].avg_pulse_daily} bpm\n\n`);
                    console.log(`@ Distance:\n`);
                    console.log(`distance passed for the past minute: ${parseFloat(jsonDataFromFile[0].distance).toFixed(2)} km`);
                    console.log(`average speed for the passed minute: ${parseFloat(jsonDataFromFile[0].distance/0.0166667).toFixed(2)} km/h`);
                    console.log(`total distance passed for whole day: ${parseFloat(jsonDataFromFile[0].total_distance).toFixed(2)} km`);
                    console.log(`total speed for the whole day: ${parseFloat(jsonDataFromFile[0].avg_speed).toFixed(2)} km\h`);
                    console.log(`total steps for the whole day: ${parseInt(jsonDataFromFile[0].avg_steps)} steps\n\n`);
                    console.log(`@ Calories:\n`);
                    console.log(`total steps for the whole day: ${parseFloat(jsonDataFromFile[0].approx_calories).toFixed(2)} kCal\n`);
                    console.log(`\n################\n\n`);

                    // reset the total_pulse, update_counter, distance befora starting next data collection
                    jsonDataFromFile[0].total_pulse = 0;
                    jsonDataFromFile[0].update_counter = 0;
                    jsonDataFromFile[0].distance = 0;
                    jsonDataFromFile[0].pulse_counter = 0;
                }
            // update the statistic file for this device
            fs.writeFileSync(`./database/database_files/devices_stats/stats_device_${jsonDataFromFile[0].device_id}.txt`, JSON.stringify(jsonDataFromFile));
},60000);

// add new item to timers[] 
// items in the array will help in stoping the setInterval function when device goes offline
// if we dont stop the setInterval - function will continue collecting data for statistic even when device is offline which result in error becasue the content of the statistic file will be emtied when device goes offline
var timerObj = {
    itemId: jsonObj.GSTSerial, // device_id
    timerId: timer_id // setInterval id (for stoping/ clearing setInterval)
}

timers.push(timerObj);

}




// utility functions for this statistic data proccessing

// method to fetch device user data and create stats_device_<device_id>.txt file for statistics
function getUserInfoAndCreateStatFile(jsonObj,time_stamp){
    mysqlPool.query(`SELECT * FROM device_users 
    WHERE device_users.device_sn=${jsonObj.GSTSerial};`, function (error, result, fields) {
        if (error){ 
            throw error
        }
        else{
            var dateTimeCurrent = new Date();
            var user_birthday = new Date(result[0].birthday);
            var userAge = dateTimeCurrent.getFullYear() - user_birthday.getFullYear();
                            
            var deviceStatObj = {
                device_id: jsonObj.GSTSerial, //device serial number
                stat_start_time: time_stamp, //statistic start time (for catching when hour passed)
                user_weight: result[0].weight,
                user_height: result[0].height,
                user_gender: result[0].gender,
                latitude:0,
                longitude:0,
                update_counter:1,
                user_age: userAge,
                total_distance:0,
                total_pulse: jsonObj.pulse,
                total_pulse_daily:0,
                avg_pulse:0,
                avg_pulse_daily:0,
                pulse_minute_counter:0,
                avg_speed:0, // average speed per hour - considering the distance
                distance:0, // distance passed per hour
                approx_calories:0, // calories burned per hour
                avg_steps:0 // steps per hour
            }

            if(jsonObj.pulse != 0){
                deviceStatObj.pulse_counter = 1;
            }
            else{
                deviceStatObj.pulse_counter = 0;
            }
            var jsonDataFromFile = [];
            jsonDataFromFile.push(deviceStatObj);
            fs.writeFile(`./database/database_files/devices_stats/stats_device_${jsonObj.GSTSerial}.txt`, JSON.stringify(jsonDataFromFile), function (err) {
                if (err) throw err;
            });
        }
    });
}

/*  
find the lowest and highest pulse for device user
updated the apropriate tables with lowest and highest pulse until this moment
compare with existing high and low pulse measurements and find the highest and the lowest
also adds location where the highest and lowest pulses occurred and the exact time when that happend 
*/
async function updateMaxMinPulse(jsonObj){
    var dateTimeCurrent = new Date();
    var log_time = dateTimeCurrent.toISOString().slice(0, 19).replace('T', ' ');

    mysqlPool.query(`SELECT * FROM device_highest_pulse WHERE device_sn=${jsonObj.device_id}`, function(err, result, fields){
        if(err)
            throw err;
        else{
            // if no record found - create new record
            if(result.length == 0){
                mysqlPool.query(`INSERT INTO device_highest_pulse(device_sn, time_log, pulse, latitude, longitude)
                VALUES(${jsonObj.device_id}, "${log_time}",${parseInt(jsonObj.avg_pulse)}, "${jsonObj.latitude}", "${jsonObj.longitude}");`, function(err, result, fields){
                    if(err)
                        throw err;
                    else{
                        console.log("new highest pulse detected - table updated");
                    }
                });
            }
            // if record found - check if pulse is higher
            else{
                // if pulse is higher - update the record
                if(parseInt(jsonObj.avg_pulse) > result[0].pulse){
                    mysqlPool.query(`UPDATE device_highest_pulse SET
                    time_log = "${log_time}",
                    pulse = ${parseInt(jsonObj.avg_pulse)},
                    latitude = "${jsonObj.latitude}",
                    longitude = "${jsonObj.longitude}"
                    WHERE device_sn=${jsonObj.device_id}`, function(err, res, fields){
                        if(err)
                            throw err;
                        else{
                            console.log("new highest pulse detected - table updated");
                        }
                    })
                }
            }
        }
    });
    mysqlPool.query(`SELECT * FROM device_lowest_pulse WHERE device_sn=${jsonObj.device_id}`, function(err, result, fields){
        if(err)
            throw err;
        else{
            // if no record found - create new record
            if(result.length == 0){
                mysqlPool.query(`INSERT INTO device_lowest_pulse(device_sn, time_log, pulse, latitude, longitude)
                VALUES(${jsonObj.device_id}, "${log_time}",${parseInt(jsonObj.avg_pulse)}, "${jsonObj.latitude}", "${jsonObj.longitude}");`, function(err, result, fields){
                    if(err)
                        throw err;
                    else{
                        console.log("new lowest pulse detected - table updated");
                    }
                });
            }
            // if record found - check if pulse is lower
            else{
                // if pulse is lower - update the record
                if(parseInt(jsonObj.avg_pulse) < result[0].pulse){
                    mysqlPool.query(`UPDATE device_lowest_pulse SET
                    time_log = "${log_time}",
                    pulse = ${parseInt(jsonObj.avg_pulse)},
                    latitude = "${jsonObj.latitude}",
                    longitude = "${jsonObj.longitude}"
                    WHERE device_sn=${jsonObj.device_id}`, function(err, res, fields){
                        if(err)
                            throw err;
                        else{
                            console.log("new lowest pulse detected - table updated");
                        }
                    })
                }
            }
        }
    });
}

// method to clear the setInterval
// after device goes offline we want to clear (stop) the setInterval function to not repeat itself every 1 minute
let clearTimerInterval = (device_id)=>{
    // loop find the correct setInterval by device id
    for(var i=0 ;i<timers.length; i++){
      if(timers[i].itemId == device_id){
        clearInterval(timers[i].timerId); // stop setInterval by its ID
        timers.splice(i, 1); // remove the object from array
        console.log("set interval cleared");
        break;
      }
    }
}

// exports
module.exports = { 
    start_stat,
    clearTimerInterval
 }