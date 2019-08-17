const express = require('express');
const router = express.Router();

// importing database functionality
const database = require('./database_functions');

// route to get location history from device_location_history
router.get('/getLocationHistory', (req, res, next)=>{
  if(!req.query.device_sn || !req.query.from_date || !req.query.to_date){
    res.send({
      status : "error",
      message : "please provide parameters: device id, from date, to date"
    })
  }
  database.get_location_history(function (err, result) {
    if (err)
        res.send({
          status : "error",
          message : err
        })
    else {
        res.send(result);
        console.log(`results found: ${result.length}\n#########`);
        
    }
  },req.query.device_sn, req.query.from_date, req.query.to_date);
});

// route to get recent data from device_cache_data
router.get('/getDataFromCache', (req, res, next) =>{
  console.log("fetching data for device_sn: "+req.query.device_sn);
  database.get_user_data_from_cache(function (err, result) {
      if (err)
        console.log("Database error!");
      else
        res.send(result);
      next();
  }, req.query.device_sn);
});

// route to get user from app_users
router.get('/getUserData', (req, res, next)=>{
    if(!req.query.p && !req.query.u)
      res.send({
        status : "error",
        message : "please provide password and username/email"
      })
    else{
      database.get_user(function(err, results){
        if(err)
          res.send({
            status : "error",
            message : err
          })
        else
          res.send(results);
      }, req.query.u, req.query.p)
    } 
});

router.get('/getWeatherUpdate', (req, res, next)=>{
  database.get_weather_update(function(err, result){
    if(err)
      res.send({
        status : "error",
        message : err
      });
    else
      res.send(result);
    next();
  }, req.query.lat, req.query.lng)
})



/* password restore routes */
// 1 : getting email or username of the user
// checking whats the phone number and sending verification code to the number
// adding the code to the user in the database
router.get('/sendRestoreCode', (req, res, next)=>{
  if(!req.query.u){
    res.send({
      status:"error",
      message:"missing username/email"
    })
  }
  else{
    database.send_pass_restore_code(function(err, result){
      if(err)
        res.send({
          status : "error",
          message : err
        })
      else
        res.send(result)
    },req.query.u);
  }
  
})

// 2 : getting the email and the code entered by the user
// validating the code and email if user exists
// if all went well : email sent back to client for later use in the final step
router.get('/checkRestoreCode', (req, res, next)=>{
  var code = req.query.restoreCode;
  var email = req.query.e;

  database.check_restore_code(function(err, result){
    if(err)
      res.send({
        status : "error",
        message : err
      })
    else
      res.send(result)
  },email,code)
})

// 3 : sending the new password and email from previous step
// updating the password and removing the restore_code from user in database
router.get('/passChange', (req, res, next)=>{
  var newPass = req.query.newPass;
  var user_email = req.query.e;
  database.change_user_pass(function(err, result){
    if(err)
      res.send({
        status : "error",
        message : err
      })
      else{
        res.send(result)
      }
  },user_email, newPass)
})

router.get('/getLowestPulse', (req, res, next)=>{
  if(!req.query.id){
    res.send({
      status : "error",
      message : "please provide device id"
    })
  }
  else{
    database.get_lowest_pulse(function(err, result){
      if(err)
        res.send({
          status : "error",
          message : err
        });
      else
        res.send(result);
    },req.query.id)
  }
  
})

router.get('/getHighestPulse', (req, res, next)=>{
  if(!req.query.id){
    res.send({
      status : "error",
      message : "please provide device id"
    })
  }
  else{
    database.get_highest_pulse(function(err, result){
      if(err)
        res.send({
          status : "error",
          message : err
        });
      else
        res.send(result);
    },req.query.id)
  }
  
})

module.exports = router;