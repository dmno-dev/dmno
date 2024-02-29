import _ from 'lodash-es';
import { z } from 'zod';
import { ApiError } from "../lib/api-error";
import { validate } from "../lib/validation-helpers";

import { CustomRouteContext } from '../custom-state';
import { router } from ".";

router.get("/foo", async (ctx) => {

  ctx.body = {
    foo: 'bar!'
  };
});

// // :userId named param handler - little easier for TS this way than using router.param
// async function handleUserIdParam(ctx: CustomRouteContext) {
//   if (!ctx.params.userId) {
//     throw new Error('Only use this fn with routes containing :userId param');
//   }

//   // ensure user is logged in
//   if (!ctx.state.authUser) {
//     throw new ApiError('Unauthorized', "You are not logged in");
//   }

//   // for now you can only edit yourself
//   // eventually we may have SI admins able to edit everyone
//   // or org admins able to edit people within their org...
//   if (ctx.state.authUser.id !== ctx.params.userId) {
//     throw new ApiError('Forbidden', "You can only edit your own info");
//   }

//   // we always have the user loaded already since you can only access yourself
//   // but eventually we'd add a lookup by id and 404 handling
//   return ctx.state.authUser;
// }

// router.patch("/users/:userId", async (ctx) => {
//   const user = await handleUserIdParam(ctx);

//   const reqBody = validate(ctx.request.body, z.object({
//     // TODO: add checks on usernames looking right
//     // TODO: figure out way to avoid marking everything as nullable
//     firstName: z.string().nullable(),
//     lastName: z.string().nullable(),
//     nickname: z.string(),
//     email: z.string().email(),
//     pictureUrl: z.string().url().nullable(),
//     discordUsername: z.string().nullable(),
//     githubUsername: z.string().nullable(),
//   }).partial());

//   _.assign(user, reqBody);
//   await saveUser(user);

//   ctx.body = { user };
// });

