export const NOT_LOADED = 'NOT_LOADED';
export const SKIP_BECAUSE_BROKEN = 'SKIP_BECAUSE_BROKEN';
export const LOAD_ERROR = 'LOAD_ERROR'
export const LOAD_SOURCE_CODE = 'LOAD_SOURCE_CODE'


// import { NOT_LOADED, notLoadError, notSkip, isntLoaded, shouldBeActivity } from './appsHelper';
export function notSkip(app) {
    return app.status !== SKIP_BECAUSE_BROKEN;
}

export function notLoadError(app) {
    return app.status !== LOAD_ERROR;
}

export function isntLoaded(app) {
    return app.status === NOT_LOADED;
}

export function shouldBeActivity(app) {
    try {
        return app.activityWhen(window.location)
    }catch(e) {
        app.status = SKIP_BECAUSE_BROKEN
        console.log(e)
    }
}