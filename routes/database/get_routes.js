const express = require('express');
const router = express.Router();

// importing database functionality
const database = require('./database_functions');

// route to get location history from device_location_history
router.get('/getLocationHistory', (req, res, net)=>{
  database.get_location_history(function (err, results) {
    if (err) console.log("Database error!");
    else {
        res.send(JSON.stringify(results));
        next();
    }
  },req.body.device_sn, req.body.from_date, req.body.to_date);
});

// route to get recent data from device_cache_data
router.get('/getDataFromCache', (req, res, next) =>{
  database.get_user_data_from_cache(function (err, results) {
       if (err) console.log("Database error!");
       else {
           res.send(JSON.stringify(results[0]));
           next();
      }
  }, req.body.device_sn);
});

// route to get user from app_users
router.get('/getUser', (req, res, next)=>{
    var pass = req.query.p;
    var email = req.query.e;
    database.get_user(function(err, results){
      if(err){
        console.log("Database error");
        next();
      }
      else{
        res.send(results[0]);
        next();
      }
    }, email, pass)
});

module.exports = router;