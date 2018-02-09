import {
  compose,
  curry,
  path,
  prop,
} from 'ramda';
import Telegraf from 'telegraf';

import getSecret from './conf';
import {
  getUserByTelegramInfo,
  insertUpdate,
} from './db';
import {
  getFullName,
  getUserId,
} from './entities/user';
import {
  logger,
} from './helpers';

const getTelegramInfo = prop('from');

const getUpdate = prop('update');

const auth = curry(async (db, ctx, next) => {
  const user = await compose(
    getUserByTelegramInfo(db),
    getTelegramInfo,
  )(ctx);
  ctx.state.user = user;
  await next();
});

const getUser = path(['state', 'user']);

const onStart = async (ctx) => {
  const user = getUser(ctx);
  logger.info('User %s has run "start" command', getUserId(user));
  ctx.reply(`Welcome, ${getFullName(user)}.`);
};

const storeUpdate = curry(async (db, ctx, next) => {
  compose(
    insertUpdate(db),
    getUpdate,
  )(ctx);
  await next();
});

const run = (db) => {
  const token = getSecret('bot_token');
  const bot = new Telegraf(token);
  bot.use(storeUpdate(db))
    .use(auth(db))
    .start(onStart)
    .startPolling();
  logger.info('Ready for messages');
};

export default run;
