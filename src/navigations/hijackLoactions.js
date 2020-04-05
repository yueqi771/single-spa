import { invoke } from "./invoke";

const HIJACK_EVENTS_NAME = /^(hashchange|popstate)$/i;
const EVENT_POOL = {
    hashchange: [],
    popstate: []
}

function reroute() {
    invoke([], arguments)
}

window.addEventListener('hashchange', reroute);
window.addEventListener('popstate', reroute);

const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

window.addEventListener = function(eventName, handler, ) {
    if(eventName && HIJACK_EVENTS_NAME.test(this.eventName)) {
        EVENT_POOL[eventName].indexOf(handler) === -1 && EVENT_POOL[eventName].push(handler)
    }else {
        originalAddEventListener.apply(this, arguments)
    }
}

window.removeEventListener = function(eventName, handler, ) {
    if(eventName && HIJACK_EVENTS_NAME.test(this.eventName)) {
        let events = EVENT_POOL[eventName]
        events.indexOf(handler) > -1 && 
        (EVENT_POOL[eventName] = events.filter(fn => fn !== handler))
    }else {
        originalRemoveEventListener.apply(window , arguments)
    }
}

function mokePopStateEvent(state) {
    return new PopStateEvent('popstate', { state })
}

const originalPushState = window.history.pushState;
const originalReplaceState = window.history.replaceState;

window.history.pushState = function(state, title, url) {
    let result = originalPushState.apply(this, arguments);

    reroute(mokePopStateEvent(state));

    return result;
}

window.history.replaceState = function(state, title, url) {
    let result = originalReplaceState.apply(this, arguments);

    reroute(mokePopStateEvent(state));

    return result;
}

export function callCaptureEvents(eventsArgs) {
    if(!eventsArgs) {
        return
    }

    if(!Array.isArray(eventsArgs)) {
        eventsArgs = [eventsArgs]
    }

    let name = eventsArgs[0].history;

    if(!EVENT_POOL[name] || EVENT_POOL[name].length === 0) {
        return;
    }

    EVENT_POOL[name].forEach(handler => {
        handler.apply(null, eventsArgs)
    })
}