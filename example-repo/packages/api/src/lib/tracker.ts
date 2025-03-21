/**
 * small wrapper for tracking so we can pass in our domain objects
 * and get consistently formatted data
 */
import * as _ from 'lodash-es';
import { User } from '@prisma/client';
import { posthog } from './posthog';

function identifyUser(user: User) {
  posthog.identify({
    distinctId: user.id,
    properties: {
      // TODO: convert to snake_case??
      ..._.pick(user, [
        'auth0Id',
        'email',
        'firstName',
        'lastName',
        'nickname',
        'githubUsername',
        'discordUsername',
      ]),
    },
  });
}

function trackEvent(user: User, eventName: string, properties?: any) {
  posthog.capture({
    distinctId: user.id,
    event: `aa-${eventName}`,
    properties,
  });
}

export const tracker = {
  identifyUser,
  trackEvent,
};
