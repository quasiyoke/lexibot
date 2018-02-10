import {
  compose,
  contains,
  curry,
  flip,
  is,
  not,
  path,
  prop,
  test,
} from 'ramda';
import Telegraf from 'telegraf';

import getSecret from './conf';
import {
  getUnitByName,
  getUserByTelegramInfo,
  insertUnit,
  insertUpdate,
  updateUnit,
} from './db';
import {
  getUnitName,
  getUnitRepr,
} from './entities/unit';
import {
  getFullName,
  getUserId,
} from './entities/user';
import {
  ARTICLES_DELIMITER,
  logger,
  parseUnit,
  TRANSLATION_DELIMITER,
} from './helpers';

const getEditedMessageText = path(['editedMessage', 'text']);

const getMessageText = path(['message', 'text']);

const getTelegramInfo = prop('from');

const getUpdate = prop('update');

const getUpdateType = prop('updateType');

/**
 * Adds user info to the context: `ctx.state.user`.
 */
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
  ctx.reply(
    `Welcome, ${getFullName(user)}. I'm intended to help you in studying foreign language's lexics.` +
    ' We\'ll study it gradually: unit by unit in your textbook.' +
    '\nTo create a new vocabulary unit just send me a message starting with a hashtag “unit\\_name”,' +
    ' e.g.: `#unidad1`' +
    ' After that I want to see a list of words in the same message.' +
    ` Use equal sign \`${TRANSLATION_DELIMITER}\` to separate foreign word from its translation.` +
    ` Use semicolon \`${ARTICLES_DELIMITER}\` to separate words list's items from each other.` +
    '\nHere is an example unit containing three pairs of words:' +
    '\n```' +
    '\n#unidad1' +
    '\nel hijo = son;' +
    '\nmasculino = masculine, male;' +
    '\nel nombre = name' +
    '```',
    { parse_mode: 'Markdown' },
  );
};

/**
 * Processes messages starting with hashtag.
 */
const processHashtag = curry(async (db, ctx, next) => {
  // If it's not an usual text message or an edited message, skip.
  if (compose(
    not,
    flip(contains)(['message', 'edited_message']),
    getUpdateType,
  )(ctx)) {
    return next();
  }

  const text = getEditedMessageText(ctx) || getMessageText(ctx);

  // If message doesn't start with hashtag, skip.
  if (compose(
    not,
    test(/^\s*#/),
  )(text)) {
    return next();
  }

  const userId = compose(
    getUserId,
    getUser,
  )(ctx);
  logger.info('User %s has sent hashtag', userId);
  return parseUnit(text)
    .then(
      unit => getUnitByName(db, getUnitName(unit), userId)
        .then(
          async (oldUnit) => {
            await updateUnit(db, oldUnit, unit);
            return ctx.reply(`Unit #${getUnitName(unit)} was updated.\n${getUnitRepr(unit)}`);
          },
          async () => {
            const newUnit = await insertUnit(db, unit, userId);
            return ctx.reply(`Unit #${getUnitName(newUnit)} was added successfully.\n${getUnitRepr(newUnit)}`);
          },
        ),
      (err) => {
        if (is(Error, err)) {
          logger.error('A trouble during unit parsing. %s', err);
          return Promise.reject(err);
        }

        logger.info('User\'s %s unit wasn\'t parsed: "%s" Unit: %s', userId, err, text);
        return ctx.reply(`${err} You're able to edit the message to fix that.`);
      },
    );
});

const storeUpdate = curry(
  async (db, ctx, next) => Promise.all([
    compose(
      insertUpdate(db),
      getUpdate,
    )(ctx),
    next(),
  ]),
);

const run = (db) => {
  const token = getSecret('bot_token');
  const bot = new Telegraf(token);
  bot.use(storeUpdate(db))
    .use(auth(db))
    .use(processHashtag(db))
    .start(onStart)
    .startPolling();
  logger.info('Ready for messages');
};

export default run;
