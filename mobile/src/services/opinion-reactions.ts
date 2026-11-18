import { subscribeBasicAuth } from './basic-auth.ts';
import { createReactionController } from './opinion-reaction-controller.ts';
import { deleteOpinionReaction, opinionReactionsEnabled, putOpinionReaction, readOpinionReactionCounts } from './opinion-reaction-api.ts';

export const opinionReactions = createReactionController({ enabled: opinionReactionsEnabled, put: putOpinionReaction, remove: deleteOpinionReaction, readCounts: readOpinionReactionCounts });
subscribeBasicAuth(() => opinionReactions.reset());
