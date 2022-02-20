//read env-files (not used by heroku task!)
const dotenv = require('dotenv');
dotenv.config();

async function connectToMongo() {
    var url = process.env.CONNSTR_mongo;

    // create a client to mongodb
    var MongoClient = require('mongodb').MongoClient;

    // make client connect to mongo service
    const dbClient = await MongoClient.connect(url);
    if (!dbClient) {
        console.log("failed to connect to mongodb!\nCheck your connection string: " + process.env.CONNSTR_mongo)
        return;
    }
    var db = null;
    try {
        db = dbClient.db('nightscout');

    } catch (err) {
        dbClient.close();
        console.log(err);
        return;
    }
    return [db, dbClient];
}

async function getData(table, column, value, limitEntries = 100000, creationDateFrom = null, creationDateTo = new Date().toISOString()) {
    console.log("get" + value + "Count");

    const [db, dbClient] = await connectToMongo();
    if (!db) return;

    var returnArray = [];
    const findObj = { [column]: value };
    if (creationDateFrom) findObj["created_at"] = { "$gt": creationDateFrom, "$lt": creationDateTo };

    try {
        //fetch nrOfEntries nr of entries from column in table
        returnArray = await db.collection(table)
            .find(findObj, { projection: { _id: 0 } })
            .sort({ $natural: -1 }) //bottomsup
            .limit(Number(limitEntries))
            .toArray();

    } catch (err) {
        console.log(err);
    } finally {
        // close the connection to db when you are done with it
        dbClient.close();
    }

    return returnArray;
};

async function getProfile(datefrom) {
    //console.log("get" + value + "Count");

    const [db, dbClient] = await connectToMongo();
    if (!db) return;

    var returnArray = [];
    try {
        const findObj = {
            eventType: "Profile Switch",
            duration: 0,
            created_at: { "$lte": datefrom }
        };
        //fetch date of last real profile switch that affects the firstdate
        let dateOfFirstP = await db.collection("treatments")
            .find(findObj, { projection: { created_at: 1 } })
            .sort({ $natural: -1 }) //bottomsup
            .limit(1)
            .next();

        const findObj2 = {
            eventType: "Profile Switch",
            created_at: { "$gte": dateOfFirstP.created_at }
        };
        returnArray = await db.collection("treatments")
            .find(findObj2, { projection: { _id: 0 } })
            .sort({ $natural: -1 }) //bottomsup
            .toArray();

    } catch (err) {
        console.log(err);
    } finally {
        // close the connection to db when you are done with it
        dbClient.close();
    }

    return returnArray;
};

module.exports = { getData, getProfile }