import { UPDATE_FILTER } from '../constants';

const initialState = {};

const actionsMap = {
  [UPDATE_FILTER]: (state, action) => Object.assign({}, state, { [action.key]: action.value })
};

export default function filter(state = initialState, action) {
  const fn = actionsMap[action.type];
  if (!fn) {
    return state;
  }
  return fn(state, action);
}
