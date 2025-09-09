import { checkUserAbility } from '../middleware/authorization';
import type { Actions, Subjects } from './abilities';

export class AuthorizationError extends Error {
  code = 'FORBIDDEN';
}

export async function requireUserAbility(
  userId: string,
  action: Actions,
  subject: Subjects,
  resource?: any
) {
  const allowed = await checkUserAbility(userId, action, subject, resource);
  if (!allowed) throw new AuthorizationError(`You are not allowed to ${action} ${subject}`);
}
