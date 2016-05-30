var http = require("http"),
  winston = require('winston'),
  express = require('express'),
  cors = require('cors'),
  twit = require('twit'),
  morgan  = require('morgan'),
  app = express();

var T = new twit({
  consumer_key:         process.env.TWIHEAT_TWITTER_CONSUMER_KEY; // 'P6TxGLffjrgGMyJ4rXvdenID8',
  consumer_secret:      process.env.TWIHEAT_TWITTER_CONSUMER_SECRET; // 'E4MDCqqZl4inFSe1G7qLgk76BKQtRq84QNS34PQjBbUS3axqqM',
  access_token:         process.env.TWIHEAT_TWITTER_ACCESS_TOKEN; // '647713-UZPiNsPFbB9tnQO3YxX58TrBzlXDdZEhhg9ORPmKhdd',
  access_token_secret:  process.env.TWIHEAT_TWITTER_ACCESS_TOKEN_SECRET; // 'IBRDwAumAHhdfzYn5UtZF8sAcS7cIz7heIg8AZnSpnnwv',
  timeout_ms:           60*1000,
});

var mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
  mongoURLLabel = "",
  db = null,
  dbDetails = new Object(),
  stream = null,
  sanFrancisco = [ '-122.75', '36.8', '-121.75', '37.8' ];

app.use(morgan('combined'))
app.use(cors());

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;
  }
};

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

// route to display versions
app.get('/_status/healthz', function(req, res) {
    res.json({status: "ok"});
})

initDb(function(err) {
  winston.error('Error connecting to Mongo. Message:\n'+err);
});

if (db) {
  stream =  T.stream('statuses/filter', { locations: sanFrancisco })

  stream.on('tweet', function (tweet) {
    winston.info(tweet)

    if (db) {
      var col = db.collection('tweets');
      col.insert({tweet: tweet, date: Date.now(), location: sanFrancisco});
    }
  });
}

app.listen(8088, function () {
  winston.info("Server running at 0.0.0.0:8088/");
});

process.on('SIGTERM', function () {
  winston.info("Received SIGTERM. Exiting.")

  app.close();
  process.exit(0);
});
