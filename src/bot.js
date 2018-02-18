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
  getRehearsalByUserId,
  getUnitByName,
  getUnitsByUserId,
  getUserByTelegramInfo,
  insertRehearsal,
  insertUnit,
  insertUpdate,
  updateRehearsal,
  updateUnit,
} from 'db';
import {
  getRehearsalArticleRepr,
  getRehearsalRepr,
  getRehearsalUnit,
  getRehearsalWithNextWord,
  getRehearsalWord,
  getStoppedRehearsal,
  updateRehearsalWithTelegramMessageId,
} from 'entities/rehearsal';
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
  escapeMarkdown,
  logger,
  noop,
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

const getRehearsal = path(['state', 'rehearsal']);

const getTelegramInfo = prop('from');

const getUpdate = prop('update');

const getUpdateMessageId = prop('message_id');

const getUpdateType = prop('updateType');

const getUser = path(['state', 'user']);

const setRehearsal = curry((ctx, rehearsal) => {
  ctx.state.rehearsal = rehearsal;
});

const askNextRehearsalWord = async (db, ctx) => {
  /**
   * When we've asked user, we're able to save message ID to the DB to change it later.
   */
  const onReplyWasSent = (update) => {
    const telegramMessageId = getUpdateMessageId(update);
    const rehearsal = getRehearsal(ctx);
    updateRehearsalWithTelegramMessageId(telegramMessageId, rehearsal);
    return updateRehearsal(db, rehearsal);
  };

  const onNextWord = async (newRehearsal) => {
    await updateRehearsal(db, newRehearsal);
    setRehearsal(ctx, newRehearsal);
    const word = compose(
      escapeMarkdown,
      getRehearsalWord,
    )(newRehearsal);
    return ctx.reply(
      'Do you know the translation for' +
      `\n*${word}?*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Show the translation',
                callback_data: 'show_translation',
              },
            ],
            [
              {
                text: 'Yes',
                callback_data: 'yes',
              },
              {
                text: 'No',
                callback_data: 'no',
              },
            ],
          ],
        },
      },
    )
      .then(onReplyWasSent);
  };

  const rehearsal = getRehearsal(ctx);

  /**
   * In case when the rehearsal was finished: there're no more words to study.
   */
  const onRehearsalEnd = async () => {
    const stoppedRehearsal = getStoppedRehearsal(rehearsal);
    await updateRehearsal(db, stoppedRehearsal);
    const rehearsalRepr = getRehearsalRepr(stoppedRehearsal);
    return ctx.reply(`The rehearsal was finished. ${rehearsalRepr}`);
  };

  return getRehearsalWithNextWord(rehearsal)
    .then(onNextWord, onRehearsalEnd);
};

/**
 * Adds user info to the context: `ctx.state.user`.
 */
const auth = curry(async (db, ctx, next) => {
  const user = await compose(
    getUserByTelegramInfo(db),
    getTelegramInfo,
  )(ctx);
  ctx.state.user = user;
  return next();
});

/**
 * Adds info about current rehearsal to the context: `ctx.state.rehearsal`.
 */
const findRehearsal = curry((db, ctx, next) => {
  const userId = compose(
    getUserId,
    getUser,
  )(ctx);
  return getRehearsalByUserId(db, userId)
    .then(
      setRehearsal(ctx),
      noop,
    )
    .then(next);
});

const onError = (err) => {
  logger.error(err);
};

/**
 * Help on the bot's features.
 */
const onHelp = ctx => ctx.reply(
  'Here\'s the list of available commands:' +
  '\n/units — show the list of available units.' +
  `\n${CREATE_UNIT_HELP}`,
  { parse_mode: 'Markdown' },
);

/**
 * User has pressed "Show the translation" callback query button.
 */
const onShowTranslation = curry(async (db, ctx) => {
  const rehearsal = getRehearsal(ctx);
  const articleRepr = getRehearsalArticleRepr(rehearsal);
  return ctx.editMessageText(
    'Did you know the translation for' +
    `\n${articleRepr}?`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Yes',
              callback_data: 'yes',
            },
            {
              text: 'No',
              callback_data: 'no',
            },
          ],
        ],
      },
    },
  );
});

/**
 * Standard Telegram `/start` command.
 */
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

/**
 * User sends this command to list her units.
 */
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
 * Processes messages starting with hashtag. User sends them to create / change the unit with the
 * hashtag-name.
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
            return ctx.reply(
              `Unit #${getUnitName(unit)} was updated.\n${getUnitRepr(unit)}`,
              { parse_mode: 'Markdown' },
            );
          },
          async () => {
            const newUnit = await insertUnit(db, unit, userId);
            logger.info('User %s has added unit %s', userId, getUnitId(newUnit));
            return ctx.reply(
              `Unit #${getUnitName(newUnit)} was added successfully.\n${getUnitRepr(newUnit)}`,
              { parse_mode: 'Markdown' },
            );
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

const stopRehearsal = async (db, ctx) => {
  const rehearsal = getRehearsal(ctx);
  const stoppedRehearsal = getStoppedRehearsal(rehearsal);
  await updateRehearsal(db, stoppedRehearsal);
  const unitName = compose(
    getUnitName,
    getRehearsalUnit,
  )(stoppedRehearsal);
  const rehearsalRepr = getRehearsalRepr(stoppedRehearsal);
  return ctx.reply(`Your rehearsal of unit “${unitName}” was stopped. ${rehearsalRepr}`);
};

/**
 * User sends "unit command" like `/unit_unidad_1` to start rehearsal.
 */
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

  const onUnitFound = async (unit) => {
    if (getRehearsal(ctx)) {
      await stopRehearsal(db, ctx);
    }
    const rehearsal = await insertRehearsal(db, unit, userId);
    setRehearsal(ctx, rehearsal);
    return askNextRehearsalWord(db, ctx);
  };

  /**
   * If unit with the name specified by user wasn't found.
   * @param unusedReason - Just to make function partially applied with one argument.
   */
  const onUnitWasntFound = curry((name, unusedReason) => {
    logger.warn('User\'s %s unit %s wasn\'t found', userId, name);
    return ctx.reply(`Sorry, unit “${name}” not found 😞`);
  });

  const onParseError = (reason) => {
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
  };

  return parseUnitCommand(text)
    .then(
      // Unit name was parsed successfully
      name => getUnitByName(db, name, userId)
        .then(onUnitFound, onUnitWasntFound(name)),
      onParseError,
    );
});

/**
 * Stores Telegram update in the DB.
 */
const storeUpdate = curry(
  async (db, ctx, next) => Promise.all([
    compose(
      insertUpdate(db),
      getUpdate,
    )(ctx),
    next(),
  ]),
);

/**
 * Ignites the bot.
 */
const run = (db) => {
  const token = getSecret('bot_token');
  const bot = new Telegraf(token);
  bot.use(storeUpdate(db))
    .use(auth(db))
    .use(findRehearsal(db))
    .use(processHashtag(db))
    .start(onStart)
    .command('units', onUnits(db))
    .on('message', processUnitCommand(db))
    .action('show_translation', onShowTranslation(db))
    // If any upper handlers haven't processed the update, let's show help message.
    .use(onHelp)
    .catch(onError)
    .startPolling();
  logger.info('Ready for messages');
};

export default run;
