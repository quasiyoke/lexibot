import assert from 'assert';
import fs from 'fs';
import { MongoClient } from 'mongodb';
import {
  curry,
} from 'ramda';
import Telegraf from 'telegraf';

const readSecret = (name) => {
  const filePath = `conf/${name}`;
  return fs.readFileSync(filePath, 'utf8');
};

const logUpdate = curry(async (db, ctx, next) => {
  db.collection('update')
    .insertOne(ctx.update);
  await next();
});

const connectToDb = (run) => {
  const url = readSecret('db_url');
  const options = {
    auth: {
      user: readSecret('db_user'),
      password: readSecret('db_password'),
    },
  };
  MongoClient.connect(url, options, (err, client) => {
    assert.equal(null, err);
    const dbName = readSecret('db_name');
    const db = client.db(dbName);
    run(db);
  });
};

const main = () => {
  const run = (db) => {
    const token = readSecret('bot_token');
    const bot = new Telegraf(token);
    bot.use(logUpdate(db));
    bot.start(ctx => ctx.reply('welcome!'));
    bot.startPolling();
  };

  connectToDb(run);
};

main();
