import { NOT_BOOTSTRAP, BOOTSTRAPPING, NOT_MOUNTED, SKIP_BECAUSE_BROKEN } from "../application/appsHelper";
import { reasonableTime } from "../application/timeout";
import { getProps } from "./helper";

export function toBootstrapPromise(app) {
    if(app.status !== NOT_BOOTSTRAP) {
        return Promise.resolve(app)
    }

    app.status = BOOTSTRAPPING;

    return reasonableTime(app.bootstrap(getProps(app)), `app: ${app.name} bootstapping`, app.timeouts.bootstrap).then(
        () => {
            app.status = NOT_MOUNTED;
            return app
        }).catch(e => {
            app.staus = SKIP_BECAUSE_BROKEN;
            console.log(e)
            return app
        })
}