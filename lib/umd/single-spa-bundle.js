(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.singleSpa = {}));
}(this, (function (exports) { 'use strict';

    const NOT_LOADED = 'NOT_LOADED';
    const SKIP_BECAUSE_BROKEN = 'SKIP_BECAUSE_BROKEN';
    const LOAD_ERROR = 'LOAD_ERROR';
    const LOAD_SOURCE_CODE = 'LOAD_SOURCE_CODE';
    const NOT_BOOTSTRAP = 'NOT_BOOTSTRAP';
    const BOOTSTRAPPING = 'BOOTSTRAPPING';
    const NOT_MOUNTED = 'NOT_MOUNTED';
    const MOUNTED = 'MOUNTED';
    const MOUNTING = 'MOUNTING';
    const UNMOUNTING = 'UNMOUNTING';

    function notSkip(app) {
      return app.status !== SKIP_BECAUSE_BROKEN;
    }
    function notLoadError(app) {
      return app.status !== LOAD_ERROR;
    }
    function isntLoaded(app) {
      return app.status === NOT_LOADED;
    }
    function isLoaded(app) {
      return app.status !== NOT_LOADED && app.status !== SKIP_BECAUSE_BROKEN && app.status !== LOAD_ERROR;
    }
    function isActive(app) {
      return app.status === MOUNTED;
    }
    function isntActive(app) {
      return !isActive(app);
    }
    function shouldBeActivity(app) {
      try {
        return app.activityWhen(window.location);
      } catch (e) {
        app.status = SKIP_BECAUSE_BROKEN;
        console.log(e);
      }
    }
    function shouldntBeActivity(app) {
      try {
        return !app.activityWhen(window.location);
      } catch (e) {
        app.status = SKIP_BECAUSE_BROKEN;
        throw e;
      }
    }

    let started = false;
    function start() {
      if (started) {
        return Promise.resolve();
      }

      started = true;
      return invoke();
    }
    function isStarted() {
      return started;
    }

    function smelLikeAPromise(promise) {
      if (promise instanceof Promise) {
        return true;
      }

      return typeof promise === 'object' && typeof promise.then === 'function' && typeof promise.catch === 'function';
    }
    /**
     * 
     * @param {*} lifecycles 
     * @param {*} description 
     */

    function flattenLifecyclesArray(lifecycles, description) {
      if (!Array.isArray(lifecycles)) {
        lifecycles = [lifecycles];
      }

      if (!lifecycles.length) {
        lifecycles = [() => Promise.resolve()];
      }

      return props => new Promise((resolve, reject) => {
        waitForPromises(0);

        function waitForPromises(index) {
          let fn = lifecycles[index](props);

          if (!smelLikeAPromise(fn)) {
            reject(new Error(`${description} has error`));
          } else {
            fn.then(() => {
              if (index >= lifecycles.length - 1) {
                resolve();
              } else {
                waitForPromises(++index);
              }
            }).catch(reject);
          }
        }
      });
    }
    /**
     * 
     */

    function getProps(app) {
      return {
        name: app.name,
        ...app.customProps
      };
    }

    const TIMEOUTS = {
      bootstrap: {
        milliseconds: 3000,
        rejectWhenTimeout: false
      },
      mount: {
        milliseconds: 3000,
        rejectWhenTimeout: false
      },
      unmount: {
        milliseconds: 3000,
        rejectWhenTimeout: false
      }
    };
    function reasonableTime(lifecyclePromise, description, timeout) {
      return new Promise((resolve, reject) => {
        let finished = false;
        lifecyclePromise.then(data => {
          finished = true;
          resolve(data);
        }).catch(e => {
          finished = true;
          reject(e);
        });
        setTimeout(() => {
          if (finished) {
            return;
          }

          if (timeout.rejectWhenTimeout) {
            reject(`${description}`);
          } else {
            console.log('timeout but waiting');
          }
        }, timeout.milliseconds);
      });
    }
    function ensureTimeout(timeouts = {}) {
      return { ...TIMEOUTS,
        ...timeouts
      };
    }

    function toLoadPromise(app) {
      if (app.status !== NOT_LOADED) {
        return Promise.resolve(app);
      }

      app.status = LOAD_SOURCE_CODE;
      let loadPromise = app.loadFunction(getProps(app));

      if (!smelLikeAPromise(loadPromise)) {
        app.status = SKIP_BECAUSE_BROKEN;
        return Promise.reject(new Error('加载函数不是一个promise'));
      } // 开始加载app了


      return loadPromise.then(appConfig => {
        if (typeof appConfig !== 'object') {
          throw new Error('');
        }

        let errors = [];
        let lifecycles = ['bootstrap', 'mount', 'unmount'];
        lifecycles.forEach(lifecycle => {
          if (!appConfig[lifecycle]) {
            errors.push('lifecycle:' + lifecycle + 'must be exists');
          }
        });

        if (errors.length) {
          app.status = SKIP_BECAUSE_BROKEN;
          console.log(errors);
          return;
        } // 加载成功， 改变状态


        app.status = NOT_BOOTSTRAP;
        app.bootstrap = flattenLifecyclesArray(appConfig.bootstrap, `app: ${app.name} bootstraping`);
        app.mount = flattenLifecyclesArray(appConfig.mount, `app: ${app.name} mounting`);
        app.unmount = flattenLifecyclesArray(appConfig.unmount, `app: ${app.name} unmounting`); // 处理超时

        app.timeouts = ensureTimeout(appConfig.timeouts);
        console.log('app加载完了', app);
        return app;
      }).catch(e => {
        app.status = LOAD_ERROR;
        console.log(e);
      });
    }

    function toUnmountPromise(app) {
      if (app.status !== MOUNTED) {
        return Promise.resolve(app);
      }
      app.status = UNMOUNTING;
      reasonableTime(app.unmount(getProps(app)), `app: ${app.name} unmounting`, app.timeouts.unmount).then(() => {
        app.status = NOT_MOUNTED;
        return app;
      }).catch(e => {
        app.status = SKIP_BECAUSE_BROKEN;
        console.log(e);
        return app;
      });
    }

    function toMountPromise(app) {
      if (app.status !== NOT_MOUNTED) {
        return Promise.resolve(app);
      }

      app.status = MOUNTING;
      return reasonableTime(app.mount(getProps(app)), `app: ${app.name} mounting`, app.timeouts.mount).then(() => {
        app.status = MOUNTED;
        return app;
      }).catch(e => {
        // 如果app挂在失败， 立即执行unmount操作
        app.status = MOUNTED;
        console.log(e);
        return toUnmountPromise();
      });
    }

    function toBootstrapPromise(app) {
      if (app.status !== NOT_BOOTSTRAP) {
        return Promise.resolve(app);
      }

      app.status = BOOTSTRAPPING;
      return reasonableTime(app.bootstrap(getProps(app)), `app: ${app.name} bootstapping`, app.timeouts.bootstrap).then(() => {
        app.status = NOT_MOUNTED;
        return app;
      }).catch(e => {
        app.staus = SKIP_BECAUSE_BROKEN;
        console.log(e);
        return app;
      });
    }

    const HIJACK_EVENTS_NAME = /^(hashchange|popstate)$/i;
    const EVENT_POOL = {
      hashchange: [],
      popstate: []
    };

    function reroute() {
      invoke([], arguments);
    }

    window.addEventListener('hashchange', reroute);
    window.addEventListener('popstate', reroute);
    const originalAddEventListener = window.addEventListener;
    const originalRemoveEventListener = window.removeEventListener;

    window.addEventListener = function (eventName, handler) {
      if (eventName && HIJACK_EVENTS_NAME.test(this.eventName)) {
        EVENT_POOL[eventName].indexOf(handler) === -1 && EVENT_POOL[eventName].push(handler);
      } else {
        originalAddEventListener.apply(this, arguments);
      }
    };

    window.removeEventListener = function (eventName, handler) {
      if (eventName && HIJACK_EVENTS_NAME.test(this.eventName)) {
        let events = EVENT_POOL[eventName];
        events.indexOf(handler) > -1 && (EVENT_POOL[eventName] = events.filter(fn => fn !== handler));
      } else {
        originalRemoveEventListener.apply(window, arguments);
      }
    };

    function mokePopStateEvent(state) {
      return new PopStateEvent('popstate', {
        state
      });
    }

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (state, title, url) {
      let result = originalPushState.apply(this, arguments);
      reroute(mokePopStateEvent(state));
      return result;
    };

    window.history.replaceState = function (state, title, url) {
      let result = originalReplaceState.apply(this, arguments);
      reroute(mokePopStateEvent(state));
      return result;
    };

    function callCaptureEvents(eventsArgs) {
      if (!eventsArgs) {
        return;
      }

      if (!Array.isArray(eventsArgs)) {
        eventsArgs = [eventsArgs];
      }

      let name = eventsArgs[0].history;

      if (!EVENT_POOL[name] || EVENT_POOL[name].length === 0) {
        return;
      }

      EVENT_POOL[name].forEach(handler => {
        handler.apply(null, eventsArgs);
      });
    }

    let appChangesUnderway = false;
    let changesQueue = [];
    function invoke(pendings = [], eventArgs) {
      // 现检查appChanges有没有在做事件循环
      if (appChangesUnderway) {
        return new Promise((resolve, reject) => {
          changesQueue.push({
            success: resolve,
            failure: reject,
            eventArgs
          });
        });
      }

      appChangesUnderway = true; // 判断应用是否启动

      if (isStarted()) {
        return performAppChanges();
      } // 如果应用没有启动， 那么启动应用


      return loadApps();

      function loadApps() {
        // 获取需要被加载的app
        return Promise.all(getAppsToLoad().map(toLoadPromise)).then(apps => {
          callAllCaptureEvents();
          return finish();
        }).catch(e => {
          console.log(e);
          callAllCaptureEvents();
        });
      }
      /**
       * @function 如果应用已经启动，那么卸载不需要的app，加载需要的app，挂载需要的app
       */


      function performAppChanges() {
        // 先卸载不需要的app
        let unmountPromise = getAppsToUnmount().map(toUnmountPromise);
        unmountPromise = Promise.all(unmountPromise);
        console.log('unmountPromise:', getAppsToUnmount()); // will load app --> NOT_MOUNTED

        let loadApps = getAppsToLoad();
        loadApps = loadApps.map(app => {
          // 先去加载， 加载完成之后调用bootstrap, 然后卸载，然后加载
          return toLoadPromise(app).then(app => {
            return toBootstrapPromise(app).then(() => unmountPromise).then(() => toMountPromise(app));
          });
        }); // will mount app --> NOT_MOUNTED

        let mountApps = getAppsTomount(); // 针对load和mount的app做去重

        mountApps = mountApps.filter(app => loadApps.indexOf(app) === -1);
        mountApps = mountApps.map(app => {
          return toBootstrapPromise(app).then(() => unmountPromise).then(() => toMountPromise(app));
        }); // 卸载没有问题的时候， 进行挂载新的

        return unmountPromise.then(() => {
          let allPromises = loadApps.concat(mountApps);
          return Promise.all(allPromises.map(toMountPromise)).then(() => {
            callAllCaptureEvents();
            return finish();
          }, e => {
            // 当一个promise状态已经改变的时候， 再次调用的时候不会在改变
            pendings.forEach(item => item.failure(e));
            throw e;
          });
        }, e => {
          callAllCaptureEvents();
          console.log(e);
        });
      }

      function finish() {
        // 路由改变， 或者是调用start方法
        // /home, 正在加载appA的时候， route变为了/index
        // appA加载完成之后， 必须立马加载appB， 将appB放到changesQueue里面，
        let returnValue = getMountedApps();

        if (pendings.length) {
          pendings.forEach(item => item.success(returnValue));
        } // 当前的循环已经完成


        appChangesUnderway = false;

        if (changesQueue.length) {
          // backup就是当前循环中被推到事件队列里的事件， 这些事件交给下一次的invoke处理
          let backup = changesQueue;
          changesQueue = [];
          invoke(backup);
        }

        return returnValue;
      }

      function callAllCaptureEvents() {
        // 如果eventsQueue.length > 0  说明： 路由发生了改变
        pendings && pendings.length && pendings.filter(item => {
          // 判断是否有事件参数， 如果有的话， 说明路由发生了改变
          return !!item.eventArgs;
        }).forEach(event => {
          callCaptureEvents(event);
        });
        eventArgs && callCaptureEvents(eventArgs);
      }
    }

    /**
     * @function 注册App
     * @param {string} appName 要注册的app的名称
     * @param {Function: Promise | Object} loadFunction app异步加载函数， 或者app的内容
     * @param {Function: boolean} activityWhen  判断该app应该何时启动
     * @param {Object} customProps  自定义参数配置
     * return Promise
     */

    const APPS = [];
    function registerApplication(appName, loadFunction, activityWhen, customProps = {}) {
      // 判断参数是否合法
      if (!appName || typeof appName !== 'string') {
        throw new Error('appName不可以是一个空字符串');
      }

      if (!loadFunction) {
        throw new Error('loadFunction must be a function or object');
      }

      if (typeof loadFunction !== 'function') {
        loadFunction = () => Promise.resolve(loadFunction);
      }

      if (typeof activityWhen !== 'function') {
        throw new Error('activityWhen must be a function');
      }

      APPS.push({
        name: appName,
        loadFunction,
        activityWhen,
        customProps,
        status: NOT_LOADED
      });
      invoke();
    }
    /**
     * @function 获取需要被加载的app
     */

    function getAppsToLoad() {
      return APPS.filter(notSkip).filter(notLoadError).filter(isntLoaded).filter(shouldBeActivity);
    }
    function getAppsToUnmount() {
      return APPS.filter(notSkip).filter(isActive).filter(shouldntBeActivity);
    }
    function getAppsTomount() {
      return APPS.filter(notSkip).filter(isLoaded).filter(isntActive).filter(shouldBeActivity);
    } // 获取当前已经挂载的app

    function getMountedApps() {
      return APPS.filter(app => {
        return isActive(app);
      });
    }

    exports.registerApplication = registerApplication;
    exports.start = start;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=single-spa-bundle.js.map
