const express = require('express');

const path = require('path');

const dbhelper = require("./dbHelper.js")

const isDev = process.env.NODE_ENV != 'production';
const PORT = process.env.PORT || 5000;

const app = express();
// Priority serve any static files.
app.use(express.static(path.resolve(__dirname, '../frontend/build')));

//this is for debugging  
app.use(function (req, res, next) {
    if (isDev) {
        res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.header(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept'
        );
    }
    next();
});

// Answer API requests with param ("/addtocount/pod/10") 
// For params instead of /:sdgf/:dfsf ("/addtocount?nr=23&type=omnipod") see: https://stackoverflow.com/a/17008027

function isNotADate(date) {
    return !(new Date(date) !== "Invalid Date") && !isNaN(new Date(date));
}
function isNotClean(val) {
    return String(val).match(new RegExp("[\[\]\$\{\}]"));
}

const validTables = ["treatments", "entries", "devicestatus", "profile"];
const validColumns = ["created_at", "eventType", "insulin"];


app.get('/getsgv', async function (req, res) {
    let dateFrom = req.query.datefrom;
    let dateTo = req.query.dateto ? req.query.dateto : new Date().toISOString();
    let count = req.query.count ? req.query.count : 1000;

    res.set('Content-Type', 'application/json');
    if (isNotADate(dateFrom) || isNotADate(dateTo) || isNotClean(count)) {
        res.send('{"message":"Not a valid call!"}');
        return;
    }
    let entries = await dbhelper.getData("entries", "type", "sgv", count, dateFrom, dateTo);
    res.send(JSON.stringify(entries));
});

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }
  


app.get('/getopenaps', async function (req, res) {
    let dateFrom = req.query.datefrom;
    let dateTo = req.query.dateto ? req.query.dateto : new Date().toISOString();
    let count = req.query.count ? req.query.count : 1000;
    await delay(10); //atlas is buggy if all queries are executed simultaniously...
    res.set('Content-Type', 'application/json');
    if (isNotADate(dateFrom) || isNotADate(dateTo) || isNotClean(count)) {
        res.send('{"message":"Not a valid call!"}');
        return;
    }
    let entries = await dbhelper.getData("devicestatus", "openaps", null, count, dateFrom, dateTo);
    res.send(JSON.stringify(entries));
});


app.get('/gettempbasal', async function (req, res) {
    let dateFrom = req.query.datefrom;
    let dateTo = req.query.dateto ? req.query.dateto : new Date().toISOString();
    let count = req.query.count ? req.query.count : 1000;
    await delay(20);
    res.set('Content-Type', 'application/json');
    if (isNotADate(dateFrom) || isNotADate(dateTo) || isNotClean(count)) {
        res.send('{"message":"Not a valid call!"}');
        return;
    }
    let entries = await dbhelper.getData("treatments", "eventType", "Temp Basal", count, dateFrom, dateTo);
    res.send(JSON.stringify(entries));
});

app.get('/getmealbolus', async function (req, res) {
    let dateFrom = req.query.datefrom;
    let dateTo = req.query.dateto ? req.query.dateto : new Date().toISOString();
    let count = req.query.count ? req.query.count : 1000;
    await delay(30);
    res.set('Content-Type', 'application/json');
    if (isNotADate(dateFrom) || isNotADate(dateTo) || isNotClean(count)) {
        res.send('{"message":"Not a valid call!"}');
        return;
    }
    let entries = await dbhelper.getData("treatments", "eventType", "Meal Bolus", count, dateFrom, dateTo);
    res.send(JSON.stringify(entries));
});


app.get('/getprofiles', async function (req, res) {
    let datefrom = req.query.datefrom ? req.query.datefrom : new Date().toISOString();
    await delay(40);
    res.set('Content-Type', 'application/json');
    if (isNotADate(datefrom)) {
        res.send('{"message":"Not a valid call!"}');
        return;
    }
    let entries = await dbhelper.getProfile(datefrom);
    res.send(JSON.stringify(entries));
});

// All remaining requests return the React app, so it can handle routing.
app.get('*', function (request, response) {
    response.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
});

app.listen(PORT, function () {
    console.error(`Node ${isDev ? 'dev server' : 'cluster worker ' + process.pid}: listening on port ${PORT}`);
});