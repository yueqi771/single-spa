(function() {
    let ctx = {}

    window.appB = {
        bootstrap: function() {
            return Promise.resolve().then(() => {
                console.log('hello bootstrap');
                ctx.container = document.querySelector('#app')
            })
        },
        mount: function() {
            return Promise.resolve().then(() => {
                console.log('hell o mount');
                ctx.container.innerHTML = 'hello 今朝, 这是appB'

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