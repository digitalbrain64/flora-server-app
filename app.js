const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3001;
const getRoutes = require('./routes/database/get_routes');
const postRoutes = require('./routes/database/post_routes');


// bypass CORS restrictions by setting headers
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", '*');
    res.header("Access-Control-Allow-Credentials", true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    next();
});

app.get('/', (req,res,next)=>{
    res.send("hello from Flora on Heroku");
});

// parsing the req body to json
app.use(bodyParser.json());

// using routes
app.use(getRoutes);
app.use(postRoutes);

// listening on available port (set by cloud services or default 3000)
app.listen(port, () =>{
  console.log(`Server is listening on port ${port}`);
});