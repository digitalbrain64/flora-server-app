/* database functionality module */
/* contains all neccesery database functions for internal use and export */
const fs = require('fs');

// using npm mysql package for mysql db managment
const mysql = require('mysql');

// request for http requests
const request = require('request');

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
function start_stat(jsonObj,time_stamp){
    getUserInfoAndCreateStatFile(jsonObj,time_stamp);
    console.log(`statistics started for device ${jsonObj.GSTSerial}`);
    

    // set interval triggers a function every 1 minute (60000 ms)
    var timer_id = setInterval(function(){
        // step one: read the data collected inside the ./database/database_files/devices_stats/stats_device_${jsonObj.GSTSerial}.txt
        // other functions added data to this file every time a GST device sent an update with all newest device data
            fs.readFile(`./database/database_files/devices_stats/stats_device_${jsonObj.GSTSerial}.txt`, function(err, data){
                if(err) throw err;

                var jsonDataFromFile = JSON.parse(data); // parsing the data from the file to JSON
                        
                // statistic will be reset by the end of the day
                // data dateTimeFromFile stores the dateTime when the statistic started for the current device
                // (this inclides date and time when statistic started)
                var dateTimeFromFile = new Date(jsonDataFromFile[0].stat_start_time);
                // day from file is the day in the week when the statistic started
                var dayFromFile = dateTimeFromFile.getDay();

                // dateTimeCurrent is the current dateTime object from the location where the server is located
                // cloud services are often located in different time zones
                var dateTimeCurrent = new Date();
                var currentDay = dateTimeCurrent.getDay();

                //console.log(hourFromFile, currentHour);

                // if day has passed - reset the data of the file
                // statistic data will be reset ONLY in local file, database will still have the latest data and will not be reset
                // new statistic data will sumply overwrite the old data 
                if(dayFromFile != currentDay){
                //
                }
                // if day has not passed then simply update the data in the file and update the database table
                else{

                    // average pulse = total sum of pulse measurements per minute (approx. every 3 seconds) devided by update counter (number of updates that been recieved from the device per minute)
                    jsonDataFromFile[0].avg_pulse = jsonDataFromFile[0].total_pulse/jsonDataFromFile[0].update_counter; // average bpm per minute
                    // exmaple: device sends an update every 3 seconds, with every update the pulse remains the same = 100 bpm
                    // each time the device sends data the pulse measurement is stored in .total_pulse
                    // by the end of every minute .total_pulse will be = 2000 bpm (100bpm every 3 seconds = 20 updates per minute)
                    // average pulse per minute will be 2000 total pulse / 20 number of updates per minute = 100 bpm (average pulse to this minute)

                    // total distance will store the total distance that has been passed by the user until this point
                    // every device update simply adds distance passed to total_distance
                    jsonDataFromFile[0].total_distance += jsonDataFromFile[0].distance; 


                    // difference in milliseconds = currenct date (date and time from where the server is located) - date time from the file (when statistic started)
                    var diffInMS = parseInt(dateTimeCurrent.getTime() - dateTimeFromFile.getTime()); //milliseconds
                    var diffInHours = (diffInMS/(1000*60*60))%24; // difference in hours

                    // average speed is calculated by taking the total distance and devide it by difference in hours
                    var avgSpeedPerTimeSlice = jsonDataFromFile[0].total_distance/diffInHours; // average speed of user per time slice (in km/h)

                    jsonDataFromFile[0].avg_speed = avgSpeedPerTimeSlice;

                    // calories burned calculation:
                    // to measure the accurate calories burned we need to use:
                    // 1. age
                    var userAge = jsonDataFromFile[0].user_age;
                            
                    // 2. weight
                    var userWeightInKg = jsonDataFromFile[0].user_weight;

                    // 3. sex
                    var userGender = jsonDataFromFile[0].user_gender; // 0 - male  ,  1 - female

                    // 4. duration of activity (in minutes)
                    var durationPerTimeSlice = 1; // 1 minutes between each setInterval callback function

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
                        calories = [ (userAge * 0.074) + (userWeightInKg * 0.1263) + (avgPulsePerTimeSlice * 0.4472) - 20.4022 ] * durationPerTimeSlice / 4.184;
                    }
                    // for Men
                    else{
                        calories = [ (userAge * 0.2017) + (userWeightInKg * 0.1988) + (avgPulsePerTimeSlice * 0.6309) - 55.0969 ] * durationPerTimeSlice / 4.184;
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
                    total_distance = ${parseFloat(jsonDataFromFile[0].total_distance).toFixed(3)},
                    user_age = ${userAge},
                    avg_speed = ${parseFloat(jsonDataFromFile[0].avg_speed).toFixed(3)},
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


                    // reset the total_pulse, update_counter, distance befora starting next data collection
                    jsonDataFromFile[0].total_pulse = 0;
                    jsonDataFromFile[0].update_counter = 0;
                    jsonDataFromFile[0].distance = 0;

                }
            // update the statistic file for this device
            fs.writeFile(`./database/database_files/devices_stats/stats_device_${jsonDataFromFile[0].device_id}.txt`, JSON.stringify(jsonDataFromFile) , function(err, data){
                if (err) throw err;
            })
        });

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
let getUserInfoAndCreateStatFile = (jsonObj,time_stamp)=>{
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
                pulse_at_start: jsonObj.pulse, // user pulse at start of statistic
                battery_at_start: jsonObj.battery, // battery at start - for measuring how much battery has been consumed by hour
                user_weight: result[0].weight,
                user_height: result[0].height,
                user_gender: result[0].gender,
                update_counter:1,
                user_age: userAge,
                total_pulse: jsonObj.pulse,
                total_distance:0,
                avg_pulse:0,
                avg_speed:0, // average speed per hour - considering the distance
                distance:0, // distance passed per hour
                approx_calories:0, // calories burned per hour
                avg_steps:0 // steps per hour
            }
            var jsonDataFromFile = [];
            jsonDataFromFile.push(deviceStatObj);
            fs.writeFile(`./database/database_files/devices_stats/stats_device_${jsonObj.GSTSerial}.txt`, JSON.stringify(jsonDataFromFile), function (err) {
                if (err) throw err;
            });
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

let addNewStatsPerHour = (obj)=>{
    mysqlPool.query(`INSERT INTO stats_per_hour(device_sn, user_id, user_weight, user_age, user_avg_pulse, user_avg_distance, user_avg_speed, user_steps, user_avg_calories, stats_start_time, device_on_time, device_off_time)
    VALUES()`)
}


module.exports = { 
    start_stat,
    clearTimerInterval
 }