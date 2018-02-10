import winston from 'winston';
import {
  compose,
  equals,
  filter,
  find,
  join,
  length,
  map,
  not,
  replace,
  split,
  trim,
} from 'ramda';

export const ARTICLES_DELIMITER = ';';
const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';
export const TRANSLATION_DELIMITER = '=';

export const compact = filter(Boolean);

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

const normalizeSpaces = compose(
  replace(/\s+/g, ' '),
  trim,
);

export const parseUnit = (text) => {
  const match = /^\s*#([^#\s]+)([^]*)$/.exec(text);

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
