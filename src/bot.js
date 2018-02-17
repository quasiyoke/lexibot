import {
  compose,
  contains,
  curry,
  flip,
  is,
  join,
  map,
  not,
  path,
  prop,
  test,
} from 'ramda';
import Telegraf from 'telegraf';

import getSecret from 'conf';
import {
  getUnitByName,
  getUnitsByUserId,
  getUserByTelegramInfo,
  insertUnit,
  insertUpdate,
  updateUnit,
} from 'db';
import {
  getUnitCommand,
  getUnitGlimpse,
  getUnitId,
  getUnitName,
  getUnitRepr,
} from 'entities/unit';
import {
  getFullName,
  getUserId,
} from 'entities/user';
import {
  ARTICLES_DELIMITER,
  logger,
  parseUnit,
  parseUnitCommand,
  TRANSLATION_DELIMITER,
} from 'helpers';

const CREATE_UNIT_HELP = 'To create a new vocabulary unit just send me a message starting with' +
  ' a hashtag “unit\\_name”, e.g.: `#unidad1`' +
  ' After that I want to see a list of words in the same message.' +
  ` Use equal sign \`${TRANSLATION_DELIMITER}\` to separate foreign word from its translation.` +
  ` Use semicolon \`${ARTICLES_DELIMITER}\` to separate words list's items from each other.` +
  '\nHere is an example unit containing three pairs of words:' +
  '\n```' +
  '\n#unidad1' +
  '\nel hijo = son;' +
  '\nmasculino = masculine, male;' +
  '\nel nombre = name' +
  '```';

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

const onError = err => {
  logger.error(err);
};

const onHelp = ctx => ctx.reply(
  'Here\'s the list of available commands:' +
  '\n/units — show the list of available units.' +
  `\n${CREATE_UNIT_HELP}`,
  { parse_mode: 'Markdown' },
);

const onStart = async (ctx) => {
  const user = getUser(ctx);
  logger.info('User %s has run "start" command', getUserId(user));
  return ctx.reply(
    `Welcome, ${getFullName(user)} 🤗` +
    ' I\'m intended to help you in studying foreign language\'s lexics.' +
    ' We\'ll study it gradually: unit by unit in your textbook.' +
    `\n${CREATE_UNIT_HELP}`,
    { parse_mode: 'Markdown' },
  );
};

const onUnits = curry(async (db, ctx) => {
  const user = getUser(ctx);
  const userId = getUserId(user);
  logger.info('User %s has run "units" command', userId);
  const units = await getUnitsByUserId(db, userId);

  if (units.length === 0) {
    return ctx.reply(`Sorry, but you have no units 😔 ${CREATE_UNIT_HELP}`, {
      parse_mode: 'Markdown',
    });
  }

  const getListItem = unit => `${getUnitCommand(unit)}: ${getUnitGlimpse(unit)}`;
  const unitsRepr = compose(
    join('\n'),
    map(getListItem),
  )(units);
  return ctx.reply(`Here's the list of available units:\n${unitsRepr}`, {
    parse_mode: 'Markdown',
  });
});

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
            logger.info('User %s has updated unit %s', userId, getUnitId(oldUnit));
            return ctx.reply(`Unit #${getUnitName(unit)} was updated.\n${getUnitRepr(unit)}`);
          },
          async () => {
            const newUnit = await insertUnit(db, unit, userId);
            logger.info('User %s has added unit %s', userId, getUnitId(newUnit));
            return ctx.reply(`Unit #${getUnitName(newUnit)} was added successfully.\n${getUnitRepr(newUnit)}`);
          },
        ),
      (reason) => {
        if (is(Error, reason)) {
          logger.error('A trouble during unit parsing. %s', reason);
          return Promise.reject(reason);
        }

        logger.info('User\'s %s unit wasn\'t parsed: "%s" Unit: %s', userId, reason, text);
        return ctx.reply(`${reason} You're able to edit the message to fix that.`);
      },
    );
});

const processUnitCommand = curry(async (db, ctx, next) => {
  const text = getMessageText(ctx);

  if (compose(
    not,
    test(/^\s*\/unit/i),
  )(text)) {
    return next();
  }

  const user = getUser(ctx);
  const userId = getUserId(user);
  return parseUnitCommand(text)
    .then(
      name => getUnitByName(db, name, userId)
        .then(
          (unit) => {
            logger.warn('User %s have asked to show unit %s', userId, getUnitId(unit));
            return ctx.reply('OK, so we\'ve found your unit');
          },
          () => {
            logger.warn('User\'s %s unit %s wasn\'t found', userId, name);
            return ctx.reply(`Sorry, unit “${name}” not found 😞`);
          },
        ),
      (reason) => {
        if (is(Error, reason)) {
          logger.error('A trouble during unit command parsing. %s', reason);
          return Promise.reject(reason);
        }

        logger.info(
          'User\'s %s unit command wasn\'t parsed: "%s" Unit command: %s',
          userId,
          reason,
          text,
        );
        return ctx.reply(reason);
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
    .command('units', onUnits(db))
    .on('message', processUnitCommand(db))
    .use(onHelp)
    .catch(onError)
    .startPolling();
  logger.info('Ready for messages');
};

export default run;
