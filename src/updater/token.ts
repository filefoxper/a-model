import { isToken } from '../validation';
import { tokenIdentifier } from '../identifiers';
import type { Token } from './type';

export function createToken(): Token {
  const value = {};
  return {
    isDifferent(token: Token) {
      if (!isToken(token)) {
        return true;
      }
      return token.value !== value;
    },
    tokenIdentifier,
    value
  };
}
