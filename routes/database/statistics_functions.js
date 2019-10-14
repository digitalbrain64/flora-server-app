/* database functionality module */
/* contains all neccesery database functions for internal use and export */
const fs = require('fs');

// using npm mysql package for mysql db managment
const mysql = require('mysql');

// request for http requests
const request = require('request');

// using mysql connection pool to manage connections and keep the connections to mysql db alive
var mysqlPool = mysql.createPool("mysql://bbf377481226a0:eaef03fd@us-cdbr-iron-east-02.cleardb.net/heroku_99593e22b69be93?reconnect=true");


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
function start_stat(device_id){
    getDeviceUpdates(function(err, result){
        fs.readFile('./stats_util.txt', function(err, data){
            if(err) throw err;
            var jsonDataFromFile = JSON.parse(data);
            if(jsonDataFromFile.length == 0){
                var jsonObj = {
                    device_id:result[0].device_sn,
                    stat_start_time:result[0].log_time,
                    pulse_at_start:result[0].pulse,
                    battery_at_start:result[0].battery,
                    bt_time_counter_on: 0,
                    bt_time_counter_off: 0,
                    device_time_counter_on:0,
                    device_time_counter_off:0,
                    avg_speed:0,
                    distance:0,
                    avg_calories:0,
                    avg_steps:0
                }
                jsonDataFromFile.push(jsonObj);
                fs.writeFile('./stats_util.txt', JSON.stringify(jsonDataFromFile) , function(err, data){
                    if (err) throw err;
                })
            }
            else{
                for(var i=0; i<jsonDataFromFile.length; i++){
                    if(jsonDataFromFile[i].device_id == device_id){
                        var dateTimeFromFile = new Date(jsonDataFromFile[i].stat_start_time);
                        var hourFromFile = dateTimeFromFile.getHours();

                        var dateTimeFromUpdate = new Date(result[0].log_time);
                        var hourFromUpdate = dateTimeFromUpdate.getHours();
                        console.log(hourFromFile, hourFromUpdate);
                        
                        if(hourFromFile != hourFromUpdate){
                            var jsonObj = {
                                device_id:result[0].device_sn,
                                stat_start_time:result[0].log_time,
                                pulse_at_start:result[0].pulse,
                                battery_at_start:result[0].battery,
                                bt_time_counter_on: 0,
                                bt_time_counter_off: 0,
                                device_time_counter_on:0,
                                device_time_counter_off:0,
                                avg_speed:0,
                                distance:0,
                                avg_calories:0,
                                avg_steps:0
                            }
                            jsonDataFromFile[i] = jsonObj;
                            fs.writeFile('./stats_util.txt', JSON.stringify(jsonDataFromFile) , function(err, data){
                                if (err) throw err;
                            })
                        }
                        else{
                            // bluetooth active time counter (every 3 seconds)
                            if(result[0].bt_status == 0){
                                jsonDataFromFile[i].bt_time_counter_off+=3;
                            }
                            else{
                                jsonDataFromFile[i].bt_time_counter_on+=3;
                            }

                            if(result[0].device_status == 0){
                                jsonDataFromFile[i].device_time_counter_off+=3;
                            }
                            else{
                                jsonDataFromFile[i].device_time_counter_on+=3;
                            }

                            if(jsonDataFromFile[i].distance != result[0].distance){
                                jsonDataFromFile[i].distance
                            }
                            fs.writeFile('./stats_util.txt', JSON.stringify(jsonDataFromFile) , function(err, data){
                                if (err) throw err;
                            })
                        }
                    }
                }
            }
        });
    },device_id)
    
}


// utility functions for this statistic data proccessing

// get all device users
let getAllDeviceUsers= (callback)=>{
    mysqlPool.query(`SELECT * FROM device_users`, function(err, results, fields){
        if(err){
          return callback(err, results);
        }
        else{
          callback(err, results);
        }
    });
}

// get device update (by device_id)
let getDeviceUpdates = (callback, device_id)=>{
    mysqlPool.query(`SELECT * FROM devices_cache_data WHERE device_sn = ${device_id}`, function (error, result, fields) {
        if (error){ 
            return callback(error,result);
        }
        else{
            callback(error,result);
        }
    });
}

// get single device statistics (per hour table)
let getDeviceStatPerHour = (callback, device_id)=>{
    mysqlPool.query(`SELECT * FROM stats_per_hour WHERE device_sn = ${device_id}`, function (error, result, fields) {
        if (error){ 
            return callback(error,result);
        }
        else{
            callback(error,result);
        }
    });
}

let addNewStatsPerHour = (obj)=>{
    mysqlPool.query(`INSERT INTO stats_per_hour(device_sn, user_id, user_weight, user_age, user_avg_pulse, user_avg_distance, user_avg_speed, user_steps, user_avg_calories, stats_start_time, device_on_time, device_off_time)
    VALUES()`)
}

module.exports = { start_stat }