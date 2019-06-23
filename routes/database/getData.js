const express = require('express');
const router = express.Router();

// importing database functionality
const database = require('./database_functions');


router.get('/getDataFromCache', (req, res, next) =>{
    database.get_user_data_from_cache(function (err, results) {
        if (err) console.log("Database error!");
        else {
            res.send(JSON.stringify(results[0]));
            next();
        }
    });
});

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