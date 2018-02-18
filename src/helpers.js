import winston from 'winston';
import {
  compose,
  cond,
  equals,
  filter,
  find,
  identity,
  isNil,
  join,
  length,
  map,
  not,
  replace,
  split,
  T,
  trim,
} from 'ramda';

export const ARTICLES_DELIMITER = ';';
const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';
export const TRANSLATION_DELIMITER = '=';
const UNIT_RE = /^\s*#([^#\s/]+)([^]*)$/;
const UNIT_COMMAND_RE = /^\s*\/unit_([^#\s/]+)\s*$/;

export const choose = arr => arr[
  Math.floor(Math.random() * arr.length)
];

export const compact = filter(Boolean);

export const delay = microseconds => new Promise(resolve => setTimeout(resolve, microseconds));

export const escapeMarkdown = compose(
  replace(/\*/g, '\\*'),
  replace(/_/g, '\\_'),
);

export const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: LOG_LEVEL,
      timestamp() {
        return (new Date()).toISOString();
      },
    }),
  ],
});

export const noop = () => {};

const normalizeSpaces = compose(
  replace(/\s+/g, ' '),
  trim,
);

/**
 * Parses the unit.
 *
 * @example
 * const text = '#unidad_1 el hijo = son; el nombre = name';
 * parseUnitCommand(text); //=> Promise.resolve({
 *                         //     name: 'unidad_1',
 *                         //     articles: [
 *                         //       { word: 'el hijo', translation: 'son' },
 *                         //       { word: 'el nombre', translation: 'name' },
 *                         //     ],
 *                         //   })
 *
 * @example
 * parseUnitCommand('/unit  dad_1'); //=> Promise.reject('Can\'t recognize unit name.')
 *
 * @returns - Promise. Resolved with the unit instance in the case of success. Rejected with
 *  the reason of the trouble during the parsing.
 */
export const parseUnit = (text) => {
  const match = UNIT_RE.exec(text);

  if (!match) {
    return Promise.reject('Can\'t recognize unit name.');
  }

  const [unusedText, name, articlesText] = match;
  const articlesRows = compose(
    map(split(TRANSLATION_DELIMITER)),
    compact,
    map(trim),
    split(ARTICLES_DELIMITER),
  )(articlesText);
  /**
   * Checks if article row doesn't contain word and its translation or does contain something more.
   */
  const isRowIncorrect = compose(
    not,
    equals(2),
    length,
  );
  const incorrectRow = find(isRowIncorrect, articlesRows);

  if (incorrectRow) {
    const incorrectRowRepr = join(TRANSLATION_DELIMITER, incorrectRow);
    return Promise.reject(`Can't recognize word and its translation here: “${incorrectRowRepr}”.`);
  }

  const articles = map(compose(
    ([word, translation]) => ({
      word,
      translation,
    }),
    map(normalizeSpaces),
  ), articlesRows);

  if (articles.length < 1) {
    return Promise.reject('The unit is empty. It must contain at least one article.');
  }

  return Promise.resolve({
    name,
    articles,
  });
};

/**
 * Parses unit command.
 *
 * @example
 * parseUnitCommand('/unit_unidad_1'); //=> Promise.resolve('unidad_1')
 *
 * @example
 * parseUnitCommand('/unit  dad_1'); //=> Promise.reject('Can\'t recognize unit name.')
 *
 * @returns - Promise. Resolved with the unit name in the case of success; otherwise rejected with
 *  the reason of the trouble during the parsing.
 */
export const parseUnitCommand = (text) => {
  const match = UNIT_COMMAND_RE.exec(text);

  if (!match) {
    return Promise.reject('Can\'t recognize unit name.');
  }

  const [unusedText, unitName] = match;
  return Promise.resolve(unitName);
};

/**
 * @returns - Rejected promise if an argument is nil-value; otherwise returns the argument.
 */
export const rejectNil = reason => cond([
  [
    isNil,
    () => Promise.reject(Error(reason)),
  ],
  [T, identity],
]);
