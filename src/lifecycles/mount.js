import { NOT_MOUNTED, MOUNTING, SKIP_BECAUSE_BROKEN, MOUNTED } from "../application/appsHelper";
import { reasonableTime } from "../application/timeout";
import { getProps } from "./helper";
import { toUnmountPromise } from "./unmount";

export function toMountPromise(app) {
    if(app.status !== NOT_MOUNTED) {
        return Promise.resolve(app)
    }

    app.status = MOUNTING;

    return reasonableTime(app.mount(getProps(app)), `app: ${app.name} mounting`, app.timeouts.mount)
    .then(() => {
        app.status = MOUNTED;
        return app
    }).catch(e => {
        // 如果app挂在失败， 立即执行unmount操作
        app.status = MOUNTED;
        console.log(e);

        return toUnmountPromise()
    });
}