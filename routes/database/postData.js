const express = require('express');
const router = express.Router();

// importing database functionality
const database = require('./database_functions');

// post data from device
router.post('/floraData', (req,res,next) => {   
    database.post_data_from_flora_device(req.body);
    // getting client ip address for additional geolocation detection
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    console.log(ip);
    
    res.sendStatus(200);
    next();
});

module.exports = router;