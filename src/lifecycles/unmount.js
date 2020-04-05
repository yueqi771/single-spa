import { MOUNTED, UNMOUNTING, NOT_MOUNTED, SKIP_BECAUSE_BROKEN } from "../application/appsHelper";
import { reasonableTime } from "../application/timeout";
import { getProps } from "./helper";

export function toUnmountPromise(app) {
    if(app.status !== MOUNTED) {
        return Promise.resolve(app)
    };

    app.status = UNMOUNTING;

    reasonableTime(
        app.unmount(getProps(app)), 
        `app: ${app.name} unmounting`,
        app.timeouts.unmount
    ).then(() => {
        app.status = NOT_MOUNTED
        return app
    }).catch(e => {
        app.status = SKIP_BECAUSE_BROKEN
        console.log(e);
        return app
    })
}