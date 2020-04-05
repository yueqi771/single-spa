(function() {
    let ctx = {}

    window.appA = {
        bootstrap: function() {
            return Promise.resolve().then(() => {
                console.log('hello bootstrap');
                ctx.container = document.querySelector('#app')
            })
        },
        mount: function() {
            return Promise.resolve().then(() => {
                console.log('hell o mount');
                ctx.container.innerHTML = 'hello yueqi, 这是appA'

            })
        },
        unmount: function() {
            return Promise.resolve().then(() => {
                console.log('hello unmount');
                ctx.container.innerHTML = ''
            })
        }
    }
})()