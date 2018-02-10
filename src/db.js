import {
  MongoClient,
} from 'mongodb';
import {
  always,
  compose,
  cond,
  curry,
  head,
  identity,
  isNil,
  prop,
  T,
} from 'ramda';

import getSecret from 'conf';
import {
  getUnitId,
} from 'entities/unit';
import {
  getUserId,
} from 'entities/user';
import {
  logger,
} from 'helpers';

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

export const getUnitByName = (db, name, userId) => db.collection('unit')
  .findOne({
    name,
    userId,
  })
  .then(cond([
    [isNil, always(Promise.reject())],
    [T, identity],
  ]));

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

export const insertUnit = (db, unit, userId) => {
  const created = new Date();
  return db.collection('unit')
    .insertOne({
      created,
      modified: created,
      userId,
      ...unit,
    })
    .then(compose(
      head,
      prop('ops'),
    ))
    .then((newUnit) => {
      logger.info('A new unit %s for user %s was inserted', getUnitId(newUnit), userId);
      return newUnit;
    });
};

export const insertUpdate = curry((db, update) => {
  const created = new Date();
  return db.collection('update')
    .insertOne({
      created,
      modified: created,
      ...update,
    });
});

export const updateUnit = (db, old, fresh) => db.collection('unit')
  .updateOne({
    _id: getUnitId(old),
  }, {
    $currentDate: {
      modified: true,
    },
    $set: fresh,
  });
