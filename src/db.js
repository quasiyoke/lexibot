import {
  MongoClient,
} from 'mongodb';
import {
  compose,
  curry,
  head,
  prop,
} from 'ramda';

import getSecret from './conf';
import {
  getUserId,
} from './entities/user';
import {
  logger,
} from './helpers';

/**
 * @throws In case of connection troubles.
 */
export const connect = async () => {
  const url = getSecret('db_url');
  const options = {
    auth: {
      user: getSecret('db_user'),
      password: getSecret('db_password'),
    },
  };
  const client = await MongoClient.connect(url, options);
  const dbName = getSecret('db_name');
  const db = client.db(dbName);
  return db;
};

export const getUserByTelegramInfo = curry(async (db, telegramInfo) => {
  const telegramId = prop('id', telegramInfo);
  let user = await db.collection('user')
    .findOne({
      'telegramInfo.id': telegramId,
    });

  if (user !== null) {
    return user;
  }

  const insertResult = await db.collection('user')
    .insertOne({
      telegramInfo,
    });
  user = compose(
    head,
    prop('ops'),
  )(insertResult);
  logger.info(
    'A new user with Telegram ID %d and ID %s was inserted',
    telegramId,
    getUserId(user),
  );
  return user;
});

export const insertUpdate = curry(async (db, update) => {
  await db.collection('update')
    .insertOne(update);
});
