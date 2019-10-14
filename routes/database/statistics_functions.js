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
*/


// get the main database_functions.js file


/* 1. calories counter */
var device_user_id = "310518410";

let fetchDeviceUserData = (callback, device_user_id)=>{
    mysqlPool.query(`SELECT * FROM device_users WHERE user_id="${device_user_id}"`, function(err, result, fields){
        if(err){
            console.log(err);
          return callback(err, result);
        }
        else{
            console.log(result);
          callback(err, result);
        }
    })
}

let fetchDeviceUpdate = (callback, device_id) =>{
    mysqlPool.query(`SELECT * FROM devices_cache_data WHERE device_sn=${device_id}`, function(err, result, fields){
        if(err){
            console.log(err);
          return callback(err, result);
        }
        else{
            console.log(result);
          callback(err, result);
        }
    })
}

    var date = new Date();
    var device_id;
    var current_date = date;
    var device_user_weight;
    var device_user_birthday;
    var user ;

    fetchDeviceUserData(function(err, result){
        // 1. device_user weight (in kg)
        // 2. device_user age (by getting it from user birthday)
        device_user_weight = result[0].weight;
        device_user_birthday = result[0].birthday;
        device_id = result[0].device_sn;
        user = result[0];
    },device_user_id);

    console.log(user.weight, device_user_birthday, device_user_speed, device_user_pulse);




    var device_user_speed;
    var device_user_pulse;
    var device_user_distance;

    // fetchDeviceUpdate(function(err, result){
    //     // 1. the distance user has covered and average speed per a time slice
    //     // 2. pulse measurments
    //     if(result.device_status == 0){
    //         device_user_pulse = 0;
    //         device_user_speed = 0;
    //     }
    //     else{
    //         device_user_pulse = result.pulse;
    //         device_user_speed = parseFloat(result.avg_speed);
    //     }
    //     device_user_distance = parseFloat(result.distance);
    // },device_id);    




    //
