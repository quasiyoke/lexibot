import assert from 'assert';
import {
  MongoClient,
} from 'mongodb';

import getSecret from './conf';

export const connect = (callback) => {
  const url = getSecret('db_url');
  const options = {
    auth: {
      user: getSecret('db_user'),
      password: getSecret('db_password'),
    },
  };
  MongoClient.connect(url, options, (err, client) => {
    assert.equal(null, err);
    const dbName = getSecret('db_name');
    const db = client.db(dbName);
    callback(db);
  });
};

export const insertUpdate = (update, db) => {
  db.collection('update')
    .insertOne(update);
};
