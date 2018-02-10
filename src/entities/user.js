import {
  compose,
  join,
  path,
  prop,
} from 'ramda';

import {
  compact,
} from '../helpers';

export const getFullName = (user) => {
  const firstName = path(['telegramInfo', 'first_name'], user);
  const lastName = path(['telegramInfo', 'last_name'], user);
  return compose(
    join(' '),
    compact,
  )([firstName, lastName]);
};

export const getUserId = prop('_id');
