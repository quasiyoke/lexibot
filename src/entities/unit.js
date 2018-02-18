import {
  compose,
  concat,
  join,
  map,
  prop,
  take,
} from 'ramda';

import {
  escapeMarkdown,
} from 'helpers';

const getArticleTranslation = prop('translation');

const getArticleWord = prop('word');

/**
 * Represents an article in Markdown.
 */
const getArticleRepr = (article) => {
  const word = compose(
    escapeMarkdown,
    getArticleWord,
  )(article);
  const translation = compose(
    escapeMarkdown,
    getArticleTranslation,
  )(article);
  return `*${word}* ${translation}`;
};

const getUnitArticles = prop('articles');

export const getUnitName = prop('name');

export const getUnitCommand = compose(
  escapeMarkdown,
  concat('/unit_'),
  getUnitName,
);

export const getUnitWords = compose(
  map(getArticleWord),
  getUnitArticles,
);

export const getUnitGlimpse = (unit) => {
  const WORDS_COUNT_MAX = 3;
  let glimpse = compose(
    escapeMarkdown,
    join(', '),
    take(WORDS_COUNT_MAX),
    getUnitWords,
  )(unit);

  if (getUnitArticles(unit).length > WORDS_COUNT_MAX) {
    glimpse += '...';
  }

  return glimpse;
};

export const getUnitId = prop('_id');

export const getUnitRepr = compose(
  join('\n'),
  map(getArticleRepr),
  getUnitArticles,
);
