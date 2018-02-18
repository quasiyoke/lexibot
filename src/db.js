import {
  MongoClient,
} from 'mongodb';
import {
  compose,
  curry,
  head,
  omit,
  prop,
} from 'ramda';

import getSecret from 'conf';
import {
  getRehearsalId,
} from 'entities/rehearsal';
import {
  getUnitId,
} from 'entities/unit';
import {
  getUserId,
} from 'entities/user';
import {
  logger,
  rejectNil,
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

const getModelFromInsertResult = compose(
  head,
  prop('ops'),
);

/**
 * Obtains active rehearsal for given user ID.
 * @returns - Rejected promise if there's no such rehearsal.
 */
export const getRehearsalByUserId = (db, userId) => db.collection('rehearsal')
  .findOne({
    status: 'active',
    userId,
  })
  .then(rejectNil('No rehearsal was found'));

export const getUnitByName = (db, name, userId) => db.collection('unit')
  .findOne({
    name,
    userId,
  })
  .then(rejectNil('Unit wasn\'t found'));

export const getUnitsByUserId = (db, userId) => db.collection('unit')
  .find({
    userId,
  })
  .sort({
    modified: -1,
  })
  .toArray();

export const getUserByTelegramInfo = curry(async (db, telegramInfo) => {
  const telegramId = prop('id', telegramInfo);
  let user = await db.collection('user')
    .findOne({
      'telegramInfo.id': telegramId,
    });

  if (user !== null) {
    return user;
  }

  user = await db.collection('user')
    .insertOne({
      telegramInfo,
    })
    .then(getModelFromInsertResult);
  logger.info(
    'A new user with Telegram ID %d and ID %s was inserted',
    telegramId,
    getUserId(user),
  );
  return user;
});

export const insertRehearsal = async (db, unit, userId) => {
  const created = new Date();
  const rehearsal = await db.collection('rehearsal')
    .insertOne({
      created,
      modified: created,
      status: 'active',
      unit,
      userId,
    })
    .then(getModelFromInsertResult);
  logger.info('A new rehearsal %s for user %s was inserted', getRehearsalId(rehearsal), userId);
  return rehearsal;
};

export const insertUnit = (db, unit, userId) => {
  const created = new Date();
  return db.collection('unit')
    .insertOne({
      created,
      modified: created,
      userId,
      ...unit,
    })
    .then(getModelFromInsertResult)
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

export const updateRehearsal = (db, rehearsal) => db.collection('rehearsal')
  .updateOne({
    _id: getRehearsalId(rehearsal),
  }, {
    $currentDate: {
      modified: true,
    },
    $set: omit(['modified'], rehearsal),
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
