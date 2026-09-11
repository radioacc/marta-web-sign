import { handleArrivalsRequest } from './functions/api/arrivals.js';

export default {
    async fetch(request, env, context) {
        const { pathname } = new URL(request.url);

        if (/^\/api\/arrivals\/?$/.test(pathname)) {
            return handleArrivalsRequest(request, env, (promise) => context.waitUntil(promise));
        }

        return env.ASSETS.fetch(request);
    },
};
