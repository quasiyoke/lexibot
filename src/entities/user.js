import {
  compose,
  filter,
  join,
  path,
  prop,
} from 'ramda';

export const getFullName = (user) => {
  const firstName = path(['telegramInfo', 'first_name'], user);
  const lastName = path(['telegramInfo', 'last_name'], user);
  return compose(
    join(' '),
    filter(Boolean),
  )([firstName, lastName]);
};

export const getUserId = prop('_id');
